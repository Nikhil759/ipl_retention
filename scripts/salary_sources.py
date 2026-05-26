"""Fetch verified IPL 2026 player salaries from official BCCI/IPL sources."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
from pypdf import PdfReader

HEADERS = {"User-Agent": "Mozilla/5.0 (ReleaseOrRetain/1.0; +ipl-project)"}

RETENTION_PDF_URL = (
    "https://documents.iplt20.com/bcci/documents/"
    "1763209725967_TATA%20IPL%202026%20-%20Playing%20Squad%20-%2015.11.2025%20(1).pdf"
)
AUCTION_DATA_URL = "https://www.iplt20.com/fetch-auction-data/2026"
ANNOUNCEMENTS_URL = "https://www.iplt20.com/news/announcements"

# Explicit name aliases between squad names and official salary records.
NAME_ALIASES: dict[str, str] = {
    "amghazanfar": "allahghazanfar",
    "auqibnabi": "auqibdar",
    "vaibhavsooryavanshi": "vaibhavsuryavanshi",
    "abishekporel": "abhishekporel",
    "tilakvarma": "tilakverma",
    "saikishore": "rsaikishore",
    "shahbazahamad": "shahbazahmed",
    "mohammadshami": "mdshami",
    "msiddharth": "manimaransiddharth",
    "digveshsingh": "digveshrathi",
    "yudhvirsinghcharak": "yudhvircharak",
    "lhuandrepretorius": "drepretorious",
    "smaranravichandran": "smaranravichandaran",
    "mohammedsiraj": "mohammadsiraj",
    "connoresterhuizen": "connoresterhuizen",
    "rsaambrish": "rsambrish",
}

SOURCE_PRIORITY = {
    "iplt20_replacement_news": 3,
    "iplt20_auction": 2,
    "bcci_retention_pdf": 1,
}


@dataclass
class SalaryRecord:
    salary_cr: float
    salary_lakhs: int
    source: str
    source_url: str
    acquisition_type: str
    matched_name: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "salary_cr": self.salary_cr,
            "salary_lakhs": self.salary_lakhs,
            "salary_display": format_salary_display(self.salary_cr),
            "salary_source": self.source,
            "salary_source_url": self.source_url,
            "acquisition_type": self.acquisition_type,
            "salary_matched_name": self.matched_name,
        }


def format_salary_display(salary_cr: float) -> str:
    if salary_cr >= 1:
        value = f"{salary_cr:.2f}".rstrip("0").rstrip(".")
        return f"₹{value} Cr"
    lakh_value = round(salary_cr * 100)
    return f"₹{lakh_value} L"


def clean_display_name(name: str) -> str:
    return re.sub(r"\*|\(T\)|\(t\)", "", name).strip()


def norm_key(name: str) -> str:
    name = clean_display_name(name).lower()
    name = re.sub(r"[^a-z0-9 ]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    name = name.replace("md ", "mohammad ")
    key = name.replace(" ", "")
    return NAME_ALIASES.get(key, key)


def parse_inr_amount(text: str) -> float | None:
    text = text.replace("&nbsp;", " ").strip()
    crore = re.search(r"([\d.]+)\s*(?:crore|cr)\b", text, re.I)
    if crore:
        return round(float(crore.group(1)), 2)
    lakh = re.search(r"([\d.]+)\s*(?:lakh|lacs?)\b", text, re.I)
    if lakh:
        return round(float(lakh.group(1)) / 100, 2)
    return None


def lakhs_to_cr(lakhs: int) -> float:
    return round(lakhs / 100, 2)


def cr_to_lakhs(salary_cr: float) -> int:
    return int(round(salary_cr * 100))


def parse_pdf_salaries(pdf_bytes: bytes) -> dict[str, SalaryRecord]:
    text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(pdf_bytes)).pages)
    text = re.sub(r"Deduction|Player Player.*|TATA IPL 2026.*|\*= Overseas player", "", text, flags=re.S)
    text = re.sub(r"No of Players.*?Salary cap available\d+", "", text, flags=re.S)

    records: dict[str, SalaryRecord] = {}
    pattern = re.compile(
        r"(\*?[A-Za-z][A-Za-z\s.\(\)]*?)(\d{2,4})(?=\s*(?:\*?[A-Z]|$))"
    )
    for match in pattern.finditer(text):
        raw_name = clean_display_name(match.group(1))
        lakhs = int(match.group(2))
        if len(raw_name) <= 2:
            continue
        traded = "(T)" in match.group(1) or "(t)" in match.group(1)
        overseas = match.group(1).strip().startswith("*")
        acquisition = "trade" if traded else "retained"
        key = norm_key(raw_name)
        records[key] = SalaryRecord(
            salary_cr=lakhs_to_cr(lakhs),
            salary_lakhs=lakhs,
            source="bcci_retention_pdf",
            source_url=RETENTION_PDF_URL,
            acquisition_type=acquisition,
            matched_name=raw_name,
        )
        if overseas and key not in NAME_ALIASES:
            pass

    # PDF text occasionally truncates first letters (e.g. "aswi Jaiswal").
    for match in re.finditer(r"([A-Za-z\s.]+Jaiswal)\s*(\d{2,4})", text):
        raw_name = clean_display_name(match.group(1))
        if "yashasvi" not in raw_name.lower():
            raw_name = f"Yashasvi {raw_name.strip()}"
        lakhs = int(match.group(2))
        records[norm_key(raw_name)] = SalaryRecord(
            salary_cr=lakhs_to_cr(lakhs),
            salary_lakhs=lakhs,
            source="bcci_retention_pdf",
            source_url=RETENTION_PDF_URL,
            acquisition_type="retained",
            matched_name=raw_name,
        )

    return records


def parse_auction_salaries(html: str) -> dict[str, SalaryRecord]:
    records: dict[str, SalaryRecord] = {}

    def store(name: str, bid_text: str, capped: str | None = None) -> None:
        digits = "".join(ch for ch in bid_text if ch.isdigit())
        if not digits:
            return
        salary_cr = round(int(digits) / 10_000_000, 2)
        key = norm_key(name)
        records[key] = SalaryRecord(
            salary_cr=salary_cr,
            salary_lakhs=cr_to_lakhs(salary_cr),
            source="iplt20_auction",
            source_url="https://www.iplt20.com/auction/2026",
            acquisition_type="auction",
            matched_name=name,
        )

    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        cells = [
            re.sub(r"<[^>]+>", "", cell).strip()
            for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        ]
        cells = [cell for cell in cells if cell]
        if not cells:
            continue

        if cells[0].isdigit() and len(cells) >= 4 and re.match(r"^[A-Za-z]", cells[1]):
            store(cells[1], cells[3], cells[4] if len(cells) > 4 else None)
            continue

        if len(cells) == 3 and re.match(r"^[A-Za-z]", cells[0]) and re.search(r"\d", cells[1]):
            if cells[2] in ("Capped", "Uncapped"):
                store(cells[0], cells[1], cells[2])

    return records


def extract_news_body(html: str) -> str:
    match = re.search(
        r"IPL MEDIA ADVISORY(.*?)<div class=\"vn-blogDetCntInr",
        html,
        re.S | re.I,
    )
    if match:
        return re.sub(r"<[^>]+>", "\n", match.group(1))
    match = re.search(r"IPL Media Advisory(.*?)IPL\s*<", html, re.S | re.I)
    if match:
        return re.sub(r"<[^>]+>", "\n", match.group(1))
    return re.sub(r"<[^>]+>", "\n", html)


def collect_article_player_names(body: str) -> list[str]:
    names: list[str] = []
    patterns = [
        r"(?:pick(?:ed)?|sign(?:ed)?)\s+(?:[A-Za-z]+\s+)*([A-Z][A-Za-z\s\-\.]+?)\s+as",
        r"(?:pick(?:ed)?|sign(?:ed)?)\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+as",
        r"(?:picked|signed)\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+and\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+respectively",
        r"([A-Z][A-Za-z\s\-]+?)\s+as\s+(?:a\s+)?replacement\s+for",
        r"sign\s+([A-Z][A-Za-z\s\-]+?)\s+as\s+(?:a\s+)?replacement",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, body, re.I):
            for group in match.groups():
                if group:
                    names.append(clean_display_name(group))
    unique: list[str] = []
    seen: set[str] = set()
    for name in names:
        if not is_plausible_player_name(name):
            continue
        key = norm_key(name)
        if key in seen:
            continue
        seen.add(key)
        unique.append(name)
    return unique


def is_plausible_player_name(name: str) -> bool:
    name = clean_display_name(name)
    if len(name) < 3:
        return False
    lowered = name.lower()
    blocked = (
        "respectively",
        "replacement",
        "injured",
        "spinner",
        "pacer",
        "indians",
        "riders",
        "hyderabad",
        "mumbai",
        "kolkata",
        "sunrisers",
        "royals",
        "signed south",
        "sign ",
    )
    if any(token in lowered for token in blocked):
        return False
    words = name.split()
    if not words or len(words) > 4:
        return False
    return all(word[0].isupper() for word in words if word)


def collect_replacement_targets(body: str) -> list[str]:
    names: list[str] = []
    patterns = [
        r"(?:pick(?:ed)?|sign(?:ed)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\-]+)*)\s+as\s+(?:a\s+)?replacement",
        r"sign\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\-]+)*)\s+as\s+(?:a\s+)?replacement",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, body, re.I):
            names.append(clean_display_name(match.group(1)))
    return [name for name in names if is_plausible_player_name(name)]


def collect_replaced_players(body: str) -> set[str]:
    replaced: set[str] = set()
    for match in re.finditer(
        r"replacement\s+for\s+(?:the\s+)?(?:injured\s+)?([A-Z][A-Za-z\s\-]+?)(?:\s+for|\s*,|\s+who|\s*$|\.)",
        body,
        re.I,
    ):
        replaced.add(norm_key(clean_display_name(match.group(1))))
    return replaced


def resolve_article_name(partial: str, article_names: list[str]) -> str:
    partial = clean_display_name(partial)
    if len(partial.split()) >= 2:
        return partial

    partial_lower = partial.lower()
    full_names: list[str] = []
    seen: set[str] = set()
    for name in article_names:
        if len(name.split()) < 2:
            continue
        key = norm_key(name)
        if key in seen:
            continue
        seen.add(key)
        full_names.append(name)

    prefix_matches = [
        name for name in full_names if name.lower().startswith(f"{partial_lower} ")
    ]
    if len(prefix_matches) == 1:
        return prefix_matches[0]

    surname_matches = [
        name for name in full_names if name.split()[-1].lower() == partial_lower
    ]
    if len(surname_matches) == 1:
        return surname_matches[0]

    exact_matches = [name for name in article_names if name.lower() == partial_lower]
    if len(exact_matches) == 1:
        return exact_matches[0]

    return partial


def parse_replacement_article(html: str, url: str) -> list[tuple[str, float]]:
    body = extract_news_body(html)
    body = re.sub(r"&nbsp;", " ", body)
    body = re.sub(r"<[^>]+>", "\n", body)
    body = re.sub(r"[ \t]+", " ", body)
    article_names = collect_article_player_names(body)
    replacement_targets = collect_replacement_targets(body)
    replaced_players = collect_replaced_players(body)

    join_fee_pattern = re.compile(
        r"(?:will join|joins)\s+"
        r"(?:[A-Z]{2,3}|[A-Za-z][A-Za-z\s]+?)\s+"
        r"for(?:\s+a\s+fee\s+of)?\s+INR\s*([\d.]+)\s*(Lakh|Lacs|Crore|Cr)\b",
        re.I,
    )
    name_patterns = [
        re.compile(
            r"(?:have\s+)?(?:pick(?:ed)?|sign(?:ed)?)\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+as",
            re.I,
        ),
        re.compile(r"([A-Z][A-Za-z\s\-]+?),\s+an?\s+", re.I),
        re.compile(r"([A-Z][A-Za-z\s\-]+?)\s+will replace", re.I),
        re.compile(
            r"named\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+as\s+(?:a\s+)?replacement",
            re.I,
        ),
    ]

    results: list[tuple[str, float]] = []
    paragraphs = [part.strip() for part in re.split(r"\n+|\.\s+", body) if part.strip()]

    for index, paragraph in enumerate(paragraphs):
        fee_match = join_fee_pattern.search(paragraph)
        if not fee_match:
            continue

        salary_cr = parse_inr_amount(f"{fee_match.group(1)} {fee_match.group(2)}")
        if salary_cr is None:
            continue

        name: str | None = None
        search_blocks = [paragraph]
        for offset in (1, 2, 3):
            if index >= offset:
                search_blocks.insert(0, paragraphs[index - offset])
        if index + 1 < len(paragraphs):
            search_blocks.append(paragraphs[index + 1])

        for block in search_blocks:
            for pattern in name_patterns:
                name_match = pattern.search(block)
                if name_match:
                    candidate = clean_display_name(name_match.group(1))
                    if len(candidate.split()) >= 1 and candidate.lower() not in {
                        "he",
                        "the",
                        "they",
                    }:
                        if norm_key(candidate) in replaced_players:
                            continue
                        name = candidate
                        break
            if name:
                break

        if not name and replacement_targets:
            for target in replacement_targets:
                if norm_key(target) not in replaced_players:
                    name = target
                    break

        if name:
            name = resolve_article_name(name, article_names + replacement_targets)
            results.append((name, salary_cr))

    # Single-player advisories: pair the headline signing with its fee directly.
    if not results:
        fees: list[float] = []
        for paragraph in paragraphs:
            fee_match = join_fee_pattern.search(paragraph)
            if fee_match:
                salary_cr = parse_inr_amount(f"{fee_match.group(1)} {fee_match.group(2)}")
                if salary_cr is not None:
                    fees.append(salary_cr)
        if len(replacement_targets) == 1 and len(fees) == 1:
            results.append((replacement_targets[0], fees[0]))

    # Headline fallback for single-player advisories.
    if not results:
        headline_match = re.search(
            r"(?:pick(?:ed)?|sign(?:ed)?)\s+([A-Za-z][A-Za-z\s\-\.]+?)\s+as\s+(?:a\s+)?replacement",
            body,
            re.I,
        )
        fee_match = re.search(
            r"He will join\s+[A-Za-z\s]+\s+for\s+(?:a fee of\s+)?INR\s*([\d.]+)\s*(Lakh|Lacs|Crore|Cr)\b",
            body,
            re.I,
        )
        if headline_match and fee_match:
            salary_cr = parse_inr_amount(f"{fee_match.group(1)} {fee_match.group(2)}")
            if salary_cr is not None:
                name = resolve_article_name(
                    clean_display_name(headline_match.group(1)),
                    article_names,
                )
                results.append((name, salary_cr))

    seen: set[str] = set()
    unique: list[tuple[str, float]] = []
    for name, salary_cr in results:
        key = norm_key(name)
        if key in seen:
            continue
        seen.add(key)
        unique.append((name, salary_cr))
    return unique


def discover_replacement_article_urls(session: requests.Session) -> list[str]:
    urls: set[str] = set()

    def add_from_html(html: str) -> None:
        for match in re.finditer(r"https://www\.iplt20\.com/news/\d+/[^\"'\s>]+", html):
            url = match.group(0).split("&")[0]
            slug = url.lower()
            if any(
                token in slug
                for token in (
                    "replacement",
                    "pick-",
                    "sign-",
                    "named-replacement",
                    "injury-replacement",
                    "replacements-for",
                )
            ):
                urls.add(url)

    for page in range(1, 8):
        page_url = ANNOUNCEMENTS_URL if page == 1 else f"{ANNOUNCEMENTS_URL}?page={page}"
        try:
            add_from_html(session.get(page_url, headers=HEADERS, timeout=30).text)
        except requests.RequestException:
            continue

    news_html = session.get("https://www.iplt20.com/news", headers=HEADERS, timeout=30).text
    add_from_html(news_html)
    for page in range(2, 6):
        try:
            add_from_html(
                session.get(
                    f"https://www.iplt20.com/news?page={page}",
                    headers=HEADERS,
                    timeout=30,
                ).text
            )
        except requests.RequestException:
            continue

    # Known official advisories that may fall off listing pages.
    urls.update(
        {
            "https://www.iplt20.com/news/4252/kkr-srh-pick-player-replacements-for-tata-ipl-2026",
            "https://www.iplt20.com/news/4291/sunrisers-hyderabad-pick-dilshan-madushanka-as-injury-replacement-for-brydon-carse",
        }
    )
    return sorted(urls)


def fetch_replacement_salaries(session: requests.Session) -> dict[str, SalaryRecord]:
    urls = discover_replacement_article_urls(session)

    records: dict[str, SalaryRecord] = {}
    for url in urls:
        article_html = session.get(url, headers=HEADERS, timeout=30).text
        for name, salary_cr in parse_replacement_article(article_html, url):
            key = norm_key(name)
            records[key] = SalaryRecord(
                salary_cr=salary_cr,
                salary_lakhs=cr_to_lakhs(salary_cr),
                source="iplt20_replacement_news",
                source_url=url,
                acquisition_type="replacement",
                matched_name=name,
            )
    return records


def merge_registries(*registries: dict[str, SalaryRecord]) -> dict[str, SalaryRecord]:
    merged: dict[str, SalaryRecord] = {}
    for registry in registries:
        for key, record in registry.items():
            existing = merged.get(key)
            if existing is None or SOURCE_PRIORITY[record.source] >= SOURCE_PRIORITY[existing.source]:
                merged[key] = record
    return merged


def build_official_salary_registry(session: requests.Session | None = None) -> dict[str, SalaryRecord]:
    session = session or requests.Session()

    pdf_bytes = session.get(RETENTION_PDF_URL, headers=HEADERS, timeout=60).content
    retention = parse_pdf_salaries(pdf_bytes)

    auction_html = session.get(AUCTION_DATA_URL, headers=HEADERS, timeout=30).json()["html"]
    auction = parse_auction_salaries(auction_html)

    replacements = fetch_replacement_salaries(session)

    return merge_registries(retention, auction, replacements)


def lookup_player_salary(
    registry: dict[str, SalaryRecord],
    name: str,
    slug: str,
) -> SalaryRecord | None:
    candidates = [
        norm_key(name),
        norm_key(slug.replace("-", " ")),
    ]
    for key in candidates:
        if key in registry:
            return registry[key]

    first = candidates[0][:4] if candidates[0] else ""
    last = name.split()[-1].lower() if name else ""

    for key, record in registry.items():
        if last and last in key and first and first in key:
            return record

    return None


def enrich_players_with_salaries(
    players: list[dict[str, Any]],
    session: requests.Session | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    registry = build_official_salary_registry(session=session)
    missing: list[dict[str, str]] = []

    for player in players:
        record = lookup_player_salary(registry, player["name"], player["slug"])
        if record is None:
            missing.append(
                {
                    "name": player["name"],
                    "slug": player["slug"],
                    "team_code": player.get("team_code", ""),
                    "client_player_id": player.get("client_player_id", ""),
                }
            )
            player["salary_cr"] = None
            player["salary_lakhs"] = None
            player["salary_display"] = None
            player["salary_source"] = None
            player["salary_source_url"] = None
            player["acquisition_type"] = None
            player["salary_matched_name"] = None
            continue

        player.update(record.as_dict())

    return players, missing


def enrich_players_file(
    players_path: Path,
    session: requests.Session | None = None,
) -> dict[str, Any]:
    payload = json.loads(players_path.read_text(encoding="utf-8"))
    players, missing = enrich_players_with_salaries(payload["players"], session=session)
    payload["players"] = players
    payload["salary_enriched_at"] = payload.get("scraped_at")
    payload["salary_sources"] = [
        "bcci_retention_pdf",
        "iplt20_auction",
        "iplt20_replacement_news",
    ]
    payload["salary_missing_count"] = len(missing)
    payload["salary_missing"] = missing

    players_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload

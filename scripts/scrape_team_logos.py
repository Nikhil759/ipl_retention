#!/usr/bin/env python3
"""Download IPL team logo images from iplt20.com squad pages."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (ReleaseOrRetain/1.0; +https://github.com/ipl-project)"}
SQUAD_URL = "https://www.iplt20.com/teams/{team_slug}/squad"

TEAMS: dict[str, str] = {
    "CSK": "chennai-super-kings",
    "DC": "delhi-capitals",
    "GT": "gujarat-titans",
    "KKR": "kolkata-knight-riders",
    "LSG": "lucknow-super-giants",
    "MI": "mumbai-indians",
    "PBKS": "punjab-kings",
    "RR": "rajasthan-royals",
    "RCB": "royal-challengers-bengaluru",
    "SRH": "sunrisers-hyderabad",
}

TEAM_NAMES: dict[str, str] = {
    "CSK": "Chennai Super Kings",
    "DC": "Delhi Capitals",
    "GT": "Gujarat Titans",
    "KKR": "Kolkata Knight Riders",
    "LSG": "Lucknow Super Giants",
    "MI": "Mumbai Indians",
    "PBKS": "Punjab Kings",
    "RR": "Rajasthan Royals",
    "RCB": "Royal Challengers Bengaluru",
    "SRH": "Sunrisers Hyderabad",
}

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LOGOS_DIR = DATA_DIR / "team-logos"
TEAMS_JSON = DATA_DIR / "teams.json"


def find_logo_url(html: str, team_code: str) -> str | None:
    pattern = re.compile(
        rf"https://documents\.iplt20\.com/ipl/{re.escape(team_code)}/[^\"'\s>]+\.(?:png|webp)",
        re.IGNORECASE,
    )
    matches = pattern.findall(html)
    if not matches:
        return None

    unique = list(dict.fromkeys(matches))
    for url in unique:
        lower = url.lower()
        if "outline" in lower or lower.endswith("_logo.png"):
            return url
    for url in unique:
        if "logo" in url.lower():
            return url
    return unique[0]


def download_logo(session: requests.Session, url: str, dest: Path, delay: float) -> bool:
    time.sleep(delay)
    response = session.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    dest.write_bytes(response.content)
    return True


def scrape_team_logos(
    team_filter: list[str] | None = None,
    delay: float = 0.4,
) -> dict:
    session = requests.Session()
    codes = team_filter or list(TEAMS.keys())
    teams: dict[str, dict] = {}
    errors: list[str] = []

    LOGOS_DIR.mkdir(parents=True, exist_ok=True)

    for team_code in codes:
        team_slug = TEAMS.get(team_code)
        if not team_slug:
            errors.append(f"Unknown team code: {team_code}")
            continue

        try:
            time.sleep(delay)
            response = session.get(
                SQUAD_URL.format(team_slug=team_slug),
                headers=HEADERS,
                timeout=30,
            )
            response.raise_for_status()
            logo_url = find_logo_url(response.text, team_code)
            if not logo_url:
                raise RuntimeError(f"No logo URL found for {team_code}")

            dest = LOGOS_DIR / f"{team_code}.png"
            download_logo(session, logo_url, dest, delay=0)

            teams[team_code] = {
                "code": team_code,
                "name": TEAM_NAMES[team_code],
                "slug": team_slug,
                "logo_url": logo_url,
                "logo_local": f"data/team-logos/{team_code}.png",
                "logo_downloaded": True,
            }
            print(f"  {team_code}: {logo_url}")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{team_code}: {exc}")
            print(f"  {team_code}: FAILED ({exc})", file=sys.stderr)

    return {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "iplt20.com",
        "team_count": len(teams),
        "teams": teams,
        "errors": errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape IPL team logos")
    parser.add_argument(
        "--teams",
        nargs="*",
        help="Team codes to scrape (default: all)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.4,
        help="Delay between requests in seconds",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=TEAMS_JSON,
        help=f"Output JSON path (default: {TEAMS_JSON})",
    )
    args = parser.parse_args()

    print("Scraping team logos...")
    payload = scrape_team_logos(team_filter=args.teams, delay=args.delay)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print()
    print(f"Done. Wrote {payload['team_count']} teams to {args.output}")
    if payload["errors"]:
        print(f"  Errors: {len(payload['errors'])}", file=sys.stderr)
        for error in payload["errors"]:
            print(f"    - {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

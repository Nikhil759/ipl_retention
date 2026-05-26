#!/usr/bin/env python3
"""Scrape IPL 2026 squad lists, season stats, and headshot images from iplt20.com."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from salary_sources import enrich_players_with_salaries
from validate_images import mark_image_validity

HEADERS = {"User-Agent": "Mozilla/5.0 (ReleaseOrRetain/1.0; +https://github.com/ipl-project)"}
SQUAD_URL = "https://www.iplt20.com/teams/{team_slug}/squad"
PROFILE_URL = "https://www.iplt20.com/players/{slug}/{client_id}"
STATS_URL = (
    "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com"
    "/ipl/feeds/stats/player/{client_id}-playerstats.js"
)
HEADSHOT_BASE = "https://documents.iplt20.com/ipl/IPLHeadshot2026/{player_id}.png?v=1.35"

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

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
IMAGES_DIR = DATA_DIR / "images"
PLAYERS_JSON = DATA_DIR / "players.json"


def parse_jsonp(text: str) -> dict[str, Any]:
    start = text.index("(") + 1
    end = text.rindex(")")
    return json.loads(text[start:end])


def slug_to_name(slug: str) -> str:
    return slug.replace("-", " ").title()


def to_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def infer_role(batting: dict[str, Any] | None, bowling: dict[str, Any] | None) -> str:
    bat_runs = to_int(batting.get("Runs") if batting else None) or 0
    bowl_wkts = to_int(bowling.get("Wickets") if bowling else None) or 0
    bat_innings = to_int(batting.get("Innings") if batting else None) or 0
    bowl_balls = to_int(bowling.get("Balls") if bowling else None) or 0

    if bat_runs > 0 and bowl_wkts > 0:
        return "all-rounder"
    if bowl_wkts > 0 or (bowl_balls > 0 and bat_runs == 0):
        return "bowler"
    if bat_innings > 0 or bat_runs > 0:
        return "batter"
    return "unknown"


def fetch_text(session: requests.Session, url: str, delay: float) -> str:
    time.sleep(delay)
    response = session.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return response.text


def get_squad_players(
    session: requests.Session, team_code: str, team_slug: str, delay: float
) -> list[tuple[str, str]]:
    html = fetch_text(session, SQUAD_URL.format(team_slug=team_slug), delay)
    players = re.findall(r"/players/([a-z0-9-]+)/(\d+)", html)
    if not players:
        raise RuntimeError(f"No players found for {team_code} ({team_slug})")
    return players


def get_stats(
    session: requests.Session, client_id: str, delay: float
) -> dict[str, Any] | None:
    try:
        text = fetch_text(session, STATS_URL.format(client_id=client_id), delay)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            return None
        raise
    return parse_jsonp(text)


def get_2026_row(stats: dict[str, Any], key: str) -> dict[str, Any] | None:
    for row in stats.get(key, []):
        if row.get("Year") == "2026":
            return row
    return None


def parse_name_from_profile(html: str) -> str | None:
    match = re.search(
        r"<meta[^>]+property=['\"]og:title['\"][^>]+content=['\"][^'\"]+\|\s*([^|'\"]+?)\s*Profile",
        html,
        re.I,
    )
    if match:
        return match.group(1).strip()
    return None


def get_profile_data(
    session: requests.Session, slug: str, client_id: str, delay: float
) -> tuple[str | None, str | None, str | None]:
    html = fetch_text(session, PROFILE_URL.format(slug=slug, client_id=client_id), delay)
    match = re.search(r"IPLHeadshot2026/(\d+)\.png", html)
    player_id = match.group(1) if match else None
    image_url = HEADSHOT_BASE.format(player_id=player_id) if player_id else None
    name = parse_name_from_profile(html)
    return player_id, image_url, name


def resolve_headshot(
    session: requests.Session,
    slug: str,
    client_id: str,
    batting: dict[str, Any] | None,
    bowling: dict[str, Any] | None,
    delay: float,
) -> tuple[str | None, str | None, str | None]:
    profile_player_id, image_url, profile_name = get_profile_data(
        session, slug, client_id, delay
    )
    if profile_player_id and image_url:
        return profile_player_id, image_url, profile_name

    for row in (batting, bowling):
        if row and row.get("PlayerId"):
            player_id = str(row["PlayerId"])
            return player_id, HEADSHOT_BASE.format(player_id=player_id), None
    return None, None, profile_name


def build_stats_block(
    batting: dict[str, Any] | None, bowling: dict[str, Any] | None
) -> dict[str, Any]:
    matches = to_int((batting or bowling or {}).get("Matches"))
    team_full = (batting or bowling or {}).get("TeamName")
    team_short = (batting or bowling or {}).get("TeamShortName")

    return {
        "matches": matches,
        "innings": to_int(batting.get("Innings") if batting else None),
        "runs": to_int(batting.get("Runs") if batting else None),
        "highest_score": batting.get("HighestScore") if batting else None,
        "batting_average": to_float(batting.get("BattingAvg") if batting else None),
        "strike_rate": to_float(batting.get("StrikeRate") if batting else None),
        "fours": to_int(batting.get("Fours") if batting else None),
        "sixes": to_int(batting.get("Sixes") if batting else None),
        "fifties": to_int(batting.get("Fifties") if batting else None),
        "hundreds": to_int(batting.get("Hundreds") if batting else None),
        "catches": to_int(batting.get("Catches") if batting else None),
        "stumpings": to_int(batting.get("Stumpings") if batting else None),
        "balls_bowled": to_int(bowling.get("Balls") if bowling else None),
        "runs_conceded": to_int(bowling.get("Runs") if bowling else None),
        "wickets": to_int(bowling.get("Wickets") if bowling else None),
        "best_bowling": bowling.get("BBM") if bowling else None,
        "bowling_average": to_float(bowling.get("Average") if bowling else None),
        "economy": to_float(bowling.get("Econ") if bowling else None),
        "bowling_strike_rate": to_float(bowling.get("StrikeRate") if bowling else None),
        "team_full": team_full,
        "team_short": team_short,
    }


def download_image(
    session: requests.Session, url: str, dest: Path, delay: float
) -> bool:
    time.sleep(delay)
    try:
        response = session.get(url, headers=HEADERS, timeout=30, stream=True)
        if response.status_code != 200:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=8192):
                handle.write(chunk)
        return True
    except requests.RequestException:
        return False


def scrape_player(
    session: requests.Session,
    team_code: str,
    slug: str,
    client_id: str,
    delay: float,
    download_images: bool,
) -> dict[str, Any]:
    stats = get_stats(session, client_id, delay)
    batting = get_2026_row(stats, "Batting") if stats else None
    bowling = get_2026_row(stats, "Bowling") if stats else None
    has_2026_stats = batting is not None or bowling is not None

    player_id, image_url, profile_name = resolve_headshot(
        session, slug, client_id, batting, bowling, delay
    )

    name = (
        (batting or bowling or {}).get("PlayerName")
        or profile_name
        or slug_to_name(slug)
    )
    role = infer_role(batting, bowling)
    stats_2026 = build_stats_block(batting, bowling) if has_2026_stats else None

    image_local: str | None = None
    image_downloaded = False
    if download_images and image_url:
        dest = IMAGES_DIR / f"{client_id}.png"
        image_downloaded = download_image(session, image_url, dest, delay)
        if image_downloaded:
            image_local = str(dest.relative_to(ROOT))

    return {
        "client_player_id": client_id,
        "player_id": player_id,
        "slug": slug,
        "name": name,
        "team_code": team_code,
        "team_full": stats_2026.get("team_full") if stats_2026 else None,
        "team_short": stats_2026.get("team_short") if stats_2026 else team_code,
        "role": role,
        "has_2026_stats": has_2026_stats,
        "stats_2026": stats_2026,
        "image_url": image_url,
        "image_local": image_local,
        "image_downloaded": image_downloaded,
        "profile_url": PROFILE_URL.format(slug=slug, client_id=client_id),
    }


def scrape_all(
    team_filter: list[str] | None,
    delay: float,
    download_images: bool,
) -> dict[str, Any]:
    session = requests.Session()
    selected = TEAMS
    if team_filter:
        unknown = [code for code in team_filter if code not in TEAMS]
        if unknown:
            raise SystemExit(f"Unknown team codes: {', '.join(unknown)}")
        selected = {code: TEAMS[code] for code in team_filter}

    players: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for team_code, team_slug in selected.items():
        print(f"Scraping {team_code} ({team_slug})...")
        try:
            squad = get_squad_players(session, team_code, team_slug, delay)
        except Exception as exc:  # noqa: BLE001
            errors.append({"team": team_code, "error": str(exc)})
            print(f"  Failed to load squad: {exc}", file=sys.stderr)
            continue

        print(f"  Found {len(squad)} players")
        for index, (slug, client_id) in enumerate(squad, start=1):
            print(f"  [{index}/{len(squad)}] {slug} ({client_id})")
            try:
                player = scrape_player(
                    session,
                    team_code,
                    slug,
                    client_id,
                    delay,
                    download_images,
                )
                players.append(player)
            except Exception as exc:  # noqa: BLE001
                errors.append(
                    {
                        "team": team_code,
                        "slug": slug,
                        "client_player_id": client_id,
                        "error": str(exc),
                    }
                )
                print(f"    Error: {exc}", file=sys.stderr)

    return {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "season": "2026",
        "source": "iplt20.com",
        "player_count": len(players),
        "teams": list(selected.keys()),
        "players": players,
        "errors": errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape IPL 2026 player data")
    parser.add_argument(
        "--teams",
        nargs="+",
        metavar="CODE",
        help="Team codes to scrape (e.g. CSK MI). Default: all teams.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Delay between HTTP requests in seconds (default: 0.25)",
    )
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Skip downloading headshot images",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PLAYERS_JSON,
        help=f"Output JSON path (default: {PLAYERS_JSON})",
    )
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not args.no_images:
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    payload = scrape_all(
        team_filter=args.teams,
        delay=args.delay,
        download_images=not args.no_images,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)

    players, salary_missing = enrich_players_with_salaries(
        payload["players"], session=requests.Session()
    )
    payload["players"] = players
    valid_images, invalid_images = mark_image_validity(payload["players"])
    payload["image_valid_count"] = valid_images
    payload["image_invalid_count"] = invalid_images
    payload["salary_sources"] = [
        "bcci_retention_pdf",
        "iplt20_auction",
        "iplt20_replacement_news",
    ]
    payload["salary_missing_count"] = len(salary_missing)
    payload["salary_missing"] = salary_missing

    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    downloaded = sum(1 for p in payload["players"] if p.get("image_downloaded"))
    with_stats = sum(1 for p in payload["players"] if p.get("has_2026_stats"))
    with_salary = sum(1 for p in payload["players"] if p.get("salary_cr") is not None)
    with_valid_image = sum(1 for p in payload["players"] if p.get("image_valid"))
    print()
    print(f"Done. Wrote {payload['player_count']} players to {args.output}")
    print(f"  With 2026 stats: {with_stats}")
    print(f"  Images downloaded: {downloaded}")
    print(f"  Valid headshots: {with_valid_image}/{payload['player_count']}")
    print(f"  Salaries matched: {with_salary}/{payload['player_count']}")
    if salary_missing:
        print(f"  Salary gaps: {len(salary_missing)}", file=sys.stderr)
        for player in salary_missing:
            print(
                f"    - {player['name']} ({player['team_code']})",
                file=sys.stderr,
            )
    if payload["errors"]:
        print(f"  Errors: {len(payload['errors'])}", file=sys.stderr)


if __name__ == "__main__":
    main()

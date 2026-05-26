#!/usr/bin/env python3
"""Attach verified IPL 2026 salaries to players.json from official BCCI/IPL sources."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

DEFAULT_PLAYERS_JSON = ROOT / "data" / "players.json"

from salary_sources import enrich_players_file  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enrich players.json with official IPL 2026 salaries"
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_PLAYERS_JSON,
        help=f"players.json path (default: {DEFAULT_PLAYERS_JSON})",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Missing input file: {args.input}")

    print("Fetching official salary data (BCCI PDF, IPL auction, IPL news)...")
    payload = enrich_players_file(args.input, session=requests.Session())

    with_salary = sum(1 for player in payload["players"] if player.get("salary_cr") is not None)
    missing = payload.get("salary_missing", [])

    print(f"Updated {args.input}")
    print(f"  Salaries matched: {with_salary}/{payload['player_count']}")

    if missing:
        print(f"  Missing salaries: {len(missing)}", file=sys.stderr)
        for player in missing:
            print(
                f"    - {player['name']} ({player['team_code']}, id={player['client_player_id']})",
                file=sys.stderr,
            )
        raise SystemExit(1)

    print("  All players have verified official salaries.")


if __name__ == "__main__":
    main()

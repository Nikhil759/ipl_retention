#!/usr/bin/env python3
"""Mark player headshots as valid/invalid based on duplicate image detection."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAYERS_JSON = ROOT / "data" / "players.json"
IMAGES_DIR = ROOT / "data" / "images"


def mark_image_validity(players: list[dict]) -> tuple[int, int]:
    """Return (valid_count, invalid_count). Lowest client_player_id wins duplicate groups."""
    hash_groups: dict[str, list[dict]] = defaultdict(list)

    for player in players:
        client_id = player.get("client_player_id")
        if not client_id:
            player["image_valid"] = False
            continue

        image_path = IMAGES_DIR / f"{client_id}.png"
        if not player.get("image_downloaded") or not image_path.exists():
            player["image_valid"] = False
            continue

        digest = hashlib.md5(image_path.read_bytes()).hexdigest()
        hash_groups[digest].append(player)

    valid = 0
    invalid = 0
    for group in hash_groups.values():
        group.sort(key=lambda row: int(row["client_player_id"]))
        for index, player in enumerate(group):
            is_valid = index == 0
            player["image_valid"] = is_valid
            if is_valid:
                valid += 1
            else:
                invalid += 1

    for player in players:
        if "image_valid" not in player:
            player["image_valid"] = False
            invalid += 1

    return valid, invalid


def main() -> None:
    payload = json.loads(PLAYERS_JSON.read_text(encoding="utf-8"))
    valid, invalid = mark_image_validity(payload["players"])
    PLAYERS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Updated {PLAYERS_JSON}")
    print(f"  Valid headshots: {valid}")
    print(f"  Silhouette fallback: {invalid}")


if __name__ == "__main__":
    main()

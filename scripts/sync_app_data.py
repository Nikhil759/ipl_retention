#!/usr/bin/env python3
"""Copy scraped player JSON and images into the Next.js app."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRAPED_JSON = ROOT / "data" / "players.json"
SCRAPED_IMAGES = ROOT / "data" / "images"
APP_DIR = ROOT / "release-or-retain"
APP_JSON = APP_DIR / "data" / "players.json"
APP_IMAGES = APP_DIR / "public" / "players"


def main() -> None:
    if not SCRAPED_JSON.exists():
        raise SystemExit(f"Missing scraped data: {SCRAPED_JSON}")

    APP_JSON.parent.mkdir(parents=True, exist_ok=True)
    APP_IMAGES.mkdir(parents=True, exist_ok=True)

    shutil.copy2(SCRAPED_JSON, APP_JSON)

    copied = 0
    for image in SCRAPED_IMAGES.glob("*.png"):
        dest = APP_IMAGES / image.name
        shutil.copy2(image, dest)
        copied += 1

    print(f"Synced {APP_JSON}")
    print(f"Copied {copied} images to {APP_IMAGES}")


if __name__ == "__main__":
    main()

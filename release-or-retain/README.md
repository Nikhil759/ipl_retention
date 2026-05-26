# Release or Retain

Swipe UI for IPL 2026 retain/release votes. Player data and images are loaded from the scraped dataset in `../data/`.

## Run locally

```bash
# From repo root — sync latest scrape into the app
python3 scripts/sync_app_data.py

# Start the app
cd release-or-retain
npm install
npm run dev
```

Open [http://localhost:3000/release-or-retain](http://localhost:3000/release-or-retain)

## Data flow

```
scripts/scrape_players.py  →  ../data/players.json + ../data/images/
scripts/sync_app_data.py   →  data/players.json + public/players/*.png
lib/map-players.ts         →  maps scraped JSON to UI Player type
```

After re-scraping, run `python3 scripts/sync_app_data.py` (or `npm run sync-data` from this folder).

## App structure

```
app/release-or-retain/page.tsx          Main page + team picker
components/release-or-retain/
  TeamPicker.tsx                        Choose a team (25 players each)
  SwipeGame.tsx                         Bumble-style swipe logic
  PlayerCard.tsx                        Player card UI
  ResultsScreen.tsx                     Post-swipe summary
lib/map-players.ts                      Scraped JSON → Player mapper
data/players.json                       Synced scraped data (252 players)
public/players/{id}.png                 Synced headshots
```

## Supabase votes

In `app/release-or-retain/page.tsx`, wire `handleVote` to your Supabase insert when ready.

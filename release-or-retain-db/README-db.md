# DB Setup Guide

## Step 1 — Supabase project

1. Go to https://supabase.com and create a new project.
2. Wait for it to provision (~1 min).

## Step 2 — Run the migration

1. Open **SQL Editor** in your Supabase dashboard.
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`.
3. Click **Run**. You should see no errors.

This creates:
- `players` table
- `sessions` table
- `votes` table (with unique constraint on session_id + player_id)
- `player_vote_summary` view (for community stats)
- `player-images` storage bucket (public)

## Step 3 — Environment variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Get your keys from: **Supabase Dashboard → Project Settings → API**

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon / public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (seed script only)

## Step 4 — Prepare your player data

1. Copy your JSON file to `scripts/players.json`.
   Make sure each player has an `imageFile` field with just the filename (e.g. `"virat-kohli.png"`).
   See `scripts/players.example.json` for the expected shape.

2. Put all your PNG files in `scripts/images/`.

## Step 5 — Run the seed script

```bash
# Install dependencies if you haven't
npm install @supabase/supabase-js tsx dotenv

# Run the seed
npx tsx scripts/seed-players.ts
```

This will:
- Upload each PNG to Supabase Storage → `player-images/players/`
- Insert each player row into the `players` table with the public image URL

You can re-run it safely — it uses `upsert` so nothing duplicates.

## Step 6 — Install Supabase SSR package

```bash
npm install @supabase/ssr
```

## Step 7 — Copy the app files

Drop these into your Next.js project:
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/session.ts
app/release-or-retain/page.tsx   ← replaces the previous version
```

## Step 8 — Verify

Run your dev server and open `/release-or-retain`.
Open the Supabase Table Editor — you should see rows appearing in `sessions` and `votes` as you swipe.

---

## How session deduplication works

1. On first load, a UUID is generated and stored in `localStorage` as `ror_session_id`.
2. A matching row is created in the `sessions` table.
3. Every swipe writes one row to `votes` with `(session_id, player_id)` — the unique constraint prevents double votes.
4. When all cards are done, `sessions.completed_at` is set.
5. On next visit, the app checks `completed_at` — if set, it shows results instead of the swipe UI.
6. If they cleared localStorage, a new session UUID is generated → new vote session.

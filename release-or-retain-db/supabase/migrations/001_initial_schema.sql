-- ─────────────────────────────────────────────
-- Release or Retain — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────


-- ── 1. PLAYERS ──────────────────────────────
create table public.players (
  id          integer primary key,
  name        text    not null,
  team        text    not null,
  team_code   text    not null,
  role        text    not null,
  age         integer not null,
  type        text    not null check (type in ('bat', 'bowl', 'all')),
  image_url   text    not null,
  stats       jsonb   not null default '{}',
  created_at  timestamptz not null default now()
);

-- Public can read players; nobody can write via the API
alter table public.players enable row level security;

create policy "Players are publicly readable"
  on public.players for select
  using (true);


-- ── 2. SESSIONS ─────────────────────────────
-- One row per device (UUID stored in localStorage)
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  completed_at timestamptz,                -- null = still in progress
  created_at   timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Anyone can create a session
create policy "Anyone can create a session"
  on public.sessions for insert
  with check (true);

-- Sessions are only readable by the owner (matched by id in the request)
-- We pass the session_id as a filter from the client, so this is fine open
create policy "Sessions are publicly readable"
  on public.sessions for select
  using (true);

-- Allow updating own session (to set completed_at)
create policy "Sessions can be updated"
  on public.sessions for update
  using (true);


-- ── 3. VOTES ────────────────────────────────
create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid        not null references public.sessions(id) on delete cascade,
  player_id   integer     not null references public.players(id)  on delete cascade,
  decision    text        not null check (decision in ('retain', 'release')),
  created_at  timestamptz not null default now(),

  -- One vote per player per session — prevents duplicate swipes
  unique (session_id, player_id)
);

alter table public.votes enable row level security;

-- Anyone can insert a vote
create policy "Anyone can vote"
  on public.votes for insert
  with check (true);

-- Votes are readable (needed for resume + community stats)
create policy "Votes are publicly readable"
  on public.votes for select
  using (true);


-- ── 4. COMMUNITY STATS VIEW ─────────────────
-- Pre-aggregated per-player retain/release counts.
-- Query this on the results screen instead of raw votes.
create or replace view public.player_vote_summary as
  select
    player_id,
    count(*) filter (where decision = 'retain')  as retain_count,
    count(*) filter (where decision = 'release') as release_count,
    count(*)                                      as total_votes,
    round(
      count(*) filter (where decision = 'retain')::numeric
      / nullif(count(*), 0) * 100
    , 1) as retain_pct
  from public.votes
  group by player_id;


-- ── 5. STORAGE BUCKET ───────────────────────
-- Run this separately OR create manually in:
-- Supabase Dashboard → Storage → New bucket
--
-- Name: player-images
-- Public: true  ← important, images are served publicly
insert into storage.buckets (id, name, public)
values ('player-images', 'player-images', true)
on conflict do nothing;

-- Public read policy on the bucket
create policy "Player images are public"
  on storage.objects for select
  using ( bucket_id = 'player-images' );

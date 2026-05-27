-- Release or Retain — votes + sessions only
-- Players/images live in the Next.js app (JSON + /public)
-- player_id = client_player_id from players.json

drop view if exists public.player_vote_summary;
drop table if exists public.votes cascade;
drop table if exists public.sessions cascade;
drop table if exists public.players cascade;

create table public.sessions (
  id           uuid primary key,
  team_code    text,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Anyone can create a session"
  on public.sessions for insert
  with check (true);

create policy "Sessions are publicly readable"
  on public.sessions for select
  using (true);

create policy "Sessions can be updated"
  on public.sessions for update
  using (true);

create table public.votes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid    not null references public.sessions(id) on delete cascade,
  player_id   integer not null,
  team_code   text    not null,
  decision    text    not null check (decision in ('retain', 'release')),
  created_at  timestamptz not null default now(),
  unique (session_id, player_id)
);

create index votes_player_id_idx on public.votes (player_id);
create index votes_team_code_idx on public.votes (team_code);

alter table public.votes enable row level security;

create policy "Anyone can vote"
  on public.votes for insert
  with check (true);

create policy "Votes are publicly readable"
  on public.votes for select
  using (true);

create policy "Votes can be updated"
  on public.votes for update
  using (true);

create or replace view public.player_vote_summary as
select
  player_id,
  team_code,
  count(*) filter (where decision = 'retain')  as retain_count,
  count(*) filter (where decision = 'release') as release_count,
  count(*)                                      as total_votes,
  round(
    count(*) filter (where decision = 'retain')::numeric
    / nullif(count(*), 0) * 100
  , 1) as retain_pct
from public.votes
group by player_id, team_code;

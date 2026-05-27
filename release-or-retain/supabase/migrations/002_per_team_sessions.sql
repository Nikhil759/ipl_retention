-- Per-team session completion (once per team per anonymous user)
-- Stats view counts only votes from completed sessions
--
-- Run this AFTER 001_votes_sessions.sql
-- Fixes: drops votes FK before changing sessions PK to (id, team_code)

drop view if exists public.player_vote_summary;

-- Clean up rows that can't participate in the composite key
delete from public.sessions where team_code is null;

-- Drop FK that references sessions(id) — blocks PK change
alter table public.votes
  drop constraint if exists votes_session_id_fkey;

-- Backfill session rows for every (session_id, team_code) pair in votes
insert into public.sessions (id, team_code, created_at)
select
  v.session_id,
  v.team_code,
  min(v.created_at)
from public.votes v
where not exists (
  select 1
  from public.sessions existing
  where existing.id = v.session_id
    and existing.team_code = v.team_code
)
group by v.session_id, v.team_code;

alter table public.sessions
  alter column team_code set not null;

alter table public.sessions
  drop constraint sessions_pkey;

alter table public.sessions
  add primary key (id, team_code);

alter table public.votes
  add constraint votes_session_team_fkey
  foreign key (session_id, team_code)
  references public.sessions (id, team_code)
  on delete cascade;

create or replace view public.player_vote_summary as
select
  v.player_id,
  v.team_code,
  count(*) filter (where v.decision = 'retain')  as retain_count,
  count(*) filter (where v.decision = 'release') as release_count,
  count(*)                                       as total_votes,
  round(
    count(*) filter (where v.decision = 'retain')::numeric
    / nullif(count(*), 0) * 100
  , 1) as retain_pct
from public.votes v
inner join public.sessions s
  on s.id = v.session_id and s.team_code = v.team_code
where s.completed_at is not null
group by v.player_id, v.team_code;

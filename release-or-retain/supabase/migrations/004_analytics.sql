-- Analytics: share events + page visits (admin dashboard reads via service role)

create table public.share_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  team_code   text not null,
  method      text not null check (method in ('native', 'copy')),
  created_at  timestamptz not null default now()
);

create index share_events_created_at_idx on public.share_events (created_at);
create index share_events_session_id_idx on public.share_events (session_id);

alter table public.share_events enable row level security;

create policy "Anyone can log a share event"
  on public.share_events for insert
  with check (true);

create table public.visits (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  path        text not null,
  created_at  timestamptz not null default now()
);

create index visits_created_at_idx on public.visits (created_at);
create index visits_session_id_idx on public.visits (session_id);

alter table public.visits enable row level security;

create policy "Anyone can log a visit"
  on public.visits for insert
  with check (true);

-- Aggregated stats for the private admin dashboard (service role only)
create or replace function public.admin_dashboard_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select id, team_code, completed_at
    from sessions
    where completed_at is not null
  ),
  super_fans as (
    select id
    from completed
    group by id
    having count(distinct team_code) >= 10
  ),
  team_counts as (
    select team_code, count(*)::int as count
    from completed
    group by team_code
    order by count desc
  ),
  share_counts as (
    select
      count(*)::int as total,
      count(*) filter (where method = 'native')::int as native,
      count(*) filter (where method = 'copy')::int as copy
    from share_events
  ),
  visit_counts as (
    select
      count(*)::int as total_views,
      count(distinct session_id)::int as distinct_visitors
    from visits
  ),
  daily as (
    select
      to_char(d, 'YYYY-MM-DD') as date,
      coalesce(v.views, 0)::int as views,
      coalesce(c.completions, 0)::int as completions
    from generate_series(current_date - interval '6 days', current_date, interval '1 day') as d
    left join (
      select date_trunc('day', created_at)::date as day, count(*)::int as views
      from visits
      group by 1
    ) v on v.day = d::date
    left join (
      select date_trunc('day', completed_at)::date as day, count(*)::int as completions
      from sessions
      where completed_at is not null
      group by 1
    ) c on c.day = d::date
    order by d
  )
  select json_build_object(
    'completed_squad_votes', (select count(*)::int from completed),
    'distinct_voters', (select count(distinct id)::int from completed),
    'super_fans', (select count(*)::int from super_fans),
    'total_shares', coalesce((select total from share_counts), 0),
    'shares_native', coalesce((select native from share_counts), 0),
    'shares_copy', coalesce((select copy from share_counts), 0),
    'total_page_views', coalesce((select total_views from visit_counts), 0),
    'distinct_visitors', coalesce((select distinct_visitors from visit_counts), 0),
    'completions_by_team', coalesce(
      (select json_agg(json_build_object('team_code', team_code, 'count', count)) from team_counts),
      '[]'::json
    ),
    'daily', coalesce(
      (select json_agg(json_build_object('date', date, 'views', views, 'completions', completions) order by date) from daily),
      '[]'::json
    )
  );
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to service_role;

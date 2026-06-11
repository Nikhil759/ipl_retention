-- Opaque share tokens for verdict links (session_id never exposed in public URLs)

create table public.share_links (
  token       text primary key,
  session_id  uuid not null,
  team_code   text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, team_code)
);

create index share_links_session_id_idx on public.share_links (session_id);

alter table public.share_links enable row level security;

create policy "Anyone can create share links"
  on public.share_links for insert
  with check (true);

-- No public SELECT — reads go through security definer RPCs below.

create or replace function public.generate_share_token()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.get_or_create_share_token(
  p_session_id uuid,
  p_team_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_attempts int := 0;
begin
  select token into v_token
  from share_links
  where session_id = p_session_id and team_code = p_team_code;

  if v_token is not null then
    return v_token;
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_token := generate_share_token();
    begin
      insert into share_links (token, session_id, team_code)
      values (v_token, p_session_id, p_team_code);
      return v_token;
    exception when unique_violation then
      if v_attempts > 12 then
        raise exception 'Could not generate unique share token';
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.get_shared_verdict(
  p_token text,
  p_team_code text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_completed timestamptz;
  v_display_name text;
  v_votes json;
  v_completed_teams int;
  v_super_fan boolean;
begin
  select session_id into v_session_id
  from share_links
  where token = p_token and team_code = p_team_code;

  if v_session_id is null then
    return null;
  end if;

  select completed_at into v_completed
  from sessions
  where id = v_session_id and team_code = p_team_code;

  if v_completed is null then
    return null;
  end if;

  select coalesce(
    (select display_name from session_profiles where session_id = v_session_id),
    'Anonymous fan'
  ) into v_display_name;

  select coalesce(
    json_agg(
      json_build_object('player_id', player_id, 'decision', decision)
      order by created_at
    ),
    '[]'::json
  )
  into v_votes
  from votes
  where session_id = v_session_id and team_code = p_team_code;

  if v_votes::text = '[]' then
    return null;
  end if;

  select count(distinct team_code)::int into v_completed_teams
  from sessions
  where id = v_session_id and completed_at is not null;

  v_super_fan := v_completed_teams >= 10;

  return json_build_object(
    'display_name', v_display_name,
    'votes', v_votes,
    'is_super_fan', v_super_fan
  );
end;
$$;

grant execute on function public.get_or_create_share_token(uuid, text) to anon, authenticated;
grant execute on function public.get_shared_verdict(text, text) to anon, authenticated;

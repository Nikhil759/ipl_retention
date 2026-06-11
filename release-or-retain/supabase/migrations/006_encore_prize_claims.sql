-- Encore superfan prize claims (₹200 coupon codes)

create table public.encore_prize_claims (
  session_id   uuid primary key,
  code         text not null,
  discount_inr int,
  message      text,
  claimed_at   timestamptz not null default now()
);

alter table public.encore_prize_claims enable row level security;

-- No public table access — reads/writes via security definer RPCs and edge functions.

create or replace function public.is_super_fan(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct team_code) >= 10
  from sessions
  where id = p_session_id
    and completed_at is not null;
$$;

create or replace function public.get_encore_prize(p_session_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row encore_prize_claims%rowtype;
begin
  if not public.is_super_fan(p_session_id) then
    return null;
  end if;

  select * into v_row
  from encore_prize_claims
  where session_id = p_session_id;

  if not found then
    return null;
  end if;

  return json_build_object(
    'code', v_row.code,
    'discount_inr', v_row.discount_inr,
    'message', v_row.message
  );
end;
$$;

grant execute on function public.is_super_fan(uuid) to anon, authenticated, service_role;
grant execute on function public.get_encore_prize(uuid) to anon, authenticated;

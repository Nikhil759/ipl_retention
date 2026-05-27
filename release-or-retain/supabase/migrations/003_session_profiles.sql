-- Optional display name for shareable verdict links (one per anonymous session)

create table public.session_profiles (
  session_id   uuid primary key,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.session_profiles enable row level security;

create policy "Anyone can read session profiles"
  on public.session_profiles for select
  using (true);

create policy "Anyone can create a session profile"
  on public.session_profiles for insert
  with check (true);

create policy "Anyone can update a session profile"
  on public.session_profiles for update
  using (true);

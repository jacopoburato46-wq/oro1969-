1) In public/config.js inserisci URL completo Supabase e anon key.
2) In Supabase SQL Editor esegui:

create table if not exists public.gold_entries (
  id bigint generated always as identity primary key,
  store text not null,
  grams numeric(10,2) not null check (grams > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.gold_state (
  id int primary key,
  last_reset_at timestamptz
);

insert into public.gold_state (id, last_reset_at)
values (1, null)
on conflict (id) do nothing;

alter table public.gold_entries enable row level security;
alter table public.gold_state enable row level security;

drop policy if exists "read entries" on public.gold_entries;
drop policy if exists "insert entries" on public.gold_entries;
drop policy if exists "read state" on public.gold_state;
drop policy if exists "insert state" on public.gold_state;
drop policy if exists "update state" on public.gold_state;

create policy "read entries" on public.gold_entries for select to anon using (true);
create policy "insert entries" on public.gold_entries for insert to anon with check (true);
create policy "read state" on public.gold_state for select to anon using (true);
create policy "insert state" on public.gold_state for insert to anon with check (true);
create policy "update state" on public.gold_state for update to anon using (true) with check (true);

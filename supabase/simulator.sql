-- One-row table: the latest investment game, the recommended stake,
-- and a summary of every candidate. Run once in the Supabase SQL Editor.

create table if not exists public.simulator_latest (
  id int primary key default 1,
  game jsonb not null,
  answer jsonb not null,
  candidates jsonb not null,
  updated_at timestamptz not null default now(),
  constraint simulator_latest_singleton check (id = 1)
);

alter table public.simulator_latest enable row level security;

create policy "anyone can read" on public.simulator_latest
  for select using (true);
create policy "anyone can insert" on public.simulator_latest
  for insert with check (true);
create policy "anyone can update" on public.simulator_latest
  for update using (true);

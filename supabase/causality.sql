-- One-row table: the latest causality probe (its story and facts), your
-- answer, and a summary of the data. Run once in the Supabase SQL Editor.

create table if not exists public.causality_latest (
  id int primary key default 1,
  probe jsonb not null,
  answer jsonb not null,
  summary jsonb not null,
  updated_at timestamptz not null default now(),
  constraint causality_latest_singleton check (id = 1)
);

alter table public.causality_latest enable row level security;

drop policy if exists "anyone can read" on public.causality_latest;
drop policy if exists "anyone can insert" on public.causality_latest;
drop policy if exists "anyone can update" on public.causality_latest;

create policy "anyone can read" on public.causality_latest
  for select using (true);
create policy "anyone can insert" on public.causality_latest
  for insert with check (true);
create policy "anyone can update" on public.causality_latest
  for update using (true);

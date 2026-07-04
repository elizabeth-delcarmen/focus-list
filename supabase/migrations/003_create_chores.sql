-- Focus List: chores table for recurring house chores
-- Run via Supabase migration or SQL Editor

create type chore_recurrence as enum (
  'weekly',
  'monthly',
  'quarterly',
  'biannual',
  'yearly'
);

create table if not exists chores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  room text,
  time_estimate_minutes integer not null default 30,
  recurrence_type chore_recurrence not null default 'weekly',
  day_of_week integer check (day_of_week >= 0 and day_of_week <= 6),
  last_completed_at timestamptz,
  next_due_at timestamptz not null default now(),
  actual_time_minutes integer,
  created_at timestamptz default now() not null
);

alter table chores enable row level security;

drop policy if exists "Users can manage their own chores" on chores;

create policy "Users can manage their own chores"
  on chores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Focus List: tasks table and RLS policies
-- Run this in the Supabase SQL Editor or via migration

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  estimate_minutes integer not null default 25,
  actual_minutes integer not null default 0,
  priority text check (priority in ('urgent', 'high', 'medium', 'low')) not null default 'medium',
  category text,
  status text check (status in ('todo', 'in_progress', 'done')) not null default 'todo',
  "order" integer not null default 0,
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  scheduled_date date default current_date not null
);

alter table tasks enable row level security;

drop policy if exists "Users can manage their own tasks" on tasks;

create policy "Users can manage their own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor)
-- Creates the user_data table with Row Level Security so each user
-- can only read/write their own row.

create table if not exists user_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  state   jsonb not null,
  updated_at timestamptz not null default now()
);

alter table user_data enable row level security;

-- Allow each authenticated user full access to their own row only
create policy "owner_all" on user_data
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

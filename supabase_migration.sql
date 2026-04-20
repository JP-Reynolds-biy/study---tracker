-- ============================================================
-- Step 1: Run this in Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists user_data (
  user_id uuid references auth.users(id) on delete cascade primary key,
  state   jsonb not null,
  updated_at timestamptz not null default now()
);

alter table user_data enable row level security;

create policy "owner_all" on user_data
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- Step 2: Create the exam-papers storage bucket
--   Dashboard → Storage → New bucket
--   Name: exam-papers
--   Public bucket: YES (so PDFs open without auth)
-- Then add these RLS policies via Dashboard → Storage → Policies
-- ============================================================

-- Allow authenticated users to upload into their own folder
create policy "upload own papers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exam-papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own papers
create policy "read own papers"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'exam-papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own papers
create policy "delete own papers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exam-papers' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

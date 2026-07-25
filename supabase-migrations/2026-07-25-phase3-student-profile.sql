-- Phase 3: student model — cross-lesson memory.
-- Run in the Supabase SQL editor.

alter table users add column if not exists student_profile jsonb;

-- lesson_analyses already exists in prod (created outside source control);
-- recorded here so a fresh environment gets it too.
create table if not exists lesson_analyses (
  user_id uuid not null references users(id) on delete cascade,
  lesson_number int not null,
  sentiment text,
  struggled_with text,
  what_clicked text,
  gaps_mentioned text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_number)
);

alter table lesson_analyses enable row level security;
do $$ begin
  create policy "deny_anon_lesson_analyses" on lesson_analyses for all using (false);
exception when duplicate_object then null;
end $$;

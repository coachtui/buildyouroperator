-- Phase 1: one session row per (user, lesson).
-- The chat route reads/writes sessions keyed on this pair with .single() and
-- upsert(onConflict: 'user_id,lesson_number') — duplicates break both.
-- Run in the Supabase SQL editor.

-- 1. Remove any duplicates, keeping the row with the longest conversation
--    (ties broken by most recent).
delete from lesson_sessions ls
using (
  select id,
         row_number() over (
           partition by user_id, lesson_number
           order by jsonb_array_length(messages) desc, created_at desc
         ) as rn
  from lesson_sessions
) ranked
where ls.id = ranked.id
  and ranked.rn > 1;

-- 2. Enforce uniqueness going forward.
alter table lesson_sessions
  add constraint lesson_sessions_user_lesson_key unique (user_id, lesson_number);

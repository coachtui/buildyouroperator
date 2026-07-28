-- Phase 5: mastery gating — per-session goal completion state.
-- Run in the Supabase SQL editor.
-- Shape: { "met": [1, 2] }  (sticky union of met goal ids)

alter table lesson_sessions add column if not exists goal_state jsonb;

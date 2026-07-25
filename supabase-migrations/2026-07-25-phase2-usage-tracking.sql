-- Phase 2: spend controls — per-user per-day usage tracking.
-- Run in the Supabase SQL editor.

create table if not exists chat_usage (
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  message_count int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);

alter table chat_usage enable row level security;
create policy "deny_anon_chat_usage" on chat_usage for all using (false);

-- Atomic increment, called by the chat route after each streamed turn.
create or replace function increment_chat_usage(
  p_user_id uuid,
  p_messages int,
  p_input_tokens bigint,
  p_output_tokens bigint
) returns void
language sql
security definer
set search_path = public
as $$
  insert into chat_usage (user_id, day, message_count, input_tokens, output_tokens)
  values (p_user_id, current_date, p_messages, p_input_tokens, p_output_tokens)
  on conflict (user_id, day) do update
    set message_count = chat_usage.message_count + excluded.message_count,
        input_tokens  = chat_usage.input_tokens  + excluded.input_tokens,
        output_tokens = chat_usage.output_tokens + excluded.output_tokens;
$$;

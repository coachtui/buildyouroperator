create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  tier text not null default 'recruit',
  token text,
  current_lesson int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lesson_number int not null,
  messages jsonb not null default '[]',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_number)
);

create index if not exists lesson_sessions_user_id_idx on lesson_sessions(user_id);

-- Per-user per-day usage (spend controls) — incremented by increment_chat_usage()
create table if not exists chat_usage (
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  message_count int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, day)
);

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

-- RLS: deny all anon key access; service_role bypasses RLS and is used server-side
alter table users enable row level security;
alter table lesson_sessions enable row level security;
alter table chat_usage enable row level security;

create policy "deny_anon_users" on users for all using (false);
create policy "deny_anon_sessions" on lesson_sessions for all using (false);
create policy "deny_anon_chat_usage" on chat_usage for all using (false);

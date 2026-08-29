create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  tier text not null default 'recruit',
  token text,
  current_lesson int not null default 1,
  student_profile jsonb,
  created_at timestamptz not null default now()
);

create table if not exists lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lesson_number int not null,
  messages jsonb not null default '[]',
  goal_state jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_number)
);

create index if not exists lesson_sessions_user_id_idx on lesson_sessions(user_id);

-- Per-lesson session analysis (sentiment, struggles, what clicked) — written by /api/analyze-lesson
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
alter table lesson_analyses enable row level security;

create policy "deny_anon_users" on users for all using (false);
create policy "deny_anon_sessions" on lesson_sessions for all using (false);
create policy "deny_anon_chat_usage" on chat_usage for all using (false);
create policy "deny_anon_lesson_analyses" on lesson_analyses for all using (false);

-- First-party page-view + funnel events — written by /api/track (service role only)
create table if not exists page_views (
  id bigint generated always as identity primary key,
  event text not null default 'pageview' check (char_length(event) <= 40),
  path text not null check (char_length(path) <= 200),
  referrer text check (char_length(referrer) <= 500),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  visitor_id text check (char_length(visitor_id) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on page_views (created_at);
create index if not exists page_views_visitor_id_idx on page_views (visitor_id);

alter table page_views enable row level security;
create policy "deny_anon_page_views" on page_views for all using (false);

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
  created_at timestamptz not null default now()
);

create index if not exists lesson_sessions_user_id_idx on lesson_sessions(user_id);

-- RLS: deny all anon key access; service_role bypasses RLS and is used server-side
alter table users enable row level security;
alter table lesson_sessions enable row level security;

create policy "deny_anon_users" on users for all using (false);
create policy "deny_anon_sessions" on lesson_sessions for all using (false);

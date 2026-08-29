-- First-party page-view + funnel event tracking (replaces third-party analytics).
-- Run in the Supabase SQL editor.
-- Written by /api/track (service role only). `event` is 'pageview' or 'signup';
-- `visitor_id` is a random client-generated id so visits and signups can be
-- joined into one funnel. No IP, no user agent, path never includes the query
-- string (magic-link tokens must never land here).

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

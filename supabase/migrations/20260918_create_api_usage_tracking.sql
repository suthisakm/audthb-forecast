-- Data Health: self-tracked daily request counts for rate-limited free-tier
-- APIs (starting with Alpha Vantage's 25 requests/day cap). This project hit
-- that cap silently mid-session once already (News Signals ingest returned 0
-- candidates with no visible reason) -- this table lets the UI show usage so
-- an empty News Signals card reads as "quota used up today", not "broken".
--
-- Already applied directly against the project via the Supabase MCP tool;
-- this file documents it, same convention as this repo's other migrations.

create table if not exists api_usage (
  provider text not null,
  usage_date date not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, usage_date)
);

create or replace function increment_api_usage(p_provider text, p_date date, p_count int)
returns void
language sql
as $$
  insert into api_usage (provider, usage_date, request_count, updated_at)
  values (p_provider, p_date, p_count, now())
  on conflict (provider, usage_date)
  do update set request_count = api_usage.request_count + excluded.request_count, updated_at = now();
$$;

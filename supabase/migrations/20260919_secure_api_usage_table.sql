-- Supabase's security linter flagged public.api_usage as RLS-disabled
-- (ERROR level) and increment_api_usage as having a mutable search_path
-- (WARN level). api_usage is only ever read/written via the service-role
-- client (lib/api-usage-data.ts, server-only), never via the public anon
-- key, so this closes both findings without changing app behavior.
--
-- Already applied directly against the project via the Supabase MCP tool;
-- this file documents it, same convention as this repo's other migrations.

-- Enable RLS with no policies, matching every other table in this schema
-- -- PostgREST denies anon/public access, the service role (which always
-- bypasses RLS) keeps working unchanged.
alter table public.api_usage enable row level security;

-- Pin the function's search_path so it can't be redirected by a
-- caller-controlled search_path.
create or replace function public.increment_api_usage(p_provider text, p_date date, p_count int)
returns void
language sql
set search_path = public, pg_temp
as $$
  insert into api_usage (provider, usage_date, request_count, updated_at)
  values (p_provider, p_date, p_count, now())
  on conflict (provider, usage_date)
  do update set request_count = api_usage.request_count + excluded.request_count, updated_at = now();
$$;

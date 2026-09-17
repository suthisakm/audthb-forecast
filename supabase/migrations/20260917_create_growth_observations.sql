-- Growth (IMF QNEA real GDP) observations.
-- Schema mirrors inflation_observations / labour_observations so the same
-- upsert-by-natural-key ingestion pattern applies.
create table if not exists public.growth_observations (
  id bigint generated always as identity primary key,
  country text not null,
  metric_code text not null,
  reference_period date not null,
  value numeric not null,
  unit text not null,
  frequency text not null,
  source text not null,
  source_series text,
  released_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  constraint growth_observations_natural_key unique (country, metric_code, reference_period)
);

create index if not exists growth_observations_country_metric_idx
  on public.growth_observations (country, metric_code, reference_period desc);

alter table public.growth_observations enable row level security;

-- Service role (used by API routes via SUPABASE_SERVICE_ROLE_KEY) bypasses RLS by default.
-- No public policies are added here, matching the other observation tables.

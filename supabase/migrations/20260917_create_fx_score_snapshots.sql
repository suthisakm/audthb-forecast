-- Immutable ledger of Core FX Score runs, one row per scheduled hourly
-- slot per model version. Feeds the future Forecast/Outcome/Evaluation
-- pipeline -- never updated in place once written.
create table if not exists public.fx_score_snapshots (
  id bigint generated always as identity primary key,

  -- Idempotency key: the scheduled slot this run belongs to (floored to
  -- the hour), not the wall-clock time it actually ran. Market timestamp
  -- alone is not enough because Macro can change on an unchanged price.
  run_slot timestamptz not null,
  model_version text not null,

  issued_at timestamptz not null default now(),

  symbol text not null default 'AUD/THB',
  market_timestamp timestamptz,
  rate numeric,
  source text,

  core_fx_score integer,
  core_bias text,
  available_core_weight numeric,

  -- Per-factor score/weight/freshness snapshot. JSONB because the model
  -- (thresholds, active factors, Gold monitor-only status, etc.) keeps
  -- changing -- a rigid column-per-factor schema would need a migration
  -- every time it does.
  components jsonb not null,

  created_at timestamptz not null default now(),

  constraint fx_score_snapshots_natural_key unique (run_slot, model_version)
);

create index if not exists fx_score_snapshots_run_slot_idx
  on public.fx_score_snapshots (run_slot desc);

alter table public.fx_score_snapshots enable row level security;

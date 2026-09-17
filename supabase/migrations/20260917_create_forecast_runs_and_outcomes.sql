-- Immutable Forecast predictions and their eventual outcomes.
-- Forecast never overwritten once written; Outcome inserted once,
-- only after a final determination (MATCHED or MISSING) is reached.

create table if not exists public.forecast_runs (
  id bigint generated always as identity primary key,

  -- Same run_slot as the fx_score_snapshots row this forecast was
  -- derived from ("ใช้ run เดียวกันผูก predicted direction/move/range").
  run_slot timestamptz not null,
  model_version text not null,
  forecast_version text not null,

  issued_at timestamptz not null default now(),

  horizon text not null default 'DAILY',
  horizon_hours integer not null default 24,
  target_time timestamptz not null,

  reference_rate numeric,
  core_fx_score integer,

  predicted_direction text not null,
  predicted_move_pct numeric not null,
  predicted_range_low_pct numeric not null,
  predicted_range_high_pct numeric not null,

  -- UNCALIBRATED until enough forecast_outcomes accumulate to validate
  -- the rule. Never claim accuracy that hasn't been measured.
  status text not null default 'UNCALIBRATED',
  methodology text,

  created_at timestamptz not null default now(),

  constraint forecast_runs_natural_key unique (run_slot, model_version, forecast_version)
);

create index if not exists forecast_runs_target_time_idx
  on public.forecast_runs (target_time);

alter table public.forecast_runs enable row level security;

create table if not exists public.forecast_outcomes (
  id bigint generated always as identity primary key,

  forecast_run_id bigint not null references public.forecast_runs(id),

  matched_at timestamptz not null default now(),
  target_time timestamptz not null,

  -- MATCHED or MISSING -- never PENDING as a stored row. A forecast
  -- whose target_time has passed with no outcome row yet IS pending;
  -- that's represented by absence, not a value that needs updating.
  status text not null,

  actual_rate numeric,
  actual_timestamp timestamptz,
  time_gap_minutes numeric,

  actual_move_pct numeric,
  direction_correct boolean,
  absolute_error_pct numeric,
  within_range boolean,

  created_at timestamptz not null default now(),

  constraint forecast_outcomes_natural_key unique (forecast_run_id)
);

alter table public.forecast_outcomes enable row level security;

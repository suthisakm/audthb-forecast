AUD/THB — Growth data (IMF GDP) status

Growth is no longer "scoring pending". lib/growth-data.ts computes a real
(EXPERIMENTAL) QoQ spread score from data stored in Supabase, and is
included in the Macro composite (macro-composite-data.ts) with weight 1
out of the 10-point Macro / Policy factor.

Data flow:
1. app/api/growth/route.ts fetches IMF QNEA (AUS/USA/THA real SA GDP),
   maps IMF country codes to AU/US/TH and quarter periods ("2026-Q2") to
   the first day of the quarter ("2026-04-01"), then upserts into the
   Supabase table growth_observations (unique on country, metric_code,
   reference_period). Protected by CRON_SECRET, same pattern as the
   other ingestion routes.
2. Supabase Cron job "update-growth-daily" calls /api/growth once a day
   (0 2 * * * UTC, 09:00 Thailand) — see
   supabase/migrations/20260917_schedule_growth_cron.sql. GDP only
   updates quarterly, so daily polling is enough to catch a new release
   without wasting invocations.
3. getGrowthData() (called by the dashboard on every page load, and by
   app/api/growth-status/route.ts) reads the latest rows per country
   from growth_observations instead of calling the IMF API live. This
   removed the old cache:no-store 30s IMF fetch that used to run on
   every dashboard refresh.

Status and limitations:
- Score status is EXPERIMENTAL: thresholds are not backtested.
- QoQ growth is not annualized; this is not a GDP-surprise-vs-consensus
  signal.
- Only compares matching quarters between countries; a quarter with no
  immediately preceding quarter is excluded (INSUFFICIENT_HISTORY /
  NON_CONSECUTIVE_QUARTERS).
- Freshness cutoff: a quarter older than 180 days past quarter-end, or a
  quarter that has not ended yet, is excluded from scoring
  (getGrowthFreshness in lib/growth-data.ts).
- Other GDP-adjacent indicators (PMI, retail sales, industrial
  production) are not connected.
- A Growth/IMF outage returns UNAVAILABLE with weight 0; it does not
  take down the other Macro components (Policy/Inflation/Labour).
- growth_observations currently holds the IMF response as returned,
  which in practice goes back to 1950/1959/2003 depending on the
  country (IMF did not honor the startPeriod=2023-Q1 filter on first
  ingest) — useful for future backtesting, not just the latest quarter.

Manual test (same shape the cron job calls):
Invoke-RestMethod -Uri 'https://audthb-forecast.vercel.app/api/growth-status' `
  -Headers @{ Authorization = 'Bearer <CRON_SECRET>' } | ConvertTo-Json -Depth 12

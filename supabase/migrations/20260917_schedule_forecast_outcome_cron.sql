-- =========================================================
-- 11. FORECAST OUTCOME MATCHING
--
-- Matches due forecast_runs (target_time <= now) against the
-- actual AUD/THB price and writes an immutable forecast_outcomes
-- row: MATCHED (price found close to target_time) or MISSING
-- (gave up after the grace period). A forecast whose target_time
-- has passed with no outcome row yet is pending -- represented by
-- absence, never a stored placeholder value.
--
-- HOURLY
--
-- :25 past every hour -- after :20 update-score-snapshot-hourly,
-- so this run never races the forecast it's trying to match.
-- =========================================================

select cron.schedule(

  'update-forecast-outcome-hourly',

  '25 * * * *',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/forecast-outcome',

    headers :=
      jsonb_build_object(

        'Authorization',

        'Bearer ' || (

          select decrypted_secret

          from vault.decrypted_secrets

          where name =
            'audthb_cron_secret'

          limit 1

        )

      ),

    timeout_milliseconds :=
      30000

  );
  $$

);

-- =========================================================
-- 10. FX SCORE SNAPSHOT
--
-- Immutable Core FX Score run history (fx_score_snapshots).
-- Feeds the future Forecast/Outcome/Evaluation pipeline.
--
-- HOURLY
--
-- :20 past every hour -- after the :15 commodity ingest, so
-- that hour's commodity data is already fresh when the
-- snapshot reads it.
-- =========================================================

select cron.schedule(

  'update-score-snapshot-hourly',

  '20 * * * *',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/score-snapshot',

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

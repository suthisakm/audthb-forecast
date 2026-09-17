-- =========================================================
-- 9. LABOUR / INFLATION / MACRO POLICY
--
-- labour_observations, inflation_observations,
-- macro_policy_snapshots + bot_policy_history all had rows
-- already (from an earlier manual/one-off ingest) but NO
-- pg_cron job existed to keep them refreshed -- confirmed by
-- querying cron.job directly (only jobid 16-23 existed before
-- this file, covering market/relative-market/commodity/
-- iron-ore/brent-daily/yields-daily/risk-hourly/growth-daily).
--
-- All three are monthly-or-slower data (ABS/BLS/BOT), so daily
-- weekday polling is enough to catch a new release.
-- =========================================================

select cron.schedule(

  'update-labour-daily',

  '45 0 * * 1-5',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/labour',

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

select cron.schedule(

  'update-inflation-daily',

  '15 1 * * 1-5',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/inflation',

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

select cron.schedule(

  'update-macro-policy-daily',

  '45 1 * * 1-5',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/macro-policy',

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

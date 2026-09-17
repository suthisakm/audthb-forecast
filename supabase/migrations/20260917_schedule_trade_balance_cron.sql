-- =========================================================
-- TRADE BALANCE (IMF BOP CURRENT ACCOUNT BALANCE, AU + TH)
--
-- BOP_CAB_USD (AUS/THA) -- monitor only, see lib/trade-balance-data.ts
--
-- QUARTERLY DATA -- NO NEED FOR FREQUENT POLLING
--
-- DAILY
--
-- 02:15 UTC (offset from the Growth cron at 02:00 to avoid both IMF
-- SDMX calls landing in the same minute)
-- 09:15 THAILAND
-- =========================================================

select cron.schedule(

  'update-trade-balance-daily',

  '15 2 * * *',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/trade-balance',

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

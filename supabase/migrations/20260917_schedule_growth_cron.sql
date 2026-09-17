-- =========================================================
-- 8. GROWTH (IMF GDP)
--
-- GDP_REAL_SA_XDC (AUS/USA/THA)
--
-- QUARTERLY DATA -- NO NEED FOR FREQUENT POLLING
--
-- DAILY
--
-- 02:00 UTC
-- 09:00 THAILAND
-- =========================================================

select cron.schedule(

  'update-growth-daily',

  '0 2 * * *',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/growth',

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

-- =========================================================
-- AI NEWS SENTIMENT (FED / TRUMP / RBA / BOT SPEECH & POLICY NEWS)
--
-- Alpha Vantage free tier caps at 25 requests/day and this route makes
-- 2 (FOREX:USD, FOREX:AUD) per run, so every 2 hours (12 runs/day = 24
-- AV requests/day) leaves headroom instead of running out mid-day.
--
-- EVERY 2 HOURS
-- =========================================================

select cron.schedule(

  'update-news-sentiment-2hourly',

  '10 */2 * * *',

  $$
  select net.http_get(

    url :=
      'https://audthb-forecast.vercel.app/api/news-sentiment',

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
      45000

  );
  $$

);

-- =========================================================
-- NEWS SIGNALS -- SWITCH FROM DAILY TO TWICE DAILY
--
-- User asked for news coverage updated twice a day, at 09:00 and 18:00
-- Bangkok time, instead of once at 11:00. Alpha Vantage cost check: 5
-- tickers x 2 runs/day = 10 requests/day, still well under the 25/day
-- free-tier cap (was 5/day at once-daily).
--
-- 02:00 UTC = 09:00 Bangkok, 11:00 UTC = 18:00 Bangkok.
--
-- Already applied directly against the project via the Supabase MCP tool;
-- this file documents it, same convention as this repo's other migrations.
-- =========================================================

select cron.unschedule('update-news-sentiment-daily');

select cron.schedule(

  'update-news-sentiment-twice-daily',

  '0 2,11 * * *',

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

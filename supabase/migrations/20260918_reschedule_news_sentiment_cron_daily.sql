-- =========================================================
-- AI NEWS SIGNALS -- SWITCH TO DAILY
--
-- User asked for AUD/USD/THB news coverage updated daily rather than
-- every 2 hours, and the ingest route now scans 3 tickers (added
-- FOREX:THB) with a broader keyword net -- daily is plenty of headroom
-- under Alpha Vantage's 25 requests/day free-tier cap either way.
--
-- 04:00 UTC = 11:00 Bangkok -- runs after the prior US trading session
-- (and any overnight Fed/Trump news) has fully landed.
-- =========================================================

select cron.unschedule('update-news-sentiment-2hourly');

select cron.schedule(

  'update-news-sentiment-daily',

  '0 4 * * *',

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

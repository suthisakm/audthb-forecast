-- Second, independent AUD/THB reference from Yahoo Finance's unofficial
-- chart endpoint, purely for display/comparison against the app's own
-- Twelve Data feed. Never feeds the Core FX Score. Same 10-min cadence
-- as the core AUD/THB feed (update-audthb-market-every-10-min) since
-- this exists to be eyeballed against it in near-real-time.
select cron.schedule(
  'update-yahoo-reference-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://audthb-forecast.vercel.app/api/yahoo-reference',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'audthb_cron_secret'
        limit 1
      )
    ),
    timeout_milliseconds := 30000
  );
  $$
);

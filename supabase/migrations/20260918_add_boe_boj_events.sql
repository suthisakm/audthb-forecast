-- Adds Bank of England and Bank of Japan rate decisions -- checked live
-- via web search on 2026-09-18, not from training-data assumption:
--   BOE: held Bank Rate at 3.75% on 2026-09-17, 12:00pm BST (6th
--        consecutive hold, 6-3 vote). https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate
--   BOJ: two-day meeting concluding 2026-09-18, policy statement around
--        midday Tokyo time with the Governor's press conference at
--        3:30pm JST -- outcome not yet known at seed time, so the event
--        name states the decision, not a result.
--        https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/index.htm
--
-- Neither GBP nor JPY drives AUD/THB directly the way Fed/RBA/BOT do,
-- but both are top-tier global central banks whose moves shift risk
-- sentiment and carry-trade flows broadly -- exactly the kind of thing
-- Event Risk (workflow G) and the News Signals card are meant to catch
-- that a AUD/USD/THB-only calendar would otherwise miss entirely.

insert into public.event_calendar
  (event_time, country, currency, event_name, category, importance, reference_period, source, source_url)
values
  ('2026-09-17 11:00:00+00', 'GB', 'GBP', 'BOE Rate Decision', 'POLICY_MEETING', 'HIGH', null, 'Bank of England', 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate'),
  ('2026-09-18 06:30:00+00', 'JP', 'JPY', 'BOJ Rate Decision', 'POLICY_MEETING', 'HIGH', null, 'Bank of Japan', 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/index.htm')

on conflict (event_time, country, event_name) do nothing;

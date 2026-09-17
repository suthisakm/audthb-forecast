-- Extends the hand-curated event_calendar (see 20260917_create_event_calendar.sql)
-- with the next batch of confirmed dates, checked live against each source's
-- official schedule page on 2026-09-17:
--   RBA:  https://www.rba.gov.au/schedules-events/board-meeting-schedules.html
--   FOMC: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
--   ABS:  https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia
--         https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia
--   BLS:  https://www.bls.gov/schedule/2026/{10,11,12}_sched.htm
--
-- RBA meeting dates are two-day; the decision is announced 2:30pm Sydney
-- time on the second day (same convention as the original seed). FOMC
-- decisions are 2:00pm ET on the second day. The Fed's own calendar states
-- "each meeting date is tentative until confirmed at the meeting immediately
-- preceding it" -- 2027 FOMC dates carry that caveat, noted in `notes`.
-- BOT has not published a full 2027 schedule yet (only two ambiguous
-- tentative dates with unclear meeting numbering) -- not seeded here to
-- avoid guessing; re-check https://www.bot.or.th/en/our-roles/monetary-policy/mpc-meeting.html
-- once BOT publishes the confirmed 2027 list.

insert into public.event_calendar
  (event_time, country, currency, event_name, category, importance, reference_period, source, source_url, notes)
values
  -- AU Labour Force, Australia -- released ~3 weeks after reference month, 11:30am AEDT (Sydney DST from 2026-10-04)
  ('2026-11-19 00:30:00+00', 'AU', 'AUD', 'Labour Force, Australia', 'EMPLOYMENT', 'HIGH', 'October 2026', 'ABS official release calendar', 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia', null),
  ('2026-12-17 00:30:00+00', 'AU', 'AUD', 'Labour Force, Australia', 'EMPLOYMENT', 'HIGH', 'November 2026', 'ABS official release calendar', 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia', null),
  ('2027-01-21 00:30:00+00', 'AU', 'AUD', 'Labour Force, Australia', 'EMPLOYMENT', 'HIGH', 'December 2026', 'ABS official release calendar', 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia', null),

  -- AU Consumer Price Index, Australia -- monthly series, 11:30am AEDT
  ('2026-10-28 00:30:00+00', 'AU', 'AUD', 'Consumer Price Index, Australia', 'CPI', 'HIGH', 'September 2026', 'ABS official release calendar', 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia', null),
  ('2026-11-25 00:30:00+00', 'AU', 'AUD', 'Consumer Price Index, Australia', 'CPI', 'HIGH', 'October 2026', 'ABS official release calendar', 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia', null),

  -- US Employment Situation -- 8:30am ET; Nov/Dec releases fall after US DST ends (2026-11-01), so EST (UTC-5)
  ('2026-11-06 13:30:00+00', 'US', 'USD', 'Employment Situation', 'EMPLOYMENT', 'HIGH', 'October 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/2026/11_sched.htm', null),
  ('2026-12-04 13:30:00+00', 'US', 'USD', 'Employment Situation', 'EMPLOYMENT', 'HIGH', 'November 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/2026/12_sched.htm', null),

  -- US Consumer Price Index -- 8:30am ET, EST (UTC-5)
  ('2026-11-10 13:30:00+00', 'US', 'USD', 'Consumer Price Index', 'CPI', 'HIGH', 'October 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/2026/11_sched.htm', null),
  ('2026-12-10 13:30:00+00', 'US', 'USD', 'Consumer Price Index', 'CPI', 'HIGH', 'November 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/2026/12_sched.htm', null),

  -- RBA Monetary Policy Board meetings 2027 -- decision 2:30pm Sydney time, 2nd day.
  -- AEDT (UTC+11) runs 2026-10-04 to 2027-04-04; AEST (UTC+10) the rest of the year.
  ('2027-02-09 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-03-23 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-05-04 04:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-06-22 04:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-08-10 04:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-09-28 04:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-11-02 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),
  ('2027-12-14 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2027 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html', null),

  -- FOMC meetings 2027 -- decision 2:00pm ET, 2nd day. Fed states these are
  -- tentative until confirmed at the immediately preceding meeting.
  -- EST (UTC-5) until 2027-03-14, EDT (UTC-4) 2027-03-14 to 2027-11-07, then EST.
  ('2027-01-27 19:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-03-17 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-04-28 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-06-09 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-07-28 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-09-15 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-10-27 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting'),
  ('2027-12-08 19:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2027 schedule (tentative per Fed disclaimer)', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', 'Tentative until confirmed at prior meeting')

on conflict (event_time, country, event_name) do nothing;

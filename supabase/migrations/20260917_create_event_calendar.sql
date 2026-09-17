-- Minimal, hand-curated calendar of high-impact scheduled events for
-- AUD/THB (RBA/Fed/BOT policy meetings, AU/US CPI and employment
-- releases). Not fed by a live API -- every real economic-calendar
-- provider checked (Finnhub, FMP) gates this behind a paid plan, and
-- ForexFactory has no official API (scraping it is a ToS/reliability
-- risk, not a foundation for a production cron job).
--
-- This is maintained by hand: seeded from each source's own official
-- schedule page, re-seeded periodically as those pages publish further
-- ahead. A date range with no rows here means "not yet seeded", not
-- "no news" -- don't let the UI imply otherwise.
create table if not exists public.event_calendar (
  id bigint generated always as identity primary key,

  event_time timestamptz not null,
  country text not null,
  currency text not null,

  event_name text not null,
  category text not null,       -- POLICY_MEETING | CPI | EMPLOYMENT | GDP | OTHER
  importance text not null,     -- HIGH | MEDIUM | LOW

  reference_period text,
  source text not null,
  source_url text,
  notes text,

  created_at timestamptz not null default now(),

  constraint event_calendar_natural_key unique (event_time, country, event_name)
);

create index if not exists event_calendar_event_time_idx
  on public.event_calendar (event_time);

alter table public.event_calendar enable row level security;

-- =========================================================
-- SEED DATA (as of 2026-09-17)
-- =========================================================

insert into public.event_calendar
  (event_time, country, currency, event_name, category, importance, reference_period, source, source_url)
values
  -- RBA Board meetings -- https://www.rba.gov.au/media-releases/2025/mr-25-02.html
  -- Announced 2:30pm Sydney time on the meeting's second day. Sep 29 is
  -- before AEDT starts (first Sun of Oct 2026); Nov 3 / Dec 8 are after.
  ('2026-09-29 04:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2026 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html'),
  ('2026-11-03 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2026 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html'),
  ('2026-12-08 03:30:00+00', 'AU', 'AUD', 'RBA Board Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'RBA official 2026 schedule', 'https://www.rba.gov.au/schedules-events/board-meeting-schedules.html'),

  -- FOMC meetings -- https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
  ('2026-10-28 18:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2026 schedule', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'),
  ('2026-12-09 19:00:00+00', 'US', 'USD', 'FOMC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Federal Reserve official 2026 schedule', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'),

  -- BOT MPC meetings -- https://www.bot.or.th/en/our-roles/monetary-policy/mpc-meeting.html
  -- Official page confirmed the DATE only, not the announcement hour --
  -- time below is a placeholder (14:00 Bangkok = 07:00 UTC), not verified.
  ('2026-10-28 07:00:00+00', 'TH', 'THB', 'BOT MPC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Bank of Thailand official 2026 schedule (date confirmed; time unverified placeholder)', 'https://www.bot.or.th/en/our-roles/monetary-policy/mpc-meeting.html'),
  ('2026-12-23 07:00:00+00', 'TH', 'THB', 'BOT MPC Meeting Decision', 'POLICY_MEETING', 'HIGH', null, 'Bank of Thailand official 2026 schedule (date confirmed; time unverified placeholder)', 'https://www.bot.or.th/en/our-roles/monetary-policy/mpc-meeting.html'),

  -- AU Labour Force / CPI -- https://www.abs.gov.au/release-calendar/future-releases
  ('2026-09-24 01:30:00+00', 'AU', 'AUD', 'Labour Force, Australia', 'EMPLOYMENT', 'HIGH', 'August 2026', 'ABS official release calendar', 'https://www.abs.gov.au/release-calendar/future-releases'),
  ('2026-09-30 01:30:00+00', 'AU', 'AUD', 'Consumer Price Index, Australia', 'CPI', 'HIGH', 'August 2026', 'ABS official release calendar', 'https://www.abs.gov.au/release-calendar/future-releases'),

  -- US Employment Situation / CPI -- https://www.bls.gov/schedule/news_release/
  ('2026-10-02 12:30:00+00', 'US', 'USD', 'Employment Situation', 'EMPLOYMENT', 'HIGH', 'September 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/news_release/'),
  ('2026-10-14 12:30:00+00', 'US', 'USD', 'Consumer Price Index', 'CPI', 'HIGH', 'September 2026', 'BLS official release schedule', 'https://www.bls.gov/schedule/news_release/')

on conflict (event_time, country, event_name) do nothing;

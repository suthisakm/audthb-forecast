-- AI-analyzed news/speech signals (Fed, Trump, RBA, BOT) -- workflow-adjacent
-- to Event Calendar (workflow G) but for *unscheduled* market-moving rhetoric
-- that a calendar of data releases can never capture. Monitor-only, same
-- precedent as Trade Balance / Gold: displayed and alerted on, but not part
-- of the Core FX Score until there's evidence it actually adds signal.
create table if not exists public.news_sentiment_signals (
  id bigint generated always as identity primary key,
  article_url text not null,
  source text not null,
  title text not null,
  summary text,
  published_at timestamptz not null,
  av_sentiment_score numeric,
  av_sentiment_label text,
  ai_direction text not null,
  ai_magnitude text not null,
  ai_tags text[] not null default '{}',
  ai_rationale text not null,
  ai_confidence numeric not null,
  first_seen_at timestamptz not null default now(),
  constraint news_sentiment_signals_article_url_key unique (article_url),
  constraint news_sentiment_signals_direction_check check (ai_direction in ('AUD_UP', 'AUD_DOWN', 'NEUTRAL')),
  constraint news_sentiment_signals_magnitude_check check (ai_magnitude in ('HIGH', 'MEDIUM', 'LOW'))
);

create index if not exists news_sentiment_signals_published_idx
  on public.news_sentiment_signals (published_at desc);

alter table public.news_sentiment_signals enable row level security;

-- Service role (used by API routes via SUPABASE_SERVICE_ROLE_KEY) bypasses RLS by default.
-- No public policies are added here, matching the other observation tables.

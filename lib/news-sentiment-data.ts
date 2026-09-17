import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

// AI News Signals -- monitor only, same precedent as Trade Balance/Gold
// (see lib/trade-balance-data.ts). Scheduled releases (Event Calendar,
// workflow G) tell you WHAT happened; a Fed chair's press-conference
// wording or an unscheduled Trump tariff post moves markets on the words
// alone, with no release on the calendar to warn you it's coming. This
// covers that gap by scoring the *content* of news/speech coverage
// instead of just its timing.

export type NewsDirection = "AUD_UP" | "AUD_DOWN" | "NEUTRAL";
export type NewsMagnitude = "HIGH" | "MEDIUM" | "LOW";

export type NewsSentimentSignal = {
  articleUrl: string;
  source: string;
  title: string;
  summary: string | null;
  publishedAt: string;
  aiDirection: NewsDirection;
  aiMagnitude: NewsMagnitude;
  aiTags: string[];
  aiRationale: string;
  aiConfidence: number;
};

type DbRow = {
  article_url: string;
  source: string;
  title: string;
  summary: string | null;
  published_at: string;
  ai_direction: string;
  ai_magnitude: string;
  ai_tags: string[];
  ai_rationale: string;
  ai_confidence: number | string;
};

function toSignal(row: DbRow): NewsSentimentSignal {
  return {
    articleUrl: row.article_url,
    source: row.source,
    title: row.title,
    summary: row.summary,
    publishedAt: row.published_at,
    aiDirection: row.ai_direction as NewsDirection,
    aiMagnitude: row.ai_magnitude as NewsMagnitude,
    aiTags: row.ai_tags ?? [],
    aiRationale: row.ai_rationale,
    aiConfidence: Number(row.ai_confidence),
  };
}

// Broad net over Fed/Trump/RBA/BOT-adjacent coverage. Alpha Vantage's own
// "topics=economy_monetary" tag is too loose to rely on alone (it tags
// most financial_markets/earnings stories too, see live check during
// build) -- this regex is the actual relevance filter, applied to
// title+summary of a ticker-scoped feed (FOREX:USD, FOREX:AUD).
export const NEWS_RELEVANCE_PATTERN =
  /\b(fed|federal reserve|fomc|powell|rate hike|rate cut|interest rate|trump|tariff|rba|reserve bank of australia|bank of thailand|thai baht)\b/i;

export async function getRecentNewsSignals(limit = 8): Promise<{
  signals: NewsSentimentSignal[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("news_sentiment_signals")
      .select(
        "article_url,source,title,summary,published_at,ai_direction,ai_magnitude,ai_tags,ai_rationale,ai_confidence",
      )
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`News sentiment DB error: ${error.message}`);

    return { signals: ((data ?? []) as DbRow[]).map(toSignal), error: null };
  } catch (error) {
    return {
      signals: [],
      error: error instanceof Error ? error.message : "News sentiment fetch failed",
    };
  }
}

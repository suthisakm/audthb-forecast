import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { NEWS_RELEVANCE_PATTERN, type NewsDirection, type NewsMagnitude } from "@/lib/news-sentiment-data";

// =========================================================
// TYPES
// =========================================================

type AvFeedItem = {
  title: string;
  url: string;
  time_published: string;
  summary: string;
  source: string;
  overall_sentiment_score: number;
  overall_sentiment_label: string;
};

type CandidateArticle = {
  articleUrl: string;
  source: string;
  title: string;
  summary: string;
  publishedAt: string;
  avSentimentScore: number | null;
  avSentimentLabel: string | null;
};

type AiClassification = {
  direction: NewsDirection;
  magnitude: NewsMagnitude;
  tags: string[];
  rationale: string;
  confidence: number;
};

// Cap Gemini calls per run -- both to stay well inside the free-tier rate
// limit and because a 2-hourly cron doesn't need to process more than a
// handful of genuinely new Fed/Trump/RBA/BOT articles at once.
const MAX_ARTICLES_PER_RUN = 8;

// Alpha Vantage free tier is 25 requests/day total; only look back far
// enough that a 2-hourly cron doesn't re-scan days of history every run.
const LOOKBACK_HOURS = 30;

// =========================================================
// ALPHA VANTAGE
// =========================================================

function parseAvTimestamp(raw: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(raw);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

async function fetchAvNews(ticker: string): Promise<AvFeedItem[]> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(ticker)}&limit=50&sort=LATEST&apikey=${key}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`);

  const body = await response.json();
  if (body.Information || body.Note) {
    // Rate-limited or misconfigured -- not a hard failure worth 500ing the
    // whole run over, since the other ticker's fetch may still succeed.
    console.warn(`Alpha Vantage returned no feed for ${ticker}: ${body.Information ?? body.Note}`);
    return [];
  }

  return Array.isArray(body.feed) ? body.feed : [];
}

function dedupeAndFilter(feeds: AvFeedItem[][]): CandidateArticle[] {
  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
  const byUrl = new Map<string, CandidateArticle>();

  for (const feed of feeds) {
    for (const item of feed) {
      if (byUrl.has(item.url)) continue;

      const haystack = `${item.title} ${item.summary}`;
      if (!NEWS_RELEVANCE_PATTERN.test(haystack)) continue;

      const publishedAt = parseAvTimestamp(item.time_published);
      if (!publishedAt || new Date(publishedAt).getTime() < cutoff) continue;

      byUrl.set(item.url, {
        articleUrl: item.url,
        source: item.source,
        title: item.title,
        summary: item.summary,
        publishedAt,
        avSentimentScore: Number.isFinite(item.overall_sentiment_score) ? item.overall_sentiment_score : null,
        avSentimentLabel: item.overall_sentiment_label ?? null,
      });
    }
  }

  return [...byUrl.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

// =========================================================
// GEMINI CLASSIFICATION
// =========================================================

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    direction: { type: "STRING", enum: ["AUD_UP", "AUD_DOWN", "NEUTRAL"] },
    magnitude: { type: "STRING", enum: ["HIGH", "MEDIUM", "LOW"] },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    rationale: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: ["direction", "magnitude", "tags", "rationale", "confidence"],
};

function buildPrompt(article: CandidateArticle): string {
  return `You classify news/speech coverage for an AUD/THB exchange-rate monitoring dashboard.
AUD/THB moves are dominated by the AUD side (Thailand rarely makes its own currency-moving headlines in global feeds), so read this article for its likely near-term (hours-to-days) impact on AUD strength.

Article:
Source: ${article.source}
Published: ${article.publishedAt}
Title: ${article.title}
Summary: ${article.summary}

Return:
- direction: AUD_UP if this plausibly strengthens AUD (e.g. hawkish RBA/Fed-driven risk-on, commodity-positive), AUD_DOWN if it plausibly weakens AUD (e.g. dovish RBA, hawkish Fed pulling USD up broadly, tariff/trade-war escalation hurting risk sentiment or Australian exports), NEUTRAL if there's no clear directional read.
- magnitude: HIGH/MEDIUM/LOW expected size of impact, not your confidence.
- tags: short controlled tags from this set where applicable: FED, RBA, BOT, TRUMP, TARIFF, RATE_HIKE, RATE_CUT, RISK_ON, RISK_OFF, TRADE_POLICY, OTHER.
- rationale: one plain sentence (under 200 characters) explaining the read.
- confidence: 0 to 1, how confident you are in this classification given the article alone.`;
}

async function classifyWithGemini(article: CandidateArticle): Promise<AiClassification | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(article) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!response.ok) {
    console.warn(`Gemini HTTP ${response.status} for "${article.title}"`);
    return null;
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return null;

  try {
    const parsed = JSON.parse(text);
    if (
      !["AUD_UP", "AUD_DOWN", "NEUTRAL"].includes(parsed.direction) ||
      !["HIGH", "MEDIUM", "LOW"].includes(parsed.magnitude) ||
      typeof parsed.rationale !== "string" ||
      typeof parsed.confidence !== "number"
    ) {
      return null;
    }

    return {
      direction: parsed.direction,
      magnitude: parsed.magnitude,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === "string") : [],
      rationale: parsed.rationale.slice(0, 300),
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
    };
  } catch {
    console.warn(`Gemini returned unparseable JSON for "${article.title}": ${text}`);
    return null;
  }
}

// =========================================================
// MAIN
// =========================================================

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [usdFeed, audFeed] = await Promise.all([fetchAvNews("FOREX:USD"), fetchAvNews("FOREX:AUD")]);
    const candidates = dedupeAndFilter([usdFeed, audFeed]);

    if (candidates.length === 0) {
      return NextResponse.json({ updated: true, candidates: 0, classified: 0, skipped: 0 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("news_sentiment_signals")
      .select("article_url")
      .in(
        "article_url",
        candidates.map((c) => c.articleUrl),
      );

    if (existingError) throw new Error(`News sentiment DB error: ${existingError.message}`);

    const existingUrls = new Set((existing ?? []).map((row) => row.article_url as string));
    const newArticles = candidates.filter((c) => !existingUrls.has(c.articleUrl)).slice(0, MAX_ARTICLES_PER_RUN);

    const rows: Array<{
      article_url: string;
      source: string;
      title: string;
      summary: string;
      published_at: string;
      av_sentiment_score: number | null;
      av_sentiment_label: string | null;
      ai_direction: string;
      ai_magnitude: string;
      ai_tags: string[];
      ai_rationale: string;
      ai_confidence: number;
    }> = [];

    for (const article of newArticles) {
      const classification = await classifyWithGemini(article);
      if (!classification) continue;

      rows.push({
        article_url: article.articleUrl,
        source: article.source,
        title: article.title,
        summary: article.summary,
        published_at: article.publishedAt,
        av_sentiment_score: article.avSentimentScore,
        av_sentiment_label: article.avSentimentLabel,
        ai_direction: classification.direction,
        ai_magnitude: classification.magnitude,
        ai_tags: classification.tags,
        ai_rationale: classification.rationale,
        ai_confidence: classification.confidence,
      });
    }

    let saved = 0;
    if (rows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("news_sentiment_signals")
        .upsert(rows, { onConflict: "article_url", ignoreDuplicates: false });
      if (upsertError) throw new Error(`News sentiment upsert error: ${upsertError.message}`);
      saved = rows.length;
    }

    return NextResponse.json({
      updated: true,
      candidates: candidates.length,
      newArticles: newArticles.length,
      classified: saved,
      skippedAlreadySeen: candidates.length - newArticles.length,
      skippedClassificationFailed: newArticles.length - rows.length,
    });
  } catch (error) {
    console.error("News sentiment ingestion error:", error);
    return NextResponse.json(
      {
        updated: false,
        error: "News sentiment update failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

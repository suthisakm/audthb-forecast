import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

export type HistoryPoint = {
  issuedAt: string;
  coreFxScore: number | null;
  rate: number | null;
};

export type ScoreHistory = {
  points: HistoryPoint[];
  error: string | null;
};

const LOOKBACK_DAYS = 7;

// Workflow I: a multi-day view of Core FX Score and AUD/THB rate, built
// from the same fx_score_snapshots the Daily Recap already reads
// (workflow B) -- no new table, just a longer lookback window than
// "today".
export async function getScoreHistory(): Promise<ScoreHistory> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("fx_score_snapshots")
    .select("issued_at, core_fx_score, rate")
    .gte("issued_at", since.toISOString())
    .order("issued_at", { ascending: true });

  if (error) {
    return { points: [], error: `Score history query failed: ${error.message}` };
  }

  type Row = { issued_at: string; core_fx_score: number | null; rate: number | string | null };

  const points = ((data ?? []) as Row[]).map((row) => ({
    issuedAt: row.issued_at,
    coreFxScore: row.core_fx_score,
    rate: row.rate !== null ? Number(row.rate) : null,
  }));

  return { points, error: null };
}

import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

// Workflow I: today's Core FX Score history at a glance, built from
// fx_score_snapshots (workflow B) -- no new table needed. Bangkok
// calendar-day boundaries, same convention as lib/event-calendar-data.ts.

export type RecapPoint = {
  issuedAt: string;
  coreFxScore: number;
  rate: number;
};

export type DailyRecap = {
  points: RecapPoint[];
  sampleSize: number;
  latestScore: number | null;
  openScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  minRate: number | null;
  maxRate: number | null;
  openRate: number | null;
  latestRate: number | null;
  biasCounts: Record<string, number>;
  error: string | null;
};

type SnapshotRow = {
  issued_at: string;
  core_fx_score: number | null;
  rate: number | string;
  core_bias: string | null;
};

function emptyRecap(error: string | null = null): DailyRecap {
  return {
    points: [],
    sampleSize: 0,
    latestScore: null,
    openScore: null,
    minScore: null,
    maxScore: null,
    minRate: null,
    maxRate: null,
    openRate: null,
    latestRate: null,
    biasCounts: {},
    error,
  };
}

export async function getDailyRecap(): Promise<DailyRecap> {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset);
  const startOfTodayBangkok =
    Date.UTC(
      bangkokNow.getUTCFullYear(),
      bangkokNow.getUTCMonth(),
      bangkokNow.getUTCDate(),
      0, 0, 0,
    ) - bangkokOffset;

  const { data, error } = await supabaseAdmin
    .from("fx_score_snapshots")
    .select("issued_at, core_fx_score, rate, core_bias")
    .gte("issued_at", new Date(startOfTodayBangkok).toISOString())
    .order("issued_at", { ascending: true });

  if (error) {
    return emptyRecap(`Daily recap query failed: ${error.message}`);
  }

  const rows = (data ?? []) as SnapshotRow[];
  const scored = rows.filter((row) => row.core_fx_score !== null);

  if (scored.length === 0) {
    return emptyRecap(null);
  }

  const points: RecapPoint[] = scored.map((row) => ({
    issuedAt: row.issued_at,
    coreFxScore: row.core_fx_score as number,
    rate: Number(row.rate),
  }));

  const scores = points.map((p) => p.coreFxScore);
  const rates = points.map((p) => p.rate).filter((r) => Number.isFinite(r));

  const biasCounts: Record<string, number> = {};
  for (const row of scored) {
    const bias = row.core_bias ?? "Unknown";
    biasCounts[bias] = (biasCounts[bias] ?? 0) + 1;
  }

  return {
    points,
    sampleSize: points.length,
    latestScore: scores.at(-1) ?? null,
    openScore: scores.at(0) ?? null,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    minRate: rates.length > 0 ? Math.min(...rates) : null,
    maxRate: rates.length > 0 ? Math.max(...rates) : null,
    openRate: rates.at(0) ?? null,
    latestRate: rates.at(-1) ?? null,
    biasCounts,
    error: null,
  };
}

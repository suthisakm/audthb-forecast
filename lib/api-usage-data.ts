import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

export type ApiUsage = {
  provider: string;
  used: number;
  limit: number;
};

// Free-tier daily caps for providers this app self-tracks (the provider
// itself doesn't expose a "quota remaining" endpoint on the free tier).
const DAILY_LIMITS: Record<string, number> = {
  alpha_vantage: 25,
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Called from an ingest route right after making N requests to a
// rate-limited provider. Best-effort -- a failure to record usage should
// never fail the ingest run itself, so this only warns.
export async function incrementApiUsage(provider: string, count: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc("increment_api_usage", {
    p_provider: provider,
    p_date: todayUtc(),
    p_count: count,
  });

  if (error) {
    console.warn(`Failed to record API usage for ${provider}: ${error.message}`);
  }
}

export async function getApiUsageToday(provider: string): Promise<ApiUsage> {
  const { data } = await supabaseAdmin
    .from("api_usage")
    .select("request_count")
    .eq("provider", provider)
    .eq("usage_date", todayUtc())
    .maybeSingle();

  return {
    provider,
    used: data?.request_count ?? 0,
    limit: DAILY_LIMITS[provider] ?? 0,
  };
}

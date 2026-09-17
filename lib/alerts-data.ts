import "server-only";
import type { DashboardData, FreshnessStatus } from "@/lib/dashboard-data";
import { getMacroCompositeData } from "@/lib/macro-composite-data";

// Surfaces "is a feed/job actually working right now" alerts, distinct
// from DataHealth (which only covers the 3 core FX rates). There is no
// dedicated cron-execution-log table in the schema, so staleness/missing
// data is used as the practical proxy for a failed ingest job -- if a
// feed hasn't updated in longer than its normal cadence, either the
// provider or the Supabase Cron job behind it is not working.

export type AlertSeverity = "critical" | "warning";

export type Alert = {
  severity: AlertSeverity;
  label: string;
  detail: string;
};

function freshnessAlert(
  label: string,
  status: FreshnessStatus | "FRESH" | "DELAYED" | "STALE" | "MISSING",
  ageValue: number | null,
  unit: "min" | "hr" = "min",
): Alert | null {
  if (status === "MISSING") {
    return {
      severity: "critical",
      label,
      detail: "No data returned at all -- the feed or its ingest job is not producing rows.",
    };
  }

  if (status === "STALE") {
    const age = ageValue !== null ? `${ageValue} ${unit} old` : "age unknown";
    return {
      severity: "warning",
      label,
      detail: `Data is stale (${age}) -- ingest cron may have failed, or the provider stopped responding.`,
    };
  }

  return null;
}

export async function getAlerts(data: DashboardData): Promise<Alert[]> {
  const candidates: Array<Alert | null> = [
    freshnessAlert("AUD/THB direct", data.directFreshness.status, data.directFreshness.ageMinutes),
    freshnessAlert("AUD/USD", data.audUsdFreshness.status, data.audUsdFreshness.ageMinutes),
    freshnessAlert("USD/THB", data.usdThbFreshness.status, data.usdThbFreshness.ageMinutes),
    freshnessAlert("USD/CNH", data.usdCnhFreshness.status, data.usdCnhFreshness.ageMinutes),
    freshnessAlert("USD/SGD", data.usdSgdFreshness.status, data.usdSgdFreshness.ageMinutes),

    freshnessAlert("Gold", data.goldFreshness, data.goldAgeMinutes),
    freshnessAlert("Brent (live)", data.brentLiveFreshness, data.brentLiveAgeMinutes),
    freshnessAlert("Iron Ore", data.ironOreFreshness, data.ironOreAgeHours, "hr"),
  ];

  // MARKET_CLOSED is an expected state for Risk/VIXY outside market hours -- not an alert.
  if (data.riskFreshness !== "MARKET_CLOSED") {
    candidates.push(freshnessAlert("Risk / VIXY", data.riskFreshness, data.riskAgeMinutes));
  }

  if (data.yieldConfidence === "STALE" || data.yieldConfidence === "MISSING") {
    candidates.push({
      severity: data.yieldConfidence === "MISSING" ? "critical" : "warning",
      label: "AU-US 2Y Yield",
      detail: `Yield spread data is ${data.yieldConfidence.toLowerCase()} (gap: ${data.yieldDataGapDays ?? "unknown"} days) -- DBnomics sync may have failed.`,
    });
  }

  // Each Macro sub-component fails independently by design (see fix
  // 24b5362) -- a component at 0 coverage means it silently dropped out
  // of this run's Macro Score rather than the whole category failing.
  const macro = await getMacroCompositeData();
  const macroChecks: Array<{ label: string; coverage: number }> = [
    { label: "Macro: Policy (RBA/Fed/BOT)", coverage: macro.policy.coverage },
    { label: "Macro: Inflation", coverage: macro.inflation.coverage },
    { label: "Macro: Labour", coverage: macro.labour.coverage },
    { label: "Macro: Growth (GDP, experimental)", coverage: macro.growth.coverage },
  ];

  for (const check of macroChecks) {
    if (check.coverage === 0) {
      candidates.push({
        severity: "warning",
        label: check.label,
        detail: "No usable data this run -- excluded from Macro Score, other Macro components unaffected.",
      });
    }
  }

  return candidates.filter((alert): alert is Alert => alert !== null);
}

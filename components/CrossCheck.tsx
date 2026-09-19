import type { DashboardData, FreshnessInfo } from "@/lib/dashboard-data";
import { getYahooReference } from "@/lib/yahoo-reference-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import InfoTip from "@/components/InfoTip";
import StatusLight from "@/components/StatusLight";
import SevenSegmentValue from "@/components/SevenSegmentValue";

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const FRESHNESS_TONE: Record<FreshnessInfo["status"], BadgeTone> = {
  FRESH: "emerald",
  DELAYED: "amber",
  STALE: "red",
  MARKET_CLOSED: "slate",
  MISSING: "red",
};

const FRESHNESS_LABEL: Record<FreshnessInfo["status"], string> = {
  FRESH: "LIVE",
  DELAYED: "DELAYED",
  STALE: "STALE",
  MARKET_CLOSED: "MARKET CLOSED",
  MISSING: "NO DATA",
};

function FreshnessBadge({ freshness }: { freshness: FreshnessInfo }) {
  return (
    <div className="mt-2 space-y-1">
      <StatusBadge label={FRESHNESS_LABEL[freshness.status]} tone={FRESHNESS_TONE[freshness.status]} />
      {freshness.ageMinutes !== null && freshness.status !== "MARKET_CLOSED" && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{freshness.ageMinutes.toFixed(0)} min ago</p>
      )}
    </div>
  );
}

// Everything on this card asks the same question a different way: "does
// the AUD/THB Direct feed agree with an independent check?" -- once
// against its own Twelve Data cross rate (matched-time), once against a
// second provider entirely (Yahoo). Split out of Market Rates so that
// card stays a plain "here are the current feeds" table, and this one
// carries the actual cross-checking -- previously all three pieces were
// stacked at the bottom of Market Rates, making it far longer than the
// Daily Recap card beside it for no real reason.
export default async function CrossCheck({ data }: { data: DashboardData }) {
  const yahoo = await getYahooReference();
  const yahooDiff = yahoo.rate !== null && data.directRate !== null ? yahoo.rate - data.directRate : null;

  const crossDataStale =
    (data.audUsdFreshness.status !== "FRESH" || data.usdThbFreshness.status !== "FRESH") &&
    data.audUsdFreshness.status !== "MARKET_CLOSED";

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-instrument-surface p-6 h-full transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <h2 className="text-xl font-semibold tracking-tight inline-flex items-center">
        <StatusLight colorClassName="text-teal-500 dark:text-teal-400" />
        Cross-Check &amp; Reference
        <InfoTip text="Two independent checks on the AUD/THB Direct feed: a matched-time cross rate computed from AUD/USD x USD/THB, and a second provider (Yahoo) entirely outside Twelve Data." />
      </h2>

      {/* MATCHED-TIME CROSS GAP */}
      <div className="mt-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">Matched-Time Cross Gap</p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <div className="inline-flex rounded bg-instrument border border-slate-800 px-2 py-1.5">
            <SevenSegmentValue
              value={data.crossGap !== null ? data.crossGap.toFixed(4) : null}
              height={26}
              svgClassName="h-[26px]"
              litClassName="fill-teal-300"
              placeholderLength={6}
            />
          </div>
          <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
            {data.crossGap !== null && data.crossGapPercent !== null
              ? `THB (${data.crossGapPercent >= 0 ? "+" : ""}${data.crossGapPercent.toFixed(3)}%)`
              : ""}
          </span>
        </div>

        {data.crossDirectReferenceRate !== null && data.crossTimestamp && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Direct reference: {data.crossDirectReferenceRate.toFixed(4)} @ {formatTime(data.crossTimestamp)}
          </p>
        )}

        {crossDataStale && (
          <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Cross Currency Score only uses matched-time data when source data is fresh.
            </p>
          </div>
        )}
      </div>

      {/* YAHOO FINANCE REFERENCE -- unofficial, comparison only, never
      scored. */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-slate-600 dark:text-slate-400 inline-flex items-center">
            AUD/THB -- Yahoo Finance
            <InfoTip text="A second, independent AUD/THB quote for comparison only. Yahoo has no official public API for this -- it's fetched via the same unofficial endpoint the yfinance community library uses, so outages here are expected and never affect the Core FX Score." />
          </p>
          <StatusBadge label="Reference Only" tone="slate" />
        </div>

        <div className="inline-flex rounded bg-instrument border border-slate-800 px-2 py-1.5 mt-1">
          <SevenSegmentValue
            value={yahoo.rate !== null ? yahoo.rate.toFixed(4) : null}
            height={26}
            svgClassName="h-[26px]"
            litClassName="fill-teal-300"
            placeholderLength={7}
          />
        </div>

        {yahoo.marketTimestamp && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{formatTime(yahoo.marketTimestamp)}</p>
        )}

        <FreshnessBadge freshness={{ status: yahoo.status, ageMinutes: yahoo.ageMinutes }} />

        {yahooDiff !== null && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            vs Twelve Data: {yahooDiff >= 0 ? "+" : ""}
            {yahooDiff.toFixed(4)} THB
          </p>
        )}

        {yahoo.error && <p className="text-xs text-red-700 dark:text-red-400 mt-1">{yahoo.error}</p>}
      </div>
    </div>
  );
}

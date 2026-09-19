import type {
  DashboardData,
  FreshnessInfo,
} from "@/lib/dashboard-data";
import { getYahooReference } from "@/lib/yahoo-reference-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import InfoTip from "@/components/InfoTip";

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString(
    "en-GB",
    {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
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

function FreshnessBadge({
  freshness,
}: {
  freshness: FreshnessInfo;
}) {
  return (
    <div className="mt-2 space-y-1">
      <StatusBadge
        label={FRESHNESS_LABEL[freshness.status]}
        tone={FRESHNESS_TONE[freshness.status]}
      />

      {freshness.ageMinutes !== null &&
        freshness.status !== "MARKET_CLOSED" && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {freshness.ageMinutes.toFixed(0)} min ago
          </p>
        )}
    </div>
  );
}

export default async function MarketRates({
  data,
}: {
  data: DashboardData;
}) {
  const yahoo = await getYahooReference();
  const yahooDiff =
    yahoo.rate !== null && data.directRate !== null ? yahoo.rate - data.directRate : null;

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 border-t-4 border-t-teal-500 dark:border-t-teal-400 bg-slate-50 dark:bg-slate-900 p-6 h-full transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <h2 className="text-xl font-semibold tracking-tight">
        Market Rates
      </h2>

      <div className="grid md:grid-cols-4 gap-6 mt-5">

        {/* AUD/THB DIRECT */}
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            AUD/THB Direct
          </p>

          <p className="text-2xl font-bold font-mono mt-1">
            {data.directRate !== null
              ? data.directRate.toFixed(4)
              : "--"}
          </p>

          {data.latestDirect && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {formatTime(
                data.latestDirect.market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={data.directFreshness}
          />
        </div>

        {/* AUD/THB CROSS */}
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            AUD/THB Cross
          </p>

          <p className="text-2xl font-bold font-mono mt-1">
            {data.crossRate !== null
              ? data.crossRate.toFixed(4)
              : "--"}
          </p>

          {data.crossTimestamp && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Matched:{" "}
              {formatTime(data.crossTimestamp)}
            </p>
          )}

          <div className="mt-2">
            <StatusBadge
              label={data.crossStatus}
              tone={
                data.crossStatus === "GOOD"
                  ? "emerald"
                  : data.crossStatus === "STALE"
                    ? "amber"
                    : "red"
              }
            />
          </div>

          {data.crossTimeGapMinutes !== null && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Source gap:{" "}
              {data.crossTimeGapMinutes.toFixed(1)} min
            </p>
          )}
        </div>

        {/* AUD/USD */}
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            AUD/USD
          </p>

          <p className="text-2xl font-bold font-mono mt-1">
            {data.latestAudUsd
              ? Number(
                  data.latestAudUsd.rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestAudUsd && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {formatTime(
                data.latestAudUsd.market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={data.audUsdFreshness}
          />
        </div>

        {/* USD/THB */}
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            USD/THB
          </p>

          <p className="text-2xl font-bold font-mono mt-1">
            {data.latestUsdThb
              ? Number(
                  data.latestUsdThb.rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestUsdThb && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              {formatTime(
                data.latestUsdThb.market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={data.usdThbFreshness}
          />
        </div>
      </div>

      {/* MATCHED-TIME CROSS GAP */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-5 pt-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Matched-Time Cross Gap
        </p>

        <p className="text-lg font-semibold font-mono">
          {data.crossGap !== null &&
          data.crossGapPercent !== null
            ? `${
                data.crossGap >= 0 ? "+" : ""
              }${data.crossGap.toFixed(4)} THB (${
                data.crossGapPercent >= 0 ? "+" : ""
              }${data.crossGapPercent.toFixed(3)}%)`
            : "--"}
        </p>

        {data.crossDirectReferenceRate !== null &&
          data.crossTimestamp && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Direct reference:{" "}
              {data.crossDirectReferenceRate.toFixed(4)}
              {" @ "}
              {formatTime(data.crossTimestamp)}
            </p>
          )}
      </div>

      {/* YAHOO FINANCE REFERENCE -- unofficial, comparison only, never
      scored. Kept in its own bordered strip rather than the 4-tile grid
      above so it doesn't read as a fifth equally-trusted core feed. */}
      <div className="border-t border-slate-200 dark:border-slate-800 mt-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 inline-flex items-center">
            AUD/THB -- Yahoo Finance
            <InfoTip text="A second, independent AUD/THB quote for comparison only. Yahoo has no official public API for this -- it's fetched via the same unofficial endpoint the yfinance community library uses, so outages here are expected and never affect the Core FX Score." />
          </p>
          <StatusBadge label="Reference Only" tone="slate" />
        </div>

        <p className="text-2xl font-bold font-mono mt-1">
          {yahoo.rate !== null ? yahoo.rate.toFixed(4) : "--"}
        </p>

        {yahoo.marketTimestamp && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            {formatTime(yahoo.marketTimestamp)}
          </p>
        )}

        <FreshnessBadge freshness={{ status: yahoo.status, ageMinutes: yahoo.ageMinutes }} />

        {yahooDiff !== null && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            vs Twelve Data: {yahooDiff >= 0 ? "+" : ""}
            {yahooDiff.toFixed(4)} THB
          </p>
        )}

        {yahoo.error && (
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">{yahoo.error}</p>
        )}
      </div>

      {/* WARNING */}
      {(data.audUsdFreshness.status !== "FRESH" ||
        data.usdThbFreshness.status !== "FRESH") &&
        data.audUsdFreshness.status !==
          "MARKET_CLOSED" && (
          <div className="mt-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠ Cross Currency Score only uses
              matched-time data when source data
              is fresh.
            </p>
          </div>
        )}
    </div>
  );
}

import type {
  DashboardData,
  FreshnessInfo,
} from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import StatusLight from "@/components/StatusLight";
import Figure from "@/components/Figure";

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
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {freshness.ageMinutes.toFixed(0)} min ago
          </p>
        )}
    </div>
  );
}

export default function MarketRates({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold tracking-tight inline-flex items-center">
        <StatusLight colorClassName="text-brass-500 dark:text-brass-400" />
        Market Rates
      </h2>

      <div className="grid grid-cols-2 gap-6 mt-5">

        {/* AUD/THB DIRECT */}
        <div>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            AUD/THB Direct
          </p>

          <Figure
            value={data.directRate !== null ? data.directRate.toFixed(4) : null}
            className="text-2xl font-semibold"
          />

          {data.latestDirect && (
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
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
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            AUD/THB Cross
          </p>

          <Figure
            value={data.crossRate !== null ? data.crossRate.toFixed(4) : null}
            className="text-2xl font-semibold"
          />

          {data.crossTimestamp && (
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
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
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              Source gap:{" "}
              {data.crossTimeGapMinutes.toFixed(1)} min
            </p>
          )}
        </div>

        {/* AUD/USD */}
        <div>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            AUD/USD
          </p>

          <Figure
            value={data.latestAudUsd ? Number(data.latestAudUsd.rate).toFixed(5) : null}
            className="text-2xl font-semibold"
          />

          {data.latestAudUsd && (
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
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
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            USD/THB
          </p>

          <Figure
            value={data.latestUsdThb ? Number(data.latestUsdThb.rate).toFixed(5) : null}
            className="text-2xl font-semibold"
          />

          {data.latestUsdThb && (
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
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
    </div>
  );
}

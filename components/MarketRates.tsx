import type {
  DashboardData,
  FreshnessInfo,
} from "@/lib/dashboard-data";

function formatTime(
  timestamp: string
) {
  return new Date(
    timestamp
  ).toLocaleString(
    "en-GB",
    {
      timeZone:
        "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}

function FreshnessBadge({
  freshness,
}: {
  freshness: FreshnessInfo;
}) {
  const styles = {
    FRESH:
      "text-green-400",

    DELAYED:
      "text-yellow-400",

    STALE:
      "text-red-400",

    MARKET_CLOSED:
      "text-slate-400",

    MISSING:
      "text-red-400",
  };

  const labels = {
    FRESH: "LIVE",
    DELAYED: "DELAYED",
    STALE: "STALE",

    MARKET_CLOSED:
      "MARKET CLOSED",

    MISSING: "NO DATA",
  };

  return (
    <div className="mt-2">
      <p
        className={`text-xs font-semibold ${
          styles[
            freshness.status
          ]
        }`}
      >
        {
          labels[
            freshness.status
          ]
        }
      </p>

      {freshness.ageMinutes !==
        null &&
        freshness.status !==
          "MARKET_CLOSED" && (
          <p className="text-xs text-slate-500">
            {freshness.ageMinutes.toFixed(
              0
            )}{" "}
            min ago
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
    <div className="bg-slate-900 rounded-xl p-6 mt-4">
      <h2 className="text-xl font-semibold">
        Market Rates
      </h2>

      <div className="grid md:grid-cols-4 gap-6 mt-5">

        {/* AUD/THB DIRECT */}

        <div>
          <p className="text-slate-400 text-sm">
            AUD/THB Direct
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.directRate !==
            null
              ? data.directRate.toFixed(
                  4
                )
              : "--"}
          </p>

          {data.latestDirect && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data
                  .latestDirect
                  .market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={
              data.directFreshness
            }
          />
        </div>

        {/* AUD/THB CROSS */}

        <div>
          <p className="text-slate-400 text-sm">
            AUD/THB Cross
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.crossRate !==
            null
              ? data.crossRate.toFixed(
                  4
                )
              : "--"}
          </p>

          {data.crossTimestamp && (
            <p className="text-xs text-slate-500 mt-2">
              Matched:{" "}
              {formatTime(
                data.crossTimestamp
              )}
            </p>
          )}

          <p className="text-xs mt-2">
            Cross Status:{" "}
            <span
              className={
                data.crossStatus ===
                "GOOD"
                  ? "text-green-400"
                  : data.crossStatus ===
                      "STALE"
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {
                data.crossStatus
              }
            </span>
          </p>

          {data.crossTimeGapMinutes !==
            null && (
            <p className="text-xs text-slate-500">
              Source gap:{" "}
              {data.crossTimeGapMinutes.toFixed(
                1
              )}{" "}
              min
            </p>
          )}
        </div>

        {/* AUD/USD */}

        <div>
          <p className="text-slate-400 text-sm">
            AUD/USD
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.latestAudUsd
              ? Number(
                  data
                    .latestAudUsd
                    .rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestAudUsd && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data
                  .latestAudUsd
                  .market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={
              data.audUsdFreshness
            }
          />
        </div>

        {/* USD/THB */}

        <div>
          <p className="text-slate-400 text-sm">
            USD/THB
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.latestUsdThb
              ? Number(
                  data
                    .latestUsdThb
                    .rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestUsdThb && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data
                  .latestUsdThb
                  .market_timestamp
              )}
            </p>
          )}

          <FreshnessBadge
            freshness={
              data.usdThbFreshness
            }
          />
        </div>
      </div>

      {/* MATCHED-TIME GAP */}

      <div className="border-t border-slate-800 mt-5 pt-4">
        <p className="text-sm text-slate-400">
          Matched-Time Cross Gap
        </p>

        <p className="text-lg font-semibold">
          {data.crossGap !==
            null &&
          data.crossGapPercent !==
            null
            ? `${
                data.crossGap >= 0
                  ? "+"
                  : ""
              }${data.crossGap.toFixed(
                4
              )} THB (${
                data.crossGapPercent >=
                0
                  ? "+"
                  : ""
              }${data.crossGapPercent.toFixed(
                3
              )}%)`
            : "--"}
        </p>

        {data.crossDirectReferenceRate !==
          null &&
          data.crossTimestamp && (
            <p className="text-xs text-slate-500 mt-1">
              Direct reference:{" "}
              {data.crossDirectReferenceRate.toFixed(
                4
              )}
              {" @ "}
              {formatTime(
                data.crossTimestamp
              )}
            </p>
          )}
      </div>

      {/* DATA WARNING */}

      {(data.audUsdFreshness
        .status !== "FRESH" ||
        data.usdThbFreshness
          .status !==
          "FRESH") &&
        data.audUsdFreshness
          .status !==
          "MARKET_CLOSED" && (
          <div className="mt-4 rounded-lg bg-yellow-950/30 border border-yellow-900 p-3">
            <p className="text-sm text-yellow-400">
              ⚠ Latest Cross
              source data is not
              fully fresh. Cross
              Currency Score only
              uses matched-time
              data when status is
              GOOD.
            </p>
          </div>
        )}
    </div>
  );
}
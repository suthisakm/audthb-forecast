import type { DashboardData } from "@/lib/dashboard-data";

function formatTime(
  timestamp: string
) {
  return new Date(
    timestamp
  ).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
        <div>
          <p className="text-slate-400 text-sm">
            AUD/THB Direct
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.directRate !== null
              ? data.directRate.toFixed(4)
              : "--"}
          </p>

          {data.latestDirect && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data.latestDirect
                  .market_timestamp
              )}
            </p>
          )}
        </div>

        <div>
          <p className="text-slate-400 text-sm">
            AUD/THB Cross
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.crossRate !== null
              ? data.crossRate.toFixed(4)
              : "--"}
          </p>

          <p className="text-xs mt-2">
            Status:{" "}
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
              {data.crossStatus}
            </span>
          </p>

          {data.crossTimeGapMinutes !==
            null && (
            <p className="text-xs text-slate-500">
              Time gap:{" "}
              {data.crossTimeGapMinutes.toFixed(
                1
              )}{" "}
              min
            </p>
          )}
        </div>

        <div>
          <p className="text-slate-400 text-sm">
            AUD/USD
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.latestAudUsd
              ? Number(
                  data.latestAudUsd.rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestAudUsd && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data.latestAudUsd
                  .market_timestamp
              )}
            </p>
          )}
        </div>

        <div>
          <p className="text-slate-400 text-sm">
            USD/THB
          </p>

          <p className="text-2xl font-bold mt-1">
            {data.latestUsdThb
              ? Number(
                  data.latestUsdThb.rate
                ).toFixed(5)
              : "--"}
          </p>

          {data.latestUsdThb && (
            <p className="text-xs text-slate-500 mt-2">
              {formatTime(
                data.latestUsdThb
                  .market_timestamp
              )}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-800 mt-5 pt-4">
        <p className="text-sm text-slate-400">
          Cross Gap
        </p>

        <p className="text-lg font-semibold">
          {data.crossGap !== null &&
          data.crossGapPercent !== null
            ? `${data.crossGap >= 0 ? "+" : ""}${data.crossGap.toFixed(4)} THB (${data.crossGapPercent >= 0 ? "+" : ""}${data.crossGapPercent.toFixed(3)}%)`
            : "--"}
        </p>
      </div>
    </div>
  );
}
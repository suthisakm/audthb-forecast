import type { DashboardData } from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";

function freshnessTone(status: string): BadgeTone {
  if (status === "FRESH") return "emerald";
  if (status === "DELAYED") return "amber";
  if (status === "MARKET_CLOSED") return "slate";
  return "red";
}

function changeColor(value: number | null) {
  if (value === null) return "text-slate-400";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-400";
}

export default function CurrentRateCard({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Current Rate
        </p>

        {data.latestPrice && (
          <StatusBadge
            label={data.latestPriceFreshness.status}
            tone={freshnessTone(data.latestPriceFreshness.status)}
          />
        )}
      </div>

      <p className="text-4xl font-bold font-mono mt-2 tabular-nums">
        {data.latestPrice
          ? Number(data.latestPrice.rate).toFixed(4)
          : "--"}
      </p>

      {data.latestPrice && (
        <div className="mt-3 text-sm text-slate-400 space-y-0.5">
          <p>
            Last updated:{" "}
            {new Date(
              data.latestPrice.market_timestamp
            ).toLocaleString("en-GB", {
              timeZone: "Asia/Bangkok",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>

          <p>
            Source: {data.latestPrice.source}
          </p>

          {data.latestPriceFreshness.ageMinutes !== null &&
            data.latestPriceFreshness.status !== "MARKET_CLOSED" && (
              <p>
                Data age:{" "}
                {data.latestPriceFreshness.ageMinutes.toFixed(0)} min
              </p>
            )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 text-sm">
        <p className={changeColor(data.change1H)}>
          1H:{" "}
          {data.change1H !== null
            ? `${data.change1H >= 0 ? "+" : ""}${data.change1H.toFixed(2)}%`
            : "--"}
        </p>

        <p className={changeColor(data.change4H)}>
          4H:{" "}
          {data.change4H !== null
            ? `${data.change4H >= 0 ? "+" : ""}${data.change4H.toFixed(2)}%`
            : "--"}
        </p>

        <p className="col-span-2 text-slate-400 font-mono">
          Intraday:{" "}
          {data.intradayLow !== null &&
          data.intradayHigh !== null
            ? `${data.intradayLow.toFixed(4)} – ${data.intradayHigh.toFixed(4)}`
            : "--"}
        </p>
      </div>
    </div>
  );
}

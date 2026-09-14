import type { DashboardData } from "@/lib/dashboard-data";

export default function ScoreBreakdown({
  data,
}: {
  data: DashboardData;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 mt-4">
      <h2 className="text-xl font-semibold">
        Score Breakdown
      </h2>

      <div className="mt-4 space-y-3">
        <div>
          <p>
            Price / Momentum:{" "}
            {data.priceMomentumScore !==
            null
              ? `${data.priceMomentumScore > 0 ? "+" : ""}${data.priceMomentumScore}`
              : "--"}
          </p>

          <p className="text-sm text-slate-500">
            1H Score:{" "}
            {data.priceScore1H !== null
              ? `${data.priceScore1H > 0 ? "+" : ""}${data.priceScore1H}`
              : "--"}
            {" | "}
            4H Score:{" "}
            {data.priceScore4H !== null
              ? `${data.priceScore4H > 0 ? "+" : ""}${data.priceScore4H}`
              : "--"}
          </p>
        </div>

        <div>
          <p>
            Cross Currency:{" "}
            {data.crossCurrencyScore !==
            null
              ? `${data.crossCurrencyScore > 0 ? "+" : ""}${data.crossCurrencyScore}`
              : "--"}
          </p>

          <p className="text-sm text-slate-500">
            1H Cross Change:{" "}
            {data.crossCurrencyChange1H !==
            null
              ? `${data.crossCurrencyChange1H >= 0 ? "+" : ""}${data.crossCurrencyChange1H.toFixed(3)}%`
              : "--"}
          </p>

          {data.crossStatus !==
            "GOOD" && (
            <p className="text-xs text-yellow-400">
              Cross excluded from score:
              {` ${data.crossStatus}`}
            </p>
          )}
        </div>

        <div>
          <p>
            Mean Reversion:{" "}
            {data.meanReversionScore !==
            null
              ? `${data.meanReversionScore > 0 ? "+" : ""}${data.meanReversionScore}`
              : "--"}
          </p>

          <p className="text-sm text-slate-500">
            Range Position:{" "}
            {data.rangePosition !== null
              ? `${data.rangePosition.toFixed(1)}%`
              : "--"}
          </p>
        </div>

        <hr className="border-slate-800" />

        <p>
          Relative Market:{" "}
          <span className="text-slate-500">
            Pending
          </span>
        </p>

        <p>
          Macro / Policy:{" "}
          <span className="text-slate-500">
            Pending
          </span>
        </p>

        <p>
          Commodity:{" "}
          <span className="text-slate-500">
            Pending
          </span>
        </p>

        <p>
          Risk:{" "}
          <span className="text-slate-500">
            Pending
          </span>
        </p>
      </div>
    </div>
  );
}
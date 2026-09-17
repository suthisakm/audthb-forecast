import type { DashboardData } from "@/lib/dashboard-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import ScoreGauge from "@/components/ScoreGauge";

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

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 15) return "text-emerald-400";
  if (score <= -15) return "text-red-400";
  return "text-amber-400";
}

export default function Hero({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-lg shadow-black/20 transition-colors hover:border-slate-700">
      <div className="grid md:grid-cols-2 gap-8">
        {/* RATE */}
        <div className="md:border-r md:border-slate-800 md:pr-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              AUD/THB Spot
            </p>

            {data.latestPrice && (
              <StatusBadge
                label={data.latestPriceFreshness.status}
                tone={freshnessTone(data.latestPriceFreshness.status)}
              />
            )}
          </div>

          <p className="text-5xl sm:text-6xl font-bold font-mono tabular-nums mt-3 leading-none">
            {data.latestPrice
              ? Number(data.latestPrice.rate).toFixed(4)
              : "--"}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-sm font-mono">
            <span className={changeColor(data.change1H)}>
              1H {data.change1H !== null ? `${data.change1H >= 0 ? "+" : ""}${data.change1H.toFixed(2)}%` : "--"}
            </span>

            <span className={changeColor(data.change4H)}>
              4H {data.change4H !== null ? `${data.change4H >= 0 ? "+" : ""}${data.change4H.toFixed(2)}%` : "--"}
            </span>

            <span className="text-slate-500">
              Range {data.intradayLow !== null && data.intradayHigh !== null
                ? `${data.intradayLow.toFixed(4)} - ${data.intradayHigh.toFixed(4)}`
                : "--"}
            </span>
          </div>

          {data.latestPrice && (
            <p className="text-xs text-slate-600 mt-3">
              Updated{" "}
              {new Date(data.latestPrice.market_timestamp).toLocaleString("en-GB", {
                timeZone: "Asia/Bangkok",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}{" "}
              (Bangkok) via {data.latestPrice.source}
            </p>
          )}

          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              Forecast 1H / 4H
            </p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              ยังไม่เปิดใช้ -- จะเปิดหลังพัฒนาและทดสอบโมเดลเทียบกับราคาจริง
              พร้อมปรับเกณฑ์และประเมินความแม่นยำ
            </p>
          </div>
        </div>

        {/* CORE FX SCORE */}
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
            Core FX Score
          </p>

          <div className="flex items-baseline gap-3 mt-3">
            <p className={`text-5xl sm:text-6xl font-bold font-mono tabular-nums leading-none ${scoreColor(data.coreFxScore)}`}>
              {data.coreFxScore !== null
                ? `${data.coreFxScore > 0 ? "+" : ""}${data.coreFxScore}`
                : "--"}
            </p>

            <p className="text-lg font-semibold text-slate-300">{data.coreBias}</p>
          </div>

          <ScoreGauge score={data.coreFxScore} />

          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Model Coverage</p>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {data.availableCoreWeight.toFixed(1)}/100
              </p>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Model factors: Price, Cross, Relative Market, Commodity, Macro / Policy, Risk and Mean Reversion.
            </p>

            <p className="text-xs text-slate-600 mt-1">
              Coverage แสดงน้ำหนักปัจจัยที่ใช้ได้ ไม่ใช่ความแม่นยำ คะแนนรวมใช้น้ำหนักตามข้อมูลที่พร้อมในขณะนั้น
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Gold ยังเป็น Monitor Only จึงมี Coverage สูงสุด 98/100 และอาจลดลงเมื่อข้อมูลไม่พร้อมหรือตลาด VIXY ปิด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

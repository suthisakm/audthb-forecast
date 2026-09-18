import type { DashboardData } from "@/lib/dashboard-data";
import { getEventRisk } from "@/lib/event-calendar-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import ScoreGauge from "@/components/ScoreGauge";
import InfoTip from "@/components/InfoTip";

function formatHoursUntil(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
}

function freshnessTone(status: string): BadgeTone {
  if (status === "FRESH") return "emerald";
  if (status === "DELAYED") return "amber";
  if (status === "MARKET_CLOSED") return "slate";
  return "red";
}

function changeColor(value: number | null) {
  if (value === null) return "text-slate-600 dark:text-slate-400";
  if (value > 0) return "text-emerald-700 dark:text-emerald-400";
  if (value < 0) return "text-red-700 dark:text-red-400";
  return "text-slate-600 dark:text-slate-400";
}

function scoreColor(score: number | null) {
  if (score === null) return "text-slate-600 dark:text-slate-400";
  if (score >= 15) return "text-emerald-700 dark:text-emerald-400";
  if (score <= -15) return "text-red-700 dark:text-red-400";
  return "text-amber-700 dark:text-amber-400";
}

function coreFeeds(data: DashboardData) {
  return [data.directFreshness.status, data.audUsdFreshness.status, data.usdThbFreshness.status];
}

function feedHealthCount(data: DashboardData) {
  return coreFeeds(data).filter((status) => status === "FRESH").length;
}

function feedHealthDot(data: DashboardData) {
  const feeds = coreFeeds(data);
  if (feeds.some((status) => status === "STALE" || status === "MISSING")) return "bg-red-500";
  if (feeds.every((status) => status === "FRESH")) return "bg-emerald-500";
  return "bg-amber-500";
}

export default async function Hero({ data }: { data: DashboardData }) {
  const eventRisk = await getEventRisk();

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 border-t-4 border-t-indigo-600 dark:border-t-indigo-400 bg-stone-50 dark:bg-slate-900 p-6 sm:p-8 shadow-sm transition-colors hover:border-stone-300 dark:hover:border-slate-700">
      <div className="grid md:grid-cols-2 gap-8">
        {/* RATE */}
        <div className="md:border-r border-stone-200 dark:border-slate-800 md:pr-8">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">
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

            <span className="text-slate-600 dark:text-slate-400">
              Range {data.intradayLow !== null && data.intradayHigh !== null
                ? `${data.intradayLow.toFixed(4)} - ${data.intradayHigh.toFixed(4)}`
                : "--"}
            </span>
          </div>

          {data.latestPrice && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
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

          {/* DATA HEALTH -- kept deliberately understated: a dot and a
              count, not its own card, since this is a "just so you know"
              signal, not something that needs to compete for attention. */}
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${feedHealthDot(data)}`} />
            {feedHealthCount(data)}/3 core feeds fresh
          </p>

          <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              Forecast 1H / 4H
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              ยังไม่เปิดใช้ -- จะเปิดหลังพัฒนาและทดสอบโมเดลเทียบกับราคาจริง
              พร้อมปรับเกณฑ์และประเมินความแม่นยำ
            </p>
          </div>
        </div>

        {/* CORE FX SCORE */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-widest inline-flex items-center">
            Core FX Score
            <InfoTip text="A weighted composite of 7 market and macro factors, from -100 (bearish AUD) to +100 (bullish AUD). Not a price prediction." />
          </p>

          <div className="flex items-baseline gap-3 mt-3">
            <p className={`text-5xl sm:text-6xl font-bold font-mono tabular-nums leading-none ${scoreColor(data.coreFxScore)}`}>
              {data.coreFxScore !== null
                ? `${data.coreFxScore > 0 ? "+" : ""}${data.coreFxScore}`
                : "--"}
            </p>

            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">{data.coreBias}</p>
          </div>

          <ScoreGauge score={data.coreFxScore} />

          {eventRisk.level !== "NONE" && eventRisk.event && eventRisk.hoursUntil !== null && (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                eventRisk.level === "HIGH"
                  ? "bg-red-500/10 text-red-700 dark:text-red-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              Event Risk ({eventRisk.level}): {eventRisk.event.eventName} ({eventRisk.event.currency}) in{" "}
              {formatHoursUntil(eventRisk.hoursUntil)} -- expect volatility, treat this score with extra caution.
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400 inline-flex items-center">
                Model Coverage
                <InfoTip text="How much of the model's total weight had usable data this run. Lower coverage means the score rests on fewer signals than usual." />
              </p>
              <p className="text-lg font-semibold font-mono tabular-nums">
                {data.availableCoreWeight.toFixed(1)}/100
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Model factors: Price, Cross, Relative Market, Commodity, Macro / Policy, Risk and Mean Reversion.
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Coverage แสดงน้ำหนักปัจจัยที่ใช้ได้ ไม่ใช่ความแม่นยำ คะแนนรวมใช้น้ำหนักตามข้อมูลที่พร้อมในขณะนั้น
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Gold ยังเป็น Monitor Only แต่ไม่กันน้ำหนักไว้ในสูตรแล้ว (ตั้งแต่ MODEL_VERSION 1.1.0) จึงเต็ม 100/100 ได้เมื่อข้อมูลครบ และจะลดลงเมื่อข้อมูลไม่พร้อมหรือตลาด VIXY ปิด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

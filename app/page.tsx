import type { ReactNode } from "react";
import RefreshControls from "@/components/RefreshControls";
import StickyBar from "@/components/StickyBar";
import ThemeToggle from "@/components/ThemeToggle";
import Hero from "@/components/Hero";
import MarketRates from "@/components/MarketRates";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import Alerts from "@/components/Alerts";
import DailyRecap from "@/components/DailyRecap";
import MarketClock from "@/components/MarketClock";
import EventCalendar from "@/components/EventCalendar";
import NewsSentiment from "@/components/NewsSentiment";
import Evaluation from "@/components/Evaluation";
import TrendChart from "@/components/TrendChart";
import ActionSummary from "@/components/ActionSummary";

import {
  getDashboardData,
} from "@/lib/dashboard-data";

import {
  getEventCalendar,
} from "@/lib/event-calendar-data";

import {
  getRecentNewsSignals,
} from "@/lib/news-sentiment-data";

import {
  getAlerts,
} from "@/lib/alerts-data";

import {
  getDailyRecap,
} from "@/lib/daily-recap-data";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

// Groups the page's growing card list under a quiet label instead of
// adding real navigation (a sidebar/tabs structure was tried and
// explicitly rejected earlier) -- just enough hierarchy that 9 stacked
// cards reads as three topics, not one undifferentiated scroll. Each
// section gets its own accent color and icon, echoed in the top border
// of the cards inside it, so the color itself groups related cards
// instead of every card looking identical regardless of topic.
type SectionColor = "indigo" | "violet" | "amber" | "emerald" | "slate";

const SECTION_COLOR_CLASSES: Record<SectionColor, string> = {
  indigo: "text-indigo-600 dark:text-indigo-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  slate: "text-slate-500 dark:text-slate-500",
};

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
      <path d="M4 19.5V6.5" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function SectionLabel({
  children,
  color,
  icon,
}: {
  children: string;
  color: SectionColor;
  icon: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-3">
      <span className={SECTION_COLOR_CLASSES[color]}>{icon}</span>
      {children}
    </p>
  );
}

export default async function Home() {
  const data =
    await getDashboardData();

  const eventCalendar =
    await getEventCalendar();

  const alerts =
    await getAlerts(data);

  const dailyRecap =
    await getDailyRecap();

  const newsSentiment =
    await getRecentNewsSignals();

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-slate-950 text-stone-900 dark:text-white">
      <RefreshControls />

      <StickyBar
        rate={data.latestPrice ? Number(data.latestPrice.rate) : null}
        score={data.coreFxScore}
        bias={data.coreBias}
        freshnessStatus={data.latestPriceFreshness.status}
      />

      {/* HEADER -- a full-width colored band, not another card on the
      same stone/slate background as everything below it, so the page
      reads as "app with a header" rather than "stack of identical cards". */}

      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-950 dark:via-slate-950 dark:to-slate-950 dark:border-b dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
              </span>

              <span className="text-xs font-medium uppercase tracking-widest text-emerald-100 dark:text-emerald-400">
                Live
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 text-white">
              AUD/THB Forecast Dashboard
            </h1>

            <p className="text-indigo-100 dark:text-slate-400 mt-1 text-sm sm:text-base">
              Market monitoring and FX signal model
            </p>
          </div>

          <div className="flex items-center gap-4">
            <MarketClock variant="inverted" />
            <ThemeToggle variant="inverted" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ALERTS */}

        <Alerts alerts={alerts} />

        {/* MARKET: RATE, CORE FX SCORE, RECAP, LIVE RATES */}

        <div className="mt-10">
          <SectionLabel color="indigo" icon={<TrendIcon />}>Market</SectionLabel>
          <Hero data={data} />
          <ActionSummary data={data} />

          <div className="grid lg:grid-cols-2 gap-6 mt-6 items-stretch">
            <DailyRecap recap={dailyRecap} data={data} />
            <MarketRates data={data} />
          </div>

          <div className="mt-6">
            <TrendChart />
          </div>
        </div>

        {/* SIGNAL MODEL */}

        <div className="mt-10">
          <SectionLabel color="violet" icon={<PulseIcon />}>Signal Model</SectionLabel>
          <ScoreBreakdown data={data} />
        </div>

        {/* TRACK RECORD */}

        <div className="mt-10">
          <SectionLabel color="emerald" icon={<TargetIcon />}>Track Record</SectionLabel>
          <Evaluation />
        </div>

        {/* CONTEXT & NEWS */}

        <div className="mt-10">
          <SectionLabel color="amber" icon={<CalendarIcon />}>Context &amp; News</SectionLabel>

          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <EventCalendar
              today={eventCalendar.today}
              thisWeek={eventCalendar.thisWeek}
              coverageNote={eventCalendar.coverageNote}
            />
            <NewsSentiment signals={newsSentiment.signals} error={newsSentiment.error} />
          </div>
        </div>

        {/* SOURCES -- reference material, not a live signal, so this is
        deliberately quieter than the cards above it: no hover highlight,
        smaller heading, muted border. */}

        <div className="mt-10">
          <SectionLabel color="slate" icon={<BookIcon />}>Reference</SectionLabel>

          <div className="rounded-xl border border-stone-200/70 dark:border-slate-800/70 p-6 mb-8">
            <h2 className="text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400">
              Sources
            </h2>

            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 grid sm:grid-cols-2 gap-x-8 gap-y-2">
            <p>
              FX Market Data:{" "}
              <span className="text-slate-700 dark:text-slate-300">Twelve Data</span>
            </p>

            <p>
              AUD/THB Cross:{" "}
              <span className="text-slate-700 dark:text-slate-300">
                AUD/USD × USD/THB (matched-time)
              </span>
            </p>

            <p>
              Relative Asian FX:{" "}
              <span className="text-slate-700 dark:text-slate-300">
                USD/CNH and USD/SGD via Twelve Data
              </span>
            </p>

            <p>
              AU 2Y Yield:{" "}
              <span className="text-slate-700 dark:text-slate-300">RBA via DBnomics</span>
            </p>

            <p>
              US 2Y Yield:{" "}
              <span className="text-slate-700 dark:text-slate-300">
                Federal Reserve via DBnomics
              </span>
            </p>

            <p>
              Iron Ore:{" "}
              <span className="text-slate-700 dark:text-slate-300">OilPriceAPI</span>
            </p>

            <p>
              Brent Live:{" "}
              <span className="text-slate-700 dark:text-slate-300">OilPriceAPI</span>
            </p>

            <p>
              Brent Historical Reference:{" "}
              <span className="text-slate-700 dark:text-slate-300">EIA</span>
            </p>

            <p>
              Gold: <span className="text-slate-700 dark:text-slate-300">Gold-API</span>
            </p>

            <p>
              Risk / Volatility:{" "}
              <span className="text-slate-700 dark:text-slate-300">VIXY via Twelve Data</span>
            </p>

            <p>
              News Signals:{" "}
              <span className="text-slate-700 dark:text-slate-300">
                Alpha Vantage News + Google Gemini
              </span>
            </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 dark:text-slate-400 mb-6">
          AUD/THB Forecast Dashboard -- for research and monitoring purposes only, not financial advice.
        </p>
      </div>
    </main>
  );
}

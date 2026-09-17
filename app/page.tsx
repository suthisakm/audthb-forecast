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

const CARD =
  "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700";

// Groups the page's growing card list under a quiet label instead of
// adding real navigation (a sidebar/tabs structure was tried and
// explicitly rejected earlier) -- just enough hierarchy that 9 stacked
// cards reads as three topics, not one undifferentiated scroll.
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-3">
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
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <RefreshControls />

      <StickyBar
        rate={data.latestPrice ? Number(data.latestPrice.rate) : null}
        score={data.coreFxScore}
        bias={data.coreBias}
        freshnessStatus={data.latestPriceFreshness.status}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* HEADER */}

        <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>

              <span className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
              AUD/THB Forecast Dashboard
            </h1>

            <p className="text-slate-500 mt-1 text-sm sm:text-base">
              Market monitoring and FX signal model
            </p>
          </div>

          <div className="flex items-center gap-4">
            <MarketClock />
            <ThemeToggle />
          </div>
        </div>

        {/* ALERTS */}

        <Alerts alerts={alerts} />

        {/* MARKET: RATE, CORE FX SCORE, RECAP, LIVE RATES */}

        <div className="mt-10">
          <SectionLabel>Market</SectionLabel>
          <Hero data={data} />
        </div>

        <DailyRecap recap={dailyRecap} data={data} />

        <MarketRates data={data} />

        {/* SIGNAL MODEL */}

        <div className="mt-10">
          <SectionLabel>Signal Model</SectionLabel>
          <ScoreBreakdown data={data} />
        </div>

        {/* CONTEXT & NEWS */}

        <div className="mt-10">
          <SectionLabel>Context &amp; News</SectionLabel>
          <EventCalendar
            today={eventCalendar.today}
            thisWeek={eventCalendar.thisWeek}
            coverageNote={eventCalendar.coverageNote}
          />
        </div>

        <NewsSentiment signals={newsSentiment.signals} error={newsSentiment.error} />

        {/* SOURCES -- reference material, not a live signal, so this is
        deliberately quieter than the cards above it: no hover highlight,
        smaller heading, muted border. */}

        <div className="mt-10">
          <SectionLabel>Reference</SectionLabel>

          <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 p-6 mb-8">
            <h2 className="text-sm font-semibold tracking-tight text-slate-600 dark:text-slate-400">
              Sources
            </h2>

            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 grid sm:grid-cols-2 gap-x-8 gap-y-2">
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
              AI News Signals:{" "}
              <span className="text-slate-700 dark:text-slate-300">
                Alpha Vantage News + Google Gemini
              </span>
            </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-700 mb-6">
          AUD/THB Forecast Dashboard -- for research and monitoring purposes only, not financial advice.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";
import SevenSegmentValue from "@/components/SevenSegmentValue";

function freshnessTone(status: string): BadgeTone {
  if (status === "FRESH") return "emerald";
  if (status === "DELAYED") return "amber";
  if (status === "MARKET_CLOSED") return "slate";
  return "red";
}

function scoreSegmentColor(score: number | null) {
  if (score === null) return "fill-slate-500";
  if (score >= 15) return "fill-emerald-400";
  if (score <= -15) return "fill-red-400";
  return "fill-amber-400";
}

// Shows once the Hero card has scrolled out of view, so the headline
// rate/score are never more than a glance away on a page that's grown
// long enough to need real scrolling (Score Breakdown, Event Calendar,
// Sources). Pure scroll-position toggle -- no IntersectionObserver
// needed for a single fixed threshold.
export default function StickyBar({
  rate,
  score,
  bias,
  freshnessStatus,
}: {
  rate: number | null;
  score: number | null;
  bias: string;
  freshnessStatus: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 inset-x-0 z-20 transition-transform duration-200 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-instrument/90 backdrop-blur">
        <div className="h-0.5 bg-teal-700 dark:bg-teal-400" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide hidden sm:inline">
              AUD/THB
            </span>
            <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1">
              <SevenSegmentValue
                value={rate !== null ? rate.toFixed(4) : null}
                height={20}
                svgClassName="h-4"
                litClassName="fill-teal-300"
                placeholderLength={7}
              />
            </div>
            <StatusBadge label={freshnessStatus} tone={freshnessTone(freshnessStatus)} />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide hidden sm:inline">
              Score
            </span>
            <div className="inline-flex rounded bg-instrument border border-slate-800 px-1.5 py-1">
              <SevenSegmentValue
                value={score !== null ? String(score) : null}
                height={20}
                svgClassName="h-4"
                litClassName={scoreSegmentColor(score)}
                placeholderLength={3}
              />
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">{bias}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Alert } from "@/lib/alerts-data";

const DISMISSED_KEY = "dismissedAlertsKey";

// Identifies "this exact set of alerts", not just "any alert" -- so
// dismissing today's BOJ event-risk alert doesn't also silently swallow
// tomorrow's unrelated stale-feed alert; the popup reappears whenever the
// underlying alert set actually changes.
function alertsKey(alerts: Alert[]): string {
  return alerts.map((a) => `${a.severity}:${a.label}`).sort().join("|");
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// Shown as a dismissible popup rather than a permanent banner -- when
// there's nothing to alert on, nothing renders at all (the page already
// conveys health via feed-freshness dots and the Confidence badge), and
// when there is, the user can close it without it coming back for the
// exact same alerts on the next page load.
export default function Alerts({ alerts }: { alerts: Alert[] }) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const key = alertsKey(alerts);

  useEffect(() => {
    if (alerts.length === 0) {
      setVisible(false);
      return;
    }

    let dismissedKey: string | null = null;
    try {
      dismissedKey = localStorage.getItem(DISMISSED_KEY);
    } catch {}

    setVisible(dismissedKey !== key);
  }, [key, alerts.length]);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, key);
    } catch {}
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="fixed inset-x-4 top-4 z-40 sm:left-1/2 sm:inset-x-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2">
      <div
        className={`relative rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50/95 dark:bg-slate-900/95 backdrop-blur p-4 shadow-xl transition-all duration-200 ${
          entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss alerts"
          className="absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <CloseIcon />
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
          <p className="font-semibold">Alerts</p>

          <div className="flex gap-4 text-sm">
            {criticalCount > 0 && (
              <span className="text-red-700 dark:text-red-400">{criticalCount} Critical</span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-700 dark:text-amber-400">{warningCount} Warning</span>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.label}
              className={`rounded-lg bg-white/70 dark:bg-slate-950/60 p-3 border-l-4 ${
                alert.severity === "critical" ? "border-red-500" : "border-amber-500"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  alert.severity === "critical" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {alert.label}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{alert.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { Alert } from "@/lib/alerts-data";

export default function Alerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/10 p-4 shadow-sm">
        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
          No active alerts
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          All tracked feeds and Macro components are fresh or within normal cadence.
        </p>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="mt-4 rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="mt-3 space-y-2">
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
  );
}

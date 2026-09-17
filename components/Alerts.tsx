import type { Alert } from "@/lib/alerts-data";

export default function Alerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm text-green-400 font-semibold">
          No active alerts
        </p>
        <p className="text-xs text-slate-500 mt-1">
          All tracked feeds and Macro components are fresh or within normal cadence.
        </p>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="mt-4 rounded-xl border border-red-900/50 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">Alerts</p>

        <div className="flex gap-4 text-sm">
          {criticalCount > 0 && (
            <span className="text-red-400">{criticalCount} Missing</span>
          )}
          {warningCount > 0 && (
            <span className="text-yellow-400">{warningCount} Stale</span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.label}
            className={`rounded-lg bg-slate-950 p-3 border-l-4 ${
              alert.severity === "critical" ? "border-red-500" : "border-yellow-500"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                alert.severity === "critical" ? "text-red-400" : "text-yellow-400"
              }`}
            >
              {alert.label}
            </p>
            <p className="text-xs text-slate-500 mt-1">{alert.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

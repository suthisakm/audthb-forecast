import type { DashboardData } from "@/lib/dashboard-data";
import { getActionSummary } from "@/lib/action-data";

// Workflow H, kept deliberately quiet -- a single sentence under Hero,
// not its own competing card, since it's a restatement of signals shown
// in full detail elsewhere (Core FX Score, Confidence, Event Risk), not
// new information.
export default async function ActionSummary({ data }: { data: DashboardData }) {
  const summary = await getActionSummary(data);

  return (
    <div className="mt-4 rounded-md bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 px-4 py-3">
      <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">{summary.headline}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{summary.detail}</p>
    </div>
  );
}

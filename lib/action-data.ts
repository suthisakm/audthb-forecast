import "server-only";
import type { DashboardData } from "@/lib/dashboard-data";
import { getConfidence } from "@/lib/confidence-data";
import { getEventRisk } from "@/lib/event-calendar-data";

export type ActionSummary = {
  headline: string;
  detail: string;
};

// Workflow H: turns the Core FX Score + Confidence (F) + Event Risk (G)
// -- three signals that already exist elsewhere on the page -- into one
// plain-language sentence, instead of leaving a user to cross-reference
// three cards themselves. Deliberately descriptive ("the model leans...")
// and never prescriptive ("you should...") -- this restates what the
// model's own signals say today, it is not trading advice, and says so.
export async function getActionSummary(data: DashboardData): Promise<ActionSummary> {
  const confidence = await getConfidence(data);
  const eventRisk = await getEventRisk();

  const bias = data.coreBias;
  const score = data.coreFxScore;

  let headline: string;
  if (score === null) {
    headline = "No score available right now -- nothing to summarize.";
  } else if (bias.includes("Bullish")) {
    headline = bias.startsWith("Strong")
      ? "Signals lean strongly toward AUD strengthening against THB today."
      : "Signals lean toward AUD strengthening against THB today.";
  } else if (bias.includes("Bearish")) {
    headline = bias.startsWith("Strong")
      ? "Signals lean strongly toward AUD weakening against THB today."
      : "Signals lean toward AUD weakening against THB today.";
  } else {
    headline = "Signals are mixed or close to flat -- no clear lean either way today.";
  }

  const detailParts: string[] = [`Confidence in this read is ${confidence.level.toLowerCase()}.`];

  if (eventRisk.level !== "NONE" && eventRisk.event) {
    detailParts.push(
      eventRisk.level === "HIGH"
        ? `A high-impact event is imminent (${eventRisk.event.eventName}) and can override these signals.`
        : `A high-impact event is coming up this week (${eventRisk.event.eventName}), worth watching.`,
    );
  }

  detailParts.push("This describes the model's current signals -- it is not financial advice.");

  return { headline, detail: detailParts.join(" ") };
}

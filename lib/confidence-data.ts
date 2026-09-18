import "server-only";
import { getEventRisk } from "@/lib/event-calendar-data";
import type { DashboardData } from "@/lib/dashboard-data";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type Confidence = {
  level: ConfidenceLevel;
  reasons: string[];
};

// Workflow F: a single plain-language read on how much to trust the
// Core FX Score right now. Not a new score -- just a summary of signals
// that already exist elsewhere on the page (Model Coverage, core feed
// freshness, Event Risk) so a user doesn't have to cross-reference three
// separate cards themselves to answer "should I trust this number today?".
export async function getConfidence(data: DashboardData): Promise<Confidence> {
  const eventRisk = await getEventRisk();
  const reasons: string[] = [];
  let tier: 0 | 1 | 2 = 2;

  if (data.availableCoreWeight < 70) {
    tier = Math.min(tier, 1) as 0 | 1;
    reasons.push(`Model coverage is only ${data.availableCoreWeight.toFixed(0)}/100`);
  }
  if (data.availableCoreWeight < 40) {
    tier = 0;
  }

  const coreFeeds = [
    data.directFreshness.status,
    data.audUsdFreshness.status,
    data.usdThbFreshness.status,
  ];
  if (coreFeeds.some((status) => status !== "FRESH")) {
    tier = Math.min(tier, 1) as 0 | 1;
    reasons.push("Not every core price feed is fresh right now");
  }

  if (eventRisk.level === "WATCH") {
    tier = Math.min(tier, 1) as 0 | 1;
    reasons.push("A high-impact event is on the calendar this week");
  }
  if (eventRisk.level === "HIGH") {
    tier = 0;
    reasons.push("A high-impact event is due within 24 hours -- expect the score to move");
  }

  if (reasons.length === 0) {
    reasons.push("All core feeds are fresh and no high-impact event is imminent");
  }

  return {
    level: tier === 2 ? "HIGH" : tier === 1 ? "MEDIUM" : "LOW",
    reasons,
  };
}

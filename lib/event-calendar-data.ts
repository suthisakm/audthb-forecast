import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

export type CalendarEvent = {
  eventTime: string;
  country: string;
  currency: string;
  eventName: string;
  category: string;
  importance: string;
  referencePeriod: string | null;
  source: string;
  sourceUrl: string | null;
};

type DbEventRow = {
  event_time: string;
  country: string;
  currency: string;
  event_name: string;
  category: string;
  importance: string;
  reference_period: string | null;
  source: string;
  source_url: string | null;
};

function toCalendarEvent(row: DbEventRow): CalendarEvent {
  return {
    eventTime: row.event_time,
    country: row.country,
    currency: row.currency,
    eventName: row.event_name,
    category: row.category,
    importance: row.importance,
    referencePeriod: row.reference_period,
    source: row.source,
    sourceUrl: row.source_url,
  };
}

// Hand-maintained calendar (see supabase/migrations -- no live provider
// gives this away for free). A gap in coverage means "not seeded yet",
// not "nothing happening" -- surfaced via coverageNote below.
export async function getEventCalendar() {
  const now = new Date();

  const bangkokOffset = 7 * 60 * 60 * 1000;
  const bangkokNow = new Date(now.getTime() + bangkokOffset);
  const startOfTodayBangkok = Date.UTC(
    bangkokNow.getUTCFullYear(),
    bangkokNow.getUTCMonth(),
    bangkokNow.getUTCDate(),
    0, 0, 0,
  ) - bangkokOffset;
  const startOfTomorrowBangkok = startOfTodayBangkok + 24 * 60 * 60 * 1000;
  // "This week" = today plus the next 7 full days (day 0..day 7 inclusive),
  // so an event exactly 7 days out (e.g. today Thu -> next Thu) still shows.
  const startOfNextWeekBangkok = startOfTodayBangkok + 8 * 24 * 60 * 60 * 1000;

  const { data, error } = await supabaseAdmin
    .from("event_calendar")
    .select("event_time,country,currency,event_name,category,importance,reference_period,source,source_url")
    .gte("event_time", new Date(startOfTodayBangkok).toISOString())
    .lt("event_time", new Date(startOfNextWeekBangkok).toISOString())
    .order("event_time", { ascending: true });

  if (error) {
    return {
      today: [] as CalendarEvent[],
      thisWeek: [] as CalendarEvent[],
      error: `Event calendar DB error: ${error.message}`,
      coverageNote:
        "Hand-maintained calendar, not a live feed -- see supabase/migrations for sources.",
    };
  }

  const rows = ((data ?? []) as DbEventRow[]).map(toCalendarEvent);

  const today = rows.filter((row) => {
    const t = new Date(row.eventTime).getTime();
    return t >= startOfTodayBangkok && t < startOfTomorrowBangkok;
  });

  return {
    today,
    thisWeek: rows,
    error: null,
    coverageNote:
      "Hand-maintained calendar (RBA/Fed/BOT meetings, AU/US CPI & employment) -- not a live feed. " +
      "A quiet week here may mean not yet seeded, not that nothing is scheduled.",
  };
}

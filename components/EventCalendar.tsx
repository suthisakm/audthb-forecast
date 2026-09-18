import type { CalendarEvent } from "@/lib/event-calendar-data";
import StatusBadge, { type BadgeTone } from "@/components/StatusBadge";

function importanceColor(importance: string) {
  if (importance === "HIGH") return "text-red-700 dark:text-red-400";
  if (importance === "MEDIUM") return "text-amber-700 dark:text-amber-400";
  return "text-slate-600 dark:text-slate-400";
}

function importanceTone(importance: string): BadgeTone {
  if (importance === "HIGH") return "red";
  if (importance === "MEDIUM") return "amber";
  return "slate";
}

function formatEventTime(eventTime: string) {
  return new Date(eventTime).toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
      <div>
        <p className="text-sm">
          <span className={`font-semibold ${importanceColor(event.importance)}`}>
            {event.currency}
          </span>{" "}
          {event.eventName}
          {event.referencePeriod ? (
            <span className="text-slate-600 dark:text-slate-400"> ({event.referencePeriod})</span>
          ) : null}
        </p>

        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{formatEventTime(event.eventTime)} (Bangkok)</p>
      </div>

      <div className="shrink-0">
        <StatusBadge label={event.importance} tone={importanceTone(event.importance)} />
      </div>
    </div>
  );
}

export default function EventCalendar({
  today,
  thisWeek,
  coverageNote,
}: {
  today: CalendarEvent[];
  thisWeek: CalendarEvent[];
  coverageNote: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 border-t-4 border-t-amber-500 dark:border-t-amber-400 bg-slate-50 dark:bg-slate-900 p-6 h-full transition-colors hover:border-slate-300 dark:hover:border-slate-700">
      <h2 className="text-xl font-semibold tracking-tight">Event Calendar</h2>

      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{coverageNote}</p>

      <div className="mt-4">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Today</p>

        {today.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No scheduled events today.</p>
        ) : (
          <div>
            {today.map((event) => (
              <EventRow key={`${event.eventTime}-${event.eventName}`} event={event} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">This Week</p>

        {thisWeek.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No events scheduled this week.</p>
        ) : (
          <div>
            {thisWeek.map((event) => (
              <EventRow key={`${event.eventTime}-${event.eventName}-week`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

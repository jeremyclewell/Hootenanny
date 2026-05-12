import type { Event } from "@shared/schema";

/** Parse a yyyy-MM-dd string into a local-time Date (no UTC shift). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today at 00:00 local time, useful for calendar `disabled={(d) => d < startOfToday()}`. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Date `days` from `from` (defaults to today), at the same time-of-day as `from`. */
export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/** The end of the date-poll window: 4 weeks from today. */
export function pollWindowEnd(): Date {
  return addDays(startOfToday(), 28);
}

function parseEventDateTime(
  date: string,
  time?: string | null,
  durationMinutes?: number | null,
  endDate?: string | null,
  endTime?: string | null,
): { start: Date; end: Date } | null {
  if (!date) return null;

  let start: Date;
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(h, m, 0, 0);
    start = d;
  } else {
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    start = d;
  }

  // If an explicit end date/time is provided, use it instead of duration
  if (endDate) {
    const resolvedEndDate = endDate;
    let end: Date;
    if (endTime && /^\d{1,2}:\d{2}$/.test(endTime)) {
      const [h, m] = endTime.split(":").map(Number);
      const d = new Date(`${resolvedEndDate}T00:00:00`);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(h, m, 0, 0);
      end = d;
    } else {
      const d = new Date(`${resolvedEndDate}T23:59:00`);
      if (Number.isNaN(d.getTime())) return null;
      end = d;
    }
    return { start, end };
  }

  const minutes = typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : 120;
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return { start, end };
}

function formatDateUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildGoogleCalendarUrl(event: Event): string | null {
  if (!event.date) return null;
  const range = parseEventDateTime(event.date, event.time, event.durationMinutes, event.endDate, event.endTime);
  if (!range) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatDateUTC(range.start)}/${formatDateUTC(range.end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsContent(event: Event): string | null {
  if (!event.date) return null;
  const range = parseEventDateTime(event.date, event.time, event.durationMinutes, event.endDate, event.endTime);
  if (!range) return null;

  const uid = `${event.id}@hootenanny`;
  const dtStamp = formatDateUTC(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hootenanny//Potluck//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatDateUTC(range.start)}`,
    `DTEND:${formatDateUTC(range.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function downloadIcsFile(event: Event): boolean {
  const content = buildIcsContent(event);
  if (!content) return false;

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "event";
  link.download = `${safeTitle}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

import type { EventSession } from "./types";

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function formatIcsTimestamp(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid event date: ${isoDate}`);
  }

  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(session: EventSession): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  const start = formatIcsTimestamp(session.startsAt);
  const end = formatIcsTimestamp(session.endsAt);

  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", session.title);
  url.searchParams.set("details", session.summary);
  url.searchParams.set("location", session.location);
  url.searchParams.set("dates", `${start}/${end}`);

  return url.toString();
}

export function buildIcsFile(session: EventSession): { filename: string; content: string } {
  const start = formatIcsTimestamp(session.startsAt);
  const end = formatIcsTimestamp(session.endsAt);

  return {
    filename: `${session.id}.ics`,
    content: [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//code-to-give//calendar-sign-up//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${session.id}@code-to-give.local`,
      `SUMMARY:${escapeIcsText(session.title)}`,
      `DESCRIPTION:${escapeIcsText(session.summary)}`,
      `LOCATION:${escapeIcsText(session.location)}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"),
  };
}

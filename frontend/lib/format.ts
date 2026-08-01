/**
 * Every number and date the user reads, formatted in one place.
 *
 * This used to be four different `formatHkd` implementations that disagreed
 * about whether "HK$1,000" came from a template literal or from
 * Intl.NumberFormat. One rule, one file.
 */

const HK_LOCALE = "en-HK";
const HK_TIME_ZONE = "Asia/Hong_Kong";

const hkd = new Intl.NumberFormat(HK_LOCALE, {
  style: "currency",
  currency: "HKD",
  maximumFractionDigits: 0,
});

/** "HK$1,000". Whole dollars: this charity never quotes cents. */
export function formatHkd(amount: number): string {
  return hkd.format(amount);
}

const eventRange = new Intl.DateTimeFormat(HK_LOCALE, {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: HK_TIME_ZONE,
});

/** "Saturday, Aug 8, 10:00 to Saturday, Aug 8, 11:30" */
export function formatEventRange(startsAt: string, endsAt: string): string {
  return `${eventRange.format(new Date(startsAt))} to ${eventRange.format(new Date(endsAt))}`;
}

const eventShort = new Intl.DateTimeFormat(HK_LOCALE, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: HK_TIME_ZONE,
});

/** "Sat, Aug 8, 10:00 · Happy Valley Recreation Ground" */
export function formatEventLine(startsAt: string, location: string): string {
  return `${eventShort.format(new Date(startsAt))} · ${location}`;
}

const stamp = new Intl.DateTimeFormat(HK_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: HK_TIME_ZONE,
});

/** "8 Aug 2026, 10:00" — for confirmations and audit lines. */
export function formatTimestamp(isoDate: string): string {
  return stamp.format(new Date(isoDate));
}

const shortDate = new Intl.DateTimeFormat(HK_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: HK_TIME_ZONE,
});

/**
 * "8 Aug 2026", or "" for a missing or unparseable value. Feeds come from
 * third parties (Instagram), so a bad timestamp must not blank the page.
 */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : shortDate.format(date);
}

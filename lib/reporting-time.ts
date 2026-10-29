export const REPORT_TIME_ZONE = "Asia/Bangkok";
export const DAY_MS = 86_400_000;

export function bangkokDayKey(date: Date | number): string {
  const ms = typeof date === "number" ? date : date.getTime();
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Inclusive calendar dates in Bangkok; today is explicitly a partial day. */
export function reportingWindow(days: number, now = Date.now()) {
  const todayStart = Date.parse(`${bangkokDayKey(now)}T00:00:00+07:00`);
  const since = todayStart - (days - 1) * DAY_MS;
  const dates = Array.from({ length: days }, (_, i) => bangkokDayKey(since + i * DAY_MS));
  return { since, until: now, dates, timeZone: REPORT_TIME_ZONE };
}

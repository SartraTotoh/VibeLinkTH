import { describe, expect, it } from "vitest";
import { bangkokDayKey, reportingWindow } from "../lib/reporting-time";

describe("Bangkok report dates", () => {
  it("switches days at 17:00 UTC", () => {
    expect(bangkokDayKey(new Date("2026-10-28T16:59:59Z"))).toBe("2026-10-28");
    expect(bangkokDayKey(new Date("2026-10-28T17:00:00Z"))).toBe("2026-10-29");
  });
  it("includes exactly seven calendar dates including the partial current day", () => {
    const now = Date.parse("2026-10-28T17:00:01Z");
    const w = reportingWindow(7, now);
    expect(new Date(w.since).toISOString()).toBe("2026-10-22T17:00:00.000Z");
    expect(w.dates).toEqual(["2026-10-23","2026-10-24","2026-10-25","2026-10-26","2026-10-27","2026-10-28","2026-10-29"]);
    expect(w.until).toBe(now);
    expect(w.timeZone).toBe("Asia/Bangkok");
  });
});

import { describe, it, expect } from "vitest";
import { dayKey, parseDayKeys } from "@/lib/date";

describe("dayKey", () => {
  it("formats a Date to a local yyyy-MM-dd key", () => {
    expect(dayKey(new Date(2025, 5, 6))).toBe("2025-06-06");
  });

  it("formats an ISO string to the same key as its Date", () => {
    const iso = "2025-06-06T13:45:00";
    expect(dayKey(iso)).toBe(dayKey(new Date(iso)));
    expect(dayKey(iso)).toBe("2025-06-06");
  });

  it("zero-pads month and day", () => {
    expect(dayKey(new Date(2025, 0, 1))).toBe("2025-01-01");
  });
});

describe("parseDayKeys", () => {
  it("round-trips through dayKey as local days", () => {
    const keys = ["2025-06-06", "2025-01-01", "2024-12-31"];
    expect(parseDayKeys(keys).map(dayKey)).toEqual(keys);
  });
});

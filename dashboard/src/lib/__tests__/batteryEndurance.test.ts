import { describe, it, expect } from "vitest";
import {
  crossX,
  linearRegression,
  meanPerLapDelta,
  projectLapsUntil,
  summarize,
} from "@/lib/batteryEndurance";

describe("linearRegression", () => {
  it("returns null with fewer than two points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
  });

  it("fits a perfect line exactly", () => {
    const reg = linearRegression([
      { x: 0, y: 2 },
      { x: 1, y: 4 },
      { x: 2, y: 6 },
    ]);
    expect(reg).not.toBeNull();
    expect(reg!.slope).toBeCloseTo(2, 10);
    expect(reg!.intercept).toBeCloseTo(2, 10);
  });

  it("returns null when x has zero variance", () => {
    expect(
      linearRegression([
        { x: 5, y: 1 },
        { x: 5, y: 2 },
      ]),
    ).toBeNull();
  });
});

describe("crossX", () => {
  it("solves for x at a boundary", () => {
    const reg = { slope: 2, intercept: 2, n: 3 };
    expect(crossX(reg, 10)).toBeCloseTo(4, 10); // 2x + 2 = 10 → x = 4
  });

  it("returns null for a flat line", () => {
    expect(crossX({ slope: 0, intercept: 5, n: 3 }, 10)).toBeNull();
  });
});

describe("meanPerLapDelta", () => {
  it("averages the trailing window of consecutive deltas", () => {
    // deltas: -2, -3, -5 ; last 2 → (-3 + -5)/2 = -4
    expect(meanPerLapDelta([100, 98, 95, 90], 2)).toBeCloseTo(-4, 10);
  });

  it("returns null with insufficient data", () => {
    expect(meanPerLapDelta([42])).toBeNull();
  });
});

describe("projectLapsUntil", () => {
  it("projects laps to a falling SOC boundary", () => {
    // SOC dropping 5%/lap, currently 40, boundary 20 → 4 laps
    const laps = [55, 50, 45, 40];
    expect(projectLapsUntil(laps, 20, "down")).toBeCloseTo(4, 6);
  });

  it("projects laps to a rising temperature boundary", () => {
    // temp rising 4°C/lap, currently 48, boundary 60 → 3 laps
    const laps = [40, 44, 48];
    expect(projectLapsUntil(laps, 60, "up")).toBeCloseTo(3, 6);
  });

  it("returns 0 once the boundary is already reached", () => {
    expect(projectLapsUntil([30, 25, 18], 20, "down")).toBe(0);
    expect(projectLapsUntil([55, 60, 62], 60, "up")).toBe(0);
  });

  it("returns null when the trend moves away from the boundary", () => {
    expect(projectLapsUntil([30, 35, 40], 20, "down")).toBeNull(); // SOC rising
    expect(projectLapsUntil([60, 55, 50], 60, "up")).toBeNull(); // temp falling
  });

  it("returns null without enough laps", () => {
    expect(projectLapsUntil([40], 20, "down")).toBeNull();
  });
});

describe("summarize", () => {
  it("computes min/max/avg over finite values", () => {
    const s = summarize([10, 20, 30]);
    expect(s).toEqual({ min: 10, max: 30, avg: 20 });
  });

  it("ignores non-finite values and returns null when empty", () => {
    expect(summarize([NaN, Infinity])).toBeNull();
    const s = summarize([NaN, 4, 6]);
    expect(s).toEqual({ min: 4, max: 6, avg: 5 });
  });
});

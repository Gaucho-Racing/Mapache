import { describe, it, expect } from "vitest";
import { deriveLapInputs, tsToIso } from "@/lib/sessions/lapInputs";
import type { LapResult, Point } from "@/models/session";

// Points at 1s spacing; only `ts` matters to deriveLapInputs (x/y are unused).
function pointsAt(timestamps: number[]): Point[] {
  return timestamps.map((ts) => ({ x: 0, y: 0, ts }));
}

// Minimal LapResult: the fields deriveLapInputs reads, with sane defaults for
// the rest so the shape stays valid.
function lapResult(partial: Partial<LapResult>): LapResult {
  return {
    lapCount: 0,
    lapTimes: [],
    bestTime: 0,
    avgTime: 0,
    worstTime: 0,
    lapNumbers: [],
    sectorNumbers: [],
    crossingIndices: [],
    ...partial,
  };
}

describe("tsToIso", () => {
  it("converts epoch seconds to an ISO string", () => {
    expect(tsToIso(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(tsToIso(1_600_000_000)).toBe("2020-09-13T12:26:40.000Z");
  });
});

describe("deriveLapInputs", () => {
  it("returns no laps when fewer than two crossings", () => {
    expect(deriveLapInputs(lapResult({ crossingIndices: [] }), [])).toEqual([]);
    expect(
      deriveLapInputs(
        lapResult({ crossingIndices: [0] }),
        pointsAt([0, 1, 2]),
      ),
    ).toEqual([]);
  });

  it("derives one lap per crossing interval with ISO times and ms duration", () => {
    // Crossings at index 0, 2, 4 → two laps. lapTimes drive duration_ms.
    const points = pointsAt([100, 101, 102, 103, 104]);
    const result = lapResult({
      crossingIndices: [0, 2, 4],
      lapTimes: [2, 2],
      bestTime: 2,
      sectorNumbers: [1, 1, 1, 1, 1],
    });

    const laps = deriveLapInputs(result, points);
    expect(laps).toHaveLength(2);

    expect(laps[0].lap_number).toBe(1);
    expect(laps[0].start_time).toBe(tsToIso(100));
    expect(laps[0].end_time).toBe(tsToIso(102));
    expect(laps[0].duration_ms).toBe(2000);

    expect(laps[1].lap_number).toBe(2);
    expect(laps[1].start_time).toBe(tsToIso(102));
    expect(laps[1].end_time).toBe(tsToIso(104));
  });

  it("flags only the first lap matching bestTime as is_best", () => {
    const points = pointsAt([0, 10, 20, 30]);
    // Two laps tied at the best time of 10s.
    const result = lapResult({
      crossingIndices: [0, 1, 2, 3],
      lapTimes: [10, 10, 10],
      bestTime: 10,
      sectorNumbers: [1, 1, 1, 1],
    });

    const laps = deriveLapInputs(result, points);
    expect(laps.map((l) => l.is_best)).toEqual([true, false, false]);
  });

  it("falls back to the index span when lapTimes is missing an entry", () => {
    const points = pointsAt([0, 3, 8]);
    const result = lapResult({
      crossingIndices: [0, 1, 2],
      lapTimes: [3], // second lap's time absent → derive from ts span (8-3=5s)
      bestTime: 3,
      sectorNumbers: [1, 1, 1],
    });

    const laps = deriveLapInputs(result, points);
    expect(laps[1].duration_ms).toBe(5000);
  });

  it("splits sectors at sector-number transitions within a lap", () => {
    // One lap (crossings at 0 and 4) crossing sectors 1 -> 2 at index 2.
    const points = pointsAt([0, 1, 2, 3, 4]);
    const result = lapResult({
      crossingIndices: [0, 4],
      lapTimes: [4],
      bestTime: 4,
      sectorNumbers: [1, 1, 2, 2, 2],
    });

    const laps = deriveLapInputs(result, points);
    expect(laps[0].sectors).toEqual([
      { sector_number: 1, duration_ms: 2000 }, // ts 0 -> 2
      { sector_number: 2, duration_ms: 2000 }, // ts 2 -> 4
    ]);
  });

  it("skips zero-duration and non-positive sector segments", () => {
    // A sector boundary that produces no elapsed time is dropped.
    const points = pointsAt([0, 0, 5]);
    const result = lapResult({
      crossingIndices: [0, 2],
      lapTimes: [5],
      bestTime: 5,
      sectorNumbers: [1, 2, 2],
    });

    const laps = deriveLapInputs(result, points);
    // The 1->2 transition at index 1 spans ts 0->0 (0ms) and is skipped; only
    // the sector-2 run ts 0->5 survives.
    expect(laps[0].sectors).toEqual([
      { sector_number: 2, duration_ms: 5000 },
    ]);
  });
});

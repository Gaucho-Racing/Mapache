import { describe, it, expect } from "vitest";
import { detectOutliers, OutlierConfig } from "@/lib/sessions/outliers";
import { GeoPoint } from "@/models/session";

// A tight cluster near a base lat/lon (jitter is a few meters in degrees).
function cluster(
  n: number,
  baseLat = 34.41,
  baseLon = -119.85,
  jitterDeg = 1e-5,
): GeoPoint[] {
  const pts: GeoPoint[] = [];
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo-jitter so tests are stable.
    const f = (i % 7) - 3; // -3..3
    pts.push({
      lat: baseLat + f * jitterDeg,
      lon: baseLon + ((i % 5) - 2) * jitterDeg,
      ts: i,
    });
  }
  return pts;
}

const sigma = (sigmaN = 3): OutlierConfig => ({
  sigmaOn: true,
  sigmaN,
  maxDistanceM: null,
});

describe("detectOutliers", () => {
  it("returns an all-false array when both detectors are off", () => {
    const pts = cluster(10);
    const flags = detectOutliers(pts, {
      sigmaOn: false,
      sigmaN: 3,
      maxDistanceM: null,
    });
    expect(flags).toHaveLength(10);
    expect(flags.some(Boolean)).toBe(false);
  });

  it("handles empty input", () => {
    expect(detectOutliers([], sigma())).toEqual([]);
  });

  it("flags a far-off point and leaves the cluster intact", () => {
    const pts = cluster(30);
    // ~1 km north — far outside the few-meter cluster.
    pts.push({ lat: 34.42, lon: -119.85, ts: 99 });
    const flags = detectOutliers(pts, sigma(3));
    expect(flags[flags.length - 1]).toBe(true);
    expect(flags.slice(0, 30).some(Boolean)).toBe(false);
  });

  it("flags both axes' outliers (true 2-D, not per-axis)", () => {
    // A point offset diagonally in BOTH lat and lon — a per-axis test with a
    // loose threshold could miss it; the radial test catches the combined
    // distance.
    const pts = cluster(30);
    pts.push({ lat: 34.415, lon: -119.845, ts: 99 });
    const flags = detectOutliers(pts, sigma(3));
    expect(flags[flags.length - 1]).toBe(true);
  });

  it("is robust: a second outlier does not mask the first (no masking)", () => {
    // With a non-robust mean/std, two far points inflate the std so neither is
    // flagged. Median + MAD ignore them, so both stay flagged.
    const pts = cluster(40);
    pts.push({ lat: 34.42, lon: -119.85, ts: 100 });
    pts.push({ lat: 34.42, lon: -119.84, ts: 101 });
    const flags = detectOutliers(pts, sigma(3));
    expect(flags[flags.length - 1]).toBe(true);
    expect(flags[flags.length - 2]).toBe(true);
    expect(flags.slice(0, 40).some(Boolean)).toBe(false);
  });

  it("does not flag a clean cluster (no false positives)", () => {
    const flags = detectOutliers(cluster(50), sigma(3));
    expect(flags.some(Boolean)).toBe(false);
  });

  it("does not flag everything when the spread is degenerate (MAD === 0)", () => {
    // All identical points -> MAD 0. The sigma test must disable, not flag all.
    const pts: GeoPoint[] = Array.from({ length: 10 }, (_, i) => ({
      lat: 34.41,
      lon: -119.85,
      ts: i,
    }));
    const flags = detectOutliers(pts, sigma(3));
    expect(flags.some(Boolean)).toBe(false);
  });

  it("honors the hard max-distance limit with sigma off", () => {
    const pts = cluster(20);
    // ~111 m east of the centroid (~0.001 deg lon * cos(34.41) * 111320).
    pts.push({ lat: 34.41, lon: -119.85 + 0.0012, ts: 99 });
    const flags = detectOutliers(pts, {
      sigmaOn: false,
      sigmaN: 3,
      maxDistanceM: 100,
    });
    expect(flags[flags.length - 1]).toBe(true);
    expect(flags.slice(0, 20).some(Boolean)).toBe(false);
  });

  it("does not flag points inside the hard limit", () => {
    const pts = cluster(20);
    // ~22 m east — inside a 100 m limit.
    pts.push({ lat: 34.41, lon: -119.85 + 0.00024, ts: 99 });
    const flags = detectOutliers(pts, {
      sigmaOn: false,
      sigmaN: 3,
      maxDistanceM: 100,
    });
    expect(flags.some(Boolean)).toBe(false);
  });

  it("a tighter sigmaN flags more aggressively than a looser one", () => {
    const pts = cluster(40);
    // A moderate excursion: present but not extreme.
    pts.push({ lat: 34.4103, lon: -119.85, ts: 99 });
    const tight = detectOutliers(pts, sigma(2)).filter(Boolean).length;
    const loose = detectOutliers(pts, sigma(8)).filter(Boolean).length;
    expect(tight).toBeGreaterThanOrEqual(loose);
  });

  it("returns flags parallel to the input length", () => {
    const pts = cluster(13);
    expect(detectOutliers(pts, sigma())).toHaveLength(13);
  });
});

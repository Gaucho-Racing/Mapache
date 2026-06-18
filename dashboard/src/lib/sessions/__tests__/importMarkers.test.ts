import { describe, it, expect } from "vitest";
import { reprojectImportedSegments } from "@/lib/sessions/importMarkers";
import { buildTransform } from "@/lib/sessions/geo";
import type { GeoPoint } from "@/models/session";

// Two overlapping GPS clouds around the same base so the source and target
// transforms differ (different centroids) but project into the same geography.
const BASE_LAT = 34.41;
const BASE_LON = -119.85;

function cloud(offsetLat = 0, offsetLon = 0): GeoPoint[] {
  const pts: GeoPoint[] = [];
  for (let i = 0; i < 5; i++) {
    pts.push({
      lat: BASE_LAT + offsetLat + i * 1e-4,
      lon: BASE_LON + offsetLon + i * 1e-4,
      ts: i,
    });
  }
  return pts;
}

describe("reprojectImportedSegments", () => {
  it("round-trips a marker through source-geo into target XY", () => {
    const sourceGeo = cloud();
    const targetGeo = cloud(); // identical cloud → identical transform
    const srcT = buildTransform(sourceGeo);
    const tgtT = buildTransform(targetGeo);

    // A marker line expressed in the SOURCE's normalized XY space: take two
    // known geo points, push them through the source transform to get source XY.
    const g1 = { lat: BASE_LAT + 1e-4, lon: BASE_LON + 1e-4 };
    const g2 = { lat: BASE_LAT + 2e-4, lon: BASE_LON + 2e-4 };
    const sx1 = srcT.toXY(g1.lat, g1.lon);
    const sx2 = srcT.toXY(g2.lat, g2.lon);

    const segments = { "S/F": [sx1, sx2] };
    const bounds = {
      minLat: BASE_LAT,
      maxLat: BASE_LAT + 5e-4,
      minLon: BASE_LON,
      maxLon: BASE_LON + 5e-4,
    };

    const { projected, overlaps } = reprojectImportedSegments(
      segments,
      srcT,
      tgtT,
      bounds,
    );

    // S/F maps to segment number 1.
    expect(Object.keys(projected)).toEqual(["1"]);
    expect(projected[1]).toHaveLength(2);

    // Identical transforms → projected target XY equals the original source XY.
    expect(projected[1][0][0]).toBeCloseTo(sx1[0], 6);
    expect(projected[1][0][1]).toBeCloseTo(sx1[1], 6);
    expect(projected[1][1][0]).toBeCloseTo(sx2[0], 6);
    expect(projected[1][1][1]).toBeCloseTo(sx2[1], 6);

    expect(overlaps).toBe(true);
  });

  it("uses only the first two points of each segment", () => {
    const geo = cloud();
    const t = buildTransform(geo);
    const p = t.toXY(BASE_LAT + 1e-4, BASE_LON + 1e-4);

    const segments = { "S/F": [p, p, p, p] };
    const { projected } = reprojectImportedSegments(segments, t, t, null);
    expect(projected[1]).toHaveLength(2);
  });

  it("ignores unknown segment names", () => {
    const geo = cloud();
    const t = buildTransform(geo);
    const p = t.toXY(BASE_LAT, BASE_LON);

    const { projected } = reprojectImportedSegments(
      { bogus: [p, p] },
      t,
      t,
      null,
    );
    expect(projected).toEqual({});
  });

  it("reports no overlap when the marker lands outside the padded bounds", () => {
    const sourceGeo = cloud();
    const srcT = buildTransform(sourceGeo);
    const tgtT = buildTransform(cloud());

    // A point far away (whole degree off) in source XY.
    const far = srcT.toXY(BASE_LAT + 1, BASE_LON + 1);
    const segments = { "S/F": [far, far] };
    const bounds = {
      minLat: BASE_LAT,
      maxLat: BASE_LAT + 5e-4,
      minLon: BASE_LON,
      maxLon: BASE_LON + 5e-4,
    };

    const { overlaps } = reprojectImportedSegments(
      segments,
      srcT,
      tgtT,
      bounds,
    );
    expect(overlaps).toBe(false);
  });

  it("never overlaps when bounds is null but still projects", () => {
    const geo = cloud();
    const t = buildTransform(geo);
    const p = t.toXY(BASE_LAT + 1e-4, BASE_LON + 1e-4);

    const { projected, overlaps } = reprojectImportedSegments(
      { "S/F": [p, p] },
      t,
      t,
      null,
    );
    expect(overlaps).toBe(false);
    expect(projected[1]).toHaveLength(2);
  });
});

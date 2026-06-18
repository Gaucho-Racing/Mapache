import { describe, it, expect } from "vitest";
import { formatMetric } from "@/lib/format";

// The legacy per-site formatter formatMetric replaces (QueryChart/SignalWidget/
// SignalsPage all shared this k/M shape; QueryChart additionally formatted
// sub-1000 fractions to 2 decimals, which is the superset kept here).
function legacy(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  if (abs < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

describe("formatMetric", () => {
  it("formats sub-1000 integers verbatim", () => {
    expect(formatMetric(0)).toBe("0");
    expect(formatMetric(42)).toBe("42");
    expect(formatMetric(999)).toBe("999");
  });

  it("formats sub-1000 fractions to two decimals", () => {
    expect(formatMetric(3.14159)).toBe("3.14");
    expect(formatMetric(0.5)).toBe("0.50");
  });

  it("abbreviates thousands with one decimal", () => {
    expect(formatMetric(1_000)).toBe("1.0k");
    expect(formatMetric(12_345)).toBe("12.3k");
    expect(formatMetric(999_999)).toBe("1000.0k");
  });

  it("abbreviates millions with two decimals", () => {
    expect(formatMetric(1_000_000)).toBe("1.00M");
    expect(formatMetric(1_250_000)).toBe("1.25M");
  });

  it("preserves sign via magnitude", () => {
    expect(formatMetric(-42)).toBe("-42");
    expect(formatMetric(-3.14159)).toBe("-3.14");
    expect(formatMetric(-12_345)).toBe("-12.3k");
  });

  it("matches the legacy per-site formatter across a sweep", () => {
    const samples = [
      0, 1, 42, 999, 1000, 1234, 9999, 12_345, 250_000, 999_999, 1_000_000,
      1_250_000, 42_000_000, -1, -1234, -2_500_000, 3.14159, 0.001, -0.5,
    ];
    for (const n of samples) expect(formatMetric(n)).toBe(legacy(n));
  });
});

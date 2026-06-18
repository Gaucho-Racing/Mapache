import { describe, it, expect } from "vitest";
import {
  buildSeriesVariables,
  compileAgainstSeries,
  computeDerivedSeries,
  type NamedSeries,
} from "@/components/signals/DerivedTraces";
import { DERIVED_KEY, type Series } from "@/components/signals/QueryChart";
import type { DerivedTrace } from "@/lib/expr";

// A small bucketed series; the bucket label is opaque to the math (alignment is
// purely by index), so plain "b{i}" strings suffice.
function series(values: (number | null)[]): Series {
  return {
    tags: { name: "sig" },
    points: values.map((value, i) => ({ bucket: `b${i}`, value })),
  };
}

function trace(
  id: string,
  expression: string,
  name?: string,
): DerivedTrace & { name?: string } {
  return { id, label: name ?? expression, expression, name };
}

describe("named-series variables (-> name as a first-class variable)", () => {
  it("exposes an explicit -> name alongside the positional sN alias", () => {
    const vars = buildSeriesVariables([
      { series: series([1]), name: "power" },
      { series: series([2]) },
    ]);
    expect(vars[0].index).toBe("s0");
    expect(vars[0].name).toBe("power");
    expect(vars[1].index).toBe("s1");
    expect(vars[1].name).toBeNull();
  });

  it("resolves and computes over explicit names (x + y)", () => {
    const pool: NamedSeries[] = [
      { series: series([1, 2, 3]), name: "x" },
      { series: series([10, 20, 30]), name: "y" },
    ];
    const ev = compileAgainstSeries("x + y", pool);
    expect(ev.ok).toBe(true);
    expect(ev.evalAt?.(0)).toBe(11);
    expect(ev.evalAt?.(1)).toBe(22);
    expect(ev.evalAt?.(2)).toBe(33);
  });

  it("keeps positional sN aliases working for back-compat", () => {
    const pool: NamedSeries[] = [
      { series: series([4, 5]), name: "x" },
      { series: series([6, 7]), name: "y" },
    ];
    const ev = compileAgainstSeries("s0 * s1", pool);
    expect(ev.ok).toBe(true);
    expect(ev.evalAt?.(0)).toBe(24);
    expect(ev.evalAt?.(1)).toBe(35);
  });

  it("computes min/max over named series", () => {
    const pool: NamedSeries[] = [
      { series: series([1, 9, 3]), name: "x" },
      { series: series([5, 2, 8]), name: "y" },
    ];
    const lo = compileAgainstSeries("min(x, y)", pool);
    expect(lo.ok).toBe(true);
    expect(lo.evalAt?.(0)).toBe(1);
    expect(lo.evalAt?.(1)).toBe(2);
    expect(lo.evalAt?.(2)).toBe(3);

    const hi = compileAgainstSeries("max(x, y)", pool);
    expect(hi.ok).toBe(true);
    expect(hi.evalAt?.(0)).toBe(5);
    expect(hi.evalAt?.(1)).toBe(9);
    expect(hi.evalAt?.(2)).toBe(8);
  });

  it("surfaces a duplicate -> name as a compile error (not a flat line)", () => {
    const pool: NamedSeries[] = [
      { series: series([1, 2]), name: "x" },
      { series: series([3, 4]), name: "x" },
    ];
    const ev = compileAgainstSeries("x + 1", pool);
    expect(ev.ok).toBe(false);
    expect(ev.error).toMatch(/duplicate series name/i);
    expect(ev.error).toMatch(/\bx\b/);
  });

  it("surfaces an unknown variable as a compile error", () => {
    const pool: NamedSeries[] = [{ series: series([1, 2]), name: "x" }];
    const ev = compileAgainstSeries("x + bogus", pool);
    expect(ev.ok).toBe(false);
    expect(ev.error).toMatch(/unknown variable/i);
    expect(ev.error).toMatch(/bogus/);
  });
});

describe("computeDerivedSeries (named results referenceable downstream)", () => {
  const base = [series([2, 4, 6]), series([1, 2, 3])];

  it("lets a later expression reference an earlier -> name", () => {
    const traces = [
      trace("t0", "s0", "a"), // a = [2,4,6]
      trace("t1", "s1", "b"), // b = [1,2,3]
      trace("t2", "a + b"), // [3,6,9]
    ];
    const results = computeDerivedSeries(base, traces);
    expect(results.find((r) => r.id === "t0")?.error).toBeUndefined();
    expect(results.find((r) => r.id === "t1")?.error).toBeUndefined();
    const sum = results.find((r) => r.id === "t2");
    expect(sum?.error).toBeUndefined();
    expect(sum?.series?.points.map((p) => p.value)).toEqual([3, 6, 9]);
    expect(sum?.series?.tags[DERIVED_KEY]).toBe("a + b");
  });

  it("computes min(x, y) -> lo over two named series", () => {
    const traces = [
      trace("t0", "s0", "x"), // [2,4,6]
      trace("t1", "s1", "y"), // [1,2,3]
      trace("t2", "min(x, y)", "lo"), // [1,2,3]
    ];
    const results = computeDerivedSeries(base, traces);
    const lo = results.find((r) => r.id === "t2");
    expect(lo?.error).toBeUndefined();
    expect(lo?.series?.points.map((p) => p.value)).toEqual([1, 2, 3]);
  });

  it("flags a duplicate -> name on the offending row even as the final pair", () => {
    const traces = [
      trace("t0", "s0", "dup"),
      trace("t1", "s1", "dup"),
    ];
    const results = computeDerivedSeries(base, traces);
    expect(results.find((r) => r.id === "t0")?.error).toBeUndefined();
    const second = results.find((r) => r.id === "t1");
    expect(second?.error).toMatch(/duplicate series name/i);
    expect(second?.series).toBeUndefined();
  });

  it("flags an unknown variable in a derived expression", () => {
    const traces = [trace("t0", "s0 + nope", "out")];
    const results = computeDerivedSeries(base, traces);
    const r = results.find((r) => r.id === "t0");
    expect(r?.error).toMatch(/unknown variable/i);
    expect(r?.error).toMatch(/nope/);
  });
});

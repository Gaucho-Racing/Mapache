import { describe, it, expect } from "vitest";
import { looksLikeFetchQuery } from "@/lib/query";

describe("looksLikeFetchQuery", () => {
  it("classifies an aggregator over a known field as a fetch", () => {
    expect(looksLikeFetchQuery("min(value)")).toBe(true);
    expect(looksLikeFetchQuery("max(raw_value)")).toBe(true);
    expect(looksLikeFetchQuery("count(signal)")).toBe(true);
    expect(looksLikeFetchQuery("avg(value)")).toBe(true);
  });

  it("does NOT classify a min/max derived expression as a fetch", () => {
    // The regression: min/max are also expr.ts functions. A multi-arg call
    // whose first arg isn't a field must route to the expression evaluator.
    expect(looksLikeFetchQuery("min(s0, s1) -> lo")).toBe(false);
    expect(looksLikeFetchQuery("max(a, b)")).toBe(false);
    expect(looksLikeFetchQuery("min(s0, s1)")).toBe(false);
  });

  it("treats a known-field fetch as a fetch even with trailing methods/labels", () => {
    expect(looksLikeFetchQuery('count(signal).where(name = "ecu*")')).toBe(true);
    expect(looksLikeFetchQuery("count(signal).by(name)")).toBe(true);
    expect(looksLikeFetchQuery('avg(value).where(name = "x") -> v')).toBe(true);
  });

  it("keeps a field-valid but otherwise-broken fetch as a fetch (inline error)", () => {
    // First arg is a known field, so it stays a fetch; the parser surfaces the
    // method typo inline rather than misrouting to the expression evaluator.
    expect(looksLikeFetchQuery("avg(value).wherx(1)")).toBe(true);
  });

  it("routes non-aggregator and unknown-field calls to expr", () => {
    expect(looksLikeFetchQuery("s0 + s1")).toBe(false);
    expect(looksLikeFetchQuery("abs(s0)")).toBe(false); // abs: expr-only fn
    expect(looksLikeFetchQuery("avg(speed)")).toBe(false); // unknown field
    expect(looksLikeFetchQuery("(s0 + s1) / 2 -> mid")).toBe(false);
  });

  it("handles whitespace inside the call", () => {
    expect(looksLikeFetchQuery("  min( value ) ")).toBe(true);
    expect(looksLikeFetchQuery("min( s0 , s1 )")).toBe(false);
  });
});

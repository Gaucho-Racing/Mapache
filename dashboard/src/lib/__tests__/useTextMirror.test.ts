import { describe, it, expect } from "vitest";
import { mirrorNext } from "@/lib/useTextMirror";

// Exercises the caret-preservation decision the hook delegates to. Rendering
// the hook itself isn't possible under the node test environment, so the rule
// is tested in isolation.
describe("mirrorNext", () => {
  it("overwrites the buffer on an external change", () => {
    const r = mirrorNext("b", "a", false);
    expect(r).toEqual({ overwrite: true, text: "b", lastSeen: "b" });
  });

  it("never overwrites on a self-edit echo (preserves caret)", () => {
    // The user typed; the resulting serialized value arrives. Even though it
    // differs from lastSeen, we must not clobber the local text.
    const r = mirrorNext("count(x)", "count(", true);
    expect(r.overwrite).toBe(false);
    // ...but it records the value so the NEXT external change is detected.
    expect(r.lastSeen).toBe("count(x)");
  });

  it("does nothing when the serialized value is unchanged", () => {
    const r = mirrorNext("same", "same", false);
    expect(r).toEqual({ overwrite: false, lastSeen: "same" });
  });

  it("after a self-edit, a later genuine external change overwrites", () => {
    // First: self-edit echo for "a" — consumed, no overwrite.
    let lastSeen = "a";
    const echo = mirrorNext("a", lastSeen, true);
    lastSeen = echo.lastSeen;
    expect(echo.overwrite).toBe(false);
    // Then: parent pushes "z" with no self-edit — must overwrite.
    const external = mirrorNext("z", lastSeen, false);
    expect(external).toEqual({ overwrite: true, text: "z", lastSeen: "z" });
  });
});

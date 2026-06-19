import { useEffect, useRef, useState } from "react";

// Decide how a text mirror reacts to a new serialized value from the parent.
// Pure so the caret-preservation rule can be unit-tested without rendering.
//
//   - self-edit echo: never overwrite (that would yank the caret); just record
//     the value as seen so the *next* external change is detected.
//   - external change (serialized moved on its own): overwrite the local text.
//   - unchanged: do nothing.
export function mirrorNext(
  incoming: string,
  lastSeen: string,
  selfEdited: boolean,
): { overwrite: boolean; text?: string; lastSeen: string } {
  if (selfEdited) return { overwrite: false, lastSeen: incoming };
  if (incoming !== lastSeen) return { overwrite: true, text: incoming, lastSeen: incoming };
  return { overwrite: false, lastSeen };
}

/**
 * Two-way mirror between a serialized value owned by the parent and a freely
 * editable local text buffer. While the user types, the local text is the
 * source of truth (so the caret never jumps); the parent's serialized value
 * only re-seeds the buffer when it changes on its own (e.g. a chip edit).
 *
 * @param serialized current serialized value from the parent
 * @param onChange   called with the raw text on each user edit
 * @returns `[text, onTextChange]`
 */
export function useTextMirror(
  serialized: string,
  onChange: (next: string) => void,
): [string, (next: string) => void] {
  const [text, setText] = useState(serialized);
  const lastSeen = useRef(serialized);
  // Distinguishes the echo of our own edit (skip overwrite) from a parent-driven
  // change (apply). Mirrors the guard the chip/MQL editors used inline.
  const selfEdited = useRef(false);

  useEffect(() => {
    const next = mirrorNext(serialized, lastSeen.current, selfEdited.current);
    selfEdited.current = false;
    lastSeen.current = next.lastSeen;
    if (next.overwrite) setText(next.text as string);
  }, [serialized]);

  const onTextChange = (next: string) => {
    selfEdited.current = true;
    setText(next);
    onChange(next);
  };

  return [text, onTextChange];
}

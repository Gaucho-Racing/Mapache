import { looksLikeFetchQuery, parseQuery } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Raw MQL editor — the "everything editable in one text window" surface.
//
// A widget owns an ordered list of trace statements (`{ id, mql }`). The chip
// rows and this textarea are two views of the SAME list: this editor renders
// one statement per line and, on every edit, splits the text back into
// `QueryStmt[]` (blank lines ignored), preserving ids BY INDEX so React keys
// and per-trace state stay stable while the user types. Fetch lines are
// parse-checked for an inline hint; expression lines (`s0 / s1`) are left
// alone (they're validated in-browser by the evaluator, not here).
// ---------------------------------------------------------------------------

export interface QueryStmt {
  id: string;
  mql: string;
}

let mqlSeq = 0;
/** Stable id for a freshly-introduced statement line. Exported so the chart-type
 *  registry's default-trace factories mint ids of the same `tr_` shape. */
export function newStmtId(): string {
  mqlSeq += 1;
  return `tr_${mqlSeq}_${Date.now().toString(36)}`;
}

/** Split editor text into statements: one non-blank line each. Ids are reused
 *  positionally from the previous list (line 0 keeps `prev[0].id`, …) so the
 *  identity of an edited line is preserved as long as line order is stable;
 *  newly-added lines get a fresh id. This keeps chip-view state aligned with
 *  the text the user typed. */
export function textToQueries(text: string, prev: QueryStmt[]): QueryStmt[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
  if (lines.length === 0) {
    // Never leave a widget with zero queries — collapse to a single default.
    return [{ id: prev[0]?.id ?? newStmtId(), mql: "count(signal)" }];
  }
  return lines.map((mql, i) => ({ id: prev[i]?.id ?? newStmtId(), mql }));
}

/** Render the statement list back to editor text — one mql per line. */
export function queriesToText(queries: QueryStmt[]): string {
  return queries.map((t) => t.mql).join("\n");
}

interface MqlEditorProps {
  queries: QueryStmt[];
  onChange: (next: QueryStmt[]) => void;
}

export function MqlEditor({ queries, onChange }: MqlEditorProps) {
  // Local text state so the textarea is freely editable (including blank
  // lines mid-edit) without the parent's normalized list yanking the caret.
  // We re-sync from the incoming queries only when they describe DIFFERENT text
  // than what's on screen (e.g. a chip edit happened while collapsed, or the
  // toggle just opened) — never on our own keystrokes, which would fight the
  // cursor.
  const [text, setText] = useState(() => queriesToText(queries));
  const incoming = useMemo(() => queriesToText(queries), [queries]);
  // Track the last text we emitted upward so we can tell an external change
  // (chips) from the echo of our own edit.
  const lastEmitted = useRef(incoming);
  useEffect(() => {
    if (incoming !== lastEmitted.current) {
      setText(incoming);
      lastEmitted.current = incoming;
    }
  }, [incoming]);

  function handle(next: string) {
    setText(next);
    const queries = textToQueries(next, prevRef.current);
    prevRef.current = queries;
    lastEmitted.current = queriesToText(queries);
    onChange(queries);
  }

  // Keep the latest list for positional id reuse without it being a render dep.
  const prevRef = useRef(queries);
  prevRef.current = queries;

  // Per-line parse hints for fetch lines (skip blank + expression lines).
  const lineErrors = useMemo(() => {
    const out: { line: number; message: string }[] = [];
    const lines = text.split("\n");
    lines.forEach((raw, i) => {
      const line = raw.trim();
      if (line === "") return;
      if (!looksLikeFetchQuery(line)) return; // expression line — not parsed here
      const res = parseQuery(line);
      if (!res.ok) out.push({ line: i + 1, message: res.error.message });
    });
    return out;
  }, [text]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        MQL — one query per line
      </span>
      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        spellCheck={false}
        rows={Math.max(3, text.split("\n").length + 1)}
        className={cn(
          "w-full resize-y rounded-md border bg-muted/30 px-2.5 py-2 font-mono text-xs leading-6 text-foreground/90 outline-none focus:border-primary/40",
        )}
        placeholder={"count(signal).where(name = \"ecu*\") -> ecu\ncount(signal).where(name != \"ecu*\") -> other\necu / other -> ratio"}
      />
      {lineErrors.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {lineErrors.map((e) => (
            <p key={e.line} className="text-xs text-destructive">
              line {e.line}: {e.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

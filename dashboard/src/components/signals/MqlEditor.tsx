import { looksLikeFetchQuery, parseQuery } from "@/lib/query";
import { cn } from "@/lib/utils";
import { useTextMirror } from "@/lib/useTextMirror";
import { useMemo, useRef } from "react";

// Raw MQL editor — one statement per line, the textual view of the same
// `QueryStmt[]` the chip rows edit. Splits text back to statements on every
// edit, reusing ids by index so React keys stay stable. Fetch lines get an
// inline parse hint; expression lines are validated in-browser elsewhere.

export interface QueryStmt {
  id: string;
  mql: string;
}

let mqlSeq = 0;
/** Stable id for a new statement line; shares the `tr_` shape the chart-type
 *  registry's default-trace factories mint. */
export function newStmtId(): string {
  mqlSeq += 1;
  return `tr_${mqlSeq}_${Date.now().toString(36)}`;
}

/** Split editor text into statements (one non-blank line each), reusing ids
 *  positionally from `prev` so an edited line keeps its identity. */
export function textToQueries(text: string, prev: QueryStmt[]): QueryStmt[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
  if (lines.length === 0) {
    // Never leave a widget with zero queries.
    return [{ id: prev[0]?.id ?? newStmtId(), mql: "count(signal.name)" }];
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
  // Latest list for positional id reuse, kept out of the render deps.
  const prevRef = useRef(queries);
  prevRef.current = queries;

  // Local text mirrors the serialized statement list, but stays the source of
  // truth while typing so the caret never jumps on the parent's normalization.
  const incoming = useMemo(() => queriesToText(queries), [queries]);
  const [text, handle] = useTextMirror(incoming, (next) => {
    const parsed = textToQueries(next, prevRef.current);
    prevRef.current = parsed;
    onChange(parsed);
  });

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
        placeholder={"count(signal.name).where(name = \"ecu*\") -> ecu\ncount(signal.name).where(name != \"ecu*\") -> other\necu / other -> ratio"}
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

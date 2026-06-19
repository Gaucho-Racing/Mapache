import { BACKEND_URL } from "@/consts/config";
import { http } from "@/lib/http";
import type { Series } from "@/components/signals/QueryChart";

/** One aligned row from /query/pairs: a produced_at ISO plus a numeric (or
 *  null) value per requested signal, keyed by signal name. */
export type PairRow = Record<string, string | number | null>;

/** Bare body of POST /query/pairs (the gateway unwraps the `{data: ...}`
 *  envelope, so callers read `res.data.data`). */
export interface PairsResponse {
  columns: string[];
  rows: PairRow[];
}

export interface FetchPairsArgs {
  vehicleId: string;
  signals: string[];
  startIso: string;
  endIso: string;
  toleranceMs?: number;
  /** Cap on rows returned — decimated in SQL server-side. */
  maxPoints?: number;
}

/** Fetch time-aligned paired samples for 2+ signals over a window. Returns the
 *  bare `{columns, rows}` body (unwrapped from the gateway envelope). */
export async function fetchPairs({
  vehicleId,
  signals,
  startIso,
  endIso,
  toleranceMs = 50,
  maxPoints = 5000,
}: FetchPairsArgs): Promise<PairsResponse> {
  const res = await http.post(
    `${BACKEND_URL}/query/pairs`,
    {
      vehicle_id: vehicleId,
      signals,
      start: startIso,
      end: endIso,
      tolerance_ms: toleranceMs,
      max_points: maxPoints,
    },
  );
  const body = res.data?.data ?? res.data;
  return {
    columns: body?.columns ?? ["produced_at"],
    rows: body?.rows ?? [],
  };
}

/** Pull a numeric column out of the aligned rows, dropping any row where the
 *  cell is missing/non-finite. Returns one number per row index kept. */
export function numericColumn(rows: PairRow[], name: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[name];
    if (typeof v === "number" && Number.isFinite(v)) out.push(v);
  }
  return out;
}

/** Adapt aligned XY rows into the `Series` shape the export helpers understand
 *  (one Series per non-time column), so the plot widget can reuse
 *  `seriesToCsv`/`seriesToJson`. */
export function pairsToSeries(resp: PairsResponse): Series[] {
  const valueCols = resp.columns.filter((c) => c !== "produced_at");
  return valueCols.map((col) => ({
    tags: { name: col },
    points: resp.rows.map((r) => ({
      bucket: String(r["produced_at"] ?? ""),
      value: typeof r[col] === "number" ? (r[col] as number) : null,
    })),
  }));
}

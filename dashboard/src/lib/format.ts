// Compact metric formatter for the signals charts/tables: axis ticks, tooltip
// values, the "N total" header, and the collected-signals count column. Differs
// from job-stream's formatCount (k/0-decimal at >=10k, B suffix), which stays
// the abbreviator for dense job/debug counts — see lib/job-stream.ts.
//
//   sub-1000 integer  -> as-is        (e.g. 42 -> "42")
//   sub-1000 fraction -> 2 decimals   (e.g. 3.14159 -> "3.14")
//   [1e3, 1e6)        -> 1 decimal k  (e.g. 12345 -> "12.3k")
//   >= 1e6            -> 2 decimal M  (e.g. 1_250_000 -> "1.25M")
//
// Negatives are formatted by magnitude, so the sign is preserved.
export function formatMetric(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  if (abs < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

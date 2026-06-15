# Signals Page Overhaul — Progress Tracker

Branch: `feat/signals-overhaul` (off `main`). One commit per task. **Add, never remove** —
all current behavior (chip grouping, bar/line/area toggle, brush-select timeframe, top-K
rollup, signal discovery table) must keep working.

Locked decisions: chart lib → **ECharts**; query surface → **cleaner chip builder only**
(keep MQL AST); derived traces + highlight boxes → **frontend-computed**; layout →
**stacked panels, shared/synced time axis**.

Full plan: `~/.claude/plans/i-have-a-bunch-gentle-engelbart.md`.

## Resume here
➡️ **T1 — Sub-second binning** (next `todo`)

After `/clear`: read this file, then run
`git log --oneline main..feat/signals-overhaul`. The first `todo` row below is next.

## Tasks

| ID | Task | Status | Commit | Note |
|----|------|--------|--------|------|
| T0 | Branch + tracking scaffold | done | _(this commit)_ | branch `feat/signals-overhaul` created |
| T1 | Sub-second binning (backend + frontend mirror) | todo | — | |
| T2 | Swap Recharts → ECharts in chart component | todo | — | |
| T3 | Stacked multi-widget layout, shared time axis | todo | — | |
| T4 | Cleaner chip query builder | todo | — | |
| T5 | Derived/expression traces (frontend compute) | todo | — | |
| T6 | Highlight regions / boxes (frontend compute) | todo | — | |
| T7 | Export (CSV data + PNG chart) | todo | — | |

## Task detail

### T1 — Sub-second binning
Add sub-second rollups (`500ms`, `100ms`, `50ms`, `16ms`). Backend: `ROLLUP_INTERVALS`
in `query/query/service/query_lang.py`, `INTERVALS` map in
`query/query/service/signals.py` (confirm ClickHouse handles `INTERVAL n MILLISECOND` /
ms-epoch `intDiv`). Frontend mirror: `ROLLUP_INTERVALS` in `dashboard/src/lib/query.ts`
+ auto-interval picker in `SignalsPage.tsx`.
**Check:** `50ms` rollup on a 60 Hz signal returns ~20 buckets/sec.

### T2 — Recharts → ECharts
Rewrite `dashboard/src/components/signals/QueryChart.tsx` on ECharts (canvas). Preserve
bar/line/area, `onBrushSelect`, top-K "+N other", tooltip, palette, null handling. Drop
the 20k confirm gate. Add `echarts` to `dashboard/package.json`.
**Check:** existing queries render identically; >20k points render without the gate.

### T3 — Stacked multi-widget layout, shared x-axis
`SignalsPage.tsx`: one chart → ordered list of chart widgets, each with its own query.
Add / delete / hide. Vertical stack; synced x-axis + time cursor (ECharts `connect` /
linked `axisPointer`).
**Check:** two panels scrub together with one cursor; add/remove/hide work.

### T4 — Cleaner chip query builder
Redesign `dashboard/src/components/signals/QueryBuilder.tsx` to read naturally; keep chip
flow, fuzzy search, wildcard expansion, grouping schema. Same MQL AST (`lib/query.ts`),
no grammar change.
**Check:** every query expressible today still is; reads cleaner.

### T5 — Derived / expression traces (frontend)
Trace defined as a function of other fetched series (`current_ac^2`, ratios, sums).
Expression input per trace; evaluate in-browser over the aligned (zero-filled) bucket
axis. Safe evaluator; no backend change.
**Check:** `current_ac^2` plots correctly vs the raw `current_ac` trace.

### T6 — Highlight regions / boxes (frontend)
Shade regions where a condition holds (throttle = 100%) via ECharts `markArea`. Detection
in-browser (reuses T5 evaluator to threshold). Boxes span the stacked panels.
**Check:** "throttle = 100%" paints red bands across all panels at the right times.

### T7 — Export
CSV of underlying series points + PNG via ECharts `getDataURL`. Export control on
widget/page.
**Check:** CSV columns correct; PNG matches on-screen chart.

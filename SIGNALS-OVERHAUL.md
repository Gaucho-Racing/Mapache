# Signals Page Overhaul — Progress Tracker

Branch: `feat/signals-overhaul` (off `main`). One commit per task. **Add, never remove** —
all current behavior (chip grouping, bar/line/area toggle, brush-select timeframe, top-K
rollup, signal discovery table) must keep working.

Locked decisions: chart lib → **ECharts**; query surface → **cleaner chip builder only**
(keep MQL AST); derived traces + highlight boxes → **frontend-computed**; layout →
**stacked panels, shared/synced time axis**.

Full plan: `~/.claude/plans/i-have-a-bunch-gentle-engelbart.md`.

## Resume here
➡️ **T5 — Derived/expression traces** (next `todo`)

After `/clear`: read this file, then run
`git log --oneline main..feat/signals-overhaul`. The first `todo` row below is next.

## Tasks

| ID | Task | Status | Commit | Note |
|----|------|--------|--------|------|
| T0 | Branch + tracking scaffold | done | 5453ffe | branch `feat/signals-overhaul` created |
| T1 | Sub-second binning (backend + frontend mirror) | done | 0cc4601 | added 16/50/100/500ms; ms-based steps; native CH MILLISECOND interval. Needs live-CH smoke test |
| T2 | Swap Recharts → ECharts in chart component | done | 1660347 | echarts core (canvas), brush via zrender, top-K/stack/tooltip preserved, 20k gate removed; empty-state made overlay so init is robust for T3 |
| T3 | Stacked multi-widget layout, shared time axis | done | dc32f0d | new SignalWidget.tsx (owns query/chart-type/fetch); page holds widgetIds+hiddenIds, add/delete/hide; synced cursor via echarts.connect group "signals-page" (additive groupId prop on QueryChart); brush bubbles to shared timeframe |
| T4 | Cleaner chip query builder | done | 94458f6 | sentence-style clauses (Show…of…where…grouped by…every…), same MQL AST, sub-second rollups reachable |
| T9 | Zoom out / reset window (in-chart, no requery) | done | ea79fdc | inside dataZoom on mouse-wheel (brush keeps left-drag→requery); page-level Zoom out / Reset dispatch to connect group via onReady instances; no network on zoom. Fixed initial-mount crash: getOption() is undefined before first setOption |
| T5 | Derived/expression traces (frontend compute) | todo | — | |
| T8 | Per-trace normalization w/ shared-scale groups | todo | — | multi-y-axis; builds on T3/T5 trace model |
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

### T8 — Per-trace normalization with shared-scale groups (frontend)
Let a trace be **normalized-to-fit** (opt-in per trace) so e.g. a boolean `drive_enable`
(0/1) is rescaled so its `1` reaches the top of the plot, while same-unit traces keep a
shared real scale relative to each other. Concretely: assign traces to a y-scale group;
a "normalize" trace is min/max-rescaled to span a reference group's range, while members
of a native-unit group (e.g. three °C temps) share one axis and are NOT rescaled against
each other. Implement with ECharts multiple `yAxis` + per-trace data scaling; tooltip
should still show the true (un-normalized) value. Builds on the T3/T5 trace model.
**Check:** drive_enable's 1 reaches the top of a plot shared with motor/accumulator/
controller temps; the three temps stay on one shared °C axis, un-rescaled vs each other;
tooltip shows real values.

### T9 — Zoom out / reset window (frontend)
In-chart zoom (ECharts `dataZoom`, inside + optional slider) with an easy way to **step
back out** and **reset** to the originally-queried window — without a full requery. Synced
across the stacked shared-axis panels (T3). Full reset is best-effort (user can always
re-query a wider range); the priority is jumping back out after zooming too far in.
**Check:** zoom into a window on one panel, all panels follow; "zoom out"/"reset"
returns to the queried range; no network requery fired.

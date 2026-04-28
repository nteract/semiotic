# Outstanding Work

Last updated 2026-04-26.

This file is the active backlog only. Completed work belongs in `CHANGELOG.md`, not here.

## Priority Order

1. Release confidence and documentation correctness.
2. Public API coherence and agent-facing behavior contracts.
3. Rendering/test coverage that catches silent visual regressions.
4. Performance work with clear profiling or scale justification.
5. Product extensions that are useful but not release blockers.

---

## P0

### API Reference Documentation

Baseline exists: `typedoc.json`, `docs:api:json`, `/api/charts`, `/api/typedoc`, and source-level JSDoc with at least 2 `@example` blocks on every HOC (38/38 covered as of 2026-04-26).

Next work:
- Periodic JSDoc audit: when a new prop ships without an `@example`/`@default`, the test-quality baseline should flag it. Today the only check is "TypeDoc resolves the type" — no minimum doc surface enforced.

### Chart Spec Registry (Schema/Validation/MCP Consolidation)

**Phase 1 + Phase 2 shipped (2026-04-26).** `chartSpecs.ts` exists with all 15 ordinal charts, three pure-function generators (`generateSchemaToolEntry`, `generateValidationMapEntry`, `generateMetadataEntry`), and a 45-test round-trip suite that locks in deep structural validationMap equivalence per chart. `check:chart-specs` is wired up. Drift annotations preserve canonical schema during the migration; Phase 3 re-baselines schema.json to match registry output.

Three files describe each chart's prop surface in different shapes today, and adding a chart means three coordinated edits plus three drift-detection checks (`check:schema`, `check:surface`, `check:ai-contracts`). The hand-curation cost compounds: schema enums, validation type unions, and MCP renderability flags all encode the same "what props does this chart accept?" knowledge in three places.

Plan: introduce a single TypeScript registry as the source of truth for the chart spec triad and emit the existing files via generators. TypeDoc continues to read `.tsx` source for per-prop types (no change). Docs pages (`docs/src/pages/charts/*.js`) stay handwritten because their value is per-chart narrative, not bullet-list coverage. `behaviorContracts.cjs` stays separate — cross-cutting semantic rules don't fit a per-chart spec.

**Source-of-truth shape** (`src/components/charts/shared/chartSpecs.ts`):

```ts
export interface ChartSpec {
  name: string                                       // "BarChart"
  category: "xy" | "ordinal" | "network" | "geo"
  importPath: string                                 // "semiotic/ordinal"
  renderable: boolean                                // can MCP renderChart use it?
  description: string                                // schema.tools[].function.description
  props: Record<string, ChartPropSpec>               // every public prop
  required: string[]                                 // schema-level required (push mode handled separately)
  dataShape: "array" | "object" | "network" | "realtime" | "none"
  dataAccessors: string[]                            // accessor props validated against data shape
}

export interface ChartPropSpec {
  type: PropType | PropType[]
  enum?: readonly string[]
  default?: unknown                                  // shows in schema + JSDoc generation later
  description?: string                               // surfaces in schema + MCP getSchema
}

export const CHART_SPECS: Record<string, ChartSpec> = { /* one entry per HOC */ }
```

**Generators** (each emits an existing file, byte-identical to today's hand-edited version):

- `scripts/generate-schema-json.mjs` → `ai/schema.json`. Walks `CHART_SPECS`, emits the JSON Schema tool array. Keeps existing structure so MCP and `--doctor` don't change.
- `scripts/generate-validation-map.mjs` → `src/components/charts/shared/validationMap.ts`. Emits the `VALIDATION_MAP` const using existing composition helpers (`commonProps`, axis prop bags). The `dataShape` and `dataAccessors` fields drive the runtime `validateArrayData`/`validateNetworkData` dispatch.
- `scripts/generate-component-metadata.mjs` → `ai/componentMetadata.cjs`. Emits the `COMPONENT_METADATA` map plus the `componentIndexFromSchema` helper.

**CI gate**: a new `check:chart-specs` runs all three generators into temp files and `git diff`s against the committed copies. Non-empty diff = fail with "run `npm run docs:chart-specs` and commit". Replaces the now-redundant `check:schema` (drift between `schema.json` and `validationMap.ts` becomes impossible by construction). `check:surface` stays — it covers parity beyond the registry's scope (renderability vs. actual `componentRegistry.ts` keys).

**Phased migration** so the diff is reviewable at each step:

1. ✅ **Phase 1 — Shape proof (shipped).** `chartSpecs.ts` with BarChart, three generators, three round-trip tests. `check:chart-specs` gate.

2. ✅ **Phase 2 — Categorical family (shipped).** All 15 ordinal charts in `chartSpecs.ts`. 45 round-trip tests. `validationMap` round-trip is byte-for-byte; schema round-trip asserts structural envelope only (canonical schema entries are individually hand-curated and inconsistent — Phase 3 re-baselines).

3. ✅ **Phase 3 — Re-baseline schema.json + XY/network/geo migration (shipped).** All 38 non-realtime charts (15 ordinal + 12 XY + 7 network + 4 geo) registered in `chartSpecs.ts`. Schema round-trip is byte-for-byte. `ai/schema.json` regenerates 38 of 43 entries from CHART_SPECS; the remaining 5 are the realtime charts, preserved canonical-only at this point.

4. ✅ **Phase 4 — Realtime migration + retire compensating gates (shipped).** All 5 realtime charts (`RealtimeLineChart`, `RealtimeHistogram`, `RealtimeSwarmChart`, `RealtimeWaterfallChart`, `RealtimeHeatmap`) registered via a new `realtime` prop bag; round-trip suite is now 129 tests covering the full 43-chart surface. `check:schema` / `scripts/check-schema-freshness.js` removed — its schema↔validation parity work is construction-guaranteed by the registry; the CLAUDE.md component-coverage cross-check is preserved as a slim, focused `check:claude-md-coverage` gate. `check:surface` trimmed to drop the redundant schema↔validation parity assertions while keeping the `semiotic/ai` / MCP registry / metadata / serverChartConfigs cross-checks it uniquely owns. `check:chart-specs` and `check:claude-md-coverage` are wired into release/prepublish scripts and the CI workflow.

**Risks and friction**:

- The schema's `description` strings carry hand-tuned wording that surfaces inside MCP responses and LLM tool definitions. Keep these in `chartSpecs.ts` directly (not derived from JSDoc) so they're explicit and reviewable.
- `validationMap.ts` may have JSDoc comments, debug commentary, or per-chart logic that doesn't fit a flat spec. Audit before migration; either move incidental comments into `chartSpecs.ts` as `// ` lines on the spec object, or accept that generated output drops them.
- JSON property ordering matters for diff reviewability. The schema generator should sort keys deterministically (alphabetical within each tool) and match the existing file's indentation (`JSON.stringify(value, null, 2)` + a trailing newline).
- Some props share definitions across charts (`title`, `description`, `width`, `enableHover`, etc.). Reuse existing `commonProps`/`xyAxisProps`/`ordinalAxisProps` bags from `validationMap.ts` directly in the registry — don't redefine them. The registry just composes the shared bag with chart-specific overrides.
- Required-combination rules that depend on `usageMode` (StackedAreaChart's `areaBy`, ForceDirectedGraph's `nodes`+`edges`) live in `behaviorContracts.cjs` and stay there. The registry's `required` list is the static-mode shape only.

**Acceptance criteria**:

- All four files (`schema.json`, `validationMap.ts`, `componentMetadata.cjs`, `chartSpecs.ts`) round-trip cleanly: edit `chartSpecs.ts`, run `docs:chart-specs`, the other three update; running again produces no further diff.
- `check:chart-specs` is wired into `release:check` and `prepublishOnly`.
- Adding a new chart requires editing `chartSpecs.ts` and the chart's `.tsx` file. No other manual edits.
- All existing tests (3349) pass after each phase.

### AI Surface Behavior Contracts

Baseline exists: `ai/behaviorContracts.cjs`, `check:ai-contracts`, `semiotic-ai --doctor` / MCP `diagnoseConfig` `usageMode` handling, MCP `semiotic://behavior-contracts`, generated AI docs sections, and scenario tests for color precedence, required prop combinations, static-vs-push data requirements, and push/ref behavior.

Next work:
- Periodically regenerate examples from runtime fixtures and diff them against `CLAUDE.md`, `docs/public/llms-full.txt`, and MCP guidance.
- Expand the metadata beyond the first critical rules when new semantic contracts prove agent-visible in real usage.

### Test Quality Gate

Baseline exists: `check:test-quality` blocks new frame/canvas mount-only assertions, and `hoc-rendering-integration.test.tsx` now asserts scene summaries, legends, annotation labels, and explicit empty/loading behavior. The 2026-04-27 burn-down passes brought the baseline from 190 → 156 mount-only candidates (~18% reduction) across the ordinal bar family (BarChart/StackedBarChart/GroupedBarChart, semantic prop-forwarding assertions on `lastOrdinalFrameProps`) and all 7 Playwright integration specs in the baseline — `accessibility.spec.ts`, `brush-selection.spec.ts`, `coordinated-views.spec.ts`, `geo-charts.spec.ts`, `hoc-legend.spec.ts`, `realtime-charts.spec.ts`, `streaming-regression.spec.ts` (semantic `aria-label` regex matches that require real paint, plus a hover-triggers-tooltip check).

Next work (low priority — diminishing returns):
- The gate's load-bearing job is preventing **new** mount-only checks; the remaining 156 candidates are unit-test cleanup with adjacent semantic coverage in the same file. Burning the rest of them down is mechanical and unlikely to catch regressions the existing assertions don't already cover. Treat this as opportunistic — if a specific file is being touched for another reason, take the candidates with you; otherwise leave them and let the gate hold the line.

---

## P1 — Architecture & API Coherence

### TypeScript Surface Cleanup

`no-explicit-any` remains warning-level debt and should be reduced by modeling real shapes, not by mechanical replacement.

Next work:
- Reduce `any` in highest-leverage hotspots: `StreamGeoFrame` d3 types, `SceneToSVG` d3-shape arc invocations, sankey/chord layout boundaries, and test utilities.
- Replace bare `string` or deprecated accessor aliases with `ChartAccessor<TDatum, T>` across HOC props.
- Make `ColorConfig` and `SizeConfig` generic so `colorBy` and `sizeBy` can infer from `keyof TDatum`.

### Consumer Workaround Audit

Known consumers sometimes route around unclear APIs, turning workarounds into accidental public contracts.

Next work:
- Maintain a tracked-consumers list for API-change checks where access allows.
- Audit realtime chart usage for `windowSize={data.length}` or other bounded-mode workarounds.
- Consider first-class bounded mode on realtime HOCs where static-data use is common.

### `validationMap` Composition

**Likely superseded by the P0 Chart Spec Registry plan** — validationMap becomes a generated file from `chartSpecs.ts`, so hand-rewriting its composition would be wasted effort. Skip this unless the registry plan slips.

For reference: `src/components/charts/shared/validationMap.ts` (951 lines) declares 40+ component specs. Every entry repeats `required: ["data"]`, `dataShape: "array"`, identical `dataAccessors` per family, plus a `commonProps + axisProps` spread. A composition helper (`xyChartBaseSpec`, `ordinalChartBaseSpec`) plus a shared `selectiveProps` bag would save ~210–260 lines, but the registry plan eliminates hand-editing the file entirely.

---

## P2 — Visual & Rendering Coverage

### HOC-Level Visual Snapshots

Frame-level snapshots and themed subsets exist, but HOCs are the user-facing API and still need broader default-state coverage.

Next work:
- Add one Playwright snapshot per HOC under a default theme.
- Keep fixture data deterministic and small.
- Bootstrap Linux baselines from CI artifacts before enforcing the new snapshots.

### Interaction-State Visual Snapshots

Hover, brush, click-locked crosshair, linked selections, and legend isolate are underrepresented visually.

Next work:
- Add snapshots after deterministic `page.hover()`, brush, legend click, and selection actions.
- Prefer a few high-value charts over broad but shallow coverage.

### SSR-Vs-CSR Visual Diff

Static SSR parity checks catch prop and scene-node drift, but not pixel-level differences.

Next work:
- Render the same fixture through `semiotic/server` and a browser client.
- Compare SVG output to a Playwright screenshot for a small matrix of chart families.
- Start with charts that historically drifted: ordinal wedges, hierarchy/network, geo, and background/foreground graphics.

### Animation Snapshots

The screenshot harness generally avoids active animation, leaving intro/update paths undercovered.

Next work:
- Mock time or freeze animation progress at deterministic points.
- Snapshot representative mid-animation states for bars, wedges, lines/areas, points, network nodes, and geo points.

---

## P3 — Performance & Scale

### Hit-Tester Factory (assessed and skipped)

The OUTSTANDING_WORK companion plan to the canvas render-helper module proposed a generic `findNearestSceneNode(scene, px, py, maxDistance, typeDispatcher, pointQuadtree?, maxPointRadius?)` shared across `CanvasHitTester` / `OrdinalCanvasHitTester` / `NetworkCanvasHitTester` / `GeoCanvasHitTester`, with an estimated 150–180-line savings.

Audited in 2026-04-28 and the savings don't materialize. Only the XY + Ordinal hit testers share a `quadtree-fast-path → linear-scan-with-dispatch → closest-wins` shape, and even there the duplicated portion is ~10 lines (the closest-wins reduce). Network's two-loop nodes-then-edges structure with a smallest-area override for nested treemap rects, and Geo's three-phase points → reverse-order areas → lines structure with offscreen `hitCtx.isPointInPath`, are genuinely different shapes. A factory broad enough to absorb all four would be abstraction, not extraction. The bulk of each tester is per-mark hit functions (`hitTestPoint`, `hitTestWedge`, `hitTestBezierEdge`, `isPointInPath` for geoarea Path2D, etc.) that don't share regardless.

Re-open only if a future hit-tester scenario shows up with ≥80% structural overlap with one of the existing four.

### Network Decay Style Allocation

Decay, pulse, and transition paths still spread style objects per node per frame in some hot paths.

Next work:
- Profile large network streams before changing behavior.
- If allocation is material, mutate unique scene-node style objects in place and add regression tests around style isolation.

### Network Tension Threshold

The force-layout tension threshold is empirically tuned and may re-run too often or not often enough under bursty updates.

Next work:
- Build a benchmark fixture for bursty graph updates.
- Measure layout quality and frame cost across threshold values.
- Document the chosen threshold and failure modes.

### Incremental Scene Updates

Most stream updates still trigger broad scene rebuilds.

Next work:
- Prototype append/evict updates for simple point and bar scenes.
- Keep the current full rebuild as the correctness fallback.
- Avoid optimizing complex marks until simple scenes show clear wins.

### Large-Scale Rendering Options

Potential work:
- RingBuffer in-place iteration helpers.
- Canvas curve interpolation optimization.
- Network decay sort cache.
- WebGL renderer for 100k+ points.
- Web Worker force layout.

---

## P4 — Product Extensions

### Design System Research

Potential work:
- Curated categorical palettes that maximize neighbor contrast.
- Per-role typography tokens beyond sizes, for example title, legend, axis, and tick font families.

### Server Export Formats

Potential work:
- `renderToPDF()` using pdfkit or jsPDF.
- Verify sync `renderChart` and `renderDashboard` in Cloudflare Workers, Vercel Edge, and Deno.
- Make `transitionFrames` in GIF export perform real incremental store ingestion.
- Link Render Studio animated previews to downloadable GIF output.

### Push API Undo

`remove()` and `update()` return previous values, so callers can implement undo manually today.

Potential work:
- Add an optional operation log with inverse operations.
- Expose `ref.current.undo()` only if the memory and semantic tradeoffs are clear.

### Geo Enhancements

Potential work:
- Anti-meridian and pole projection regression fixtures.
- Path2D hit testing generalization.
- Bounds pre-filter for network nodes.
- Canvas grid lines.
- Geographic minimap.
- Temporal animation on cartograms.
- Richer edge encodings, including tapered and animated dashed lines.

### CodeQL Re-Evaluation

CodeQL was removed because the workflow-managed config kept producing stale-baseline warnings on every PR even after the language identifier was aligned. GitHub's "default setup" mode (Repo Settings → Security → Code scanning) manages the configuration outside the workflow file, which avoids the drift class entirely.

Potential work:
- Decide whether the security scanning value (a JS/TS library that's mostly DOM/canvas/d3 surface — not high-CWE territory) justifies re-enabling.
- If yes, enable default setup and verify it produces a single check name that matches the configured branch protection rule.

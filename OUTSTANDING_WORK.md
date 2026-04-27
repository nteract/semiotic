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

## P0 — Release Confidence

### API Reference Documentation

Baseline exists: `typedoc.json`, `docs:api:json`, `/api/charts`, `/api/typedoc`, and source-level JSDoc with at least 2 `@example` blocks on every HOC (38/38 covered as of 2026-04-26).

Next work:
- Periodic JSDoc audit: when a new prop ships without an `@example`/`@default`, the test-quality baseline should flag it. Today the only check is "TypeDoc resolves the type" — no minimum doc surface enforced.

### Chart Spec Registry (Schema/Validation/MCP Consolidation)

**Phase 1 + Phase 2 shipped (2026-04-26).** `chartSpecs.ts` exists with all 15 ordinal charts, three pure-function generators (`generateSchemaToolEntry`, `generateValidationMapEntry`, `generateMetadataEntry`), and a 45-test round-trip suite that locks in byte-for-byte validationMap equivalence per chart. `check:chart-specs` is wired up. Drift annotations preserve canonical schema during the migration; Phase 3 re-baselines schema.json to match registry output.

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

Baseline exists: `check:test-quality` blocks new frame/canvas mount-only assertions, and `hoc-rendering-integration.test.tsx` now asserts scene summaries, legends, annotation labels, and explicit empty/loading behavior.

Next work:
- Continue burning down the existing `scripts/test-quality-baseline.json` candidates by replacing mount checks with scene props, rendered SVG/canvas output, callbacks, or user-visible behavior.
- Prioritize validation-adjacent tests where accepted props should also prove a rendered effect.
- Add higher-level coverage for Playwright specs that still count canvases/SVGs without verifying chart content or interaction state.

### Push-Mode Legend Color Regression Test

`useChartSetup` now synthesizes a legend color scale from discovered categories using the same precedence as `useColorScale` (provider → explicit scheme → theme → STREAMING_PALETTE), so legend swatches match rendered marks in push mode without each chart layering `useStreamingLegend`. There is no scenario test that exercises this end-to-end: a regression that mis-orders precedence or returns the wrong palette would currently ship silently because all color-related unit tests use bounded data.

Next work:
- Add a scenario test per palette source: provider-only, explicit `colorScheme` array, explicit string scheme name, theme categorical, and bare push-mode (STREAMING_PALETTE).
- Each test should mount the HOC in push mode, push two categories, and assert that the rendered legend swatches and the canvas pixels at known mark positions agree.
- Cover one XY HOC and one Geo HOC at minimum (`LineChart` and `ProportionalSymbolMap`).

### Sparse-Array Prop Hardening Sweep

`FlowMap` and `ProportionalSymbolMap` now defensively filter `null`/non-object entries from their array props before handing data to `useChartSetup`, which iterates without null-checks. CSV-parsed and lookup-failed inputs commonly contain such entries. The same vulnerability likely exists in other HOCs that take array props (`BarChart`, `LineChart`, `Scatterplot`, `SankeyDiagram`, etc.).

Next work:
- Audit every public HOC that accepts an array prop for the same crash mode by mounting with `[null, validObject, undefined]` and observing whether `useChartSetup`/the scene builder throws.
- Add the identity-preserving `useMemo` filter pattern (skip allocation when nothing to drop) to each affected HOC.
- Either fold the filter into `useChartSetup` itself (so HOCs don't need to remember) or add a regression test that runs the sparse-input matrix.

---

## P1 — Architecture & API Coherence

### HOC To `useChartSetup` Unification — Remaining Pieces

The bulk conversion is done (see CHANGELOG). Two follow-ups remain.

Next work:
- Add `useLinkedChartCategories` integration to `useChartSetup` so `LineChart` can drop its standalone `useStreamingLegend` call. After that change, `useStreamingLegend` either ships only as a low-level utility for advanced consumers or is removed entirely.
- Decide whether `useChartSetup` should accept optional inputs for dual-axis (`MultiAxisLineChart`) and projection (geo charts that need pre-projected coordinates) cases. Current charts in those families stay explicit; a second concrete consumer would justify the shared inputs.

### `setupCanvasMock` Adoption Sweep

`src/test-utils/canvasMock.ts` exposes `setupCanvasMock({ stubRaf })` covering canvas + Path2D + optional rAF/cAF stubs with symmetric cleanup. `hoc-rendering-integration.test.tsx` was the first scenario file to adopt it; older test files still reimplement parts of the canvas mock inline.

Next work:
- Migrate the remaining test files that reimplement canvas/Path2D setup to `setupCanvasMock`.
- Pass `stubRaf: false` for any spec that exercises a force-simulation tick loop (otherwise the synchronous-fire stub recurses).
- Verify cleanup actually fires by re-running the suite in a different order; canvas/Path2D leaks across files now restore correctly via the helper.

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

### HOC-Layer Boilerplate Reduction

Two cross-cutting helpers would eliminate the bulk of remaining HOC boilerplate. Both are pure extraction, behavior-preserving, no API changes, no type-system cost. Estimated total: ~1,060 lines saved across the 38 published HOCs.

Step 1 — `useFrameImperativeHandle(ref, { frameRef, isNetwork? })` (~520 lines saved):
- Every HOC implements the same 7-method `useImperativeHandle` bridge to `frameRef`: `push`, `pushMany`, `remove`, `update`, `clear`, `getData`, `getScales`.
- Network charts route `remove`/`update` through `removeNode`/`updateNode`; an `isNetwork` flag handles that.
- Ship as `src/components/charts/shared/useFrameImperativeHandle.ts`. Replace site-by-site; each HOC's diff drops ~10 lines.

Step 2 — `useChartModeAliases(resolved)` (~540 lines saved):
- Every HOC unpacks `width`, `height`, `enableHover`, `showGrid`, `showLegend`, `title`, `description`, `summary`, `accessibleTable` into local consts after `useChartMode`.
- Helper returns the alias bundle; chart-specific extras (`xLabel`, `yLabel`, `categoryLabel`, etc.) keep destructuring from `resolved` directly.
- Ship as `src/components/charts/shared/useChartModeAliases.ts`. Site diffs are ~10 lines per HOC.

Risk: low. Both helpers preserve identity of returned values across renders provided `resolved` is stable (it is — `useChartMode` already memoizes). Ship in two PRs so each diff is reviewable.

### `streamProps` Construction Helpers

Three small spreads recur in every HOC's `streamProps = {...}` object. Best done *after* the two HOC-layer helpers above, because once each HOC is 20+ lines lighter the construction site becomes the obvious next focal point. Estimated ~240 lines saved across 28 occurrences.

Next work:
- `buildBaseMetadataProps({ title, description, summary, className, animate })` — the `...(title && { title })` chain (~110 lines).
- `buildCustomBehaviorProps({ linkedHover, onObservation, onClick, hoverHighlight, customHoverBehavior, customClickBehavior })` — the conditional hover/click spread pair (~40 lines).
- `buildTooltipProps({ tooltip, defaultTooltipContent })` — the `tooltip === false ? () => null : (normalizeTooltip(tooltip) || defaultTooltipContent)` line (~90 lines).
- Group all three into one `src/components/charts/shared/streamPropsHelpers.ts` module so the import cost amortizes.

Risk: none. Each helper is a pure function over already-named locals.

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

### Renderer & Hit-Tester Boilerplate Reduction

Two helper extractions in the canvas-rendering layer. Lower priority than the HOC-layer work because they don't change the public surface and the duplication isn't actively causing pain — but together they remove ~330–400 lines of mechanical boilerplate that recurs every time a new mark type is added.

Step 1 — Canvas render-helper module (~180–220 lines saved):
- `bar/area/line/pointCanvasRenderer` each repeat: opacity setup → resolve fill → resolve stroke → build gradient → reset alpha. Same 5-step dance, slightly different shapes drawn in between.
- Extract into `src/components/stream/renderers/canvasRenderHelpers.ts`:
  - `setupNodeStyle(ctx, node) → cleanup()` — global alpha + restore.
  - `resolveNodeFill(ctx, fill, fallback)` — handles string/Pattern/undefined.
  - `buildLinearGradient(ctx, baseColor, config, x0, y0, x1, y1)` — frame-agnostic, replaces both `buildBarGradient` and the inline area-gradient (~90% byte-identical).

Step 2 — Generic `findNearestSceneNode` factory (~150–180 lines saved):
- `CanvasHitTester`, `OrdinalCanvasHitTester`, `NetworkCanvasHitTester`, `GeoCanvasHitTester` each have a 60-line `findNearestNode` whose only difference is the `case node.type:` dispatch.
- Generic factory: `findNearestSceneNode(scene, px, py, maxDistance, typeDispatcher, pointQuadtree?, maxPointRadius?)`.
- Each frame's hit tester becomes a thin `typeDispatcher` plus a one-line call. Return types share a `{ datum, x, y, distance }` base so no `any` is needed.

Risk: low — both extractions are mechanical. Behavior must match byte-for-byte; cover with the existing `*HitTester.test.ts` suites and any canvas-pixel regression tests.

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

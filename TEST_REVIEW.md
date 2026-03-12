# Semiotic Test Suite Review

**Date:** 2026-03-12
**Scope:** All 62 test files across 149 source files
**Framework:** Vitest + React Testing Library + jsdom

---

## Executive Summary

The test suite has **solid foundations in the data pipeline layer** (ring buffers, bin accumulators, canvas renderers, layout plugins) where tests verify real behavior with numerical assertions. However, the **HOC chart layer is dominated by smoke tests** — most render a component and assert `expect(frame).toBeTruthy()` without verifying that props produced correct output. There are also **significant coverage gaps**: 80+ source files have no tests at all, including critical shared infrastructure (hooks, selection utils, statistical overlays, LOESS regression).

### By the numbers

| Metric | Count |
|--------|-------|
| Test files | 62 |
| Source files (non-test, non-type) | ~149 |
| Files with zero test coverage | ~80 |
| Tests that are pure smoke tests | ~60% |
| Tests with structural/behavioral assertions | ~40% |
| Snapshot tests | 0 (good) |

---

## Grading Scale

- **A** — Tests real behavior with edge cases, structural assertions, and error paths
- **B** — Mix of behavioral assertions and smoke tests, reasonable coverage
- **C** — Mostly smoke tests ("renders without crashing"), minimal behavioral verification
- **D** — Exists but tests almost nothing meaningful
- **F** — No test file exists

---

## 1. XY Charts (`src/components/charts/xy/`)

### Systemic Issues

Every test file shares copy-pasted canvas mock boilerplate (~40 lines of `beforeEach`/`afterEach`). The dominant pattern is: render component → query `.stream-xy-frame` → assert truthy. No tests verify `onObservation`, `linkedHover`/`selection`, dev-mode `console.warn` from `warnMissingField`, or `SafeRender` error boundary behavior.

| File | Grade | Notes |
|------|-------|-------|
| `LineChart.test.tsx` | C+ | 12 smoke tests. Zero coverage for forecast/anomaly overlays (headline feature), line objects format, function accessors, validation errors. |
| `AreaChart.test.tsx` | C+ | Smoke tests. Missing `y0Accessor` (ribbon/band), `gradientFill`, single data point. |
| `StackedAreaChart.test.tsx` | C | Only 4 tests — fewest of any XY chart. `normalize={true}` renders but nothing verifies output differs from unnormalized. |
| `Scatterplot.test.tsx` | C+ | Smoke tests. Only file testing function accessors (good). Missing `marginalGraphics`, `linkedBrush`. |
| `BubbleChart.test.tsx` | B | **Best XY test file.** Tests validation error for missing `sizeBy` (structural assertion on `role="alert"`). Tooltip integration tests. Legend show/hide. |
| `Heatmap.test.tsx` | C+ | Smoke tests. `showValues={true}` tested but no assertion that text elements appear. |
| `ScatterplotMatrix.test.tsx` | B | Real structural assertions: correct cell count for N fields, label text content. No interaction testing (hover/brush). |
| `ConnectedScatterplot.tsx` | **F** | **No test file.** Unique features: viridis coloring, connecting lines, halo rendering, `orderAccessor` with Date support. |
| `MinimapChart.tsx` | **F** | **No test file.** Complex: brush interaction, controlled/uncontrolled extent, overview+detail coordination. |

### Key gaps

- **Forecast/anomaly in LineChart** — complex data transformation with zero coverage
- **`y0Accessor` and `gradientFill` in AreaChart** — key differentiating features untested
- **Canvas mock boilerplate** should be extracted to shared test utility

---

## 2. Ordinal Charts (`src/components/charts/ordinal/`)

### Systemic Issues

Split into two testing patterns: files that mock `StreamOrdinalFrame` and inspect passed props (BarChart, GroupedBarChart, Histogram, ViolinPlot) and files that render the real frame with canvas mocks (SwarmPlot, BoxPlot, DotPlot). The first group produces behavioral assertions; the second group is pure smoke tests.

| File | Grade | Notes |
|------|-------|-------|
| `BarChart.test.tsx` | B+ | **Best ordinal test file.** Mocks frame, captures props. Thorough tooltip and legend tests. Sort/orientation/colorBy still smoke tests despite mock being available. |
| `StackedBarChart.test.tsx` | B | Tests required `stackBy` error path (only ordinal test with validation). Tooltip renders values. |
| `GroupedBarChart.test.tsx` | B+ | Structural assertions on `chartType`, `groupBy`, `projection`, custom accessors. Missing: `groupBy` error path, `colorBy` defaulting to `groupBy`. |
| `Histogram.test.tsx` | B+ | Structural assertions on `chartType`, `bins`, `relative→normalize`, projection. Tests function accessors. Missing: tooltip content (hand-crafted histogram tooltip untested). |
| `ViolinPlot.test.tsx` | B+ | Structural assertions on `chartType`, `bins`, `showIQR`, orientation. Missing: `curve` prop, tooltip content. |
| `PieChart.test.tsx` | B | Tests `projection="radial"`, `startAngle`, default square size. Missing: `slicePadding`, `colorBy` default. |
| `DonutChart.test.tsx` | B | Tests `innerRadius` default and custom, `centerContent`. Missing: `chartType === "donut"` assertion. |
| `SwarmPlot.test.tsx` | C+ | **No frame mock** — pure smoke tests. Cannot verify `chartType`, sizing, styling. |
| `BoxPlot.test.tsx` | C+ | **No frame mock.** BoxPlot has hand-crafted tooltip with stats (median, Q1, Q3) — completely untested. |
| `DotPlot.test.tsx` | C+ | **No frame mock.** Good sort variant coverage but all assertions are smoke. |
| `RidgelinePlot.tsx` | **F** | **No test file.** Has `amplitude` prop, orientation defaults, stats tooltip. |

### Key gaps

- **SwarmPlot, BoxPlot, DotPlot** need the `vi.mock` pattern used in other ordinal tests
- **Statistical tooltips** (BoxPlot median/quartiles, Histogram count/range, ViolinPlot stats) are user-facing features with zero test coverage
- **RidgelinePlot** has no tests at all

---

## 3. Network Charts (`src/components/charts/network/`)

### Systemic Issues

The most smoke-test-heavy area. `expect(frame).toBeTruthy()` appears ~80 times across 6 files. Only Treemap and CirclePack mock `StreamNetworkFrame` and inspect props. The other 4 files render the real frame with canvas polyfills, preventing any prop verification.

| File | Grade | Notes |
|------|-------|-------|
| `ForceDirectedGraph.test.tsx` | C | All smoke tests. "applies color encoding" just checks frame exists — if `colorBy` were silently ignored, test would still pass. |
| `SankeyDiagram.test.tsx` | C | All smoke tests. "infers nodes from edges" doesn't verify which nodes were inferred. "allows frameProps" doesn't actually pass `frameProps`. |
| `ChordDiagram.test.tsx` | C | All smoke tests. Self-loops in test data (good) but no verification of handling. |
| `TreeDiagram.test.tsx` | C+ | All smoke tests, but **best edge case coverage**: missing data, single-node hierarchy, custom `childrenAccessor`. |
| `Treemap.test.tsx` | B | **Mocks frame, inspects props.** Verifies `chartType`, `hierarchySum` function, default size, custom accessors. Missing: `colorBy`/`colorByDepth`, `showLabels`, `labelMode`, selection. |
| `CirclePack.test.tsx` | B | **Mocks frame, inspects props.** Only test in entire network suite that verifies a style function output (`circleOpacity → fillOpacity`). |
| `OrbitDiagram.tsx` | **F** | **No test file.** Most complex network component: custom layout engine, rAF animation, widget annotations, orbit modes, eccentricity math. |

### Key gaps

- **ForceDirectedGraph, SankeyDiagram, ChordDiagram, TreeDiagram** should adopt the Treemap/CirclePack mock pattern
- **OrbitDiagram** needs tests — the layout engine alone has multiple code paths
- **No network chart tests verify interaction** (hover, click, `onObservation`)
- **Several "frameProps" tests are mislabeled** — they pass component props like `nodeSize={10}`, not `frameProps`

---

## 4. Stream Pipeline (`src/components/stream/`)

### Pipeline Store Tests

| File | Grade | Notes |
|------|-------|-------|
| `PipelineStore.decay.test.ts` | A- | Tests all 3 decay types with numerical assertions. Edge case: single-item buffer. Integration: decay propagates to scene nodes. Missing: `minOpacity` default, extreme `halfLife` values. |
| `PipelineStore.heatmap.test.ts` | B+ | Tests count/sum/mean aggregation with expected values. Concern: `if (multiCell)` guards silently pass when cell not found — should assert `toBeDefined()` first. |
| `PipelineStore.pulse.test.ts` | B- | Tests creation and scene node marking. **Missing: pulse intensity decay over time** — the core behavior is untested. No mock clock to verify temporal decay. |
| `PipelineStore.transition.test.ts` | D+ | **Weakest test file in the suite.** The "starts transition" test admits it cannot verify the transition starts. "applies easing correctly" doesn't assert anything about easing — just checks `scene.length > 0`. |
| `PipelineStore.remap.test.ts` | A- | Tests coordinate scaling on resize, line path remapping, scale range updates, triggers for full rebuild. Missing: area node remapping, zero-dimension resize. |

### Scene & Hit Testing

| File | Grade | Notes |
|------|-------|-------|
| `SceneGraph.test.ts` | B+ | Tests path sorting, datum alignment, NaN filtering, area paths, stacked areas. Missing: `buildPointNode`, `buildRectNode`, `buildHeatcellNode`. |
| `CanvasHitTester.test.ts` | B+ | Tests line hit (binary search), scatter proximity, maxDistance threshold, area hit, empty scene. Missing: overlapping lines, heatcell/rect hit testing. |
| `MarginalGraphics.test.tsx` | B | Tests all 4 graphic types and orientations. Custom config tests are structural assertions. Missing: verifying positions reflect actual data distribution. |

### Canvas Renderers (4 tested of 16)

| File | Grade | Notes |
|------|-------|-------|
| `barCanvasRenderer.test.ts` | A- | Tests fill, dimensions, stroke, opacity, pulse, icon mode, decay, type filtering. Mock canvas context tracks exact API calls. |
| `heatmapCanvasRenderer.test.ts` | A- | Thorough. Type-unsafe `(node as any).style = { opacity: 0.4 }` may mask a real bug. |
| `lineCanvasRenderer.test.ts` | A | **Best renderer test.** Includes threshold color segmentation with multi-segment verification. |
| `pointCanvasRenderer.test.ts` | A- | Tests pulse glow ring radius calculation. Opacity test is weak (checks reset but not intermediate value). |

**12 untested renderers:** `areaCanvasRenderer`, `swarmCanvasRenderer`, `candlestickCanvasRenderer`, `boxplotCanvasRenderer`, `violinCanvasRenderer`, `waterfallCanvasRenderer`, `connectorCanvasRenderer`, `wedgeCanvasRenderer`, `networkCircleRenderer`, `networkEdgeRenderer`, `networkArcRenderer`, `networkRectRenderer`, `networkParticleRenderer`

### Layout Plugins

| File | Grade | Notes |
|------|-------|-------|
| `chordLayoutPlugin.test.ts` | B | Tests node positioning, arcData, scene output types, labels. Missing: single-node, self-referencing edges, padAngle/groupWidth config. |
| `forceLayoutPlugin.test.ts` | B- | Non-deterministic by nature. Uses generous position bounds (-100 to 700). Missing: disconnected components, iteration count effect. |
| `hierarchyLayoutPlugin.test.ts` | B+ | Good breadth across tree/treemap/circlepack. Tests colorByDepth and missing root. Missing: single-node, unbalanced trees, orientation. |
| `sankeyLayoutPlugin.test.ts` | B | Tests node positioning, edge resolution, scene types, labels, vertical orientation. Missing: circular flows, nodeAlign options, zero-value edges. |

### Untested stream files (high priority)

| File | Impact | Notes |
|------|--------|-------|
| `NetworkPipelineStore.ts` | **Critical** | Entire network pipeline — topology, layout dispatch, scene generation, streaming. Zero tests. |
| `OrdinalPipelineStore.ts` | **Critical** | Entire ordinal pipeline — category discovery, column layout, scene dispatch. Zero tests. |
| `keyboardNav.ts` | **High** | Accessibility feature. Pure functions, trivially testable. |
| `NetworkCanvasHitTester.ts` | **High** | Hit testing for circles, rects, arcs, bezier/line/ribbon edges. |
| `OrdinalCanvasHitTester.ts` | **High** | Hit testing for rects, points, wedges, boxplots, violins. |
| `SceneToSVG.tsx` | **High** | SSR critical path. Pure converters, easily testable. |
| `DataSourceAdapter.ts` | Medium | Progressive chunking, dedup cache, clearLastData. |
| `ParticlePool.ts` | Medium | Object pool lifecycle for streaming Sankey particles. |
| `accessorUtils.ts` | Medium | `resolveAccessor`, `resolveStringAccessor`. Foundational. |
| 6 ordinal scene builders | Medium | `barScene`, `pieScene`, `pointScene`, `statisticalScene`, `timelineScene`, `connectorScene` |

---

## 5. Server / SSR (`src/components/server/`)

| File | Grade | Notes |
|------|-------|-------|
| `renderToStaticSVG.test.tsx` | B+ | Covers all ordinal types, XY regression, network regression, **node inference from edges** (regression test for recent fix). Uses element count assertions. Missing: function accessors, custom margins, colorScheme verification. |
| `componentSSR.test.tsx` | A- | **Strongest structural test file.** No-canvas assertions, mark count contracts (N data → N marks), component↔standalone equivalence, network SSR coverage. Missing: ConnectedScatterplot, Histogram, ChordDiagram in SSR. |

---

## 6. Shared Infrastructure (`src/components/charts/shared/`)

| File | Grade | Notes |
|------|-------|-------|
| `diagnoseConfig.test.ts` | B | Tests core anti-patterns (empty data, bad width, accessor missing, margin overflow). Missing: BAD_HEIGHT, BAD_SIZE, NETWORK_NO_EDGES, DATE_NO_FORMAT, vertical margin overflow. |
| `validateProps.test.ts` | D+ | **Only 4 tests for a ~900-line module.** Tests typo detection only. Missing: required props, type checking, enum validation, data shape validation, network/ordinal/realtime components. |

### Untested shared files (high priority)

| File | Impact | Notes |
|------|--------|-------|
| `hooks.ts` | **Critical** | `useChartSelection`, `useChartLegendAndMargin` — core HOC infrastructure. |
| `statisticalOverlays.ts` | **Critical** | Forecast + anomaly processing — headline feature, zero tests. |
| `loess.ts` | **High** | LOESS regression algorithm. Statistical code needs unit tests. |
| `withChartWrapper.tsx` | **High** | SafeRender error boundary + dev warning helpers. |
| `selectionUtils.ts` | **High** | `wrapStyleWithSelection`, cross-filtering. |
| `colorUtils.ts` | Medium | Color scale construction. |
| `legendUtils.ts` | Medium | Legend computation. |
| `validateChartData.ts` | Medium | Data shape validation. |
| `annotationRules.tsx` | Medium | Annotation rendering. |
| `tooltipUtils.tsx` | Medium | Tooltip rendering. |
| `ChartError.tsx` | Low | Error display component. |

---

## 7. Realtime (`src/components/realtime/`)

| File | Grade | Notes |
|------|-------|-------|
| `RingBuffer.test.ts` | **A** | **Best-tested module in the repo.** Covers construction, push, eviction, iteration, resize, capacity-1 edge case. |
| `IncrementalExtent.test.ts` | A- | Comprehensive: empty state, expanding, eviction, recalculate, all-same-values, NaN. Missing: negative numbers, Infinity. |
| `BinAccumulator.test.ts` | A- | Thorough: single point, cross-bin, NaN, categories, empty data. Missing: null values, extreme binSize. |
| `waterfallRenderer.test.ts` | A- | Tests cumulative positioning, pos/neg colors, connector lines, NaN skip, horizontal mode, inverted scales. |

**Missing:** No tests for the actual realtime chart components (`RealtimeLineChart`, `RealtimeHistogram`, `RealtimeSwarmChart`, etc.).

---

## 8. Other

| File | Grade | Notes |
|------|-------|-------|
| `StrictMode.test.tsx` | B- | Tests all HOC chart types in StrictMode double-mount. Assertions only check frame container exists, not that marks rendered. Defines `assertCanvasSized` helper that is **never called** (dead code). Missing: OrbitDiagram. |
| `Tooltip/MultiLineTooltip.test.tsx` | B | Tests content rendering with various data shapes. |
| `data/transforms.test.ts` | B | Tests data transformation utilities. |
| `store/createStore.test.tsx` | B | Tests store creation, subscription, provider isolation. |
| `store/ObservationStore.test.ts` | B+ | Tests the observation event system. |

### Untested high-impact files elsewhere

| File | Impact |
|------|--------|
| `coordination/LinkedCharts` | **Critical** — coordinated views, the main integration story |
| `coordination/CategoryColorProvider` | **High** — stable color mapping |
| `export/chartConfig.ts` | Medium — `toConfig`/`fromConfig`/`toURL`/`fromURL` serialization |
| `export/exportChart.ts` | Medium — browser export |
| `ChartContainer.tsx` | Medium — wraps DetailsPanel |
| `ChartGrid.tsx` | Low — CSS Grid layout |
| `ContextLayout.tsx` | Low — primary + context panel |
| `ai/mcp-server.ts` | Medium — MCP server tools |

---

## Top 10 Recommendations (Priority Order)

### 1. Test the forecast/anomaly pipeline
`statisticalOverlays.ts` and the forecast/anomaly code path in `LineChart` are headline features with zero coverage. These are pure data transformations — easily testable.

### 2. Test LOESS regression
`loess.ts` is a statistical algorithm. Test it with known inputs/outputs (e.g., compare against R's `loess()` output for a small dataset).

### 3. Add tests for `hooks.ts` (shared HOC hooks)
`useChartSelection` and `useChartLegendAndMargin` are used by every HOC chart. Test them with `renderHook`.

### 4. Test `NetworkPipelineStore` and `OrdinalPipelineStore`
These are the core of the ordinal and network rendering pipelines — topology management, layout dispatch, scene generation. They have complex logic and zero tests.

### 5. Test `keyboardNav.ts`
Pure functions for accessibility navigation. Trivially testable, high user impact.

### 6. Upgrade HOC smoke tests to behavioral assertions
The mock pattern used in BarChart/Treemap/CirclePack should be adopted by all HOC test files. Instead of `expect(frame).toBeTruthy()`, assert on the props passed to the underlying Stream Frame. This one change would make ~40 existing tests meaningful.

### 7. Test `selectionUtils.ts` and `LinkedCharts`
Cross-filtering is a major feature. `wrapStyleWithSelection` should be tested with various selection states. LinkedCharts coordination should have integration tests.

### 8. Add tests for `ConnectedScatterplot`, `MinimapChart`, `OrbitDiagram`, `RidgelinePlot`
Four HOC components with zero test coverage. OrbitDiagram is the most complex.

### 9. Fix `PipelineStore.transition.test.ts`
The weakest test file. Needs real interpolation assertions with a mock clock, not just "scene.length > 0".

### 10. Extract shared test utilities
- Canvas mock context (duplicated across 7+ files)
- `setupCanvasMock()` / `teardownCanvasMock()`
- Frame mock capture pattern (`lastXYFrameProps`, `lastOrdinalFrameProps`, `lastNetworkFrameProps`)

---

## Anti-patterns Found

1. **Dead test code**: `StrictMode.test.tsx` defines `assertCanvasSized` but never calls it
2. **Silent pass guards**: `PipelineStore.heatmap.test.ts` uses `if (multiCell)` which silently passes when the expected cell isn't found
3. **Mislabeled tests**: Several network tests named "allows frameProps" actually test component props, not `frameProps`
4. **`as any` type casts**: Used throughout to bypass type mismatches in test data — may mask real type errors
5. **Copy-pasted boilerplate**: Canvas mock setup is duplicated in 7+ files instead of being shared

---

## What the Suite Does Well

- **Zero snapshot tests** — all assertions are structural, which is maintainable
- **Data pipeline tests are genuinely behavioral** — decay, remap, scene graph, canvas renderers all test real computation
- **SSR tests use mark count contracts** — "N data points → N marks" catches data-dropping regressions
- **Component SSR equivalence tests** — verify HOC and standalone paths produce the same geometry
- **Realtime data structure tests are excellent** — RingBuffer, IncrementalExtent, BinAccumulator are thoroughly tested with edge cases

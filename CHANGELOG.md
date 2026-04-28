# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Shared AI/MCP component metadata** — `ai/componentMetadata.cjs` is now the shared source for component category, import, renderability, and registry metadata across the CLI, MCP resources, and surface-parity checks. `check:surface` is wired into release gates so schema, `semiotic/ai`, MCP renderability, and server-renderer support cannot drift silently.
- **Shared chart recommendation engine** — `ai/chartSuggestions.cjs` powers both MCP `suggestChart` and `npx semiotic-ai --suggest`, with recommendations for network, hierarchy, geographic, temporal, categorical, and magnitude data shapes. The CLI supports stdin on all platforms via fd `0`.
- **MCP protocol smoke coverage** — `src/__tests__/scenarios/mcp-protocol.test.ts` exercises stdio JSON-RPC and Streamable HTTP initialization/tools-list flows, including robust parsing for JSON and SSE responses.
- **API docs extraction coverage** — `api-docs-extraction.test.js` locks down TypeDoc re-export resolution, props alias handling, function-signature formatting, examples, inherited-prop labels, and component summaries.
- **Docs route smoke check** — `check:docs-routes` validates prerendered homepage/API routes, route metadata, sitemap entries, and generated API JSON assets; `website:build` now runs it after prerender.
- **AI behavior contracts** — `ai/behaviorContracts.cjs` is now the structured source for agent-visible semantic rules that schema parity cannot express: categorical color precedence, required prop combinations, push/ref behavior, ID-accessor mutation requirements, and renderChart/static-data boundaries. `semiotic-ai --doctor` and MCP `diagnoseConfig` now accept `usageMode: "static" | "push"` so static/renderChart configs still require data while ref-push React HOCs can intentionally omit it. The MCP `semiotic://behavior-contracts` resource and generated AI docs consume the same rule metadata; `check:ai-contracts` is wired into release gates.
- **Test quality gate** — `check:test-quality` baselines existing frame/canvas mount-only assertion candidates and fails when new candidates are introduced without updating the baseline. The release and prepublish gates now run it so new tests must prefer semantic assertions against scene summaries, rendered output, callbacks, or user-visible behavior.
- **Streaming legend frame-domain subscriptions** — `StreamOrdinalFrame` and `StreamXYFrame` expose `legendCategoryAccessor` and `onCategoriesChange`; pushed legends now populate, shrink, relabel, and clear after insert/remove/update/clear. `LinkedCharts` has a live category registry so unified legends and shared category colors update from child chart domains.
- **ThemeProvider first-render coverage** — new tests prove preset/object themes, CSS custom properties, prop changes, and forced-colors initialization are visible to children on the first render.
- **PipelineStore config-only cache regressions** — cache tests now cover scene rebuilds from `themeSemantic.primary`, `themeSequential`, and `barColors` changes without data ingest.
- **HOC JSDoc coverage** — every public HOC (38/38) now ships with at least 2 `@example` blocks, a top-line summary that cross-references sibling charts via `{@link}`, and `@default` annotations on the most-used optional props. Previously only 5 HOCs had any examples; the rest relied on schema summaries. Format is consistent across families: simple usage → encoded variants → push-API or advanced cases. Surfaced through TypeDoc (`/api/typedoc`) and TypeScript hover-help.
- **Test quality gate burn-down: ordinal bar family + Playwright** — Two passes against the mount-only assertion baseline:
  - **Ordinal bar family unit tests:** `BarChart.test.tsx` (16 mount-only checks), `StackedBarChart.test.tsx` (8), and `GroupedBarChart.test.tsx` (1) replaced their `expect(frame).toBeTruthy()` mount-only assertions with semantic checks against the props the HOC actually forwards to `StreamOrdinalFrame`: `chartType`, `data`, `oAccessor`/`rAccessor`, `projection`, `oSort` (plus a sortedness check on the pre-sorted data when `sort` is `"asc"`/`"desc"`), `barPadding`, `enableHover`, `showGrid`, `size`, `stackBy`, `groupBy`, `normalize`, `legend.legendGroups[0].items` (distinct colors per category for `colorScheme` checks), and `frameProps` escape-hatch overrides. Caught and locked in a real distinction along the way: `GroupedBarChart` routes through `chartType: "clusterbar"`, not `"bar"`. The intentional sparse-array hardening test gets the documented `// test-quality-gate: allow-mount-only` opt-out so the gate doesn't fight a test whose whole purpose is to prove no-crash-on-sparse-input.
  - **Playwright integration specs:** 9 `canvas.toBeVisible()` / `svg.toBeVisible()` mount-only checks across `accessibility.spec.ts`, `brush-selection.spec.ts`, `coordinated-views.spec.ts`, `geo-charts.spec.ts`, `hoc-legend.spec.ts`, `realtime-charts.spec.ts`, and `streaming-regression.spec.ts` replaced with semantic `aria-label` regex matches (`/\d+/`). The data canvas's `aria-label` is set by `computeCanvasAriaLabel` only after the scene populates (e.g. `scatter, 50 points`), so the new check requires real paint — a regression that wires the canvas up but never draws would slip past `toBeVisible()` but trip the regex. The coordinated-views hover test now asserts a `.stream-frame-tooltip` element appears after hover (proving the interaction-canvas hit-test resolved a point) instead of just checking the overlay canvas exists.
  - **Net baseline change:** 190 → 156 mount-only candidates (~18% reduction across both passes). The Playwright sweep is the higher-leverage half: those tests run in a real browser, where mount-only checks are blind to drawn-pixels regressions that semantic assertions catch.
- **Sparse-array prop hardening across every ingestion path** — public chart HOCs now filter `null`/non-object entries from array props (`data`, `points`, `nodes`, `edges`, `flows`, `series`, `areas`) before any iteration. CSV/loader pipelines commonly emit `[null, validRow, undefined]`-shaped input, which previously crashed inside `useChartSetup`, `useColorScale`, `inferNodesFromEdges`, the choropleth geometry validator, and the StreamFrame ingestion path. A new shared identity-preserving helper at `src/components/charts/shared/sparseArray.ts#filterSparseArray` returns the original reference when nothing is dropped (preserving `useMemo` cache hits in the clean case) and is wired through every ingestion seam:
  - `useChartSetup` filters its `data` input and exposes the sanitized array as `setup.data`; the empty-state check filters `rawData` too, so `[null, undefined]` lands on the empty-state UI rather than rendering blank.
  - `DataSourceAdapter` filters `setBoundedData`, `setReplacementData`, `push`, and `pushMany`. Push-mode `ref.pushMany([null, valid])` now silently drops the null and lands the valid row instead of crashing extent reads inside the pipeline store.
  - `StreamGeoFrame.pushPoint`/`pushMany` and `StreamNetworkFrame.pushEdge`/`pushManyEdges` mirror the same filtering at the geo/network frame boundaries (those frames don't route through `DataSourceAdapter`).
  - 26 HOCs replaced their `safeData = data || []` with the identity-preserving filter; `MultiAxisLineChart`'s `series` prop, the network family's `nodes`/`edges`, and `ChoroplethMap`'s resolved `areas` got the same treatment.
  - `ForceDirectedGraph`/`SankeyDiagram`/`ChordDiagram` empty-state checks route through their filtered arrays so sparse-only input triggers empty UI.
  - `ProportionalSymbolMap` and `FlowMap` were migrated to drop their own pre-setup filter and read `setup.data` directly (eliminates the double-scan when `useChartSetup` would re-filter the same array).
  - A new `EMPTY_ARRAY` singleton (frozen) is used as the stable push-mode default in HOCs that need an array literal; per-render churn through the sparse-filter `useMemo` is gone.
  - New regression test `src/__tests__/scenarios/sparse-array-hardening.test.tsx` covers one HOC per data-iteration shape, plus push-mode ingestion drops and empty-state routing — 17 cases, all green.
- **Push-mode legend color regression suite (XY + geo)** — `src/__tests__/scenarios/push-mode-legend-colors.test.tsx` exercises the legend-color synthesis precedence (`CategoryColorProvider` → explicit `colorScheme` array → string scheme name → `ThemeProvider` categorical → default theme) against `LineChart` (xy / `useStreamingLegend` path) and `ProportionalSymbolMap` (geo / `useChartSetup` path) mounted in push mode for each tier. 10 tests total. The "bare push" tier's behavior is documented inline: it resolves to `LIGHT_THEME.colors.categorical` because the theme store seeds a non-empty default categorical palette, leaving `STREAMING_PALETTE` as a defense-in-depth fallback rather than a reachable production path. Negative-anti-source assertions catch any regression that surfaces `STREAMING_PALETTE` from a wrongly-ordered precedence chain.
- **StreamGeoFrame push-mode legend category emission** — `StreamGeoFrame` now reads `legendCategoryAccessor` + `onCategoriesChange` from props and emits the live category domain after every scene rebuild, mirroring `StreamXYFrame` / `StreamOrdinalFrame`. Push-mode geo HOCs (`ProportionalSymbolMap`, `FlowMap`) now propagate their discovered categories back through `useChartSetup`'s `frameCategories` state, so the synthesized legend renders with the correct swatches the moment data starts flowing. Previously the props were accepted on the HOC side but unread by the frame, so push-mode geo legends never populated. Frame-level coverage in `StreamGeoFrame.test.tsx` exercises the emission across `pushMany` / `removePoint` / `clear` so a regression in the wiring is caught at the frame level, not just through HOC scenarios.
- **Chart Spec Registry — Phases 1–4 (all 43 chart families)** — `src/components/charts/shared/chartSpecs.ts` is the single source of truth for the prop specifications of every Semiotic HOC: 15 ordinal + 12 XY + 7 network + 4 geo + 5 realtime = 43 charts. Three pure generators in `scripts/lib/chart-specs-generators.mjs` (`generateSchemaToolEntry`, `generateValidationMapEntry`, `generateMetadataEntry`) produce `ai/schema.json`, `validationMap.ts`, and `componentMetadata.cjs` entries from each `ChartSpec`; `scripts/regenerate-schema.ts` re-baselines `ai/schema.json` from the registry. A 130-test round-trip suite (`chart-specs-round-trip.test.ts`) iterates over `CHART_SPECS` and asserts deep structural equality on the parsed schema tool entry and validationMap entry per chart, plus componentMetadata category correctness and a top-level set-parity check that `CHART_SPECS` keys exactly match the canonical name sets in `ai/schema.json`, `validationMap.ts`, and `ai/componentMetadata.cjs`. `check:chart-specs` is wired into release/prepublish gates and the CI workflow. Adding a new chart is now one edit (a `ChartSpec` entry) plus regeneration; previously it required three coordinated hand-edits across schema/validation/metadata files.

### Changed

- **Docs prerendering pipeline** — route extraction handles nested and multiline route declarations, root and nested pages get idempotent canonical/LLM alternate/JSON-LD/noscript metadata, homepage metadata is normalized consistently, and prerender functions can be imported directly for scenario tests.
- **TypeDoc API reference** — `/api/typedoc` now covers the full chart HOC surface, resolves re-exported props declarations instead of stopping at reference stubs, shows component summaries/examples, formats callback prop signatures, and labels inherited props from shared interfaces.
- **ThemeProvider initialization** — the scoped ThemeStore is seeded with the resolved initial theme before children render. This removes the previous light-theme-first path for `useTheme()`, chart color defaults, and CSS variables.
- **Canvas theme bridge** — `useFrame` owns theme-change invalidation from a layout-timed effect: clear CSS-var color cache, mark the frame dirty, and schedule a repaint whenever the ThemeStore theme changes.
- **Streaming legends and linked colors** — push-mode legends now source swatch colors from the same provider/theme/color-scale path as rendered marks, so child legends and unified `LinkedCharts` legends agree.
- **HOC shared setup unification** — `LineChart`, `AreaChart`, `StackedAreaChart`, `QuadrantChart`, `ConnectedScatterplot`, `BubbleChart`, `ProportionalSymbolMap`, `FlowMap`, and `DistanceCartogram` now use `useChartSetup` for categorical color scales, legends, selection/hover/click behavior, loading/empty states, and margins, while keeping chart-specific logic (statistical overlays, gap handling, direct-label margins, line/area/stack transforms, size domains, quadrant overlays, projection, flow point→edge hover translation, and cartogram layout) local. `useChartSetup` itself now synthesizes a push-mode legend color scale from discovered categories using the same precedence as `useColorScale` (provider → explicit scheme → theme → STREAMING_PALETTE), so legend swatches and rendered marks agree on every converted chart without each one needing to layer `useStreamingLegend` separately.
- **StackedAreaChart AI contract** — `areaBy` is now marked required in the AI schema and validation map, matching the existing LLM guidance that StackedAreaChart needs an explicit grouping field for stacked series.
- **HOC rendering scenario tests** — high-value public wrapper smoke tests now assert scene summaries, legend labels, annotation labels, and explicit empty/loading states instead of only proving that a canvas mounted.
- **OUTSTANDING_WORK.md** — collapsed into an active priority backlog only; completed dependency migrations, theming milestones, AI/MCP work, prerendering, streaming legend work, quadtree work, and cache/theme fixes were removed from the backlog and recorded here instead.

### Removed

- **`check:schema` / `check-schema-freshness.js`** — schema↔validation per-prop drift is now construction-guaranteed by the Chart Spec Registry round-trip (`check:chart-specs`). The CLAUDE.md component-coverage cross-check that lived inside `check:schema` is preserved as a slim, focused gate at `scripts/check-claude-md-coverage.js` (`npm run check:claude-md-coverage`). `check:surface` no longer asserts schema↔validation name parity (also covered by registry round-trip) and instead focuses on `semiotic/ai` exports, MCP renderable registry entries, AI component metadata, and server renderChart configs. CI workflow and release/prepublish gate scripts are updated accordingly.

### Fixed

- **HOC JSDoc accuracy pass** — 13 doc inaccuracies caught and corrected against source: `ForceDirectedGraph` `nodeSize` / `nodeSizeRange` defaults, push-mode opt-in for `nodes`/`edges`, and the fabricated `frameProps.initialPositions`; `PieChart.startAngle` units (degrees, not radians) and the matching example value; `PieChart.valueAccessor` aggregation by `Math.abs` for negatives; `QuadrantChart` example commentary; `ChoroplethMap.areas` shape (`Feature[]`, not `FeatureCollection`) and the async `resolveReferenceGeography` example pattern; `MinimapChart` examples that referenced non-existent `chart`, `minimapHeight`, `initialExtent`, `onBrushChange` props; `ScatterplotMatrix` example that wrapped the matrix in an outer `<LinkedCharts>` even though the component already creates its own provider internally; `ProportionalSymbolMap` push example missing the `id` field required by `pointIdAccessor`. All examples now match the real prop surface and copy-paste cleanly.
- **AI chart suggestions copy/paste correctness** — ForceDirectedGraph suggestions no longer imply nodes are optional, hierarchy suggestions reference the provided data shape, heatmap recommendations require two dimensions plus a value, sample inputs are capped, and generated JSX string props are escaped safely with `JSON.stringify`.
- **MCP HTTP test robustness** — startup retries wait for child-process exit before rebinding; response parsing handles plain JSON and SSE data events instead of assuming a single `data:` line.
- **Prerender structured-data duplication** — injected JSON-LD now carries the same `data-jsonld="semiotic"` marker the client hook checks, preventing duplicate runtime scripts. De-duplication is scoped to Semiotic-owned JSON-LD rather than all SoftwareApplication schemas.
- **Prerender metadata consistency** — canonical and `og:url` metadata are normalized together, including the homepage URL shape.
- **SSR alignment test isolation** — `ssr-alignment.test.ts` checks a temporary SceneToSVG copy instead of mutating tracked source files during parallel Vitest runs.
- **GaugeChart LLM docs** — machine-readable docs now correctly list `thresholds` as optional, matching the TypeScript API.
- **`validateProps` data shape handling** — the `"none"` data shape is handled explicitly so no-data components do not accidentally fall through realtime validation assumptions.

### Tooling

- **3324 unit tests pass** after the latest backlog cleanup and cache regression additions.

## [3.4.2] - 2026-04-23

### Added

- **`gradientFill` on `BarChart`** — same API as `AreaChart.gradientFill`: `true` for a default 80%→5% opacity fade on the resolved bar color, `{ topOpacity, bottomOpacity }` for explicit opacity stops, or `{ colorStops: [{offset, color}, ...] }` for arbitrary multi-color gradients. Direction always runs from each bar's tip (opposite the baseline) toward its base, so positive/negative and vertical/horizontal orientations all do the right thing. The scene builder now tags every rect with `roundedEdge` unconditionally (previously only when `roundedTop > 0`) so gradient direction resolves without requiring rounded corners. New `buildBarGradient` helper in `barCanvasRenderer.ts` builds the `CanvasGradient` per bar; `StackedBarChart` / `GroupedBarChart` get it for free via the shared scene + renderer.
- **SVG / SSR rendering for bar gradients** — `ordinalSceneNodeToSVG` in `SceneToSVG.tsx` emits `<defs><linearGradient>` + `fill="url(#id)"` for rect nodes carrying `fillGradient`. Works through both `renderToStaticSVG` (server) and `animatedGif` (GIF export) automatically since both delegate to the shared scene-to-SVG converter. Uses `gradientUnits="userSpaceOnUse"` with absolute coords so each bar's gradient tracks its own rect. New `safeSvgId` helper coerces category names containing spaces/punctuation to a legal SVG id charset before embedding them in the gradient's `id` and `url(#...)` reference.
- **`renderers/colorUtils.ts`** — shared `parseCanvasColor(ctx, color)` used by both `barCanvasRenderer` and `areaCanvasRenderer`. Resolves any valid CSS color (named like `"steelblue"`, `hsl()`, `rgb()`, hex short/long) to an `[r, g, b]` tuple via a `ctx.fillStyle` round-trip that the browser normalizes. Uses a sentinel-probe pattern so silently-rejected invalid colors (canvas ignores them and leaves `fillStyle` at the previous value) fall back safely instead of being mis-parsed as the prior color. Unified the two previously-duplicated local `parseColor` helpers. Bar-gradient dev demos on `/charts/bar-chart` cover three shapes: opacity fade, multi-color stops, and horizontal bars.

### Changed

- **JSX transform flipped to the automatic runtime.** `tsconfig.json` and `tsconfig.mcp.json` now use `"jsx": "react-jsx"` instead of the classic `"jsx": "react"`. JSX compiles to imports from `react/jsx-runtime` rather than `React.createElement(...)`, matching React 17+ guidance and removing the "outdated JSX transform" runtime warning that was peppering test output. ESLint flat config layers `reactPlugin.configs["jsx-runtime"].rules` on top of `recommended` to disable `react/react-in-jsx-scope` and `react/jsx-uses-react` (both obsolete under the new runtime). 17 test files lost their now-redundant `import React from "react"` imports; the 51 files that reference `React.X` types kept theirs. Rollup's `external` predicate in `scripts/build.mjs` extended to cover the `react/jsx-runtime` and `react/jsx-dev-runtime` subpaths alongside the existing `react-dom/server` entry (auto-external marks package roots external but not subpaths).
- **Empty legends no longer reserve margin.** `useChartLegendAndMargin` previously returned a truthy legend object with `legendGroups: [{ items: [], label: "" }]` when mounted with no `data` (push-API pattern) plus `colorBy` — that reserved 110px of right margin and rendered only the legend's header neatline. Zero-item legends now resolve to `undefined`, so no margin is reserved and the chart uses the full width until categories arrive. Surfaced by the "Update: Bar Chart" demo on `/features/push-api`.
- **Dependency hygiene.** `react-router` and `marked-gfm-heading-id` moved from `dependencies` → `devDependencies` (both are docs-only — never imported by anything under `src/`). Removed `tslib` as an explicit dev dep (no `importHelpers: true` in either tsconfig, so TypeScript never emits tslib references). `@testing-library/dom` now an explicit `devDependency` (was a transitive peer of `@testing-library/react@16+`; missing on `npm install --legacy-peer-deps` and broke 79 test files on the publish workflow). Net: Cloud consumers installing the library get 19 runtime deps instead of the 22 they were getting before. `grep -c "react-router\|marked-gfm-heading-id\|tslib" dist/semiotic.module.min.js` returns 0.

### Fixed

- **Publish workflow OOM in `prepublishOnly`.** Four of the five `node scripts/build.mjs` invocations across package.json scripts were missing the `--max-old-space-size=8192` flag that `dist` and `dist:prod` carry; the one that ran on publish hit Node's 4GB default heap ceiling and died during rollup minification with a mark-compact GC failure (exit 134). All five invocations (`build:analyze`, `build:prod`, `pretest:dist`, `release:check`, `prepublishOnly`) now share the heap bump, and the last two route through `npm run dist:prod` so there's one source of truth for how to invoke the build.
- **`parseCanvasColor` detects silently-rejected invalid colors.** The browser ignores invalid CSS color assignments without throwing — `fillStyle` stays at whatever was set before. Without a probe, feeding an invalid color to the parser would mis-read the *previous* color as the caller's input. Added a sentinel-set-first pattern: assign `#010203` before the user's color, then compare; if the sentinel is still there (and the input wasn't literally the sentinel), return the fallback tuple. Also guards the non-string `fillStyle` case (`CanvasGradient` / `CanvasPattern`).
- **`buildBarGradient` / `buildRectSVGGradient`: < 2 valid stops falls back to solid.** Both previously checked `fg.colorStops.length >= 2` but then filtered out `NaN` offsets inside the loop — a configured list of 2 stops with one NaN produced a single-stop gradient (flat color) or, on the SVG path, emitted `offset="NaN"` which invalidates the whole gradient. Now both filter for finite offsets first, clamp, then require ≥2 valid survivors before building.
- **Bar renderer preserves `CanvasPattern` fills when `fillGradient` is set.** The opacity branch of `buildBarGradient` used a hardcoded `"#4e79a7"` fallback when the resolved fill wasn't a string, silently replacing a `CanvasPattern` fill with a grey gradient. Now guards: if the resolved fill isn't a string, the gradient is skipped entirely and the pattern fill renders as intended.
- **Candlestick transition exit stubs preserve bodyWidth.** `snapshotPositions` now captures `node.bodyWidth` into `prev.w` so the candlestick exit node reads the pre-transition width instead of falling through to the 6px default on the final frame. `getNodeIdentity` prefers an existing `_transitionKey` over the datum-derived key so exit stubs stay stable across overlapping transitions (affects all exit-node types, not just candlestick).
- **`CandlestickChart` OHLC validation gap.** When the user asks for OHLC mode but the data is missing `open`/`close` fields, `warnMissingField` and `validateArrayData` now cover all four accessors. Previously the scene builder silently dropped bars and the chart rendered blank with no feedback.

### Tooling

- **`noUnusedLocals` / ESLint cleanup pass.** 17 test files under `src/components/` and `src/__tests__/scenarios/` had bare `import React from "react"` imports that existed only to satisfy the classic JSX transform. Removed with the transform flip. The 51 files that use `React.SomeType` / `React.ComponentProps<>` kept their imports.
- **3246 unit tests pass** (was 3216 in 3.4.1). Net adds: 9 `buildBarGradient` tests + 6 SVG `gradientFill` tests in `SceneToSVG.test.tsx` + 1 `BarChart` empty-legend suppression test + 8 `parseCanvasColor` tests covering hex normalization, named colors, invalid-with-string-prev, invalid-with-non-string-prev, and the sentinel-self edge case + 2 `ordinalSceneBuilders` tests for roundedEdge tagging and fillGradient attachment + 2 NaN-stop fallback tests.

### Docs

- **`/charts/bar-chart`** — new "Gradient Fill" section under Examples with three live demos (default opacity fade, multi-color colorStops, horizontal direction flip) and a props-table row. Generator seeds match the page's existing deterministic pattern (no `Math.random()` at module scope).
- **OUTSTANDING_WORK.md** — added "Legend auto-population from pushed categories [YELLOW]" under the Push API section. Captures the 3.4.2 short-circuit (empty legends don't reserve margin), the real design (an `onCategoriesChange` callback on StreamOrdinalFrame + StreamXYFrame threading through `useChartSetup` state into `useChartLegendAndMargin`'s existing `categories` param), known landmines (first-ingest timing, sorted-array dedupe, XY's `groupAccessor` variant, `LinkedCharts` + `CategoryColorProvider` interaction), and an estimated ~150 LOC surface across 5 files.

## [3.4.1] - 2026-04-22

### Added

- **`CandlestickChart` HOC** (`semiotic/xy`) — wraps `chartType="candlestick"` with the same mode-aware, animated, push-API conventions as the other XY HOCs. Required: `highAccessor`, `lowAccessor`. Optional: `openAccessor` + `closeAccessor` — omit both and the chart degrades to a range/dumbbell visualization (endpoint dots + wick, no body). Honors `mode="primary" | "context" | "sparkline"`: `scalePadding` scales from width (12 / 10 / 3) to keep leftmost/rightmost bars from clipping, `extentPadding` drops to 2% at widths ≤200 so the y-domain isn't padded into uselessness, and sparkline zeroes `top`/`bottom` margin (axes are stripped, so the 2px defaults were dead space). Full docs page at `/charts/candlestick-chart` with static ↔ streaming toggle, range-chart demo, compact-mode grid for OHLC + Range, and an Animation section demoing data-morph (seeded regenerate button) and a sliding push/remove window.
- **Candlestick animation support** — the transition pipeline in `pipelineTransitions.ts` gained full enter/update/exit branches for `type: "candlestick"` nodes. Bars matching by x-identity smoothly interpolate all four y-coords (`openY`, `closeY`, `highY`, `lowY`) when data updates; new bars fade in; scrolled-off bars fade out with a held-in-place gray stub. Snapshot carries `bodyWidth` too so exits don't jump to a 6px fallback on the final frame. Renderer now composites `decayOpacity * style.opacity` so decay and transition fades stack. `getNodeIdentity` prefers an existing `_transitionKey` over the datum-derived key so exit stubs stay stable across overlapping transitions (fixes a latent reshuffle risk for *all* exit-node types, not just candlestick).
- **Server-side rendering for candlestick** — `renderChart("CandlestickChart", ...)` works through a new entry in `serverChartConfigs.ts`. Passthrough config: HOC-level accessors map 1:1 to frame-level ones; `openAccessor`/`closeAccessor` are forwarded without defaults so `PipelineStore` can auto-detect range mode.
- **`compactMode: boolean` on `useChartMode` return** — the context∨sparkline union now lives on the hook instead of being recomputed in each HOC. `GaugeChart` consumes it (replaces the local `modeIsContext || modeIsSparkline` flag and collapses three conditional-render branches into one).
- **`candlestick-range-*` visual regression fixtures** — 3 new modes × 3 browsers = 9 baselines added to the chart-modes matrix specifically covering range-mode rendering (the path that motivated the dot-radius cap).

### Changed

- **Candlestick sparkline rendering** — three rendering changes converge to make high/low lines actually visible at 120×24:
  - Wick is drawn **on top** of the body at `layout.height < 60` with a 2px minimum stroke. At sparkline heights the protrusion above/below a tiny body is often <2px and lands on subpixel boundaries, antialiasing to ~11% alpha (invisible). Drawing the wick last shows the full high-low range as a continuous line through the body.
  - **Range-mode dot radius** scales with `bodyWidth/2` and caps at `layout.height * 0.12` (was hardcoded `max(wickWidth * 2, 4)` — ≥4px always, marble-sized on a 24px row). Scales up for primary/context.
  - Scene builder now computes the **same gap-derived `bodyWidth`** in OHLC and range modes so the renderer has a scale-aware basis for dot sizing.
- **`GaugeChart` needle formula simplification** — `innerRadius > 20 ? innerRadius - 8 : radius - 1`. The `Math.max(1, ...)` / `Math.max(2, ...)` floors in the previous formula were dead: the guarded expression is always well above the floor in either branch.
- **Type safety sweep** — ~216 `any` types eliminated across the codebase. Scene-node interfaces, scale helpers, hook returns, and accessor resolution gained concrete types. No behavior change; catches more regressions at compile time.
- **Major dependency updates** — `@playwright/test` + `playwright-chromium` `^1.17.1` → `^1.59.1` (regenerated 9 darwin baselines for chromium font-rendering shifts on label-heavy charts), `vitest` + `@vitest/coverage-v8` + `@vitest/ui` `^4.0.18` → `^4.1.4`, `typedoc` `^0.28.17` → `^0.28.19`, `@axe-core/playwright` `^4.11.1` → `^4.11.2`, `@modelcontextprotocol/sdk` 1.27.1 → 1.29.0, `@types/node` aligned to Node 22.19.17 (matches the Volta-pinned runtime). `.node-version` corrected from `18` → `22.22.1`.

### Fixed

- **`RealtimeHistogram.showLegend` dead pass-through** — `showLegend` was being fed into `useChartMode` but the resolved value was never consumed (the HOC doesn't construct a `legend` prop for StreamXYFrame). Removed the feed-in and updated the comment to explain the absence.
- **`arrowOfTime` wrongly exposed on `StreamOrdinalFrame`** — removed. The prop only applies to XY time-series layouts; its presence on the ordinal frame was a leftover from a shared-types refactor.
- **Doc TOC duplicate-key warning** — two sections titled "When to reach for which" on `/theming/semantic-colors` slugged to the same React key. Renamed to "When to reach for which role" and "When to reach for which primitive"; `PageLayout` additionally de-dupes TOC keys defensively so a transient DOM overlap during route transitions can't re-surface the warning. `item.id` still carries the real heading id for anchor navigation; `item.key` is a separate React-only identifier.
- **Shadowed cookbook import in `App.js`** — `import CandlestickChartPage from "./pages/cookbook/..."` was re-importing the same symbol used by the new `/charts/` route, so the charts-route fell through to the cookbook recipe. Renamed to `CandlestickCookbookPage`.

### Tooling

- `ai/schema.json` and `validationMap.ts` gained `CandlestickChart` entries; `check-schema-freshness.js` and `check-ssr-alignment.js` both pass.

## [3.4.0] - 2026-04-18

### Added

- **Tooltip format cascade** — `valueFormat` on ordinal HOCs and `xFormat`/`yFormat` on XY HOCs now flow through to the default tooltip automatically, so a BarChart with `valueFormat: d => \`$\${d/1000}k\`` shows "$450k" on both the axis and the tooltip. Wired into: BarChart, StackedBarChart, GroupedBarChart, DotPlot, SwarmPlot, SwimlaneChart, LineChart, AreaChart, StackedAreaChart, Scatterplot, BubbleChart, ConnectedScatterplot, QuadrantChart, Heatmap. `buildOrdinalTooltip` and `buildDefaultTooltip` gained format params; a new `applyFormat` helper wraps formatter calls in try/catch so a misbehaving formatter falls back to the built-in `formatVal` instead of breaking the tooltip. Custom `tooltip` props still fully override the default (re-pass the formatter inside `Tooltip({format})` / `MultiLineTooltip({fields:[{format}]})` if you want it to apply). New "Format Cascade" section on `/features/tooltips`.
- **`sort: "auto"` on ordinal HOCs** — preserves insertion order while streaming and falls through to value-desc on static data. Applied to `oSort` on the frame and to `sort` on BarChart / StackedBarChart / GroupedBarChart / DotPlot. **DotPlot's default changed from `sort: true` to `sort: "auto"`** — fixes categories shuffling during streaming in the quick-start docs demo and any push-API usage.
- **`replace()` method on `StreamOrdinalFrameHandle`** — atomically swaps the dataset while preserving the store's category insertion-order memory and the transition position snapshot. Routes through a new `DataSourceAdapter.setReplacementData()` (emits `{bounded: true, preserveCategoryOrder: true}`); falls through to progressive chunking for large replacements. `LikertChart`'s re-aggregation now uses `replace()` instead of `clear() + pushMany()` so streaming question order stays stable across ticks.
- **`Changeset.preserveCategoryOrder`** — new flag on the ingest changeset. When true on a bounded changeset, the store replaces the buffer contents but does NOT clear its category insertion-order memory, and marks itself as having received streaming-sourced data. The machinery that makes aggregator HOCs (LikertChart, future density/bin charts) behave like live streams even though the transport is wholesale replacement.
- **`getScales()` on the shared `RealtimeFrameHandle`** (optional) — routed through 8 ordinal HOCs + 9 XY HOCs + 5 realtime HOCs. Returns the frame's resolved scales (`{o, r, projection}` for ordinal, `{x, y}` for XY). Network/geo/hierarchy HOCs stay compliant by virtue of the method being optional.
- **`LikertChartHandle`** — narrowed ref handle type exported from the public entry point. Extends `RealtimeFrameHandle` and types `getScales()` as returning `OrdinalScales`, so `ref.current?.getScales()?.o.domain()` works without casts.
- **`useFrame` composition hook** (`src/components/stream/useFrame.ts`) — extracts shared Tier A concerns across all four Stream Frames (size + responsive sizing, margin merge, foreground/background graphics resolution, animate → transition, current theme subscription, stable accessible-table id, rAF-coalesced render scheduling with unmount cleanup, pointer-coalesced hover handlers, theme-change effect). ~300 lines of duplication removed. No behavioral change for consumers.
- **FlowMap SSR support** — `renderChart("FlowMap", ...)` now works server-side via a new `flowMap` entry in `serverChartConfigs.ts`. Expands `{flows, nodes}` into the line-shape StreamGeoFrame expects, with value-proportional edge widths, `edgeColorBy` / `edgeWidthRange` / `edgeOpacity` / `edgeLinecap` honored. Function-valued `edgeColorBy` returning literal CSS colors passes through unchanged (via shared `getColor`).
- **`LikertChart`** added to the server-side `ChartName` union — was registered in `CHART_CONFIGS` but absent from the TS union, so `renderChart("LikertChart", ...)` would type-error despite working at runtime.
- **`animate` prop on every HOC chart** — `animate?: boolean | { duration?, easing?, intro? }` wired across all XY, ordinal, network, and geo HOCs. Stream Frames resolve `animate` → `transition` internally, with synthesized intro animations: bars from baseline, wedges from collapsed arc, lines/areas clipped from left, points from `r=0`, network nodes from chart center, geo points from center. Wedge angle interpolation for pie/donut data changes. Respects `prefers-reduced-motion`.
- **Quadtree spatial index** for point hit testing on XY (scatter/bubble), Geo (proportional symbol maps), and Ordinal (swarm plots) when point count exceeds 500. Each store tracks `maxPointRadius` so the hit tester widens its query for variable-size points (BubbleChart, proportional symbols). Shared `findHitPointInQuadtree` (`src/components/stream/quadtreeHitTest.ts`) uses `quadtree.visit()` to enumerate every candidate within the search region, eliminating the nearest-only miss that `quadtree.find()` had on heterogeneous-radius scenes.
- **`Path2D` cache on network edges** (`NetworkBezierEdge` / `NetworkRibbonEdge` / `NetworkCurvedEdge`) — `_cachedPath2D` + `_cachedPath2DSource` fields invalidate when `pathD` changes. Shared between `NetworkCanvasHitTester` and `networkEdgeRenderer`.
- **`waitForChartReady` / `waitForAllChartsReady` / `waitForRafs` / `waitForStreamingUpdate`** in `integration-tests/helpers.ts` — event-driven Playwright waits replacing the per-spec `waitForVisualization` + `waitForTimeout(N)` pattern.
- **`HoverPointerCoords` type** in `hoverUtils.ts` — narrower hover-handler signature replacing the `as unknown as React.MouseEvent` cast that the rAF-coalesced path used to need.
- **`ordinalFixtures.ts` + `recordCanvasOps` test utilities** — shared sample datasets for bar-chart tests; behavior-level draw-op recorder that replaces brittle `toHaveBeenCalledTimes` assertions in canvas-renderer tests.
- **`describe.each` combinatorial coverage** for `lineCanvasRenderer` over (curve × decay × thresholds), exercising the path-selection invariants that previously had a single test.
- **3000+ unit tests passing** (was 2890 in 3.3.x). Added cache-invalidation regressions for `_colorMapCache`, `_colorSchemeMap`, `_categoryIndexCache`, `_stackExtentCache`, accessor explicit-clear, ParticlePool free-list, `findHitPointInQuadtree` variable-radius, `resolveCSSColor` version counter, swimlane bandwidth clamp.
- **Theme-driven selection opacity** — `theme.colors.selectionOpacity` (already defined on `SemioticTheme`; built-in presets set it to 0.1–0.15) is now wired into the dimming applied by `hoverHighlight`, legend isolate, and linked selections. Previously the value was emitted as the `--semiotic-selection-opacity` CSS variable but never read. A new `useResolvedSelection(selection)` hook merges the theme value into the selection config; every HOC plus `Treemap` now passes through it. Resolution order is `selection.unselectedOpacity` (per-chart) → `theme.colors.selectionOpacity` → `DEFAULT_SELECTION_OPACITY` (library fallback). Clients that previously reached into the package to change `DEFAULT_SELECTION_OPACITY` can now do `<ThemeProvider theme={{ colors: { selectionOpacity: 0.5 } }}>` instead.

### Changed

- **Function comparator on ordinal `sort` / `oSort` is now a category-key comparator** — prior types said `(row, row) => number` but the frame always invoked it with category name strings, so any user passing a row-comparator was getting silently incorrect ordering. Tightened to `(a: string, b: string) => number` on BarChart, DotPlot, GroupedBarChart, StackedBarChart, and the frame's `oSort` type. `useSortedData` treats function-valued sort (and `"auto"`) as pass-through since the frame owns category ordering. No usages in `src/`, `docs/src/`, or `integration-tests/` passed a function comparator.
- **Stream Frame perf pass** — `OrdinalPipelineStore` decay/pulse no longer rebuild a `Map<datum, index>` every frame (cached against `_dataVersion`); pulse wedge inner loop went from `O(wedges × data)` to `O(matches per category)` via `getCategoryIndexMap`. `PipelineStore` stacked-area extent fused into a single pass; `resolveColorMap` short-circuits on `_ingestVersion`. Geo line projection fused project + filter into one pass.
- **`ParticlePool.spawn()`** — O(1) free-list (stack of free indices) replaced the O(capacity) linear scan. `evaluateBezier` rewritten as `evaluateBezierInto(out)` so positions write into the particle directly — zero per-particle allocation per frame.
- **rAF-coalesced pointermove** in all four Stream Frames — caps hit-testing + React re-renders at the display refresh rate (60 Hz) instead of the native pointer rate (often 120–240 Hz). `onMouseLeave` cancels any pending move; latest coords always processed.
- **CSS-var color cache** (`resolveCSSColor`) — version-counter design plus a singleton `MutationObserver` on `document.documentElement` and a `prefers-color-scheme` `matchMedia` listener. Themes/class toggles/media-query swaps that bypass React still invalidate; per-frame `getComputedStyle` thrashing is gone.
- **`DEFAULT_SELECTION_OPACITY`: 0.2 → 0.5** — unselected (dimmed) elements stay readable when a selection is active. Override via `selection.unselectedOpacity` (per-chart) or `theme.colors.selectionOpacity` (via `ThemeProvider`, applies to every chart). Built-in theme presets set this to 0.1–0.15.
- **`barPadding` ratio clamped to ≤ 0.9** in `OrdinalPipelineStore` — degenerate layouts (e.g. horizontal swimlane where `showCategoryTicks: false` shrinks the left margin and the vertical content area is less than `barPadding * 2`) no longer paint zero-bandwidth bands.

### Fixed

- **Streaming ordinal category shuffle** — re-aggregating from a live buffer (LikertChart) or pushing into DotPlot made categories visibly jump around when per-category values changed rank. Two root causes, both fixed: (1) `replace()` now routes through the new `preserveCategoryOrder` ingest path so the category Set isn't wiped on every re-aggregation; (2) `sort: "auto"` (DotPlot's new default) collapses to insertion-order while streaming instead of value-desc.
- **Composing charts as `position: absolute` overlays no longer hides the base layer** — StreamXYFrame and StreamOrdinalFrame used to paint `--semiotic-bg` across the full canvas regardless of whether the chart was on top of another. Pass `frameProps={{ background: "transparent" }}` on the overlay to short-circuit the fill; the built-in composed-brush demos (`/charts/realtime-histogram`) now use this pattern. Network/Geo frames already behaved correctly.
- **MultiAxis ordinal `rExtents` not cleared on bounded ingest** — when `rAccessor` is an array, the per-axis `rExtents[i]` instances are distinct from `this.rExtent`, so clearing only the latter left stale min/max on subsequent bounded replacements. All per-accessor extents now clear together.
- **Streaming axis rendered ghost ticks after `replace()` dropped a category** — `resolveCategories` retains its insertion-order memory for FIFO stability on re-appearance, but only the `undefined`/`"auto"` branch was filtering to live categories. Explicit `"desc"`/`"asc"`/`false`/comparator branches rendered empty columns for evicted categories. Live-category filtering now happens once at the top of the function and every branch reads from it.
- **DataSourceAdapter progressive-chunk timer state** — `scheduleNext` early returns (completed dataset, superseded data) didn't reset `chunkTimer`, so `setBoundedData` / `clearLastData` could call `cancelAnimationFrame` on a stale token. Every exit path now resets `chunkTimer = 0`, preserving the "`chunkTimer === 0` iff no rAF scheduled" invariant. Fixed in both `setBoundedData` and the new `setReplacementData`.
- **`setReplacementData` microtask race** — a `push()` / `pushMany()` buffered just before a `replace()` could flush after the replacement and append stale points onto the fresh dataset. `setReplacementData` now clears the pushBuffer + `flushScheduled` state before emitting the changeset.
- **`react-dom/server` stripped to `(void 0)(...)` in the server bundle** — `rollup-plugin-auto-external` marks package roots external but not subpaths, so `renderToStaticMarkup` was being tree-shaken to an undefined binding. Added `id === "react-dom/server"` to the rollup external predicate. Verified no other production subpath imports hit the same trap.
- **`StreamOrdinalFrameHandle.replace()` JSDoc and atomicity** — routes through `setBoundedData`-style progressive chunking for large datasets, not a single synchronous change. Corrected the "Atomically replace" wording to describe the actual two-phase behavior (small datasets synchronous, large datasets chunked).
- **DataSourceAdapter unmount cleanup** — `StreamXYFrame` and `StreamOrdinalFrame` now call `adapter.clear()` in their lifecycle cleanup so in-flight progressive chunking and pending push microtasks can't fire after unmount.
- **MinimapChart polling rAF** — tracks its handle and cancels on unmount + data change. Was leaking a recursive `requestAnimationFrame` poll that kept calling `setOverviewScales` on unmounted components.
- **Cache invalidation completeness** — `PipelineStore._stackExtentCache` now invalidates on `timeAccessor` / `valueAccessor` / `runtimeMode` changes; `OrdinalPipelineStore._colorSchemeMap` on `themeCategorical` / `colorAccessor`; `OrdinalPipelineStore._categoryIndexCache` on `categoryAccessor` / `oAccessor`.
- **Accessor re-resolution gates** — `updateConfig` blocks for x/y/time/value (`PipelineStore`) and category/o/value/r (`OrdinalPipelineStore`) used `config.X !== undefined`, which silently skipped re-resolution when a caller explicitly cleared an accessor (`{xAccessor: undefined}` — valid React pattern). Switched to `"X" in config` so defined → undefined transitions revert to the fallback key.
- **GeoCanvasHitTester wasted fallback** — when a quadtree is built, the linear scan after a quadtree miss is now skipped (the visit-based path is authoritative). Per-hit `.filter()` array allocations for areas/lines also removed.
- **StreamGeoFrame hover via `e.currentTarget`** — handler reads `canvasRef.current` instead so it works under the rAF-coalesced path that passes a synthetic `{clientX, clientY}` payload.
- **`_resetCSSColorCacheForTest` observer leak** — disconnects the global `MutationObserver` and `matchMedia` listener it installed; bumps `currentVersion` rather than resetting to 0 so any surviving WeakMap entries can't be re-validated.

### Security

- Bumped `hono` 4.12.8 → 4.12.14 and `@hono/node-server` to 1.19.14 (transitive via `scripts/og-server.mjs`). Resolves seven advisories — six in `hono` (cookie validation, IPv4-mapped IPv6 mismatch, path traversal in `toSSG`, `serveStatic` slash bypass, `hono/jsx` HTML injection) and one in `@hono/node-server` (`serveStatic` middleware bypass via repeated slashes). All moderate; reachable only from the OG-image build script, not from the published library.

### Tooling

- **Dev deps:** `@modelcontextprotocol/sdk` 1.27.1 → 1.29.0, `esbuild` 0.27.4 → 0.28.0, `@types/node` aligned to Node 22.19.17 (matches the Volta-pinned runtime).
- **Realtime encoding docs** — new "Tuning for streaming cadence" subsection on `/features/realtime-encoding` with guidance on duration-vs-push-interval tradeoffs (fast / pulsed / slow streams) and the `replace()` requirement for aggregator HOCs to participate in the transition system.
- **CLAUDE.md / AI docs** — "Composing overlays" pitfall note added.
- `scripts/create-release-branch.sh` now (a) syncs `ai/schema.json` version to the bumped package version, (b) verifies `CHANGELOG.md` has an entry for the new version, and (c) gates on `npm audit --audit-level=moderate`. Override the audit floor with `AUDIT_LEVEL=...` if a release is intentionally shipping with known low-severity transitives.
- `prettier` 3.8.1 → 3.8.3 (dev-only patch).

### Removed

- The per-spec `waitForVisualization` helpers in 9 Playwright spec files (consolidated into `integration-tests/helpers.ts`).

## [3.3.1] - 2026-04-11

### Added

- **`sort` prop on StackedBarChart and GroupedBarChart** — Default: `false` (data insertion order). Accepts `"asc"`, `"desc"`, `boolean`, or custom `(a, b) => number` comparator. Maps to frame `oSort`. Previously categories were always sorted by total value.
- **`edgeIdAccessor`** on `NetworkPipelineConfig` — Enables `removeEdge(edgeId)` single-ID edge removal. Accepts string or function accessor. Throws descriptive error if not configured when single-ID form is used.
- **Transition exits on `remove()`** — `remove()` now calls `snapshotPositions()` before buffer mutation in PipelineStore and OrdinalPipelineStore. Removed items get fade-out exit transitions instead of vanishing instantly.
- **Selection clearing on `remove()`** — All three stream frames (XY, Ordinal, Network) clear hover state when the removed datum matches the current hover. Prevents stale tooltips and ghost highlights.
- **`serverChartConfigs.ts`** — Extracted `renderChart()` dispatch from a 400-line switch statement into a lookup table of `{ frameType, buildProps }` entries. Each chart type is independently readable and testable.
- **Shared `computeDecayOpacity()`** — Decay algorithm consolidated from 4 inline implementations (OrdinalPipelineStore, NetworkPipelineStore, GeoPipelineStore) into the existing `pipelineDecay.ts` utility. Single source of truth.
- **`HoverData` unified type** — All four stream frames now construct typed `HoverData` objects instead of ad-hoc shapes. Network frames use `nodeOrEdge` field (replaces untyped `type`); geo frames use `properties` field. Fixed GeoFrame mismatch where tooltip and `customHoverBehavior` received different shapes. **Breaking**: Network `customHoverBehavior`/`tooltipContent` callbacks no longer receive `d.type` — use `d.nodeOrEdge` instead.
- **SSR angle convention fix** — SVG wedge/arc rendering adds `π/2` to convert from canvas convention (0 = 3 o'clock) to d3-shape convention (0 = 12 o'clock). Fixes -90° rotation on all SSR pie, donut, gauge, and chord charts.
- **SSR hierarchy theme colors** — Treemap, CirclePack, and TreeDiagram `colorByDepth` now uses `config.colorScheme` (from theme) instead of hardcoded `DEPTH_PALETTE`. Default fill uses first scheme color instead of `#4d430c`.
- **SSR GaugeChart needle** — Needle rendered via React elements (XSS-safe), positioned from inner (margin-adjusted) dimensions, uses `resolveTheme()` for color, divide-by-zero guard on `gMax === gMin`.
- **SSR `sweepAngle` passthrough** — `sweepAngle` was on the props but missing from the `pipelineConfig` builder. Gauge arcs now render with correct sweep.
- **SSR `hierarchySum` string resolution** — String `valueAccessor` (e.g., `"value"`) now resolved to a function before passing to `d3-hierarchy.sum()`.
- **SSR bottom legend positioning** — Legend placed at `totalHeight - margin.bottom + 38` (below axes) instead of hardcoded offset that overlapped chart area.
- **SSR ID uniqueness** — All SVG element IDs (`data-area`, `axes`, `grid`, `legend`, `chart-title`, `annotations`, `semiotic-title`, `semiotic-desc`, hatch patterns) prefixed with `_idPrefix` in multi-chart documents. `renderDashboard` passes per-chart prefixes.
- **88 new tests** — Push API edge cases (17), server rendering coverage (27), HOC rendering integration (22), callback wiring + accessibility + bad data resilience (22). Plus 9 PipelineStore cache invalidation tests.
- **Ordinal scene builder tests refactored** — 14 exact-pixel assertions replaced with relationship/proportional assertions. Tests now survive layout constant changes.

### Changed

- **`as any` reduced: 240 → 164** — Hover data types, renderer arrays, pipeline config, accessor utils, SSR prop threading.
- **SSR `frameProps` override priority** — `frameProps` spread first, explicit top-level props override. `margin`/`colorScheme`/`legendPosition` only override when defined (not `undefined`).
- **SSR gallery** — All 15 charts use `renderChart` with explicit themes (11 different presets). Dark-themed charts have dark card backgrounds.

### Fixed

- **`getColor()` / `getSize()` null datum guard** — Optional chaining prevents crash when datum is undefined.
- **`ProportionalSymbolMap` sizeDomain crash** — `filter(Boolean)` + optional chaining in accessor.
- **`resolveCSSColor` cache** — Restored per-canvas `WeakMap` cache with `has()` check (handles falsy values). `clearCSSColorCache()` invalidates on theme change.
- **`pieceStyle` merge null guard** — User `frameProps.pieceStyle` returning `undefined`/`null` no longer crashes spread.
- **GeoFrame hover/click shape mismatch** — `customHoverBehavior` and `tooltipContent` now receive the same `HoverData` object.
- **Bottom legend overlap** — Positioned below axes area in reserved margin.

## [3.3.0] - 2026-04-08

### Added

- **`semiotic/server` production API** — `renderChart(component, props)` renders 27+ HOC chart types to standalone SVG strings. Supports all themes, legends (4 positions), grid, annotations (y-threshold, x-threshold, category-highlight, widget, enclose), and accessibility attributes (`role="img"`, `<title>`, `<desc>`, `aria-labelledby`). SVG groups have `id` attributes for Figma layer naming (`data-area`, `axes`, `grid`, `annotations`, `legend`, `chart-title`).
- **`renderDashboard(charts, options)`** — Multi-chart dashboard layout with title, theme, configurable columns. Each chart entry supports `colSpan` for wide charts.
- **`renderToImage(component, props, options)`** — PNG/JPEG rasterization via sharp (peer dependency). Configurable `scale` for retina output.
- **`renderToAnimatedGif(chartType, data, props, options)`** — Animated GIF from streaming data windows. Options: `fps`, `transitionFrames`, `easing`, `decay`, `windowSize`, `loop`, `scale`.
- **`generateFrameSequence(frames)`** — Snapshot-based animation for topology changes (network failover, edge removal). Each frame is an independent `renderChart` call.
- **SVG hatch patterns** — `createSVGHatchPattern()` for server-rendered diagonal hatch fills. Used by FunnelChart vertical mode for dropoff bars.
- **Push API `remove()` and `update()`** — Selective data removal and in-place update across all stores (RingBuffer, PipelineStore, OrdinalPipelineStore, NetworkPipelineStore) and all HOC/frame handles. `remove(id)` or `remove([ids])` by ID (requires `pointIdAccessor`/`dataIdAccessor`). `update(id, updater)` for in-place mutation. Network: `removeNode(id)` cascades to edges, `removeEdge(source, target)` removes parallel edges.
- **`pointIdAccessor` / `dataIdAccessor`** — ID accessor props on BaseChartProps for `remove()` and `update()` targeting.
- **GaugeChart server rendering** — Sweep angle, start angle, inner radius, threshold zone fills, needle indicator.
- **FunnelChart server rendering** — Horizontal and vertical modes with trapezoid connectors. Vertical mode supports hatch pattern dropoff bars.
- **Sparkline server rendering** — `renderChart("Sparkline", props)` with no axes, 2px margins, no grid/legend/title.
- **6 interactive docs pages** — Render Studio, Theme Showcase, Dashboard Gallery, Email Preview, Export & Embed (with real GIF downloads), Push API demo.

### Changed

- **`hoverHighlight` simplified** — Changed from `boolean | "series"` to just `boolean`. Any truthy value triggers series-based dimming (requires `colorBy`).
- **CSS variable resolution in canvas** — `resolveCSSColor()` resolves `var(--name, fallback)` via `getComputedStyle` at paint time. Per-canvas cache avoids repeated calls within a paint cycle; `clearCSSColorCache()` invalidates on theme change. All 9 canvas renderers updated.
- **`extentPadding` nullish coalescing** — Changed `|| 0.05` to `?? 0.05` so `extentPadding: 0` is respected.
- **Swimlane `skipMaxPad`** — Prevents trailing gap in swimlane charts by skipping max-side extent padding.
- **`frameProps.pieceStyle` merging** — Ordinal HOCs now merge user's `pieceStyle` with computed base style instead of excluding it. Enables stroke overrides.
- **`resolveGroupColor()` in server rendering** — XY line/area style fallbacks call `resolveGroupColor(group)` instead of hardcoding `#007bff`. Theme categorical colors flow through to server SVG.
- **Force layout `iterations: 0`** — Now skips simulation entirely for pinned node positions. Previously warm-start detection overrode to 40 iterations.
- **Background rect positioning** — Server SVG background rect renders at SVG root, not inside translated group (fixes Figma import).
- **Dependency bumps** — vite 8.0.5, typedoc 0.28.18, vulnerable devdeps fixed.

### Fixed

- **Server legend margin** — Legend position expands margin before width/height calculation (right:100, left:100, bottom:70, top:40).
- **Server `frameProps` passthrough** — `frameProps` spread into renderer common object so `pieceStyle`, `lineStyle` flow through.
- **Server `effectiveColorScheme`** — Falls back to `theme.colors.categorical` when `colorScheme` prop not set.
- **Network `remove()` return value** — Returns node data before removal instead of empty array.
- **RingBuffer `update()` snapshot safety** — Proper type-aware cloning (array spread for arrays, object spread for objects).
- **Timestamp buffer desync on remove** — Lockstep compaction removes matching indices from timestamp buffer.
- **`buildRealtimeNodes` preserving positions** — Uses `x: d.x ?? 0, y: d.y ?? 0` instead of hardcoded zeros.
- **Dark mode CSS var strokes** — Docs site sets `--semiotic-bg` in both dark/light blocks. `LiveExample` uses MutationObserver for chart remount on theme toggle.

## [3.2.3] - 2026-04-03

### Added

- **GaugeChart** — New ordinal HOC for single-value gauges with threshold zones, needle indicator, and configurable sweep angle. Built on StreamOrdinalFrame radial projection (reuses pie/donut rendering pipeline). Supports `fillZones={false}` for fixed-zone displays where only the needle moves (e.g. election needle). Exported from `semiotic` and `semiotic/ordinal`.
- **Range/dumbbell plot** — Candlestick chart type now supports range mode: omit `openAccessor`/`closeAccessor` and provide only `highAccessor`/`lowAccessor` to render vertical lines with endpoint dots. Single `rangeColor` via `candlestickStyle`. No new HOC — demonstrates StreamXYFrame flexibility.
- **`scalePadding`** — Pixel inset on XY scale ranges to prevent glyph clipping at chart edges. Available on `StreamXYFrameProps`; HOCs pass via `frameProps={{ scalePadding: 12 }}`. Domain and tick values unchanged.
- **`xScaleType="time"`** — New scale type creates `d3.scaleTime` for Date-aware tick generation. Required for landmark ticks with timestamp data.
- **`sweepAngle`** — New prop on `StreamOrdinalFrameProps` limiting pie/donut arc to less than 360° (used internally by GaugeChart).
- **Multi-point tooltip** — `tooltip="multi"` on LineChart shows all series values at hovered X with color swatches. Custom functions receive `datum.allSeries` with `{group, value, valuePx, color, datum}`.
- **Click-to-lock crosshair** — In `linkedHover` x-position mode, click locks the crosshair. Escape or click again to unlock. Source-aware unlock prevents multi-chart interference.
- **Hover-based sibling dimming** — `hoverHighlight` on all HOCs dims non-hovered series on data mark hover (requires `colorBy`).
- **Per-series fillArea** — `fillArea={["A","B"]}` on LineChart fills named series as areas, others stay as lines. New `"mixed"` chart type with dedicated scene builder.
- **Multi-color gradient fills** — `gradientFill={{ colorStops: [{offset, color}] }}` on AreaChart for semantic color bands. Supports `transparent`.
- **Line stroke gradients** — `lineGradient={{ colorStops }}` on LineChart/AreaChart for horizontal gradient strokes.
- **Axis config extensions** — `includeMax` forces domain-max tick, `autoRotate` rotates labels 45° when crowded, `gridStyle` ("dashed"|"dotted"|string) for grid lines, `landmarkTicks` bolds month/year boundaries.
- **`baselinePadding`** — Boolean prop on bar chart HOCs. Default `false` makes bars flush with 0 baseline.
- **`hoverRadius`** — Configurable hit-test distance (default 30px) on all XY HOCs and `StreamXYFrameProps`.
- **ReactNode tick labels** — `xFormat`, `yFormat`, `categoryFormat` accept `=> string | ReactNode` with `<foreignObject>` fallback.
- **Tick deduplication** — Adjacent identical tick labels automatically removed.
- **`getHitRadius`** and `MultiPointTooltip` exported from `semiotic/utils`.
- **`isTimeLandmark`** and **`toDate`** exported from `hitTestUtils.ts` (shared across SVGOverlay and tests).

### Fixed

- **30px default hit radius** — All 4 hit testers (XY, Network, Geo, Ordinal) now use `getHitRadius()` from shared `hitTestUtils.ts`. Previous 12px Fitts's law cap was too small for comfortable interaction.
- **`lineDataAccessor` data flattening** — StreamXYFrame now flattens line-object data before pipeline ingestion. Previously the pipeline read `xAccessor` on line objects (which lack that field), producing NaN extents.
- **`scaleTime` domain comparison** — `valueOf()` comparison for Date objects prevents stale scales from blocking updates.
- **Annotation dark mode** — `Annotation.tsx` text uses `var(--semiotic-text)`, connectors use `var(--semiotic-text-secondary)` instead of hardcoded black.
- **SwimlaneChart `showCategoryTicks={false}`** — Now suppresses both tick labels and axis title.
- **Floating point tooltip precision** — `formatValue` rounds via `toPrecision(6)`.
- **Default tick format Date-aware** — `defaultTickFormat` handles Date objects (formats as "Jan 7" style).
- **`bodyWidth: 0` on candlestick** — Body rect skipped entirely, no invisible canvas elements.
- **Ordinal bar baseline** — Value axis baseline draws at `rScale(0)`, not chart edge. Include-zero applied before padding.
- **Remap fast-path with `scalePadding`** — Disabled proportional remap when padding is set (forces full rebuild for correctness).
- **Candlestick `updateConfig`** — OHLC accessors and `candlestickRangeMode` recomputed on prop changes.

### Changed

- **`baselineStyle` renamed to `gridStyle`** — Applies to grid lines (not axis baselines, which stay solid).
- **Build system** — `rollup-plugin-typescript2` replaced with `@rollup/plugin-typescript` (fixes TS compilation).
- **Playwright CI** — `serve-examples:ci` script skips redundant `npm run dist`. Timeout bumped to 120s.

## [3.2.2] - 2026-03-30

### Added

- **Exhaustive scene builder test coverage** — 346 new tests across all XY scene builders (line, area, stacked area, point, swarm, heatmap, waterfall, candlestick, bar) and ordinal scene builders (funnel, bar-funnel, swimlane). Tests assert actual coordinates, baselines, cumulative positions, and style resolution — not just "it didn't crash."
- **FunnelChart and LikertChart HOC tests** — First test suites for the two previously untested HOCs. FunnelChart: 29 tests covering horizontal/vertical modes, multi-category mirroring, connector opacity, tooltip metadata. LikertChart: 31 tests covering raw/pre-aggregated modes, diverging colors, neutral sentinels, error states.
- **Render pipeline benchmarks** — `benchmarks/unit/render-pipeline.bench.ts` covering scene builder throughput (scatter 50k: 4ms, line 10k: 0.45ms, stacked area 10k: 1.3ms), RingBuffer push/iteration, and end-to-end ingest-to-scene-build. Identified heatmap at 50k (49ms) as the only builder exceeding frame budget.
- **Dev-mode `d.data` access warning** — Frame callbacks (`nodeStyle`, `edgeStyle`, `nodeSize`) now warn in development when users access properties that exist on `.data` but not on the RealtimeNode/RealtimeEdge wrapper (e.g., `d.category` instead of `d.data?.category`). Zero production overhead. Applied to all 5 layout plugins (sankey, force, chord, orbit, hierarchy).
- **Streaming-first docs narrative** — Landing page and Getting Started page restructured to lead with the streaming engine (push API, two-canvas RAF loop, ring buffer, decay/pulse/staleness/transitions) as the primary differentiator.

### Performance

- **Heatmap scene builder optimized** — Streaming path uses flat `Int32Array`/`Float64Array` grids instead of `Map<string, {data[]}>`, eliminating 50k string key allocations and per-datum array pushes. Static path uses numeric Map keys and precomputed 256-entry color LUT (cached per scheme) instead of per-cell `scaleSequential` calls. Streaming 50k points into 20×20 grid: **0.37ms** (was ~49ms with Map+string approach). Static path ~15% faster at high cardinality.

### Fixed

- **`@modelcontextprotocol/sdk` removed from production dependencies** — The MCP CLI (`semiotic-mcp`) now bundles the SDK via esbuild, so `npm install semiotic` no longer pulls in the 4MB+ MCP SDK and its transitive deps. The bundled CLI works identically — zero behavior change for `npx semiotic-mcp` users.
- **`@types/d3-quadtree` moved to devDependencies** — Type declaration packages are always dev-only.
- **Stacked area points at wrong Y position** — `emitPointNodes` used raw `ctx.getY` instead of cumulative stacked Y. Fixed by adding `yGetOverride` parameter and computing stacked positions from `buildStackedAreaNodes`' `stackedTops` map — no duplicate stacking pass.
- **Null Y datums assigned stacked Y** — Added `y != null && !Number.isNaN(y)` guard before setting stacked point positions.
- **Stale forecast overlays on prop removal** — Early return in LineChart effect when both `forecast` and `anomaly` become falsy now clears previous statistical overlays.
- **GeoCanvasHitTester inconsistent hit radius** — Quadtree path used `(r||4)+4`, linear scan used `Math.max((r||4)+5, 12)`. Unified to `Math.max((r||4)+5, 12)` everywhere.
- **backgroundGraphics not honoring margins** — StreamXYFrame and StreamGeoFrame rendered `backgroundGraphics` outside the margin-translated `<g>`. Fixed in both client and SSR paths.

## [3.2.1] - 2026-03-30

### Added

- **LikertChart** — new ordinal HOC for Likert scale survey data. Horizontal (default): diverging bar chart centered at 0% with negative levels extending left, positive right, and neutral (odd count) split 50/50 across the centerline. Vertical: stacked 100% bar chart. Supports raw integer scores (1-based, auto-aggregated) and pre-aggregated (question, level, count) data. Works with any scale size (3-point to 7-point+). Push API for streaming — the chart accumulates raw data and re-aggregates percentages on each push.
- **`onClick` prop on all HOCs** — Direct click handler receiving `(datum, { x, y })` with the original unwrapped datum. Works on lines, bars, areas, pie slices, nodes, and geo features. No more `onObservation` filtering or `frameProps.customClickBehavior` escape hatch for simple click handling.
- **`categoryFormat` prop on ordinal HOCs** — Custom formatting function for individual category tick labels. Receives `(label, index?)` and returns a formatted string. Covers truncation, abbreviation, and custom labeling without dropping to `frameProps.oLabel`.
- **`category-highlight` annotation type** — Highlights a specific category column/row in ordinal charts with a semi-transparent band. Usage: `{ type: "category-highlight", category: "Q3", color: "#4589ff", opacity: 0.15 }`. Uses raw band scale from annotation context for correct positioning.
- **`labelPosition` on threshold annotations** — `y-threshold` supports `"left"` | `"center"` | `"right"` (default). `x-threshold` supports `"top"` (default) | `"center"` | `"bottom"`. Previously labels were fixed at right/top.
- **Coordinate-based linked crosshair** — `linkedHover={{ name: "sync", mode: "x-position", xField: "time" }}` broadcasts the hovered X data value across charts. Consuming charts render a synced vertical crosshair at that X position with independent Y values. Wired through all 9 XY HOCs via shared `getCrosshairProps` utility. Crosshair positions are cleaned up on unmount.
- **Tooltip viewport-aware flip** — Tooltips auto-flip horizontally and vertically when near container edges. Uses `useLayoutEffect` measurement with proper dependency array for precise flip decisions. Applied to all four stream frames (XY, ordinal, network, geo).
- **Data-driven histogram bin snapping** — RealtimeTemporalHistogram brush now snaps to actual computed bin boundaries (binary search via `floorBinBoundary`/`ceilBinBoundary`) instead of uniform grid math. Works with irregular bin widths. `snapDuring: true` enables continuous snap feedback during drag. Bin boundaries are defensively sorted. Auto-populated from pipeline store — zero config change for existing usage.
- **IBM Carbon color palettes** — `CARBON_CATEGORICAL_14` (14-color), `CARBON_ALERT` (danger/warning/success/info), and `"carbon"`/`"carbon-dark"` theme presets. Exported from `semiotic` and `semiotic/utils`. Integrated into Theme Explorer and Theme Provider docs.
- **Legend line wrapping** — horizontal legends now wrap to multiple rows when items exceed the available chart width, preventing overflow. Applies to all charts with `legendPosition="bottom"` or `"top"`.
- **`showPoints` on AreaChart and StackedAreaChart** — Data point markers are now supported on area charts, matching LineChart's existing `showPoints`/`pointRadius` props. Scene builders (line, area, stacked area) now emit `PointSceneNode` entries when `pointStyle` is configured, and `pointCanvasRenderer` is included in the renderer dispatch for all three chart types.

### Changed

- **ThemeProvider categorical colors flow to all HOCs** — When `colorBy` is set but `colorScheme` is not explicitly provided, charts now use the ThemeProvider's `colors.categorical` palette instead of falling back to d3 `category10`. Priority: explicit `colorScheme` > theme categorical > `"category10"`. Previously, ordinal and XY charts always defaulted to `category10` regardless of theme.
- **12px minimum hit target (Fitts's law)** — All four canvas hit testers (XY, ordinal, network, geo) now enforce `Math.max(node.r + 5, 12)` as the minimum interactive hit radius. Previously formulas varied across hit testers (some as small as 5px), making small points difficult to hover.
- **`useColorScale` `colorScheme` parameter is now optional** — Callers that don't pass a color scheme get the effective scheme fallback instead of requiring an explicit argument. Fallback uses scheme-based scale instead of hardcoded `"#999"`.
- **`LinkedCrosshairStore` optimized subscriptions** — `useCrosshairPosition` uses no-op subscribe/snapshot when the crosshair name is undefined, avoiding unnecessary store subscriptions on charts that don't use crosshairs.

### Fixed

- **Legend `styleFn` contract** — LikertChart (and any chart using custom `legendGroups`) now passes `(item: LegendItem, index)` to `styleFn` correctly, fixing grey legend swatches.
- **LikertChart tooltip** — shows category name (bold) and level name with percentage/count instead of raw internal field values. Uses standard tooltip chrome (dark background, rounded corners) matching all other charts.
- **`category-highlight` annotation in ordinal charts** — Annotations now receive the raw band scale (`scales.o`) and `projection` in the annotation context, fixing cases where the `oCentered` wrapper didn't expose `.bandwidth()`.
- **Crosshair cleanup on unmount** — Linked crosshair positions are cleared when a chart unmounts or when crosshair config changes, preventing stale crosshair markers in coordinated dashboards.
- **`FlippingTooltip` `useLayoutEffect` dependency array** — Added proper dependencies (`children`, `className`, `containerWidth`, `containerHeight`) to prevent stale measurements.
- **Removed dead `slicePadding` prop** — Removed from PieChart and DonutChart interfaces, validation map, schema, tests, and all documentation. The prop was declared but never wired to any rendering logic.
- **Removed unused `DEFAULT_COLOR` import in Heatmap** — Eliminated dead import.

### Removed

- **`slicePadding` prop on PieChart/DonutChart** — This prop was never functional. Use `frameProps={{ oPadding: value }}` for slice padding.

## [3.2.0] - 2026-03-25

### Added

- **Hover dot color matching** — The hover indicator dot now automatically matches the hovered element's color (line stroke, area stroke, point fill) instead of hardcoded blue. Override with `frameProps={{ hoverAnnotation: { pointColor: "#custom" } }}`. Fallback chain: explicit `pointColor` → element color → `--semiotic-primary` CSS var → `#007bff`. Affects all XY and Geo charts.
- **`pointColor` option on `HoverAnnotationConfig`** — New opt-in override for hover dot color on Stream Frames.
- **Adaptive time tick formatting** — New `adaptiveTimeTicks(granularity?)` export from `semiotic`. Produces hierarchical axis labels: first tick is fully qualified, subsequent ticks only show what changed (e.g. seconds when the minute is the same, full timestamp when the hour rolls over). Tick labels auto-space based on label width to prevent overlap.
- **Forecast: training line styling** — `trainStroke` ("darken" or CSS color), `trainLinecap` ("round"), `trainUnderline` (true | "lighten"), `trainOpacity`, `forecastOpacity` on `ForecastConfig`. Enables dashed training lines with solid underlines for visual distinction.
- **Forecast: per-datum anomaly styling** — `anomalyColor`, `anomalyRadius`, and `anomalyStyle` on `ForecastConfig` now accept functions `(datum) => value` for data-driven anomaly rendering (e.g. sizing dots by anomaly count).
- **Forecast: multi-metric boundary duplication** — `_groupBy` internal field on `ForecastConfig`. When `lineBy` and `forecast` are both active, boundary points are duplicated within each metric group (not across groups), preventing stray cross-metric connecting lines in interleaved data.
- **`training-base` segment type** — New segment for solid underlines beneath dashed training lines. PipelineStore renders training-base first (insertion order) so the solid line appears beneath the dashed one.
- **`resolveNodeColor` shared utility** — Extracted to `sceneUtils.ts`, used by both StreamXYFrame and StreamGeoFrame for consistent hover color resolution. Handles `CanvasPattern` fills correctly.
- **128 new unit tests** — Multi-metric boundary duplication (3 tests), ThemeStore dark mode merging (5 tests), PipelineStore reproduction (9 tests), LineChart integration (8 tests), plus expanded statisticalOverlays coverage.

### Fixed

- **SVGOverlay left axis label missing in dual-axis mode** — `MultiAxisLineChart` passes left axis label via `axes` config, but SVGOverlay only read the `yLabel` prop (which is suppressed in dual-axis mode). Now reads `leftAxis?.label || yLabel`.
- **ThemeStore `mode: "dark"` merged onto wrong base** — `{ mode: "dark", colors: { categorical: [...] } }` was merging onto `LIGHT_THEME`, so dark-mode text/background/grid colors were lost. Now correctly merges onto `DARK_THEME`.
- **Tick label overlap on time axes** — X-axis tick spacing now accounts for actual label width (estimated at 6.5px/char) instead of using a fixed 55px minimum, preventing label collision on dense time axes.
- **`tickFormat` signature expanded** — `AxisConfig.tickFormat` and `xFormat` now receive `(value, index, allTickValues)` so formatters can produce hierarchical labels (e.g. show full date only on first tick or at boundary crossings).
- **Function accessors with forecast/anomaly** — When `xAccessor` or `yAccessor` is a function, resolved values are now baked into data under `__resolvedX`/`__resolvedY` fields so the statistical overlay pipeline and annotation renderer can access them by string key.
- **Geo hover ring color** — Geo frame point hover ring now uses `resolveNodeColor` (shared utility) instead of inline logic, and correctly handles `CanvasPattern` fills.
- **Tick color dark mode fallback** — SVGOverlay tick color CSS var chain is now `--semiotic-text-secondary` → `--semiotic-text` → `#666`, improving visibility when only `--semiotic-text` is set.
- **Annotation accessor fallback** — SVGOverlay annotation renderer receives `"__resolvedX"`/`"__resolvedY"` when accessors are functions, preventing annotations from rendering at wrong positions.

### Changed

- **`SegmentType` union expanded** — Added `"training-base"` to the exported type.
- **`ForecastConfig` interface expanded** — Added `trainStroke`, `trainLinecap`, `trainUnderline`, `trainOpacity`, `forecastOpacity`, `anomalyStyle`, `_groupBy`. `anomalyColor` and `anomalyRadius` now accept functions.
- **HOC early return guard** — LineChart (and other HOCs with statistical overlays) no longer returns early before loading/empty state, ensuring all hooks are called unconditionally (React rules of hooks compliance).

## [3.1.2] - 2026-03-21

> **Note:** v3.1.1 was yanked from npm due to broken MCP tool schemas. Upgrade directly from 3.1.0 to 3.1.2.

### Fixed

- **MCP server tools received no arguments** — all 5 tools used empty `{}` Zod schemas, causing the MCP SDK to strip all incoming parameters. Every tool call silently fell into "missing field" error paths. Fixed by defining proper Zod input schemas for all tools (`getSchema`, `suggestChart`, `renderChart`, `diagnoseConfig`, `reportIssue`).
- **MCP geo chart rendering** — `renderHOCToSVG` called `validateProps` which rejected geo components not in its validation map. Geo components (ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram) now skip validation and render correctly.
- **MCP `--port` parsing** — `--http` without `--port` no longer produces NaN (falls back to 3001).
- **MCP "top-level fields" dead code** — removed unreachable spread logic from `renderChart`/`diagnoseConfig` handlers; updated Zod descriptions to match actual schema behavior (MCP SDK strips fields not in Zod schema).
- **suggestChart Histogram heuristic** — removed unreachable `data.length >= 10` check (suggestChart accepts 1–5 samples per its Zod schema).
- **renderHOCToSVG validation fragility** — tightened unknown-component skip check to require exactly one "Unknown component" error instead of `.every()` over all errors.

### Added

- **MCP geo chart support** — ChoroplethMap, ProportionalSymbolMap, FlowMap, and DistanceCartogram added to the MCP render registry (25 renderable components total).
- **MCP HTTP transport** — `npx semiotic-mcp --http --port 3001` starts a session-based HTTP server with CORS headers for browser-based MCP inspectors and remote access.
- **suggestChart input validation** — Zod schema enforces `.min(1).max(5)` on data array.

## [3.1.1] - 2026-03-21 (yanked)

### Added

- **MCP `reportIssue` tool** — generates pre-filled GitHub issue URLs for bug reports and feature requests directly from AI coding assistants. No auth required.
- **MCP `getSchema` tool** — returns the prop schema for a specific component on demand, reducing token overhead vs loading the full 63KB schema. Omit `component` to list all 30 chart types.
- **MCP `suggestChart` tool** — analyzes a data sample and recommends chart types with confidence levels and example props. Supports `intent` parameter for narrowing suggestions (comparison, trend, distribution, relationship, composition, geographic, network, hierarchy).
- **MCP server documentation** — comprehensive setup instructions, tool descriptions, and usage examples in README.
- **npm keywords** — `mcp`, `model-context-protocol`, `mcp-server`, and other discovery keywords for MCP directory indexing.
- **CI coverage thresholds** — unit test coverage gated at 62/52/63/65% (statements/branches/functions/lines) with `@vitest/coverage-v8`.
- **CI bundle size guardrails** — `size-limit` checks for all 6 entry bundles in CI pipeline.
- **axe-core accessibility scanning** — automated `@axe-core/playwright` scans across all chart category pages in E2E tests.
- **Self-healing error boundaries** — `SafeRender` runs `diagnoseConfig` on chart failures (dev mode) and displays actionable fix suggestions alongside the error message.
- **61 new unit tests** — coverage for `withChartWrapper` (SafeRender, warnDataShape, warnMissingField, renderEmptyState, renderLoadingState), network utilities, and push API on 7 ordinal chart types.

### Changed

- **MCP server** — added `getSchema`, `suggestChart`, and `reportIssue` tools (5 tools total). Added geo chart rendering support (ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram).
- **npm description** — updated to highlight MCP server capability for discoverability.
- **`prepublishOnly` cleans dist/** — prevents stale dynamic import chunks from accumulating in published tarball.

### Fixed

- **MCP `component` key leaking into props** — flat-shape calls like `{ component: "LineChart", data: [...] }` no longer pass `component` as a chart prop.
- **Missing dynamic import chunk** — `dist/*-statisticalOverlays-*.js` added to `files` array so forecast/anomaly features work when consumed via ESM.

## [3.1.0] - 2026-03-20

### Added

- **Geographic visualization** — new `semiotic/geo` entry point with 4 HOC chart components and a low-level `StreamGeoFrame`, all canvas-rendered with d3-geo projections.
  - **`ChoroplethMap`** — sequential color encoding on GeoJSON features. Supports `areaOpacity`, function or string `valueAccessor`, and reference geography strings (`"world-110m"`, `"world-50m"`, etc.).
  - **`ProportionalSymbolMap`** — sized/colored point symbols on a geographic basemap with `sizeBy`, `sizeRange`, and `colorBy`.
  - **`FlowMap`** — origin-destination flow lines with width encoding, animated particles (`showParticles`, `particleStyle`), and `lineType` ("geo"|"line").
  - **`DistanceCartogram`** — ORBIS-style projection distortion based on travel cost. Concentric ring overlay (`showRings`, `ringStyle`, `costLabel`), north indicator (`showNorth`), configurable `strength` and `lineMode`.
  - **`StreamGeoFrame`** — low-level geo frame with full control over areas, points, lines, canvas rendering, and push API for streaming.
- **`GeoCanvasHitTester`** — spatial indexing for hover/click hit detection on canvas-rendered geo marks.
- **`GeoParticlePool`** — object-pool polyline particle system for animated flow particles. Supports `"source"` color inheritance, per-line color functions, and configurable spawn rate.
- **`GeoTileRenderer`** — slippy-map tile rendering on a background canvas. Mercator-only with retina support. Configurable `tileURL`, `tileAttribution`, `tileCacheSize`.
- **Zoom/Pan** — all geo charts accept `zoomable`, `zoomExtent`, `onZoom`, with imperative `getZoom()`/`resetZoom()` on the frame ref. Re-renders projection directly (no CSS transform).
- **Drag Rotate** — `dragRotate` prop for globe spinning (defaults true for orthographic). Latitude clamped to [-90, 90].
- **Reference geography** — `resolveReferenceGeography("world-110m")` returns Natural Earth GeoJSON features. `mergeData(features, data, { featureKey, dataKey })` joins external data into features.
- **Geo particles** — `showParticles` and `particleStyle` on `FlowMap` and `StreamGeoFrame` for animated dots flowing along line paths.
- **6 geo documentation pages** — ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram, StreamGeoFrame, and GeoVisualization overview.
- **2 geo playground pages** — interactive prop exploration for geo charts.
- **1 geo recipe page** — ORBIS-style distance cartogram walkthrough.
- **Geo test suites** — unit tests for FlowMap (25 tests), ChoroplethMap (16 tests), DistanceCartogram (19 tests), colorUtils (+6 tests), hooks (+3 tests).

- **Accessibility foundation** — moves Semiotic from ~30% to ~70% WCAG 2.1 AA compliance.
  - **Canvas `aria-label`** — every `<canvas>` element now has a computed `aria-label` describing chart type and data shape (e.g., "scatter chart, 200 points"). All four Stream Frames: `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`.
  - **Legend keyboard navigation** — interactive legend items are focusable (`tabIndex={0}`, `role="option"`), with `role="listbox"` on the container. Enter/Space activates (click), Arrow keys navigate between items. Visible focus ring on keyboard focus.
  - **`aria-multiselectable`** on legend listbox when `legendInteraction="isolate"` or `customClickBehavior` is present.
  - **`aria-selected`** on legend items reflecting isolation state.
  - **`aria-live="polite"` region** — `AriaLiveTooltip` component mirrors tooltip text for screen reader announcements on hover.
  - **SVG `<title>` and `<desc>`** — all SVG overlays (`SVGOverlay`, `OrdinalSVGOverlay`, `NetworkSVGOverlay`) include `role="img"` and accessible `<title>`/`<desc>` elements derived from the chart title.
  - **`aria-label` on ChartContainer toolbar buttons** — Export, Fullscreen, and Copy Config buttons have descriptive labels and title attributes.
  - **35 Playwright integration tests** — `integration-tests/accessibility.spec.ts` covering canvas aria-labels, AriaLiveTooltip, legend keyboard traversal, focus rings, SVG title/desc, and ChartContainer toolbar buttons.

- **Streaming legend support** — new `useStreamingLegend` hook discovers categories from pushed data and builds legends dynamically with minimal re-renders via version counter. Integrated into StackedBarChart, PieChart, DonutChart, GroupedBarChart.

- **Streaming regression test suite** — 20+ Playwright integration tests (`streaming-regression.spec.ts`) covering:
  - Canvas pixel sampling to verify colored fills (saturation > 0.1) across 8 streaming chart types
  - Legend items appear after push API data arrives (4 chart types)
  - Area chart tooltip contains numeric values, not dashes
  - LineChart streaming stability (no "Maximum update depth" errors)
  - Force graph content centroid within 30% of canvas center
  - Error-free rendering across all 11 streaming test fixtures

- **Performance: color map cache** — `PipelineStore` caches the category→color map across rebuilds using a sorted category set as cache key. Skips rebuild when categories are unchanged. (`PipelineStore.ts`)
- **Performance: stacked area cache** — `PipelineStore` caches stacked area cumulative sums using a `buffer.size + ingestVersion` hash. Skips expensive groupData + cumulative sum computation when data is unchanged. (`PipelineStore.ts`)

### Fixed

#### Streaming Color Pipeline (root cause)

- **Grey fills on push API charts** — When using `ref.current.push()`, HOC charts passed undefined color scales to style functions, causing grey fallback fills. Fixed end-to-end:
  - HOC `pieceStyle`/`pointStyle`/`lineStyle` functions now omit fill/stroke when colorScale is unavailable
  - `OrdinalPipelineStore.resolvePieceStyle` fills in from the frame's color scheme when HOC returns no fill
  - `PipelineStore.resolveLineStyle`/`resolveAreaStyle`/point scene builder do the same for XY charts
  - New `resolveGroupColor` method provides centralized `STREAMING_PALETTE` assignment for streaming groups
  - Affected charts: StackedBarChart, PieChart, DonutChart, GroupedBarChart, BubbleChart, StackedAreaChart, AreaChart, LineChart, Scatterplot, QuadrantChart, ChordDiagram

#### Runtime Errors

- **LineChart infinite re-render loop** — circular dependency between `useEffect` → `setSegmentAwareStyle` → `baseLineStyle` → `colorScale` → `statisticalResult`. Fixed by guarding statistical effect to only run when forecast/anomaly is present and deriving `effectiveLineStyle` without unnecessary state.
- **`createColorScale` crash on undefined data** — added null guards (`d?.` + `.filter(v => v != null)`) so push API charts with sparse data don't throw.
- **`OrdinalSVGOverlay` duplicate React keys** — keys now include category/group for uniqueness across stacked/grouped layouts.

#### Tooltips

- **Area/StackedArea tooltips showing "-"** — `hitTestAreaPath` now extracts the specific data point at the hover index (like `hitTestLine` does) instead of returning the entire data array.
- **Ordinal frame tooltips** — default tooltip now shows category + value using `__oAccessor`/`__rAccessor` metadata.
- **Geo chart tooltips** — ChoroplethMap shows country names (not numeric IDs), ProportionalSymbolMap shows formatted metrics with labels, FlowMap shows source → target with values.

#### Layout & Interaction

- **Force graph centering** — added `forceCenter` to simulation, strengthened `forceX`/`forceY`, clamped node positions to canvas bounds. Fixed `finalizeLayout` overwriting force-computed positions from stale bounding boxes during streaming warm-starts.
- **Streaming force refresh** — force simulation now runs on topology changes during push API streaming.
- **FIFO category ordering** — streaming ordinal charts preserve insertion order instead of re-sorting by value (fixes violin/histogram column flicker).
- **Edge hit areas** — expanded to 5px minimum tolerance across XY lines, network edges (bezier + path), and geo lines. Added `pointToSegmentDist` for accurate perpendicular distance. Line hit tolerance now scales with stroke width.
- **Network edge ctx.lineWidth leak** — `hitTestBezierEdge` and `hitTestPathEdge` now save/restore `ctx.lineWidth` around `isPointInStroke` calls.
- **Sankey crossing reduction** — added barycenter-based initial node ordering before iterative relaxation.
- **QuadrantChart streaming** — fixed quadrant backgrounds disappearing after first point; points now auto-color by quadrant when no `colorBy` provided.
- **Anti-meridian line handling** — geo lines that wrap across the projection edge are split into segments with smooth opacity fades.
- **Distance cartogram centering** — center node is pinned to viewport center during streaming.
- **Orthographic drag jank** — pointer-move rotations now coalesce via `pendingRotationRef`, applying once per rAF frame.

#### Visual / Dark Mode

- **Orbit diagram** — ring/connecting lines changed from `currentColor` (invisible on canvas) to `rgba(128,128,128,0.35)`. Root nodes use scheme color instead of grey depth palette.
- **Treemap/CirclePack labels** — luminance-based contrast text color (white on dark fills, dark on light fills). Treemap parent labels positioned at top-left of rectangle.
- **ScatterplotMatrix diagonal histograms** — now colored by category with O(1) Map lookups instead of grey fills with O(n) `.indexOf()`.
- **Dark mode fixes** — serialization page text contrast, streaming system model background, candlestick wick color, uncertainty tooltip background.

#### Bug Fixes

- **`tooltip={false}` now correctly disables tooltips** on all 22 remaining HOCs. The pattern `normalizeTooltip(tooltip) || defaultTooltipContent` was replaced with an explicit `tooltip === false ? undefined : ...` check.
- **`normalizeTooltip` unwrap heuristic tightened** — the HoverData unwrap now only triggers when the object has `.type === "node" | "edge"` AND `.data`, preventing false unwraps when a user's datum has a `.data` property.
- **ForceDirectedGraph empty state** — `renderEmptyState` now checks `nodes` instead of `edges`, so a graph with nodes but no edges no longer shows the empty state.
- **ChoroplethMap validation** — added GeoJSON-aware validation that checks for a `geometry` property on area features, replacing the inapplicable `validateArrayData` check.
- **"Rendered more hooks than during previous render"** in `FlowMap` and `ChoroplethMap` — hooks were called after early returns for loading/empty states. All hooks now run unconditionally before any early return.
- **`colorScale` crash with null areas in ChoroplethMap** — `useMemo` now returns a fallback sequential scale when `resolvedAreas` is null during async loading.
- **Variable name collision in ChoroplethMap** — local `areaStyle` renamed to `areaStyleFn` to avoid collision with destructured prop.
- **Function `colorBy` produced undefined colors** — `useColorScale` now derives categories from data when `colorBy` is a function and builds a proper ordinal scale. `getColor` maps non-CSS-color strings through `colorScale`.
- **LineChart validation** — `validateArrayData` now receives the raw `data` prop instead of post-processed `safeData`, so push API mode (`data` undefined) correctly skips validation instead of triggering "No data provided".
- **QuadrantChart `sizeDomain` NaN** — `sizeBy` values are now filtered to finite numbers before computing min/max, preventing NaN propagation to point radius.

#### Documentation (25+ fixes)

- Home page: meaningful tooltips on bar chart, bubble chart, network graph (degree centrality)
- Streaming sankey pastel colors, chord multi-color fix
- Highlight hover uses distinct red line, more distinctive custom theme
- Top/bottom legend examples, chart container year controls work
- Responsive frame data fix, styling offset fix, linked dashboard color consistency
- Candlestick dark mode, uncertainty tooltip dark mode, isotype chart person icons
- Radar/isotype duplicate key fix, network explorer `.data` wrapper access
- Rosling bubble annotations/extent/tooltip, benchmark log scale fix, forecast sparkline card
- Force graph sparse preset parameters, choropleth playground sizing
- DocumentFrame: added 100+ missing prop names to `processNodes`
- Tile map: production provider documentation

## [3.0.1] - 2026-03-12

### Added

- **`emphasis` prop** — all charts accept `emphasis="primary" | "secondary"`. `ChartGrid` detects `emphasis="primary"` on children and spans them across two grid columns for F-pattern dashboard layouts.
- **`directLabel` rendering** — new `"text"` annotation type in `annotationRules.tsx` so `directLabel` labels actually render. Automatic right margin expansion prevents label clipping.
- **`gapStrategy` fixes** — `"break"` now correctly splits lines at null boundaries using synthetic `_gapSegment` group keys. `"interpolate"` filters gap points in the HOC before data enters the pipeline, preventing `resolveAccessor`'s unary `+` from coercing `null` to `0`.
- **Chart States docs page** (`/features/chart-states`) — dedicated page for empty, loading, and error state documentation. Moved from LineChart and ChartContainer pages.
- **Gap strategy tabs** — consolidated three separate subsections in LineChart docs into a tabbed interface.
- **Tabs component** — reusable tab switcher for docs pages.

### Changed

- **Export default format** — `exportChart()` now defaults to PNG instead of SVG. PNG export composites the canvas data layer underneath the SVG overlay, producing a complete chart image. SVG export only captures the overlay (axes, labels).
- **Type widening** — eliminated `as any` casts at HOC/Frame boundaries by widening `rFormat`, `oSort`, `colorBy`, and `TooltipFieldConfig.accessor` types in stream type definitions.

### Fixed

- **Export captured only axes** — PNG export now finds the `<canvas>` element and draws it as the base layer before compositing the SVG overlay on top.
- **`directLabel` annotations silently dropped** — `type: "text"` was not a recognized annotation type; it fell through to the default case and returned `null`.
- **`gapStrategy="break"` drew lines through gaps** — flattening re-merged segments because the Frame re-grouped by the original `groupAccessor`.
- **`gapStrategy="interpolate"` dropped to zero** — `resolveAccessor` used `+(d)[key]` which converted `null` to `0`.
- **`colorBy` type mismatch in network charts** — hierarchy charts that color by depth index returned a number, but the type expected a string. Added `String()` coercion.
- **Duplicate `amplitude` property** in `StreamOrdinalFrameProps`.

## [3.0.0] - 2026-03-10

Complete rewrite of Semiotic. Stream-first canvas architecture, 37 HOC chart
components, full TypeScript, AI tooling, coordinated views, realtime encoding,
and native server-side rendering.

### Architecture

**Stream-first rendering.** All frames are canvas-first with SVG overlays for
labels, axes, and annotations. Legacy frame names (`XYFrame`, `OrdinalFrame`,
`NetworkFrame`) have been removed entirely.

| Frame | Purpose |
|---|---|
| `StreamXYFrame` | Line, area, scatter, heatmap, candlestick charts |
| `StreamOrdinalFrame` | Bar, pie, boxplot, violin, swarm charts |
| `StreamNetworkFrame` | Force, sankey, chord, tree, treemap, circlepack |

Every frame supports a ref-based push API for streaming data.

**Functional components + hooks.** All components converted from class-based to
functional. Full TypeScript strict mode with generic type parameters on all
Frame and Chart components. `"use client"` directives for React Server
Components compatibility.

### Added

#### Chart Components (HOCs)

38 higher-order chart components that wrap the core Frames with curated,
simple prop APIs.

**XY Charts** (wrap StreamXYFrame):
- `LineChart` — line traces with curve interpolation, area fill, and point markers
- `AreaChart` — filled area beneath a line
- `StackedAreaChart` — multiple stacked area series
- `Scatterplot` — point clouds with color and size encoding
- `ConnectedScatterplot` — sequential path through 2D space with Viridis gradient
- `BubbleChart` — sized circles with optional labels
- `Heatmap` — 2D binned density visualization

**Ordinal Charts** (wrap StreamOrdinalFrame):
- `BarChart` — vertical/horizontal bars with sort and color encoding
- `StackedBarChart` — stacked categorical bars
- `GroupedBarChart` — side-by-side grouped bars
- `SwarmPlot` — force-directed point distribution
- `BoxPlot` — statistical box-and-whisker
- `Histogram` — binned frequency distribution
- `ViolinPlot` — kernel density per category
- `DotPlot` — sorted dot strips
- `PieChart` — proportional slices
- `DonutChart` — ring variant of PieChart

**Network Charts** (wrap StreamNetworkFrame):
- `ForceDirectedGraph` — force-simulation node-link diagrams
- `ChordDiagram` — circular connection matrix
- `SankeyDiagram` — flow diagrams with weighted edges
- `TreeDiagram` — hierarchical tree layouts
- `Treemap` — space-filling hierarchical rectangles
- `CirclePack` — nested circle packing
- `OrbitDiagram` — animated orbital hierarchy with solar/atomic/flat modes

**Realtime Charts** (canvas-based streaming):
- `RealtimeLineChart` — streaming line
- `RealtimeHistogram` — streaming histogram bars
- `RealtimeSwarmChart` — streaming scatter
- `RealtimeWaterfallChart` — streaming waterfall/candlestick
- `RealtimeHeatmap` — streaming 2D heatmaps with grid binning

All chart components feature:
- Full TypeScript generics (`LineChart<TDatum>`)
- Sensible defaults for width, height, margins, colors, hover
- `frameProps` escape hatch for accessing the underlying Frame API
- Automatic legend rendering when `colorBy` is set
- Smart margin expansion to accommodate legends and axis labels
- Built-in error boundary (never blanks the page) and dev-mode validation warnings

#### Server-Side Rendering

Two SSR paths, both producing identical SVG output:

**Component-level SSR** — Stream Frames detect server context
(`typeof window === "undefined"`) and render `<svg>` elements with scene
nodes instead of `<canvas>`. Same component, same props — works automatically
in Next.js App Router, Remix, and Astro.

**Standalone SSR** — `semiotic/server` entry point for Node.js environments
(email, OG images, PDF, static sites):

```js
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

- `renderToStaticSVG(frameType, props)` — generic entry point
- `renderXYToStaticSVG(props)` — XY-specific
- `renderOrdinalToStaticSVG(props)` — ordinal-specific
- `renderNetworkToStaticSVG(props)` — network-specific
- Shared SceneToSVG converters used by both paths

#### Realtime Visual Encoding System
- `decay` prop — configurable opacity fade for older data (linear, exponential, step modes)
- `pulse` prop — glow flash effect on newly inserted data points with configurable duration/color
- `transition` prop — smooth position interpolation with ease-out cubic easing
- `staleness` prop — canvas dimming + optional LIVE/STALE badge when data feed stops
- All four features work on StreamXYFrame, StreamOrdinalFrame, and all realtime HOCs
- Features compose freely (e.g., decay + pulse creates a data trail with flash-on-arrival)

#### Marginal Graphics
- `marginalGraphics` prop on `StreamXYFrame`, `Scatterplot`, and `BubbleChart`
- Four types: **histogram**, **violin**, **ridgeline**, **boxplot**
- Margins auto-expand to 60px minimum when marginals are configured

#### Coordinated Views
- `LinkedCharts` — cross-highlighting, brushing-and-linking, and crossfilter between any charts
- Selection hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`
- `ScatterplotMatrix` — N×N grid with hover cross-highlight or crossfilter brushing
- `CategoryColorProvider` — stable category→color mapping across charts

#### Threshold-based Line Coloring
- Annotations with `type: "threshold"` automatically split lines into colored segments
- Interpolates exact crossing points between data samples

#### ThemeProvider
- `ThemeProvider` wraps charts and injects CSS custom properties
- Presets: `"light"` (default) and `"dark"`
- `useTheme()` hook

#### Layout & Composition
- `ChartGrid` — CSS Grid layout with auto columns
- `ContextLayout` — primary + context panel layout

#### AI Tooling

- **`semiotic/ai`** — HOC-only surface optimized for LLM code generation
- **`ai/schema.json`** — machine-readable prop schemas for every component
- **MCP server** (`npx semiotic-mcp`) — renders charts as SVG tools for any MCP client
  - Per-component tools for all 21 SVG-renderable chart types
  - Generic `renderChart` tool accepting `{ component, props }`
  - `diagnoseConfig` tool for anti-pattern detection
- **`validateProps(componentName, props)`** — prop validation with Levenshtein typo suggestions
- **`diagnoseConfig(componentName, props)`** — anti-pattern detector with 12 checks:
  `EMPTY_DATA`, `EMPTY_EDGES`, `BAD_WIDTH`, `BAD_HEIGHT`, `BAD_SIZE`,
  `ACCESSOR_MISSING`, `HIERARCHY_FLAT_ARRAY`, `NETWORK_NO_EDGES`,
  `DATE_NO_FORMAT`, `LINKED_HOVER_NO_SELECTION`, `MARGIN_OVERFLOW_H`, `MARGIN_OVERFLOW_V`
- **CLI** (`npx semiotic-ai`) — `--schema`, `--compact`, `--examples`, `--doctor`
- **`CLAUDE.md`** — instruction file for Claude, Cursor, Copilot, Windsurf, and Cline
- **Schema freshness CI** — cross-references schema.json, VALIDATION_MAP, and CLAUDE.md

#### Other
- `onObservation` — structured events (hover, click, brush, selection) on all HOCs
- `useChartObserver` — aggregates observations across LinkedCharts
- `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX` — chart serialization
- `fromVegaLite(spec)` — translate Vega-Lite specs to Semiotic configs
- `exportChart()` — download charts as PNG (default) or SVG
- `ChartErrorBoundary` — React error boundary
- `DetailsPanel` — click-driven detail panel inside `ChartContainer`
- Data transform helpers (`semiotic/data`): `bin`, `rollup`, `groupBy`, `pivot`
- `Tooltip` and `MultiLineTooltip` components with field-based configuration
- Keyboard navigation utilities

#### Granular Bundle Exports

Eight separate entry points for reduced bundle sizes:

| Entry Point | Contents |
|---|---|
| `semiotic` | Full library |
| `semiotic/xy` | XY Frame + XY charts |
| `semiotic/ordinal` | Ordinal Frame + ordinal charts |
| `semiotic/network` | Network Frame + network charts |
| `semiotic/realtime` | Realtime charts |
| `semiotic/server` | SSR rendering functions |
| `semiotic/ai` | HOC-only surface for AI generation |
| `semiotic/data` | Data transform utilities |

#### HOC Shared Infrastructure

Extracted shared logic from all HOC chart components into reusable hooks:

- **`useChartSelection` hook** — selection/hover setup used by 21 charts
- **`useChartLegendAndMargin` hook** — legend + margin auto-expansion used by 18 charts
- **`buildOrdinalTooltip` helper** — shared tooltip builder for ordinal charts
- **Network utilities** — `flattenHierarchy`, `inferNodesFromEdges`, `resolveHierarchySum`, `createEdgeStyleFn`

### Changed

#### Build System

- Rollup 2.x → Rollup 4.x with Terser minification
- Modern ESM output with `const` bindings (ES2015 target)
- `sideEffects: false` for aggressive tree-shaking
- Modern `exports` field in package.json for proper ESM/CJS resolution

#### React 18 Requirement

Minimum React version is now 18.1.0 (was 16.x in v1, 17.x in v2).
Also supports React 19.

#### Network Layout Refactoring

The monolithic `processing/network.ts` has been split into focused layout plugins:
sankey, force, chord, tree, cluster, treemap, circlepack, partition.

### Removed

- **All legacy frames** — `XYFrame`, `OrdinalFrame`, `NetworkFrame` and their Responsive/Spark variants. Use `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`.
- **`FacetController`** — use `LinkedCharts`
- **`RealtimeSankey`**, **`RealtimeNetworkFrame`** — use `StreamNetworkFrame` with `chartType="sankey"`
- **`baseMarkProps`**, **`ProcessViz`**, **`Mark`**, **`SpanOrDiv`** — removed internal utilities

### Fixed

- Chord diagram arc/ribbon angle alignment
- Stacked area streaming flicker (stable sort of groups)
- Violin plot IQR positioning
- Sankey particle colors
- Canvas clip region (marks no longer draw into margins)
- Tooltip position flipping at chart edges
- Stacked bar color encoding, streaming aggregation, and category flicker
- Force layout initial positions (phyllotaxis spiral)
- Treemap hover (smallest containing rect wins)
- Axis label floating-point noise and overlap
- ThemeProvider integration with SVG overlay axes and canvas background
- HOC chart data validation (visible error element instead of blank)
- 30+ additional rendering, theming, and coordination fixes

---

## [2.0.0-rc.12] - 2021

Version 2.0 was an internal milestone that began the transition from class
components to functional components and introduced initial TypeScript support.
It was never promoted to a stable release.

Notable changes from v1:
- Initial functional component conversions
- TypeScript adoption began
- React 17 compatibility

---

## [1.20.6] - 2020-12-02

- Add `customClickBehavior` with hover pointer state for legend interactions
- Make difference between vertical and horizontal group rendering explicit

## [1.20.5] - 2020-01-21

- Fix canvas interactivity with custom canvas function

---

For the complete v1.x changelog, see the
[git history](https://github.com/nteract/semiotic/commits/main).

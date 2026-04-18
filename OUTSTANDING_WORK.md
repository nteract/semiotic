# Outstanding Work

Last updated 2026-04-17.

---

## Follow-up audits — 2026-04-17

Second pass after the Stream Frames perf PR merged, triggered by Copilot feedback patterns that clustered into four themes. Most items closed; open ones below.

### Completed
- **Lifecycle cleanup audit.** `DataSourceAdapter.clear()` now called on unmount in `StreamXYFrame` / `StreamOrdinalFrame` (in-flight progressive chunking and pending push microtasks can't fire post-unmount). `MinimapChart` scales-polling rAF tracks its handle and cancels on unmount + data change.
- **Cache invalidation completeness audit.** Three gaps fixed: `PipelineStore._stackExtentCache` now invalidates on `timeAccessor` / `valueAccessor` / `runtimeMode` changes (was missing streaming-mode accessor triggers); `OrdinalPipelineStore._colorSchemeMap` invalidates on `themeCategorical` / `colorAccessor` changes (same class of bug as the `_colorMapCache` fix); `OrdinalPipelineStore._categoryIndexCache` invalidates on `categoryAccessor` / `oAccessor` changes. Regression tests in `OrdinalPipelineStore.accessor.test.ts`.
- **`CanvasHitTester` upgraded to `findHitPointInQuadtree`.** XY was the last hit tester using the old `quadtree.find()` approach, which had the nearest-only bug for variable-radius BubbleChart points. `PipelineStore` now tracks `maxPointRadius` alongside the quadtree; `StreamXYFrame` threads it through. The `CanvasHitTester` linear-scan fallback for points is gone — the visit-based path is authoritative. Regression test for the `maxPointRadius`-widening behavior added.
- **Hover-handler contract tightened.** New `HoverPointerCoords` type in `hoverUtils.ts`; all four Stream Frames' `hoverHandlerRef` is now `(coords: HoverPointerCoords) => void`. `as unknown as React.MouseEvent` casts removed from the rAF-coalesced paths. A downstream read of `e.currentTarget` / `e.target` / `e.preventDefault` now fails typecheck instead of silently breaking at runtime.
- **Playwright `waitForTimeout` eliminated.** All 45 `page.waitForTimeout` calls across 13 integration specs replaced with event-driven waits. New `integration-tests/helpers.ts` exports `waitForChartReady` (canvas visible + pixel-content poll), `waitForAllChartsReady` (network-idle + all-canvases-non-empty — the replacement for page-wide "does the page error in N seconds" tests), `waitForRafs` (two-rAF wait, deterministic replacement for small post-interaction timeouts), and `waitForStreamingUpdate` (polls a canvas pixel hash to confirm new streaming data arrived). The four per-spec local `waitForVisualization` helpers are gone. Three 5-second timeouts and two 3-second page-load timeouts are now bounded by the shared 15-second watchdog but typically return in hundreds of milliseconds.
- **Shared ordinal-chart fixture library.** New `src/test-utils/ordinalFixtures.ts` exports `BAR_SAMPLE` / `BAR_INITIAL` / `BAR_EXTENDED` / `BAR_COLORED` / `NAMED_COUNT_DATA` / `STACKED_SAMPLE` / `GROUP_SERIES_CUSTOM`. `BarChart.test.tsx`, `StackedBarChart.test.tsx`, and `GroupedBarChart.test.tsx` now import from it; local `sampleData` / `customData` / etc. literals are gone.
- **Canvas renderer combinatorial matrix.** `lineCanvasRenderer.test.ts` now runs a `describe.each` over (curve ∈ {none, step, monotoneX}) × (decay ∈ {on, off}) × (thresholds ∈ {on, off}) — 12 combinations, each verifying the expected code path (threshold segmentation / decay per-segment alpha / fast path). Exercises the "decay suppressed when thresholds are active" invariant and the "curve ignored in decay/threshold paths" invariant that were previously covered by a single threshold case. Also fixed the local mock to use the shared `createMockCanvasContext` (which exposes `bezierCurveTo` etc. for d3-shape curve factories).
- **Canvas renderer tests less brittle.** New `recordCanvasOps` helper in `src/test-utils/canvasMock.ts` captures `fillStyle` / `strokeStyle` / `globalAlpha` at each draw call. Replaced the most implementation-detail-sensitive count assertions in `wedgeCanvasRenderer.test.ts` (pulse overlay, multi-wedge) and `pointCanvasRenderer.test.ts` (pulse glow) with behavior-level checks — "both colors appear in the fill log" rather than "fill was called exactly N times". Load-bearing counts (e.g. "3 input points → 3 arc calls" which is a structural invariant) kept as-is.
- **Accessor re-resolution gates.** Three `updateConfig` gates in `PipelineStore.ts` (x/y/time/value accessors) and `OrdinalPipelineStore.ts` (category/o, value/r) used `config.X !== undefined`, which silently skipped the re-resolution block when a caller explicitly cleared an accessor (`{xAccessor: undefined}` — valid React pattern for conditionally-rendered props). Converted to `"X" in config` so the inner `accessorsEquivalent` check sees the defined→undefined transition and reverts `getX` / `getY` / `getO` / `getR` to the fallback key. Four regression tests added (`PipelineStore.accessor.test.ts`, `OrdinalPipelineStore.accessor.test.ts`).

### Still open (deferred with reasoning)

- **`_groupColorMap` unbounded growth** (`PipelineStore.ts`). Still no eviction policy. Long-running streams with truly unique group IDs (UUIDs) can accumulate arbitrary entries. Candidates: LRU with a cap, prune-on-buffer-evict, or simply rebuild on data clear. Needs a product decision on whether color assignment should persist for re-appearing groups.

- **Style-spread allocation in decay / pulse / transitions** (`NetworkPipelineStore.applyDecay` line 936 in particular, plus `pipelineTransitions.ts`). `node.style = { ...node.style, opacity: x }` allocates a new style object per node per frame. NetworkPipelineStore's decay runs every frame in `StreamNetworkFrame`'s render loop, so the GC pressure is real for large graphs. Mutation is safe (scene nodes have unique style objects from `resolvePieceStyle` / `resolveStyle`) but the change touches ~13 sites across 4 files. Park until profiling identifies it as a bottleneck.

- **Remaining canvas-renderer call-count assertions.** `barCanvasRenderer.test.ts`, `boxplotCanvasRenderer.test.ts`, `heatmapCanvasRenderer.test.ts`, and a handful of `lineCanvasRenderer.test.ts` cases still use `toHaveBeenCalledTimes` — but in these cases the count is load-bearing (one `fillRect` per bar, one `save`/`restore` pair per boxplot, etc.) rather than incidental. Revisit only if a refactor breaks them for reasons unrelated to pixel output.

- **`AccessibleDataTable.tsx:635` fire-and-forget rAF.** `requestAnimationFrame(() => target.focus())` inside a click handler with no cleanup. Practical risk is zero (target is resolved synchronously, focus on detached node is a no-op), but it's the only rAF in the codebase without a tracked handle. Add a cancel if the component ever grows a longer-lived hold on the lookup.

### Architecture notes (from this pass)

- **Spatial-index pattern now consistent** across XY / Geo / Ordinal (`findHitPointInQuadtree` in all three, threshold at 500 points, `maxPointRadius` tracked in each store). Network deliberately stays on linear-scan — circles are few and large; edges are the hotspot, addressed by the Path2D cache from the prior PR.
- **`_cachedPath2D` / `_cachedPath2DSource` pattern** established for any scene node that owns an SVG path string. Applied to network edges; also pre-existed on geoarea nodes. Any future node types with path strings should follow the same convention to keep hit-test cost bounded.
- **"Authoritative vs informational" API discipline.** `findHitPointInQuadtree` is authoritative (exhaustive visit); `quadtree.find()` is informational (nearest-only). The audit removed the last mix of these under similar-looking code. Any future fast-path + fallback construct should be marked explicitly as one or the other.

---

## Dependency upgrades — backlog as of 2026-04-17

Honest snapshot from `npm outdated`. We are meaningfully behind on several deps; some are dev-only and harmless, several are runtime/test-environment moves with real migration costs. **Treat the "Effort" column as a planning estimate, not a guarantee.**

### Tier 1 — DONE (3.4.0 + 3.4.x)

| Dep | Bump | Status |
|---|---|---|
| `hono` 4.12.8 → 4.12.14 + `@hono/node-server` < 1.19.13 → 1.19.14 | security fix, six advisories | shipped in 3.4.0 |
| `prettier` 3.8.1 → 3.8.3 | patch / dev-only | shipped in 3.4.0 |
| `@axe-core/playwright` 4.11.1 → 4.11.2 | patch / test-only | post-3.4.0 |
| `@vitest/coverage-v8` + `@vitest/ui` + `vitest` 4.1.0 → 4.1.4 | patch / test-only | post-3.4.0 |
| `@playwright/test` + `playwright-chromium` 1.58.2 → 1.59.1 | minor / test-only — required regenerating 9 darwin baselines (chromium font-rendering shifts in label-heavy charts: ordinal bars, network treemap, network circle pack). No real regressions. | post-3.4.0 |
| `typedoc` 0.28.17 → 0.28.19 | patch / docs-only | post-3.4.0 |

### Tier 2 — single-PR follow-ups (3.4.x)

| Dep | Current → Latest | Risk | Effort |
|---|---|---|---|
| ~~`@modelcontextprotocol/sdk` 1.27.1 → 1.29.0~~ | ~~bundles into shipped MCP server. Smoke test: stdio JSON-RPC `initialize` + `tools/list` round-trip. All 6 tools enumerate correctly under 1.29; tool shape gained additive `execution.taskSupport` field (non-breaking).~~ | DONE post-3.4.0 |
| `esbuild` 0.27.4 → 0.28.0 | "minor" but esbuild is pre-1.0 so 0.x → 0.x can break. Used by parcel/rollup transitively. | Build + test pass = good enough. | 30 min |
| `@types/node` 20.19.x → 25.6.0 | We pin Node 20 LTS via Volta — keep the runtime types matched to the runtime version. **Don't** bump types past Node 20.x range or you'll get `process.X` autocompletes for APIs the CI Node doesn't have. The dependabot bump to 25.x is wrong; close it and bump to latest 20.x patch only. | n/a — actively the wrong PR | reject |

### Tier 3 — major-version migrations, each gets its own PR

These are all **legitimately big** and the previous "no big deal" framing was wrong. Each line below is roughly the order I'd tackle them.

#### 1. Test environment: `jsdom` 26 → 29 — multi-week or revisit env choice

**Three majors behind.** Every jsdom major has historically broken at least one chunk of canvas, `getComputedStyle`, or observer behavior — exactly the surfaces the recent perf-pass fixes lean on (`resolveCSSColor`, `MutationObserver` in helpers, `ResizeObserver` polyfills). Risk is high and concentrated in the test suite.

Options:
- **Bump in place** and chase breakage: probably 1–3 days of test repair, plus likely follow-on Copilot/CI feedback rounds.
- **Switch to `happy-dom`** or `@vitest/browser` (real Chromium): faster tests and avoids the migration treadmill. ~1 week including audit of jsdom-specific assumptions in `setupTests.ts` and the per-frame canvas mocks.

Either way, do this **before** the eslint-9 work below — eslint migration adds churn to the same test files.

#### 2. ESLint 8 → 10 + `@typescript-eslint` 6 → 8 — flat-config migration, ~1 week

**ESLint 9 dropped legacy `.eslintrc.json` support.** Our `.eslintrc.json` will be silently ignored after the upgrade — every file passes lint because no rules apply. Need to migrate to `eslint.config.js` flat config, which means:

- Rewrite `.eslintrc.json` → `eslint.config.js` (~50 lines, mostly mechanical)
- Bump `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` together (they share a major) and switch to the new exported `tseslint.configs.recommendedTypeChecked` patterns
- Audit `eslint-plugin-react` and any other plugins for flat-config compatibility (most have `*-x` or `9.x` packages)
- Re-run `eslint src` and triage the new violations from `tseslint` 8's stricter `no-explicit-any` defaults — we still have ~140 `as any` per the TypeScript section below

ESLint 8 is in maintenance through October 2026, so we can defer without immediate security pressure, but it should be 3.5.0 work at the latest. Pairs naturally with the **`as any` reduction** initiative already on this list.

#### 3. React + types 18 → 19 — multi-PR effort, 2–4 weeks

**React 19 GA shipped.** `peerDependencies` already declares `^18.1.0 || ^19.0.0` so we *say* we support 19, but we don't test against it. Concrete migration work:

- Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` together
- React 19 changes:
  - Refs can be passed as props (deprecates `forwardRef` for new components — Stream Frames + every HOC use `forwardRef` extensively, but `forwardRef` still works in 19, just with a deprecation warning)
  - New `use()` hook for promises / context
  - Stricter `useMemo`/`useEffect` rules (one-render guarantee for refs assigned during render)
  - `useId` behavior change in concurrent rendering
  - Removed: legacy context API, string refs, `findDOMNode`, defaultProps for function components
- Test it under React 19 in CI before bumping the peer-dep floor to 19-only
- `@testing-library/react` must bump to 16.x for React 19 support

Risk surface is large but mostly cosmetic — the perf-pass code we just landed is React-version-agnostic. The likely landmines are in legacy components (BarChart class definitions if any, ChartContainer's HOC composition). Recommend a feature branch + a CI matrix test.

#### 4. TypeScript 5.9 → 6.0 — couple of days

TypeScript 6 is brand new. Project is `strict: true` already so most of the migration friction is around new rule defaults (e.g. stricter inference on `as const`, narrower `unknown` propagation). Pairs with the **`as any` reduction** initiative — 6.0's tighter inference is what makes some of those `any`s unnecessary.

Don't do this *during* React 19 migration (compounding type churn). Either before or after, isolated.

#### 5. `react-router-dom` 6 → 7 — docs-only, half a day

Used only in `docs/src/`. v7 unifies Remix + Router; lots of import path changes (`react-router-dom` exports moved to `react-router`). Mechanical but touch-everything. Doesn't affect the published library.

#### 6. `marked` 4 → 18 — docs-only, **fourteen majors behind**

Used only in `docs/src/MarkdownText.js`. Marked went ESM-only at v5, restructured the API at v8, dropped sync rendering at v12. Honest take: probably easier to swap to a different library (`micromark`, `remark`) than to walk through the migration, but walk-through is a few hours' work too.

#### 7. `d3-dsv` 1 → 3 — docs-only, 30 min

Used in one docs example (`CanvasInteraction.js`). v2 went ESM-only, v3 is otherwise compatible. Mechanical bump.

#### 8. `@testing-library/react` 14 → 16 — depends on React 19

Don't bump independently; v16 requires React 19. Slot into the React 19 PR.

#### 9. `size-limit` + `@size-limit/file` 11 → 12 — dev-only, ~1 hr

Bundle-size CI tool. v12 changed the config schema. Run `npx size-limit` after to verify the limits still fire correctly.

### Standing recommendation

The "no big deal" framing on these has been wrong. **ESLint, jsdom, and React are each their own real project.** Sequencing matters: jsdom first (test infra), then eslint (so you're not chasing two test environments at once), then React 19 (largest blast radius, do when the rest is stable). The patches in Tier 1 are free wins and should land routinely; the dependabot queue exists so you don't have to track them manually — accept them as they come.

**What's actually urgent, short-term:**
- `npm audit` reports **6 vulns (4 low, 2 moderate)** as of 2026-04-17. The two moderate ones are in `hono` / `@hono/node-server` (Tier 1 above — `npm audit fix` resolves them, dependabot PR #839 is the same fix). The 4 low ones are in `elliptic` / `crypto-browserify` / `browserify-sign` / `create-ecdh`, all transitive dev-only crypto libs reachable from the rollup build chain — addressing them requires `npm audit fix --force` which would push `crypto-browserify` to a breaking-change version. Defer those four; they're not in the runtime bundle.
- ESLint 8 hits maintenance EOL October 2026 — that's the hardest near-term deadline.
- React 18 itself isn't EOL but losing CI coverage of new React features is a slow-burn problem.

Re-run `npm audit` before each release; this section gets stale fast.

---

## Completed in 3.3.x (reference)

- **Rounded corners** — `cornerRadius` on PieChart/DonutChart, `roundedTop` on BarChart/StackedBarChart/GroupedBarChart. Negative-value bars round the correct edge.
- **`sort` on StackedBarChart/GroupedBarChart** — default `false` (insertion order).
- **Push API transition exits** — `remove()` calls `snapshotPositions()` before mutation.
- **Push API selection clearing** — all frames clear hover on datum removal.
- **Network `edgeIdAccessor`** — `removeEdge(edgeId)` single-ID form.
- **OG image server** — `scripts/og-server.mjs`.
- **CLI screenshot generator** — `scripts/demo-server-render.mjs`.
- **Release pipeline** — post-publish smoke test, rollback script.
- **SSR alignment CI** — `scripts/check-ssr-alignment.js` checks HOC↔SSR↔validation parity.
- **SSR fixes** — wedge rotation, hierarchy themes, gauge needle, bottom legend, ID uniqueness, `sweepAngle`/`hierarchySum`/`cornerRadius`/`roundedTop` passthrough.
- **HoverData unification** — typed `HoverData` across all 4 frames.
- **Shared `computeDecayOpacity`** — single source of truth in `pipelineDecay.ts`.
- **`serverChartConfigs.ts`** — `renderChart` dispatch extracted to lookup table.
- **`as any` reduction** — 240 → ~140.
- **Test coverage** — 2890 tests across 157 files. Cache invalidation, push API edge cases, SSR coverage, HOC integration, callback wiring, bad data resilience.

---

## Theming

### CSS variables [DONE]

All four planned variables implemented:
- `--semiotic-annotation-color` — falls back to `--semiotic-text`
- `--semiotic-legend-font-size` — used by Legend component
- `--semiotic-title-font-size` — available for chart titles
- `--semiotic-tick-font-family` — monospace option for aligned numerics

### SemioticTheme interface additions [DONE]

- `colors.annotation` — annotation marker/text color (used by Annotation.tsx, staticAnnotations.tsx)
- `typography.legendSize` — legend font size (used by Legend.tsx)
- `typography.tickFontFamily` — tick label font family
- `typography.titleFontSize` — chart title font size
- `accessibility.colorBlindSafe` — type defined, runtime not yet wired
- `accessibility.highContrast` — type defined, runtime not yet wired

Theme presets updated: Tufte and Journalist presets include `annotation`, `tickFontFamily`, `legendSize`. `themeToCSS()` and `themeToTokens()` emit the new tokens. Server `themeStyles()` resolves the new fields with fallbacks.

### ThemeProvider useEffect timing lag [YELLOW]

`ThemeInitializer` uses `useEffect` to sync the store, causing CSS variables to be one render behind on initial mount. Mitigated by inline CSS vars on `ThemeCSSWrapper`'s div, but the architecture is fragile. Fix: resolve theme synchronously during render via `useSyncExternalStore` or store initialization.

### Canvas theme bridge fragility [YELLOW]

Canvas renderers read theme values via `getComputedStyle`. If the dirty flag isn't set when the theme updates, canvas keeps old colors while SVG updates to the new theme. Currently works because theme changes trigger re-render → dirty flag, but the coupling is implicit.

### Design system research gaps

Curated categorical sequences maximizing neighbor contrast, and per-role typography tokens (title vs legend vs axis vs tick — currently only sizes, not per-role font families).

---

## Push API

### Undo

**Status**: Not scoped. `remove()`/`update()` return previous values — caller can push them back manually. A built-in `ref.current.undo()` needs an operation log with inverse operations. May be better as a userland wrapper.

---

## Server Rendering

### CLI Screenshot Generator [DONE]

`scripts/demo-server-render.mjs` — batch-renders 7 charts + 1 dashboard across multiple themes to SVG/PNG.

### PDF Export

**Status**: Not scoped. `renderToPDF()` with pdfkit/jsPDF. 1-2 weeks.

### Edge Runtime Compatibility

**Status**: Not scoped. Verify sync `renderChart`/`renderDashboard` work in CF Workers, Vercel Edge, Deno. 3-5 days.

### GIF Transition Easing

**Status**: Not started. `transitionFrames` is a no-op — needs incremental store ingestion across frames. 2-3 days.

### Render Studio: Real GIF Downloads

**Status**: Not started. Link Studio animated preview to Export page for download. 0.5 day.

---

## Bugs & Code Quality

### PipelineStore cache invalidation [YELLOW]

Implicit cache invalidation keyed by `bufferSize:_ingestVersion`. No test verifies caches invalidate correctly. Cache invalidation tests added in 3.3.x cover color maps, extents, and push-clear cycles, but combinatorial paths remain untested.

### Canvas renderer combinatorial paths [YELLOW]

Step curve + exponential decay + threshold coloring compose multiplicatively. Only validated visually via Playwright.

### NetworkPipelineStore tension threshold [YELLOW]

Empirically tuned, not theoretically derived. May re-run too frequently or infrequently under bursty traffic.

### GeoPipelineStore projection edge cases [YELLOW]

Anti-meridian/pole rendering artifacts possible with limited test coverage at extreme latitudes.

---

## TypeScript

### `as any` reduction

~140 remaining. Hotspots: sankeyLayoutPlugin (27, vendor-adjacent), StreamGeoFrame (13, d3-zoom types), XYBrushOverlay (7), chordLayoutPlugin (6). Next targets: StreamGeoFrame d3 type imports, SceneToSVG d3-shape arc invocations.

### Accessor type audit

Replace bare `string` or deprecated `Accessor<T>` with `ChartAccessor<TDatum, T>` across all HOC props.

### Generic ColorConfig/SizeConfig

Make generic with `TDatum` for `keyof` inference on `colorBy`, `sizeBy`.

---

## Declarative Animation

### `animate` prop on HOCs

`animate?: boolean | TransitionConfig` on `BaseChartProps`. Infrastructure exists (`_targetOpacity`, `snapshotPositions`, `startTransition`). Missing: HOC wiring, canvas `ctx.globalAlpha` from transition opacity. 1-2 weeks.

---

## Performance

### Quadtree for scatter hit testing [RED]

O(log n) lookup for >10k points. Currently linear scan. 3-5 days.

### Other performance items

- RingBuffer in-place forEach
- Canvas curve interpolation
- Network decay sort cache
- Incremental scene updates (append/evict vs full rebuild)
- WebGL renderer for >100k points
- Web Worker for force layout

---

## MCP & AI Tooling

### MCP protocol compliance testing [RED]

No integration test exercises the actual MCP protocol round-trip. Tested via CLI only.

### Schema freshness check [YELLOW]

Regex-based parsing. Structural CLAUDE.md changes could cause silent drift.

---

## Docs & Publishing

### Docs site prerendering

Homepage resolves to a JS shell. Prerendering improves SEO and LLM retrieval.

### API Reference Documentation

TypeDoc setup, prop table component, `/api` route. Not started.

---

## Geo Enhancements

- Path2D hit testing generalization
- Bounds pre-filter for network nodes
- Canvas grid lines
- Geographic minimap
- Temporal animation on cartogram
- Edge encoding richness (tapered lines, animated dashed)

---

## Architecture

### HOC → `useChartSetup` unification

11 HOCs still compose `useChartSelection` + `useColorScale` + `useLegendInteraction` + `useChartLegendAndMargin` manually rather than going through `useChartSetup`: LineChart, AreaChart, StackedAreaChart, BubbleChart, QuadrantChart, Heatmap, ConnectedScatterplot, ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram. Each has specific deviations (no `colorBy`, dual-axis margin logic, value-based color, projection-specific geometry) that would require either bending the HOC to the shared hook or making `useChartSetup` accept optional inputs. Currently every HOC calls `useResolvedSelection(selection)` directly for the theme's selection opacity, which is a coherent single-hook touch but still a second codepath. Consolidating would make future shared plumbing (theme → style-config merges, declarative animation defaults, shared cache invalidation) a single-site change.

### Visual regression coverage

3.4.0 added `themed-charts.spec.ts` (6 charts × 5 themes) and three geo-chart snapshots, bringing the total to ~75 baselines. Linux baselines for the new specs need to be bootstrapped from CI on the first run after merge (download the `playwright-snapshots` artifact, commit the `*-chromium-linux.png` files; see `VISUAL_TESTING.md`).

Open extensions, ranked by leverage:
- **HOC-level snapshots for every chart type.** Existing Frame-level snapshots cover the Stream Frames; HOCs (which is what users actually instantiate) have only the themed-charts subset. Adding one snapshot per HOC × default theme would catch HOC-layer prop-resolution regressions (the most common source of visual bugs). ~25 new baselines.
- **Interaction-state snapshots.** Hover, brush extents, click-locked crosshair, legend isolate. Mechanical: `await page.hover()` then snapshot. Catches the most subtle regressions (the kind that pass structural tests).
- **SSR-vs-CSR diff.** Render the same chart through `semiotic/server` and compare to a Playwright snapshot of the client render. Would catch SSR drift introduced after the SSR-alignment CI script's purview ends (which only checks prop parity, not visual output).
- **Animation snapshots.** Snapshot mid-animation frames at fixed timestamps with `Date.now()` mocking. Currently `animate` is implicitly disabled in the screenshot harness; this leaves the intro animation paths untested visually.
- **Other browsers.** Firefox and Webkit run in CI but no baselines are committed for them. Each adds ~75 baselines per browser. Probably overkill unless we hit a browser-specific rendering bug.

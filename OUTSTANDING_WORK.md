# Outstanding Work

Last updated 2026-05-01 (all four phases of real-fix isomorphic SSR + geo backfill + RSC import safety landed; SSR demo caught two more bugs along the way).

This file is the active backlog only. Completed work belongs in `CHANGELOG.md`, not here.

## Priority Order

1. Release confidence and documentation correctness.
2. Public API coherence and agent-facing behavior contracts.
3. Rendering/test coverage that catches silent visual regressions.
4. Performance work with clear profiling or scale justification.
5. Product extensions that are useful but not release blockers.

---

## P0 — Architecture & API Coherence

### Split `semiotic/utils` and `semiotic/themes` to keep pure exports server-safe

Both bundles are *mixed*: ~80% of their exports are pure (theme constants, formatters, color helpers, validators, `fromVegaLite`, `RingBuffer`, `IncrementalExtent`) and ~20% are React-flavored (`ThemeProvider`, `useTheme`, `useReducedMotion`, `useHighContrast`, `MultiPointTooltip`, `exportChart`). The `"use client"` directive lands on the entire bundle via the React-only re-exports' transitive imports — and the directive is file-level, so importing a pure export from a Server Component is blocked too. Server Components can't `import { fromVegaLite } from "semiotic/utils"` to transform a Vega spec on the server, even though the function itself is pure.

Build categorization is currently agnostic for both (no `clientOnly: true` flag), which is honest about the mixed nature but means the inverse-direction post-build assertion doesn't gate either bundle.

Real fix: split the entry points. Move `ThemeProvider` / `useTheme` / `useReducedMotion` / `useHighContrast` / `MultiPointTooltip` / `exportChart` into a new `semiotic/react` (or absorb into the main `semiotic` bundle), leaving `semiotic/utils` and `semiotic/themes` as pure bundles. Drops the directive on both, makes the pure exports server-importable, restores the `clientOnly` gate on each.

Open question: how much breakage is acceptable? Consumers importing `ThemeProvider` from `semiotic/utils` would need to update. Could add a deprecation period via re-exports from the existing entry points, then remove in 4.0.

Next work:
- Audit consumers (docs site, demo project, internal docs) for `import ... from "semiotic/utils"` and `import ... from "semiotic/themes"` to map the breakage surface.
- Decide on new entry-point name (`semiotic/react` vs absorb-into-main vs add a `semiotic/hooks`).
- Land the split with deprecated re-exports, codemod entry in `semiotic-codemod`, update docs.

### Codemod for `nodeIDAccessor` → `nodeIdAccessor` rename

`ForceDirectedGraph` now accepts `nodeIdAccessor` as the canonical camelCase prop name, with `nodeIDAccessor` kept as a `@deprecated` alias and removed in 4.0. A jscodeshift transform should be added to the external [`semiotic-codemod` repo](https://github.com/emeeks/semiotic-codemod) that renames the prop on existing JSX usages.

Sketch (transform name: `force-directed-graph-node-id`): walk every `<ForceDirectedGraph …>` JSX element, find the `nodeIDAccessor` attribute on the opening element, rename it to `nodeIdAccessor`. Skip if `nodeIdAccessor` is already present (don't produce duplicate attributes). Idempotent. Fixture pair lives under `tests/__testfixtures__/force-directed-graph-node-id.{input,output}.tsx`. Add to the recipe order in `bin/cli.js` after `subpath-imports`.

This is purely a polish fix — consumers using `nodeIDAccessor` keep working until 4.0; the codemod is for the consumer who wants to silence the deprecation warning their IDE shows on the prop.

### Turbopack subpath resolution

Turbopack (Next.js's default dev bundler in recent versions) intermittently fails to resolve Semiotic's sub-path exports — `Module not found: Can't resolve 'semiotic/xy'` from a Server Component, even though Node, webpack, esbuild, and Vite all resolve them correctly against the same `package.json`. Reproduced in the SSR demo project at `~/sandbox/semiotic-ssr-demo`.

Workaround documented in `UsingSSRPage`: pass `--webpack` to `next dev` and `next build`. Webpack handles the exports map without issue.

Hypothesis: Turbopack's exports resolver may not handle the `.module.min.js` extension correctly, or has a quirk around how it walks conditional exports for subpath patterns. The package's exports map is well-formed by spec.

Next work:
- Reproduce in a minimal Turbopack repro and file upstream.
- Once root-caused, decide whether to work around in our package shape (e.g. drop the `.min.` from `import` targets and let consumers' bundlers minify) or wait for the upstream fix.
- Independent npm gotcha (also documented): `npm install` symlinks `file:` deps by default, which breaks resolution in both Turbopack and webpack. `npm install --install-links` copies the package and works correctly. Not Semiotic's bug, but worth surfacing in the docs.

### Isomorphic SSR + Hydration for Interactive Charts (Next.js style)

True isomorphic charts: the chart component renders server-side as SVG, the client picks up that SVG without remounting (no hydration mismatch), and canvas + interactivity attach in place. Staged across four phases.

**Phase 1 — landed 2026-05-01 (XY frame).** `useHydration()` hook + extension of `StreamXYFrame`'s `isServerEnvironment` branch to also fire when `!hydrated`. Server output equals first-client-render output (both go through the SVG branch); after first commit, `useLayoutEffect` flips `hydrated` and the canvas branch upgrades the same DOM subtree. Hydration-parity test (`StreamXYFrame.hydration.test.tsx`) gates regressions: `renderToString` + `hydrateRoot` round-trip with no React mismatch warnings.

**Phase 2 — landed 2026-05-01 (XY catalog).** Parametrized hydration test across all 13 XY HOCs (`charts/xy/hydration.test.tsx`): LineChart, AreaChart, StackedAreaChart, Scatterplot, ConnectedScatterplot, BubbleChart, Heatmap, ScatterplotMatrix, QuadrantChart, MultiAxisLineChart, CandlestickChart, MinimapChart, XYCustomChart. Every one passes the three-part check (no `<canvas>` in server output, no React mismatch warnings on hydrate, canvas live after the swap) with zero code changes — the boundary genuinely lived in `StreamXYFrame` and the architecture held.

**Phase 3 — landed 2026-05-01 (ordinal + network + geo catalogs).** `StreamOrdinalFrame`, `StreamNetworkFrame`, and `StreamGeoFrame` got the same `useHydration` integration (one-line `useHydration()` call, condition swap on the SSR branch, `responsiveRef` on the SVG branch's outer div, `hydrated` in the mount-time `scheduleRender` deps). Parametrized regression tests cover every shipped HOC: `charts/ordinal/hydration.test.tsx` (16 ordinals — BarChart, StackedBarChart, GroupedBarChart, SwarmPlot, BoxPlot, Histogram, ViolinPlot, RidgelinePlot, DotPlot, PieChart, DonutChart, GaugeChart, FunnelChart, SwimlaneChart, LikertChart, OrdinalCustomChart), `charts/network/hydration.test.tsx` (8 networks — ForceDirectedGraph, ChordDiagram, SankeyDiagram, TreeDiagram, Treemap, CirclePack, OrbitDiagram, NetworkCustomChart), and `charts/geo/hydration.test.tsx` (4 geo — ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram). All 84 new tests pass (28 cases × 3 assertions each). The harder scene primitives (wedges, ribbons, sankey beziers, hierarchy rects, orbit arcs, force-directed positions, projected feature paths) round-trip through `SceneToSVG` cleanly with no extensions needed. **Geo was caught late** — the original Phase 3 scope omitted `StreamGeoFrame` because I enumerated three frame families instead of four; the demo project's verification matrix exposed the gap and the same five-line integration applied cleanly.

**Phase 4 — landed 2026-05-01 (intro continuity).** Animations now resolve correctly across the hydration boundary. Today's pre-fix bug: server painted the chart in its final state via SVG, then on hydration the canvas took over and *re-animated the intro from blank → final*, producing a visible flash where the user saw their chart, then watched it animate back in. Fix: a `useWasHydratingFromSSR` hook (uses `useSyncExternalStore`'s `getServerSnapshot` to distinguish SSR rehydration from pure CSR mounts) + a `cancelIntroAnimation` method on each pipeline store. When the SVG → canvas swap happens after SSR rehydration, the frame calls `cancelIntroAnimation` to wipe the intro state, so the canvas paints the final scene directly. Pure CSR mounts keep their intro animation because the SVG render is overwritten before the browser ever paints. Subsequent data-change transitions still animate normally — only the *first* paint after SSR hydration is intro-skipped. Regression tests live in `useHydration.test.tsx` (hook behavior) and `PipelineStore.cancelIntro.test.ts` (store-level cancellation across all three pipeline types).

**Result: every non-streaming HOC in Semiotic auto-hydrates from a React Server Component, with no flash on hydration.** 41 HOCs total — 13 XY + 16 ordinal + 8 network + 4 geo. No `"use client"` ceremony, no manual placeholder, no `next/dynamic` scaffolding, no re-animated intro.

**Manual placeholder pattern stays documented for streaming charts.** `RealtimeLineChart`, `RealtimeHistogram`, etc. are deliberately canvas-only — server-rendering a live push-driven streamgraph isn't a use case. The pattern (`next/dynamic({ ssr: false })` + `semiotic/server`'s `renderChart` placeholder) remains the answer for those, plus as an emergency fallback if a future regression hits an auto-hydrating chart.

**Streaming charts deliberately stay canvas-only.** A server-rendered streamgraph or `RealtimeLineChart` was never a use case; those frames stay on the canvas-first path.

---

## P1 — Visual & Rendering Coverage

### HOC-Level Visual Snapshots

**Complete as of 2026-04-29 — every HOC in `chartSpecs.ts` (43/43) has at least one default-theme visual snapshot.** The animated-HOC pass shipped pixel-stable snapshots for the 4 realtime charts and `OrbitDiagram` by passing static `data` arrays + omitting decay/pulse/transition/staleness on realtime + `animated: false` on Orbit, so the canvas stabilizes after initial paint and ordinary `waitForChartReady` succeeds.

Remaining infrastructure work:
- Bootstrap Linux baselines from the CI `playwright-snapshots` artifact (existing CI workflow auto-generates on first push when no Linux baselines are committed).

### Interaction-State Visual Snapshots

Covered as of 2026-04-29: hover-state (scatter, bar — pre-existing), `hoverHighlight` (multi-line dim), brush selection rect (scatter), legend isolate (multi-line LineChart), linked-hover cross-highlight (LinkedCharts dashboard). The remaining underrepresented case is **click-locked crosshair** in `linkedHover` x-position mode (click locks dashed white line, second click or Escape unlocks). That's a 2-step interaction — driver test + snapshot of locked state — and a follow-up if the regression class becomes load-bearing.

Next work:
- Click-locked crosshair snapshot (low priority; gate value is incremental on top of the linked-hover snapshot already shipped).

### SSR-Vs-CSR Visual Diff

**Structural parity gate landed 2026-05-01.** `src/components/server/ssr-csr-parity.test.tsx` exercises the two SSR code paths (`renderChart` from `semiotic/server` vs. `renderToString(<Component />)` through the in-frame SSR branch) for a representative chart matrix — LineChart, BarChart, PieChart, SankeyDiagram, Treemap. Catches the regression class where one pipeline silently emits wildly different data marks than the other.

**Pixel-level Playwright gate landed 2026-05-01.** `integration-tests/ssr-parity.spec.ts` snapshots both server-rendered SVG (via `renderChart`) and client-rendered canvas for the same chart matrix. The SSR side renders into a `page.setContent` payload with the `renderChart` output inlined — no fixture file needed for that side. The CSR side uses a new `integration-tests/ssr-parity-examples/` fixture page. 30 baselines committed (5 charts × 2 sides × 3 browsers, all darwin); CI generates Linux baselines on first push from the artifact pattern other Playwright specs use.

Both sides snapshot independently rather than direct pixel-comparing each other — SVG and canvas pipelines render with subtly different anti-aliasing and won't match byte-for-byte, but per-side baselines mean any drift on either pipeline lands in front of a maintainer for review.

Surfaced an expected divergence in the structural test: `renderChart` emits bare data marks while the in-frame SSR branch includes SVGOverlay chrome (axis/legend). Documented; assertions tuned to permit it. The Playwright baselines lock in both renderings as-they-are, so a maintainer reviewing snapshot diffs can decide whether a change is intentional.

Future work (lower priority):
- Background-graphics fixture coverage (the matrix doesn't currently exercise foreground/background graphics composition).
- Theme-matrix variant of the parity gate (charts × theme presets) if a theme-driven SSR regression ever ships unnoticed.

### Animation Snapshots

The screenshot harness generally avoids active animation, leaving intro/update paths undercovered.

Next work:
- Mock time or freeze animation progress at deterministic points.
- Snapshot representative mid-animation states for bars, wedges, lines/areas, points, network nodes, and geo points.

---

## P2 — Performance & Scale

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

## P3 — Product Extensions

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

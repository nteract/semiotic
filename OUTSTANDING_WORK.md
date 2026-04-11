# Outstanding Work

Last updated 2026-04-08.

---

## Rounded Corners

**Status**: Scoped, not started.

### What

Optional rounded corners on:
1. **Pie/donut wedges** — `cornerRadius` on PieChart/DonutChart/GaugeChart. Rounds the outer corners of each wedge arc.
2. **Bar chart tops** — `roundedTop` on BarChart. Rounds only the top two corners of each bar (the end away from the baseline). Bottom stays flush with the axis.
3. **Stacked bar top piece** — Only the topmost bar segment in a stack gets rounded corners. Interior segments stay rectangular so they stack cleanly.
4. **RealtimeHistogram** — Same as stacked bar — only the top bin gets rounded.

### Prop API

```tsx
<PieChart cornerRadius={8} />
<DonutChart cornerRadius={6} />
<BarChart roundedTop={4} />         // pixel radius
<StackedBarChart roundedTop={4} />  // only topmost segment
<RealtimeHistogram roundedTop={4} />
```

### Technical approach

**Pie/donut (d3-shape `arc.cornerRadius`)**:
- d3-shape's `arc()` generator already supports `.cornerRadius(r)`. The scene builder (`pieScene.ts`) creates `WedgeSceneNode` with start/end angles and radii.
- Add `cornerRadius?: number` to `WedgeSceneNode`.
- In `wedgeCanvasRenderer.ts`: replace manual `ctx.arc()` calls with d3-shape `arc()` generator that respects `cornerRadius`. The generator produces a path string; use `Path2D` to render it on canvas.
- In `SceneToSVG.tsx ordinalSceneNodeToSVG` wedge case: already uses `d3Arc()` — just chain `.cornerRadius(n.cornerRadius || 0)`.
- `OrdinalPipelineConfig` gets `cornerRadius?: number`. PieChart/DonutChart HOC props expose it and pass through.

**Bar chart tops (canvas rounded rect)**:
- Add `roundedTop?: number` to `RectSceneNode` (or pass via style).
- In `barCanvasRenderer.ts`: when `roundedTop` is set, draw a path with rounded top-left and top-right corners instead of `ctx.fillRect`. For horizontal bars, round the end corners (right side for LTR, left for negative values).
- In `SceneToSVG.tsx` rect case: use `rx`/`ry` SVG attributes. SVG `<rect rx>` rounds all corners — for top-only, render as a `<path>` with explicit arc commands on the top two corners.
- Scene builder (`barScene.ts`): propagate `roundedTop` from config to each `RectSceneNode`. For stacked bars, only the last (topmost) segment gets `roundedTop`; interior segments get `roundedTop: 0`.

**Stacked bar / histogram**:
- The ordinal scene builder produces rect nodes in category order. The topmost segment in a stack is the last rect node for that category.
- After building all rects for a category, mark only the last one with `roundedTop`.
- For `normalize` mode (100% stacked), the topmost segment touches the full extent — still only round the top.

### Canvas helper

```ts
function roundedTopRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y + h)          // bottom-left
  ctx.lineTo(x, y + r)          // left side up
  ctx.arcTo(x, y, x + r, y, r) // top-left corner
  ctx.lineTo(x + w - r, y)     // top edge
  ctx.arcTo(x + w, y, x + w, y + r, r) // top-right corner
  ctx.lineTo(x + w, y + h)     // right side down
  ctx.closePath()
}
```

### Effort

Medium (3-4 days):
- Pie/donut cornerRadius: 0.5 day (d3-shape already supports it)
- Bar roundedTop canvas renderer: 1 day
- Bar roundedTop SVG renderer: 0.5 day
- Stacked bar topmost-only logic: 0.5 day
- HOC prop wiring: 0.5 day
- Tests: 0.5 day

### Edge cases

- `cornerRadius` larger than wedge angle → d3-shape clamps automatically
- `roundedTop` larger than bar height → clamp to `min(radius, h/2, w/2)`
- Horizontal bars → round the end that points away from the axis (right for positive, left for negative)
- Negative value bars (below zero baseline) → round the bottom (the end away from zero)
- Single-segment stacked bar → round the top (it's both the first and last segment)

---
## BUGS

### StackedBarChart and GroupedBarChart missing `sort` prop

`BarChart` supports `sort` via `useSortedData` but `StackedBarChart` and `GroupedBarChart` don't declare or implement it. The prop is silently ignored. Worse, the underlying frame defaults `oSort` to descending value sort when undefined — so categories always appear sorted by total value, not insertion order. Pre-sorting the data array doesn't help because the pipeline re-sorts.

**Workaround**: Pass `frameProps={{ oSort: false }}` to preserve data insertion order.

**Fix**: Add `sort` to `StackedBarChartProps` and `GroupedBarChartProps`. Default to `false` (insertion order). Map `"asc"`/`"desc"` to frame `oSort`. Small (0.5 day).

---

## Push API: Transition Exits on Remove

**Status**: Not started.

When `remove()` is called, items vanish instantly instead of fading out. The existing transition machinery supports enter/exit animations — `snapshotPositions()` captures pre-change state, `computeScene()` builds post-change scene, `startTransition()` creates exit nodes with `_targetOpacity: 0`. But `remove()` currently marks dirty and triggers rebuild without calling `snapshotPositions()` first, so the transition system has no "before" state to animate from.

**Fix**: Call `snapshotPositions()` inside `remove()` before the buffer changes (same pattern as `computeScene()` uses). The next `computeScene()` call will then see the removed items in the "previous" snapshot and create fade-out exits.

**Effort**: Small (0.5-1 day). The machinery exists; it's wiring.

---

## Push API: Selection Clearing on Remove

**Status**: Not started.

If the removed item is currently hovered or selected (via `linkedHover` or `selection`), the interaction state points at a ghost datum. Not a crash — the selection references a datum no longer in the scene — but it can leave a stale tooltip or highlight.

**Fix**: After `remove()`, check if any removed item matches the current hover/selection state and clear it. The selection store has `clearSelection()` and the hover store has `clearHover()`.

**Effort**: Small (0.5 day).

---

## Push API: Network Edge ID Accessor

**Status**: Not started.

`removeEdge(sourceId, targetId)` requires knowing both endpoints. For named edges (a specific contract, SLA, or data pipeline link), users want `removeEdge(edgeId)`. The network store keys edges by `source\0target\0index`, but there's no user-facing edge ID accessor.

**Fix**: Add `edgeIdAccessor` to `NetworkPipelineConfig`. Build a reverse map from edge ID → edge key. `removeEdge` and `updateEdge` accept either `(sourceId, targetId)` or `(edgeId)`.

**Effort**: Small (0.5 day).

---

## Push API: Undo

**Status**: Not scoped.

`remove()` and `update()` return the previous values, so the caller can `push` them back. But there's no built-in undo stack. For a chat agent workflow ("remove that node" / "undo"), the caller holds the return value manually.

A built-in undo would be: `ref.current.undo()` that reverses the last mutation (remove, update, push). Requires an operation log with inverse operations. Scoping TBD — may be better as a userland wrapper than a library feature.

---

## CLI Screenshot Generator

**Status**: Not started. Trivial.

A Node script (`scripts/demo-server-render.mjs`) that batch-renders charts to SVG/PNG files on disk. Produces the exact images needed for PR descriptions and release posts. ~80 lines.

**Effort**: 0.5 day.

---

## OG Image HTTP Server

**Status**: Not started. Trivial.

A ~60-line Node HTTP server (`scripts/og-server.mjs`) that returns chart SVG/PNG from URL query parameters. `GET /og?component=BarChart&theme=dark&title=Revenue` → PNG. Deployable as Vercel serverless function, Cloudflare Worker, or AWS Lambda.

**Effort**: 0.5 day.

---

## PDF Export

**Status**: Not scoped.

`renderToPDF(component, props, options)` — generate PDF documents with embedded charts. Multi-page dashboard support via pdfkit or jsPDF (peer dependency). Text as vectors (no font embedding). Page layout (A4, Letter, custom).

**Effort**: Large (1-2 weeks).

---

## Edge Runtime Compatibility

**Status**: Not scoped.

Verify `renderChart`, `renderDashboard`, `generateFrameSVGs`, `generateFrameSequence` work in Cloudflare Workers, Vercel Edge Functions, and Deno Deploy. The sync functions should already work (they only use react-dom/server). The async functions (renderToImage, renderToAnimatedGif) require sharp which is Node-only — resvg-wasm would enable edge PNG generation.

**Effort**: Medium (3-5 days). Mostly testing and polyfill discovery.

---

## GIF Transition Easing (Phase 2 fix)

**Status**: Known limitation, not started.

`transitionFrames` in `generateFrameSVGs` is currently a no-op because each frame creates a new PipelineStore. The store needs a previous scene snapshot to compute enter/update/exit transitions, but a fresh store has no history. Fixing this requires keeping a single store instance across frames and ingesting data incrementally (push the delta, let the store snapshot previous positions before rebuilding).

`generateFrameSequence` is not affected — it renders each snapshot independently via `renderChart`, so transitions don't apply.

**Effort**: Medium (2-3 days). Requires changing the XY branch of `generateFrameSVGs` to use incremental ingestion instead of bounded re-creation per frame.

---

## Render Studio: Real GIF Downloads

**Status**: Not started.

The Render Studio page (`/server/studio`) animated preview still cycles SVG frames client-side. The Export & Embed page uses pre-built GIF files. The Studio could either generate GIFs at build time for common configs or link to the Export page for download.

**Effort**: Small (0.5 day) if linking to Export page. Medium (1-2 days) if generating per-config GIFs at build time.

---

## Release & CI Pipeline

### Release pipeline hardening [DONE]

- **Post-publish smoke test** — added to `.github/workflows/release.yml`. After `npm publish`, waits for registry propagation then installs `semiotic@version` in a temp project and verifies 8 entry points (`semiotic`, `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/server`, `semiotic/themes`, `semiotic/utils`) export expected components.
- **Rollback script** — `scripts/rollback-release.sh <bad-version> [good-version]`. Deprecates the bad version (shows warning on install) and points the dist-tag back to the previous version. Auto-detects previous version if not specified. Prints follow-up steps (delete git tag, optional unpublish).

---

## Release & Publishing

### Docs site prerendering

Homepage and chart index pages resolve to a JS shell. Prerendering would improve SEO and LLM retrieval quality.

---

## Bugs & Code Quality

### canvasPreRenderers only on StreamXYFrame

### PipelineStore cache invalidation edge cases [YELLOW]

Stacked area cumulative sums are cached by `bufferSize:_ingestVersion`. Color maps rebuild only when the set of categories changes. These caches are correct for tested patterns but the invalidation logic is implicit — there is no assertion or test that verifies a cache *does* invalidate when it should. A subtle change to ingest ordering could leave stale cached values without any visible error, just wrong numbers.

**Symptom**: Stacked areas show wrong heights after certain data update patterns, or color assignments drift after category additions/removals.

### Canvas renderer combinatorial paths [YELLOW]

Line and area renderers handle three independent features that each break continuous paths into segments: curve interpolation, per-vertex decay opacity, and threshold coloring. These compose multiplicatively but are only validated visually via Playwright screenshots, not programmatically. Unusual combinations (e.g., step curve + exponential decay + threshold coloring) may produce artifacts.

### NetworkPipelineStore tension threshold tuning [YELLOW]

Streaming network layouts use a `tension` counter that accumulates as edges arrive. Layout re-runs when tension exceeds a threshold. The threshold is empirically tuned, not theoretically derived. Under bursty traffic patterns, layouts may re-run too frequently (jittery graph) or too infrequently (stale positions).

### GeoPipelineStore projection edge cases [YELLOW]

Anti-meridian line splitting and zoom/pan transforms work for standard projections and zoom ranges. Edge cases near projection singularities (e.g., poles in Mercator, anti-meridian in Equirectangular) may produce rendering artifacts. The d3-geo math is trusted, but the custom wrapping code (splitting, tile alignment) has limited test coverage at extreme latitudes/longitudes.

### Click-testing remainders

---

## Theming Gaps

### ThemeProvider useEffect timing lag [YELLOW]

`ThemeInitializer` uses `useEffect` to sync the store, causing CSS variables to be one render behind on initial mount. Mitigated by inline CSS vars on `ThemeCSSWrapper`'s div, but the architecture is fragile — future changes to rendering order could re-expose the timing issue. The right fix may be to resolve the theme synchronously during render (via `useSyncExternalStore` or store initialization) rather than via effect.

### Canvas theme bridge fragility [YELLOW]

Canvas renderers read theme values via `getComputedStyle(canvas).getPropertyValue("--semiotic-bg")` at paint time. If the dirty flag isn't set when the theme updates, canvas keeps old colors while SVG elements (axes, legend) update to the new theme. Currently works because theme changes trigger a re-render which sets the dirty flag, but this coupling is implicit.

### Planned CSS variables (not yet implemented)

| Variable | Purpose | Priority |
|---|---|---|
| `--semiotic-annotation-color` | Default annotation text/marker color | Medium |
| `--semiotic-legend-font-size` | Legend text size (separate from tick) | Low |
| `--semiotic-title-font-size` | Chart title size | Low |
| `--semiotic-tick-font-family` | Monospace option for numeric tick alignment | Low |

### Planned SemioticTheme interface additions

- `colors.annotation` — annotation marker/text color
- `typography.legendSize` — legend font size
- `typography.tickFontFamily` — monospace option for numeric alignment
- `accessibility.colorBlindSafe` — auto-swap categorical palette for CB-safe variant
- `accessibility.highContrast` — enforce 3:1+ contrast ratios

### Design system research gaps

Per Carbon/MUI comparison: curated categorical sequences maximizing neighbor contrast (currently user-provided arrays), and per-role typography tokens (title vs legend vs axis vs tick — currently only sizes, not per-role font families).

---

## TypeScript

### Accessor type audit

Replace bare `string` or deprecated `Accessor<T>` with `ChartAccessor<TDatum, T>` across all HOC props.

### Generic ColorConfig/SizeConfig

These types use `Accessor<string>` instead of `ChartAccessor`. Making them generic with `TDatum` enables `keyof` inference on `colorBy`, `sizeBy`.

### Realtime HOC generics

Adding `TDatum` to Realtime HOC props interfaces enables accessor inference.

**Files**: `types.ts`, all 36 HOC files

### `as any` reduction [RED]

172 `as any` casts in production code. Hotspots: PipelineStore (38), sankeyLayoutPlugin (25), NetworkPipelineStore (19), StreamOrdinalFrame (16). Primary source is the transition system — shadow properties accessed via `as any`. Each cast is a potential runtime type error that TypeScript can't catch. Fix: add `_transitionState?: TransitionState` to SceneNode variants.

---

## Declarative Bounded Animation

### Enter/exit detection

Add `_targetOpacity` to scene node types. New nodes enter at opacity 0→1, exiting nodes fade 1→0 then remove.

**Files**: `PipelineStore.ts`, `types.ts`

### Line/area path interpolation

For lines with stable x-values, interpolate y-coordinates. Store path arrays in `prevPositionMap` keyed by group identity.

### `animate` prop on HOCs

Add `animate?: boolean | TransitionConfig` to `BaseChartProps`. Default `false`. Currently declared but unused (`resolveAnimateConfig` exists in hooks.ts but no HOC consumes it).

### Canvas renderer opacity support

Each renderer respects `_targetOpacity` via `ctx.globalAlpha`, composing with selection dimming.

**Files**: all canvas renderers

---

## Testing & CI Gaps

### Missing test specs

1. `animation.spec.ts` — bounded data transitions, enter/exit (not yet written). Blocked on declarative animation implementation.

### SSR testing gap [DONE]

- 10 server test files with 31+ integration tests covering all chart types, themes, formats
- Geo SSR test added: ChoroplethMap with pre-resolved GeoJSON features, ProportionalSymbolMap
- Negative cases added: empty data, missing accessors (defaults), unknown component name (throws descriptive error), null data, empty dashboard
- All SSR tests run in CI via `npx vitest run --coverage` (same as all other tests)

### Cross-browser testing [DONE — config added]

Firefox and WebKit projects added to `playwright.config.ts`. CI installs all three browsers (`npx playwright install --with-deps chromium firefox webkit`). Snapshot baselines will need to be generated per-browser — the CI auto-generates missing baselines on first run.

### Playwright snapshot baselines [YELLOW — partially addressed]

CI has auto-generation logic: if no Linux baselines exist, runs `--update-snapshots` on first run. Both macOS and Linux baselines can coexist. Firefox/WebKit baselines will be generated on first CI run with the new config.

### Canvas stub drift in unit tests [DONE]

CI step added to `node.js.yml`: scans all `ctx.<method>` calls in `src/components/stream/renderers/`, compares against the stubbed methods in `setupTests.ts`, and fails if any method is used in production but not stubbed. Excludes property assignments (fillStyle, strokeStyle, etc.).

### Sustained streaming load testing [DONE]

`benchmarks/unit/streaming-load.bench.ts` added with 6 benchmarks:
- RingBuffer: 10k/50k pushes with eviction, forEach iteration cost
- PipelineStore: 1k push + scene rebuild, 5k burst, incremental 100-point hot path
- Memory stability: 50k push/evict cycles assert buffer stays at capacity

### Canvas accessibility [YELLOW — by design]

Canvas data marks are opaque to assistive technology. Mitigated by: ARIA labels on canvas elements, SVG overlay for text-accessible axes/legends, `accessibleTable` (default true) rendering screen-reader-only data summary, keyboard navigation with graph-based traversal. The data marks themselves have no text alternative beyond tooltips. This is an inherent canvas limitation — further improvement would require a parallel invisible DOM representation of each data point.

### Benchmark regressions [YELLOW — tooling gap]

CI runs `npx vitest bench --reporter=verbose` for visibility. `scripts/check-bench-regression.js` exists for baseline comparison but vitest bench does not support `--reporter=json` output, so automated regression gating is blocked on upstream vitest support. The script will work once vitest adds JSON bench output. For now, benchmarks run in CI for visibility but don't fail builds.

---

## MCP & AI Tooling

### MCP protocol compliance testing [RED]

The MCP server is tested via CLI (`--doctor`), not via actual MCP protocol messages. If a host (Claude Desktop, Cursor) sends a request in an unexpected format, the server's error handling is untested. No integration test starts the MCP server and exercises the protocol round-trip.

**Fix**: Add a test that starts `semiotic-mcp`, sends tool calls via the MCP protocol (stdio transport), and validates responses. Cover: `renderChart` with valid props, `renderChart` with invalid props, `diagnoseConfig`, `suggestChart`.

### Schema freshness check is regex-based [YELLOW]

`check-schema-freshness.js` validates sync between `ai/schema.json`, `validateProps.ts`, and `CLAUDE.md` using regex parsing. If the format of CLAUDE.md changes structurally, the parser may fail silently — reporting "in sync" when drift exists.

---

## API Reference Documentation

- TypeDoc setup generating from 8 entry points
- Prop table component rendering from TypeDoc JSON, embedded in doc pages
- `/api` route in docs site with cross-links from example pages

---

## Bundle Size

### Profile

Run rollup-plugin-visualizer on each entry point.

### Lazy-load statistical overlays

`statisticalOverlays.ts` pulls LOESS/forecast logic. Dynamic import behind `forecast` and `anomaly` props.

### PipelineStore shared base

The 4 PipelineStore files (~4500 lines) share extent tracking, accessor resolution, and transition logic. Extract shared utilities.

---

## Performance

### Tier 2: Medium Complexity

- **RingBuffer forEach** — iterate in-place instead of materializing for scan operations
- **Canvas curve interpolation** — apply d3-shape curves to canvas line/area renderers
- **Quadtree for scatter hit testing [RED]** — O(log n) lookup for >10k points. Currently linear scan for non-point nodes (lines, areas, rects). A chart with 10,000 line segments does 10,000 distance calculations per mouse move.
- **Network decay sort cache** — maintain sorted node list, invalidate on topology change
- **Line/area decay** — per-vertex opacity gradient for streaming line charts

### Tier 3: Transformative

- **Incremental force layout (warm start)** — preserve positions, fewer iterations for streaming
- **Incremental scene updates** — append/evict nodes instead of full rebuild for streaming
- **Streaming annotation anchoring** — `"latest"`, `"sticky"` anchor modes
- **Heatmap canvas text** — render `showValues` text on canvas instead of SVG overlay
- **WebGL renderer for >100k points** — single draw call via vertex buffer
- **Web Worker for force layout** — move simulation off main thread

---

## Geo Enhancements

- **Path2D hit testing generalization** — shared `pathHitTest` utility for network custom shapes, ordinal arcs, XY area fills
- **Bounds pre-filter for network nodes** — apply geo-style `[[x0,y0],[x1,y1]]` bounds check to CanvasHitTester
- **Canvas grid lines** — render XY grid lines on canvas as non-interactive background marks for performance
- **Geographic minimap** — overview + detail with linked zoom, extending MinimapChart pattern
- **Temporal animation on cartogram** — `timeAccessor` to scrub through time and watch cartogram reshape
- **Edge encoding richness** — tapered lines (width varies along path) and animated dashed lines (directionality)

---

## Learnings (Reference)

- Test mocks must use `forwardRef` when HOCs pass refs. Update ALL test mocks in same PR when adding `forwardRef`.
- Conditional spread `nodes != null` blocks inferred data — test the derived value, not the raw prop.
- `renderEmptyState(undefined, ...)` returns `null` because `undefined` data means push API mode, not "no data."

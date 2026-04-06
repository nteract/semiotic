# Outstanding Work

Last updated 2026-04-05.

---
## BUGS

---

## Push API: Selective Data Removal

**Status**: Implemented. `remove()` and `update()` ship on all stores and frame handles.

### Problem

The push API (`push`, `pushMany`, `clear`, `getData`) is additive-only. Data exits the buffer only through RingBuffer eviction (oldest items drop when window is full) or `clear()` (wipes everything). There is no way to remove a specific datum, edge, or node.

This matters for network topology changes (edge/node removal), filtered live views (deselect a category), correction/tombstone streams, and TTL-based expiry.

**Current workaround**: For server GIF rendering, `generateFrameSequence` accepts complete data snapshots per frame, so deletion is implicit (frame N+1 simply omits the deleted item). For client-side, the only option is `clear()` + `pushMany(filteredData)`, which loses transition state.

### Proposed API

```ts
ref.current.remove((datum) => datum.id === "Lead")       // by predicate
ref.current.removeWhere("id", "Lead")                     // field match sugar
ref.current.removeEdge((edge) => edge.source === "Spark") // network edges
```

### Technical approach

- **RingBuffer**: Add `remove(predicate)` — O(n) scan + compact. Size decreases, capacity stays. Subsequent pushes fill the gap.
- **PipelineStore**: `remove(predicate)` calls `buffer.remove()`, recomputes extent from scratch (O(n), removal is infrequent), marks dirty.
- **Transitions**: Existing enter/exit machinery handles this — removed items appear in the "previous" snapshot but not the "current" scene, so `startTransition()` creates fade-out exit nodes automatically.
- **Network cascade**: Removing a node also removes edges that reference it.
- **HOC handles**: All forwardRef HOCs get `remove` on their imperative handle. No prop changes.

### Edge cases

- Remove all data → empty state (same as `clear()`)
- Remove during active transition → snap to end, start new transition
- Network node removal → cascade to edges
- Remove hovered/selected item → clear interaction state

### Effort

Medium (3-5 days). RingBuffer.remove (1d), PipelineStore.remove + extent recompute (1d), transition exits (1d, mostly existing), frame/HOC exposure (0.5d), network cascade (0.5d).

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

## Discord / Slack Chart Agent

**Status**: Scoped in CHAT_AGENT_PLAN.md, not started.

A bot that listens in a channel, accepts data (CSV/JSON paste or code block), interprets natural language requests via an LLM, and replies with a chart image (PNG or animated GIF). Conversational — "dark mode", "add a threshold at 50K", "animate it" refine the previous chart.

Architecture: discord.js / @slack/bolt → Claude API (with ai/system-prompt.md + ai/schema.json as context) → semiotic/server renderToImage/renderToAnimatedGif → file upload. Per-channel state stores last data + last config for iterative refinement.

**Effort**: Phase 1 (slash command, JSON in → PNG out): 1-2 days. Phase 2 (natural language via LLM): 2-3 days. Phase 3 (conversational refinement + GIF): 2-3 days. Phase 4 (polish, error handling, rate limiting): 1-2 days. Total: 6-10 days.

**Dependencies**: @anthropic-ai/sdk, discord.js or @slack/bolt. semiotic/server + sharp already available.

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

## SVG Hatch Pattern Fills for Server Rendering

**Status**: Not started.

`createHatchPattern()` produces CanvasPatterns which don't work in SVG server output. For server-rendered charts, hatch fills (used by FunnelChart vertical mode and desired for visual differentiation like the Backup-B node in the ETL failover demo) need SVG `<pattern>` elements with `<line>` strokes inside a `<defs>` block.

**Effort**: Small (1 day). Create `createSVGHatchPattern(opts)` that returns a `<pattern>` element and a `url(#id)` fill reference. Wire into server frame renderers.

---

## Render Studio: Real GIF Downloads

**Status**: Not started.

The Render Studio page (`/server/studio`) animated preview still cycles SVG frames client-side. The Export & Embed page uses pre-built GIF files. The Studio could either generate GIFs at build time for common configs or link to the Export page for download.

**Effort**: Small (0.5 day) if linking to Export page. Medium (1-2 days) if generating per-config GIFs at build time.

---

## Release & CI Pipeline

### Release pipeline hardening [YELLOW — partially addressed]

**Remaining**: No rollback mechanism, no post-publish smoke test. A bad release still requires manual `npm unpublish` within 72 hours.

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

1. `animation.spec.ts` — bounded data transitions, enter/exit (not yet written)

### SSR testing gap [YELLOW — partially addressed]

Three test files exist: `renderToStaticSVG.test.tsx`, `componentSSR.test.tsx`, `SceneToSVG.test.tsx`. These run in Vitest (unit) but are not explicitly gated in CI as a separate step. Coverage of geo SSR and edge cases (empty data, invalid props) is thin.

**Remaining**: Ensure SSR tests run in CI. Add geo SSR test with pre-resolved features. Add negative case (invalid props → graceful fallback).

### Cross-browser testing [RED]

Playwright tests run Chromium only. No Firefox or Safari testing. Canvas rendering differences between browsers (anti-aliasing, font metrics, gradient interpolation) are untested.

**Fix**: Add Firefox and Safari (WebKit) projects to `playwright.config.ts`. Start with a subset of specs (xy-frame, ordinal-frame) to avoid screenshot baseline explosion.

### Playwright snapshot baselines are macOS-only [YELLOW]

All E2E screenshot baselines are `*-chromium-darwin.png`. CI runs on `ubuntu-latest` (Linux), where Playwright looks for `*-chromium-linux.png` — which don't exist. Font hinting and subpixel antialiasing differ enough between platforms that sharing baselines across OSes isn't viable.

**Fix**: Generate Linux baselines via Playwright's Docker image (`mcr.microsoft.com/playwright:v1.x`) or a one-time CI run with `--update-snapshots`. Commit both `*-chromium-darwin.png` and `*-chromium-linux.png` baselines. Alternatively, pin E2E to a Docker-based CI runner so only one set of baselines is needed.

### Canvas stub drift in unit tests [YELLOW]

`setupTests.ts` stubs ~40 canvas methods for jsdom. If a new canvas method is used in production but not stubbed, tests pass in Playwright but throw in Vitest. No CI step validates stub completeness.

### Sustained streaming load testing [RED]

No load test pushes high-throughput data (e.g., 10,000 points/second for 5 minutes) and measures frame drop rate, memory growth, or GC pauses. Benchmarks test batch processing, not sustained streaming. The architecture (microtask batching -> RingBuffer -> scene rebuild -> canvas repaint) is sound in design but unvalidated under sustained real-world load.

**Fix**: Add a benchmark or integration test that pushes data at sustained high rates and asserts: no memory leak (heap stable after GC), RAF callback completes within 16ms budget, no dropped frames.

### Canvas accessibility [RED]

axe-core catches WCAG violations in the DOM/SVG layer. But canvas content is opaque to accessibility tools. Keyboard navigation exists and is tested against specific patterns, but not comprehensively against screen reader behavior. Users relying on assistive technology may not be able to access canvas-rendered data marks.

**Mitigation**: ARIA labels on canvas elements exist. SVG overlay provides text-accessible axes/legends. But the data marks themselves (the canvas layer) have no text alternative beyond tooltips.

### Benchmark regressions non-blocking [YELLOW]

The 5 existing benchmark suites run in CI but don't fail builds. Baselines aren't versioned in git. A 50% perf regression ships silently.

**Fix**: Version baseline files in git. Add a CI check that fails on >20% regression vs baseline.

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

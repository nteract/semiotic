# Outstanding Work

Last updated 2026-04-12.

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

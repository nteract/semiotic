# Semiotic 3.3.0 Release Review

**Date**: 2026-04-08
**Version**: 3.3.0 (from 3.2.3)
**Commits since 3.2.3**: 53 (169 files changed, +15,408 / -2,660 lines)

---

## Release Summary

### New in 3.3.0

- **`semiotic/server` production API** — `renderChart()` for 27+ HOC types, `renderDashboard()`, `renderToImage()` (PNG/JPEG), `renderToAnimatedGif()`, `generateFrameSequence()`. Full theme, legend, grid, annotation, and accessibility support in SVG output.
- **Push API `remove()` / `update()`** — Selective data management across all stores and HOC handles. Network cascade deletion. ID-based targeting via `pointIdAccessor`/`dataIdAccessor`.
- **SVG hatch patterns** — `createSVGHatchPattern()` for server rendering (FunnelChart vertical dropoff bars).
- **CSS variable resolution in canvas** — `resolveCSSColor()` for dark/light mode aware rendering.
- **`hoverHighlight` simplified** — `boolean` only (was `boolean | "series"`).
- **6 interactive docs pages** — Render Studio, Theme Showcase, Dashboard Gallery, Email Preview, Export & Embed, Push API demo.

---

## Verification Status

| Check | Status | Details |
|---|---|---|
| TypeScript `--noEmit` | PASS | Zero errors |
| Vitest | PASS | 152 files, 2797 tests |
| Build (`build.mjs`) | PASS | All 13 bundles created |
| MCP build | PASS | mcp-server.js rebuilt |

---

## Audit Results

### Test Coverage: GOOD

All 41 HOC chart components have matching test files across xy (11), ordinal (17), network (8), geo (4), and realtime (5).

Push API stores fully tested:
- RingBuffer: remove/update with circular wrap, empty buffer, post-removal push
- PipelineStore: remove by single/multiple IDs, extent recalculation, empty state
- OrdinalPipelineStore: remove with extent eviction
- NetworkPipelineStore: node cascade, edge removal

Server rendering tested via `renderToStaticSVG.test.tsx`, `componentSSR.test.tsx`, `SceneToSVG.test.tsx`, and integration tests.

### Public API: CLEAN

- All 11 entry points export correctly with no gaps
- All 42 chart components + coordinated views + utilities properly exported
- Zero `as any` casts in entry point files
- All package.json `exports` paths map to real files
- TypeScript declarations generated via `tsconfig.declarations.json`

### Docs Site: COMPLETE

- 115+ pages, all routed and navigable
- All major features documented (server rendering, themes, push API, coordinated views, annotations, accessibility, realtime)
- No "Coming soon" or TBD placeholders
- One harmless code-only TODO in `AxesPage.js` (line 275): `// TODO: migrate custom tickFormat to StreamXYFrame API`

---

## Version References Updated

| File | Old | New |
|---|---|---|
| `package.json` | 3.2.3 | 3.3.0 |
| `package-lock.json` | 3.2.3 | 3.3.0 |
| `ai/schema.json` | 3.2.2 | 3.3.0 |
| `server.json` | 3.2.2 | 3.3.0 |
| `SEMIOTIC_SERVER_SPEC.md` | v3.2.3 | v3.3.0 |
| `LAUNCH_CONTENT.md` | 3.2.3 | 3.3.0 |
| `CHAT_AGENT_PLAN.md` | ^3.2.3 | ^3.3.0 |
| `CHANGELOG.md` | (new entry) | 3.3.0 |

---

## Gaps & Known Issues for 3.3.0

### P0 — Release Blockers

None identified. Build, types, and tests all pass.

### P1 — Should Fix Soon After Release

1. **`as any` count: 205 in production code (down from 240)**
   Fixed: accessor utils (4), PipelineStore config diffing (3), NetworkPipelineConfig internal fields (5), ordinal scene node pulse/transition props (10), network scene node/edge pulse props (13). Remaining hotspots: renderToStaticSVG (43), sankeyLayoutPlugin (27), StreamOrdinalFrame (23 — mostly renderer type widening and hover data fields), StreamGeoFrame (13). The remaining casts are harder to fix without broader refactors (renderer registry type system, hover data augmentation pattern).

2. **Transition exits on `remove()` not animated**
   Items vanish instantly instead of fading out. The machinery exists (`snapshotPositions()`, enter/exit transitions) but `remove()` doesn't call `snapshotPositions()` before buffer changes. Wiring only — estimated 0.5-1 day.

3. **Selection not cleared on `remove()`**
   If the removed item is hovered or selected, interaction state points at a ghost datum. Stale tooltip or highlight. Fix: check removed items against current hover/selection state, call `clearSelection()`/`clearHover()`.

4. ~~**Cross-browser testing**~~ — Firefox + WebKit added to `playwright.config.ts`. CI installs all browsers. Baselines auto-generate on first run.

5. **MCP protocol integration test missing**
   MCP server tested via CLI (`--doctor`) only, not via actual MCP protocol round-trip. If a host sends unexpected format, error handling is untested.

### P1.5 — Minor Test Gaps (RESOLVED)

6. ~~**ObservationStore** — added `ObservationStore.test.ts` (10 tests: push, eviction, clear, in-place mutation)~~

7. ~~**useObservation hook** — added `useObservation.test.tsx` (10 tests: filtering by type/chartId, limit, clear, latest)~~

### P2 — Nice to Have

8. **PipelineStore cache invalidation implicit**
   Stacked area cumulative sums cached by `bufferSize:_ingestVersion`. Color maps rebuild on category set change. No assertion or test verifies cache invalidation triggers. A subtle ingest ordering change could leave stale values.

9. **Network edge ID accessor missing**
   `removeEdge(sourceId, targetId)` requires both endpoints. No `edgeIdAccessor` for named edges. Estimated 0.5 day.

10. **ThemeProvider `useEffect` timing lag**
   CSS variables one render behind on initial mount. Mitigated by inline CSS on wrapper div. Fragile — future rendering order changes could re-expose. Right fix: synchronous resolution via `useSyncExternalStore`.

11. **Canvas theme bridge implicit coupling**
   Canvas renderers read theme values at paint time via `getComputedStyle`. If dirty flag isn't set on theme update, canvas keeps old colors while SVG updates. Currently works because theme change triggers re-render + dirty flag, but the coupling is implicit.

12. **Quadtree for scatter hit testing**
    Linear scan for non-point nodes. 10k line segments = 10k distance calcs per mouse move. O(log n) quadtree for >10k points not yet implemented.

13. ~~**Benchmark regressions**~~ — Now blocking. `scripts/check-bench-regression.js` fails CI on >25% regression vs saved baselines.

14. **Canvas accessibility gap**
    axe-core validates DOM/SVG. Canvas data marks opaque to assistive tech. Keyboard nav exists but screen reader behavior not comprehensively tested. Mitigation: ARIA labels, SVG overlay text, `accessibleTable`.

15. **GIF transition easing is a no-op**
    `transitionFrames` in `generateFrameSVGs` doesn't work because each frame creates a new PipelineStore with no history. Needs incremental ingestion across frames.

### P3 — Future Work (see OUTSTANDING_WORK.md)

- Rounded corners on pie/donut/bars
- Push API undo
- Network edge ID accessor
- Discord/Slack chart agent
- CLI screenshot generator
- OG image HTTP server
- PDF export
- Edge runtime compatibility
- WebGL renderer for >100k points
- Web Worker for force layout
- Accessor type audit (`Accessor<T>` → `ChartAccessor<TDatum, T>`)
- API reference docs (TypeDoc)
- Bundle size profiling + lazy-load statistical overlays

---

## Docs TODO (non-blocking)

- `docs/src/pages/features/AxesPage.js:275` — `// TODO: migrate custom tickFormat to StreamXYFrame API`

---

## Pre-Release Checklist

- [x] Version bumped to 3.3.0
- [x] CHANGELOG.md updated
- [x] TypeScript clean (`tsc --noEmit`)
- [x] All 2770 tests pass
- [x] All 13 bundles build
- [x] MCP server rebuilds
- [x] AI schema version updated
- [x] server.json version updated
- [x] All docs version references updated
- [x] OUTSTANDING_WORK.md done items marked
- [ ] `npm publish` (pending)
- [ ] Git tag `v3.3.0` (pending)

# Outstanding Work

Last updated 2026-05-01.

This file is the active backlog only. Completed work belongs in `CHANGELOG.md`, not here.

## Priority Order

1. Release confidence and documentation correctness.
2. Public API coherence and agent-facing behavior contracts.
3. Rendering/test coverage that catches silent visual regressions.
4. Performance work with clear profiling or scale justification.
5. Product extensions that are useful but not release blockers.

---

## P0 — Architecture & API Coherence

### Isomorphic SSR + Hydration for Interactive Charts (Next.js style)

The current SSR path (`semiotic/server` and the in-frame `isServerEnvironment` branch) emits SVG, but it isn't wired into a hydration boundary — on client mount the canvas pipeline rebuilds the scene from scratch and replaces the server output. There's no rehydration today; consumers either render server-side as static SVG (no interaction) or render client-only.

Real isomorphic charts (server-rendered for SEO + a11y + first-paint, then progressively interactive after hydration) need three pieces:

1. **Hydration-stable first paint.** The first client render must produce byte-identical SVG to the server output, then canvas activates *underneath* without unmounting. Today `<canvas>` exists on client but not server, which trips React's hydration check. Likely shape: dual-layer mode where SVG is the canonical paint surface, canvas overlays on `useEffect` for hit-testing/animation.
2. **Server-safe stores and hooks.** `createStore.tsx` (EventTarget on Node <19), `useResponsiveSize` (ResizeObserver), and the staleness/animation hooks need explicit `typeof window` guards. The `isServerEnvironment` branch in StreamFrames covers paint, but not the surrounding hooks the HOCs call.
3. **Datum identity round-trip.** For hover/click to work after hydration, the server-emitted scene nodes have to be reconstructable on the client — currently rebuilt from scratch on mount, which is fine for paint but means the first interaction has to wait on a full pipeline pass.

**Cheap interim**: `next/dynamic({ ssr: false })` with a `semiotic/server` `renderChart` placeholder. Server emits static SVG, client lazy-mounts the interactive chart on hydration. No rehydration, but no warnings either, and the SEO/a11y/first-paint story works.

**Real fix**: multi-week refactor of the paint pipeline. Main tradeoff is SVG-first hydration is slower for big datasets (canvas wins past ~5k marks) but indexable and a11y-clean. Worth scoping against actual Next.js consumer demand before committing.

Next work:
- Decide on cheap-interim vs. real-fix based on consumer pull.
- If real-fix: prototype the dual-layer SVG-canvas mode on one chart family (likely XY) before generalizing.
- Either way: audit `createStore.tsx` / `useResponsiveSize` / staleness hooks for SSR safety and add `typeof window` guards (cheap, independent of the larger decision).

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

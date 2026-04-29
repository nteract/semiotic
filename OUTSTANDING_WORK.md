# Outstanding Work

Last updated 2026-04-28.

This file is the active backlog only. Completed work belongs in `CHANGELOG.md`, not here.

## Priority Order

1. Release confidence and documentation correctness.
2. Public API coherence and agent-facing behavior contracts.
3. Rendering/test coverage that catches silent visual regressions.
4. Performance work with clear profiling or scale justification.
5. Product extensions that are useful but not release blockers.

---

## P0 — Architecture & API Coherence

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

### `validationMap` Composition

**Likely superseded by the P0 Chart Spec Registry plan** — validationMap becomes a generated file from `chartSpecs.ts`, so hand-rewriting its composition would be wasted effort. Skip this unless the registry plan slips.

For reference: `src/components/charts/shared/validationMap.ts` (951 lines) declares 40+ component specs. Every entry repeats `required: ["data"]`, `dataShape: "array"`, identical `dataAccessors` per family, plus a `commonProps + axisProps` spread. A composition helper (`xyChartBaseSpec`, `ordinalChartBaseSpec`) plus a shared `selectiveProps` bag would save ~210–260 lines, but the registry plan eliminates hand-editing the file entirely.

---

## P1 — Visual & Rendering Coverage

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

# Outstanding Work

Last updated 2026-04-26.

This file is the active backlog only. Completed work belongs in `CHANGELOG.md`, not here.

## Priority Order

1. Release confidence and documentation correctness.
2. Public API coherence and agent-facing behavior contracts.
3. Rendering/test coverage that catches silent visual regressions.
4. Performance work with clear profiling or scale justification.
5. Product extensions that are useful but not release blockers.

---

## P0 — Release Confidence

### API Reference Documentation

Baseline exists: `typedoc.json`, `docs:api:json`, `/api/charts`, and `/api/typedoc`.

Next work:
- Add source-level JSDoc examples to high-traffic HOCs that still rely on schema summaries instead of component comments.
- Decide whether `/api/charts`, `/api/typedoc`, AI schema, and MCP metadata should share one generated chart registry.

### AI Surface Behavior Contracts

Baseline exists: `ai/behaviorContracts.cjs`, `check:ai-contracts`, `semiotic-ai --doctor` behavior-rule output, MCP `semiotic://behavior-contracts`, generated AI docs sections, and scenario tests for color precedence, required prop combinations, and push/ref behavior.

Next work:
- Periodically regenerate examples from runtime fixtures and diff them against `CLAUDE.md`, `docs/public/llms-full.txt`, and MCP guidance.
- Expand the metadata beyond the first critical rules when new semantic contracts prove agent-visible in real usage.

### Test Quality Gate

Several tests still prove mountability rather than correctness.

Next work:
- Flag new tests that assert only existence, for example `.stream-xy-frame` mounted without checking scene output or behavior.
- Convert high-value mount tests into semantic assertions against scene props, rendered canvas/SVG output, or user-visible behavior.
- Prioritize validation-adjacent tests: accepted props should also prove rendered effect.

---

## P1 — Architecture & API Coherence

### HOC To `useChartSetup` Unification

Several HOCs still compose shared hooks manually rather than using `useChartSetup`: LineChart, AreaChart, StackedAreaChart, BubbleChart, QuadrantChart, Heatmap, ConnectedScatterplot, ChoroplethMap, ProportionalSymbolMap, FlowMap, and DistanceCartogram.

Next work:
- Decide whether `useChartSetup` should accept optional inputs for dual-axis, projection, and value-color cases.
- Convert one XY and one Geo HOC first to validate the shape before broad rollout.
- Keep deviations explicit where shared setup would obscure real chart-specific behavior.

### TypeScript Surface Cleanup

`no-explicit-any` remains warning-level debt and should be reduced by modeling real shapes, not by mechanical replacement.

Next work:
- Reduce `any` in highest-leverage hotspots: StreamGeoFrame d3 types, SceneToSVG d3-shape arc invocations, sankey/chord layout boundaries, and test utilities.
- Replace bare `string` or deprecated accessor aliases with `ChartAccessor<TDatum, T>` across HOC props.
- Make `ColorConfig` and `SizeConfig` generic so `colorBy` and `sizeBy` can infer from `keyof TDatum`.

### Consumer Workaround Audit

Known consumers sometimes route around unclear APIs, turning workarounds into accidental public contracts.

Next work:
- Maintain a tracked-consumers list for API-change checks where access allows.
- Audit realtime chart usage for `windowSize={data.length}` or other bounded-mode workarounds.
- Consider first-class bounded mode on realtime HOCs where static-data use is common.

---

## P2 — Visual & Rendering Coverage

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

## P3 — Performance & Scale

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

## P4 — Product Extensions

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

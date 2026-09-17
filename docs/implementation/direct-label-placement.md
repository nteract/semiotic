# P1 implementation and verification

Date: 2026-09-16

Baseline: `120153607470774eb8c899a7f5e12a972315cb42`  
Status: functional implementation verified; phase completion remains open for the sustained-update performance gate.

This records the endpoint-label phase of the locally maintained dbt Charts build plan.
It does not mark the whole P0 prerequisite phase complete.

## Implementation record

Implementation owner role: library/frame maintainer, performed by Codex.

- React and static LineChart preparation now share semantic endpoint selection, including unsorted data, gaps, function accessors, and falsy series names. Push requests expand against the current frame snapshot.
- Push-mode label rails now grow from categories discovered by the frame, including later categories with longer names. Numeric user margins keep precedence; omitted, null, and `"auto"` sides can grow. Static rails use the actual resolved endpoint labels, including nested point-level names.
- LineChart marks and direct labels now share the resolved category scale used by legends, including explicit arrays/maps, themes, and category providers.
- Both renderers call the same pixel-coordinate placement and SVG painter after resolving scales, margins, and dimensions. Invalid/missing projections produce omissions with diagnostics; they do not become zero coordinates.
- The rail uses the existing `placeWithMinGap` primitive, extracted into a separately importable module without changing its recipe API. Its objective is minimum squared vertical movement in anchor order, with measured box heights, a two-pixel gap, and hard rail bounds. Stable IDs break ties. When all labels cannot fit, retain feasible labels in anchor/ID order; every other request has a reason. Displacement counts describe vertical rail movement. Leaders connect moved labels and endpoints distant from the rail.
- Text metrics identify measured versus estimated dimensions. Browser measurement includes the font's ascent/descent as well as glyph ink, matching SVG text boxes. Cache keys include text, family, version, weight, and size; caches are bounded and replaced on font load. Browser measurement and axis inspection load only after mounting an enabled chart.
- `RenderEvidence.layout` adds requested/rendered/displaced/omitted counts, bounded ID samples, findings with remedies, and measurement/assessment coverage. Mark `status: "ok" | "empty"` retains its meaning. Custom annotation rules still run; dropped nodes are reconciled as `RENDER_FAILURE`, and replacement geometry is reported as unsupported/incomplete.
- Generated labels have their own placement pass. Existing authored annotation offsets and the existing `autoPlaceAnnotations` opt-in behavior remain separate.
- Every series and its full endpoint values remain in an accessible series list and the root SVG description, including when every visible label is omitted or `showLegend` is false.
- Browser axis inspection reports post-paint SVG tick-box collisions and overflow. Custom tick foreignObjects are unsupported geometry. Static axis geometry is explicitly not assessed. Assessment uses enclosing rectangles for rotated text.
- ESM builds now shorten private cross-chunk export names while preserving public exports. Disabling function cloning in the shared client group preserves downstream tree shaking. AI-core builds separately from the server renderer to avoid widening renderer chunks with AI contract helpers. All existing bundle budgets now pass; no limits changed.
- Browser SVG/PNG export now selects the accessible foreground SVG, preserving labels when a separate grid SVG precedes it. No public signature or dependency changed.
- PNG/JPEG rasterization and GIF encoding now load behind their existing async export calls. This reduces eager export code without changing the synchronous SVG interfaces or adding dependencies.

## Reproduction and fixtures

[The generated measurement record](direct-label-performance.json) includes exact inputs (defined in the owning script), React/static output coordinates, output sizes, runtime/hardware, and timing distributions. Regenerate after building both worktrees:

```sh
node scripts/measure-direct-labels.mjs /private/tmp/semiotic-p1-baseline > docs/implementation/direct-label-performance.json
```

The old bug reproduced in **both** React SSR and the static renderer. For Series 1 in the six-series fixture, the baseline text y-coordinate was approximately 26.2 at magnitudes `1e-6` and `1`, versus 13.2 at `1e9`. The candidate coordinates agree across all three magnitudes and both renderers. The fixture also demonstrates the old remaining overlap, rather than relying solely on source inspection.

| Fixture / surface | Coverage |
| --- | --- |
| `src/components/text/labelPlacement.test.ts` | Scale invariance; feasible packing; nonlinear/reversed projections; deterministic ties; invalid geometry; capacity; bounded findings; font cache identity |
| `src/components/text/axisLabelAssessment.test.ts` | Axis collision/overflow counts, one-pixel tolerance, unsupported geometry |
| `src/components/server/directLabelLayout.test.tsx` | Actual SVG and evidence counts; React/static parity with estimated and injected measured metrics; custom rule loss; fallback; formatter/offset compatibility; endpoint selection; push snapshot expansion |
| `integration-tests/direct-label-layout.spec.ts` | Actual browser text boxes; numeric magnitudes; resize; font-family changes and font-load invalidation; fixed-domain push updates; default rails at both ends; later longer categories; canvas/label color parity across schemes and providers; omissions; axis collisions; SVG/PNG downloads |
| `/direct-label-examples/` on the integration server | Focused interactive demonstration in `integration-tests/direct-label-examples/` |
| Existing annotation, render-evidence, hydration, and GIF/image tests | Authored annotation behavior; legacy evidence; static/live frame paths; optional export boundaries |

Browser measurements use installed Arial/Courier fonts, compared within each environment. The font-load browser probe is synthetic; it does not establish performance for a delayed network font. Static rendering defaults to estimates and does not claim browser font equivalence. The internal measurement seam permits renderer-owned metrics; this phase adds no mandatory server font engine.

## Verification record

Verification owner role: test/measurement operator, performed by Codex separately from the implementation record above.

Completed successfully:

- Focused Vitest runs, including a combined 10-file/187-test run across layout, axis assessment, LineChart, render evidence, static annotations, direct-frame parity, and hydration; subsequent affected direct-label and image/GIF tests also passed.
- `npx playwright test integration-tests/direct-label-layout.spec.ts`: **15 passed**, across Chromium, Firefox, and WebKit.
- Review follow-up: **95 tests passed** across LineChart, static direct-label layout, hydration, and public-entry intent registries.
- `npx playwright test --config playwright.docs-examples.config.ts integration-tests/docs-examples-direct-labels.spec.ts`: interactive controls and copyable code passed at `/charts/line-chart#direct-label`.
- `npm run typescript` and `node scripts/check-test-types.mjs`: no source or test type errors.
- Targeted ESLint on changed source modules; `npm run check:custom-lints`.
- `npm run check:file-size`: passed, with the existing untouched NetworkPipelineStore ceiling warning.
- `npm run dist:prod`; owning API-snapshot generation and `node scripts/check-api-surface.mjs`.
- `npm run check:pack`: all package exports and temporary-consumer smoke tests passed after retrying the stalled dependency installation with network access.
- `npm run check:chart-specs`: 62-chart schema/validation/metadata round trip passed. No chart prop or serialized config field was added.
- `npm run check:website-build`: passed after rerunning outside the sandbox because the TypeScript generator's local IPC pipe was denied.
- `node scripts/measure-direct-labels.mjs …`: baseline/candidate evidence and timings captured on the same Apple M3 Pro / Node 22.22.1 host.

The six-label static-render fixture measured roughly 0.191 ms baseline versus 0.344 ms candidate at p50; p95 was 0.250 ms versus 0.666 ms. The unlabeled control measured 0.258 ms versus 0.227 ms at p50. These are **observations, not a new adopted performance budget**. They do not substitute for a sustained high-frequency push/resize/font-load workload.

## Related-surface audit

The audit covered high-level LineChart through `semiotic/line`, `semiotic/xy`, the root/AI exports; live SVGOverlay; React SSR; `renderChartWithEvidence`; static annotations; generated API snapshots; existing serialized config schemas; and the shared evidence object returned through server/CLI/MCP rendering. The latter adapters forward the additive evidence field; this phase did not add a second CLI/MCP operation or run the full protocol suite. LineChart/StreamXYFrame was the endpoint-label family with the duplicated raw-value packing defect. Authored annotations remain outside this solver, and unrelated label families are not advertised as assessed.

Additional same-class issues addressed: inconsistent endpoint selection across segments/order, missing push-mode direct labels, insufficient SVG font-box bounds, and post-placement loss through custom rendering. The review follow-up audited default start/end rails, explicit and automatic margins, nested static endpoints, palette arrays/maps, themes, category providers, actual canvas strokes, and exported SVG/PNG. XY, ordinal, network, and geo overlays expose the accessible SVG selected by the exporter; legacy SVGs retain the fallback. Root descriptions preserve identity independently of the visible legend or generated-label nodes.

## Remaining acceptance and release work

P1-01 through P1-08 and P1-10 have the scoped functional evidence above. **P1-09 remains open**: resize/font invalidation and push updates are covered, but no sustained high-frequency performance gate has been adopted and executed for this label path.

`npm run size` now passes both the static-entry graph gate and the representative multi-import consumer gate. The review follow-up restored the unchanged limits:

| Static entry graph | Baseline gzip KiB | Candidate gzip KiB | Limit KiB |
| --- | ---: | ---: | ---: |
| XY | 156.3 | 153.9 | 160.0 |
| Line | 117.3 | 116.4 | 121.0 |
| Server | 241.4 | 240.4 | 242.0 |
| AI | 585.8 | 577.2 | 586.0 |
| Multi-import consumer | 389.3 | 388.4 | 390.0 |

All other measured public entry graphs also pass. The full release suite was not run. P1-09 remains the phase-completion blocker described above.

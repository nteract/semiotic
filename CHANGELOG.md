# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Chart-aware numeric data audit.** `semiotic/ai`, `semiotic/ai/core`,
  `semiotic/utils`, and `semiotic/utils/core` now export `auditData`,
  `formatDataAudit`, `profileNumericFields`, and `toDataAuditNotifications`.
  Serializable `numericContracts` on chart
  capabilities detect non-finite/non-numeric values, zero-span or single-row
  domains, invalid log inputs, negative size geometry, unsafe normalized or
  part-to-whole totals, and scale-dominating outliers with bounded row evidence.
  `diagnoseConfig` inherits the checks, schema-driven docs playgrounds show a
  live Data Truth Lens, and `ChartContainer dataAudit` can surface findings in
  its existing accessible notification bell.

### Changed

- **Frame-batched network ingestion.** Sequential `StreamNetworkFrame.push()`
  calls now share one layout pass per animation frame instead of recomputing the
  whole layout for every edge. `pushMany()` absorbs pending single-push layout
  work into its synchronous batch; reads/mutations flush first, and `clear()`
  cancels uncommitted layout work so imperative semantics stay deterministic.

## [3.8.4] - 2026-07-19

### Added

- **Sequence diagram kit.** `semiotic/recipes` now exports `layoutSequence`
  (linear spines, span-arc packing, shared-edge partition) alongside
  `layoutChipStrip`, `packSpanLevels`, `scaleArcBand`, `spanArcPath`, and
  `partitionSharedEdges` for hand-built sequence and span layouts.
- **Grid observatory recipe + example.** A new "The Grid Is the Real AI
  Infrastructure" example ships with a reusable `gridObservatory` recipe module
  (fuel-stack series, reserve-margin snapshots, threshold bands, and event
  annotations) exported from `semiotic/recipes`.
- **Report-style example.** The Semiotic Standard example gained a
  report-oriented "Plate C" layout demonstrating inline, context, and table
  chart deployments, and the Analyst Adventure example gained a secret-warp
  room and expanded Forecast Vault interaction.
- **Recipe chrome helpers.** `recipeChrome` adds `hullFromBoxes` (and the
  `HullBox` type) for convex-hull enclosures around grouped marks.

### Changed

- **Physics pipeline refactor.** Overflow eviction and quiescence tracking were
  extracted into dedicated modules. Settling now recognizes sustained
  quiescence as `atRest` in addition to full sleep, so simulations settle and
  rerun reliably even when a straggler or tethered body never formally sleeps
  (GaltonBoard with many balls, GauntletChart force-held properties). Gauntlet
  chrome now gates to a compact layout and pop bursts scale with body size.
- **Network scene-rebuild stability.** `StreamNetworkFrame` uses a shared
  `rebuildSceneNow` path that avoids duplicate scene builds during hydration,
  keeps post-layout/ingest scene state current, and syncs hover/particle color
  caches from the authoritative scene fills.
- **Leaner entry graphs.** Brush overlays for MinimapChart and
  ScatterplotMatrix (and the ordinal/XY brush overlays) are now lazy-loaded,
  and a chunk-aware bundle-size gate guards the reduction.
- **SVG serializer split.** Ordinal scene-node SVG rendering moved into
  `SceneToSVGOrdinal` with shared helpers in `sceneToSVGShared`, keeping SSR
  alignment intact under the file-size limits.
- **Small-mode histograms.** Histogram sparkline category padding now defaults
  to 0 for readability at small sizes.
- **Schema/capability metadata.** ProcessSankey, PieChart, and related
  capability and validation metadata were refreshed so suggestions and prop
  validation reflect the current API.

### Fixed

- **SSR/CSR render parity.** `renderChart` and static SVG output now match the
  browser for mixed line+area fills, semantic gradients, line bands, pie/donut
  start angles, swimlane value extents and hatch fills, treemap `colorBy` and
  parent labels, range-mode candlesticks, streamgraph (`baseline="wiggle"`)
  stacked areas, hierarchy and network styling, open-ended band annotations,
  and the LineChart series features (`forecast`, `anomaly`, `directLabel`,
  `gapStrategy`, `showPoints`), Sankey `styleRules`, and top-level
  `autoPlaceAnnotations`. Regressions are guarded by dedicated parity tests.
- **Annotation editorial visibility.** Retracted and superseded annotations are
  now hidden consistently across the client and server render paths.
- **Imperative ref stability.** The shared imperative handle and ordinal
  `replace` support were stabilized across re-renders.

## [3.8.3] - 2026-07-17

### Added

- **Narrative examples.** Added Earthquakes and Europa Languages examples,
  including deterministic data fixtures and example-gallery previews.

### Changed

- **Browser/server rendering alignment.** Browser, static SVG, and MCP render
  paths now share chart-mode defaults, line and geo styling, legend layout,
  temporal histogram configuration, and specialized network, geo, gauge, and
  custom-chart rendering behavior.
- **SSR parity coverage.** Replaced the redundant SSR/CSR screenshot matrix
  with semantic markup and targeted geometry assertions, while retaining the
  dedicated cross-browser visual suite.

### Fixed

- **Docs example route smoke test.** The route contract now targets the
  `ExamplePageLayout` title specifically, and the Earthquakes dashboard uses a
  nested heading level instead of duplicating the page's H1.

## [3.8.2] - 2026-07-16

### Fixed

- **MCP accessibility contract.** Chart schemas, validation, repair guidance,
  accessibility audits, and `getChartSchema` now consistently expose the
  direct `title`, `description`, `summary`, and `accessibleTable` props.
  `improveChart` returns suggested accessibility prose separately with its
  canonical location, while `auditChart` no longer credits unsupported text.
- **Public `getChartSchema` output.** The hosted five-tool profile now declares
  and returns structured results for component lists, component schemas, and
  unknown-component errors, including direct and `ChartContainer` accessibility
  guidance.

## [3.8.1] - 2026-07-15

### Fixed

- **Stateless MCP HTTP rendering.** A normally completed request body no longer
  cancels render work; hosted `createChart` rendering is verified to return
  `status: "render-proven"` with SVG and render evidence.

### Changed

- **MCP HTTP health endpoint.** `GET /health` is the supported health and
  deployment-identity endpoint; the unnecessary `/healthz` alias was removed.
- **Hosted release channels.** Nightly continues to validate `main`; stable
  deployments remain separately release-pinned to the published npm package.

## [3.8.0] - 2026-07-11

### Added

- **`StreamPhysicsFrame` and physics process runtime.** A deterministic,
  streaming physics frame for data stories where motion is the mechanism:
  sampling, lateness, queues, routing, collision, threshold crossing, and
  accumulation. It includes resident worker execution; running/paused/settled
  lifecycle; chart-derived colliders, regions, portals, absorption, forces,
  annotations, selection, observations, semantic interaction, and an imperative
  control surface; optional Matter and Rapier adapters; capacity queues, finite
  service-resource pools, service-level and dependency-gate controllers,
  journey ledgers, reference envelopes, and trace comparison; accessible
  settled projections and tables; deterministic SVG/evidence output and
  server-stepped animated GIF frames; plus EventDrop, Galton board, gauntlet,
  pile, collision, physical-flow, process-flow, and custom physics HOCs.
- **ChartContainer notifications.** New `notifications` prop surfaces
  chart-level notices that have no single mark to anchor to (a data-pitfalls
  or accessibility-audit finding about the whole chart, an unplaceable
  data-quality result) and custom user-authored notes. They collapse into a
  single severity-colored toolbar **bell with a count badge** — the bell
  adopts the icon and color of the most severe visible notice — and clicking
  it opens a **popover** with the dismissible cards, so a notice arriving or
  being dismissed never reflows the chart body. Each `ChartNotification` is
  `{ id?, level?, title?, message, source?, dismissible? }`; levels (`info` |
  `success` | `warning` | `error` | `neutral`) resolve through the theme's
  semantic role CSS variables, a screen-reader-only `aria-live="polite"`
  region announces the current count + most-severe level so notices arriving
  while streaming are still voiced with the popover collapsed, and dismissal
  is tracked internally by `id` with an `onNotificationDismiss` callback for
  host stores/telemetry. Semantic class hooks:
  `semiotic-chart-notifications` (wrapper), `-toggle` (bell), `-badge`,
  `-popover`, and `semiotic-chart-notification` + `--{level}` /
  `-source`/`-title`/`-message`/`-dismiss` (cards). Types exported from
  `semiotic` and `semiotic/ai`; demonstrated on the Chart Container feature
  page and the Chart Clinic example.

- **Worker-based force layout.** ForceDirectedGraph gains `layoutExecution`
  (`"auto"` default | `"worker"` | `"sync"`), `layoutLoadingContent`, and
  `onLayoutStateChange`; in `auto` mode, layouts whose estimated cost
  (`iterations × (nodes + edges)`) exceeds a threshold settle in a short-lived
  module Web Worker and fall back to the synchronous path when workers are
  unavailable. New `forceLayoutAsync()` (Promise sibling of the `forceLayout`
  recipe, identical deterministic output) and `useForceLayout()` (React wrapper;
  SSR and first hydration stay synchronous for markup parity, and settled
  positions are memoized by graph identity + options so remounts don't re-enter
  a loading state). Ships a packaged `forceLayoutWorker.js` asset — CSP
  deployments need `worker-src 'self'`.
- **`x-band` annotation.** Full-height vertical shaded region (`x0`, `x1`,
  `fill`, `fillOpacity`, `label`) for marking eras/phases, rendered by both the
  canvas annotation rules and static SSR output; annotations with a missing
  bound are skipped in both.
- **`intervalLanesLayout` `minBarWidth`** (default 2): zero- and short-duration
  intervals stay visible and hoverable on long domains.
- **Custom-layout readback: `ref.current.getCustomLayout()`.** All four custom
  chart HOCs (XY/Ordinal/Network/Geo) expose the most recent `layout(ctx)`
  result on their ref, beside `getData()`/`getScales()` — hosts that need the
  computed placement (stats readouts, inspectors, validation) no longer re-run
  the layout function themselves. `null` before the first layout or on
  built-in chart types.
- **`unwrapDatum` also unwraps `.datum` nesting** (some interaction payloads
  nest the raw object there rather than under `.data`), and is now documented
  as the single unwrap path for both `onObservation` and
  `frameProps.tooltipContent` values.

### Changed

- **Force layout model overhauled** (degree-aware charge, degree-normalized link
  strength, radius-aware collision, weaker centering; the `forceLayout` recipe is
  now backed by d3-force). Layouts settle to better-spread positions, but the
  same seed produces *different* geometry than earlier 3.x betas — regenerate
  position-pinned snapshots. `forceStrength` documentation was corrected to its
  actual link-attraction semantics, and its response curve changed with the new
  model, so hand-tuned values may need revisiting.
- **`intervalLanesLayout` packs in rendered-pixel space**, so the `minBarWidth`
  floor and inclusive `end + unit` extension can no longer overlap a same-track
  neighbor (previously visible as darker doubled fills when one interval ended
  the same unit the next began).
- **DataPitfalls and GoFish adapters remain experimental.** The DataPitfalls
  bridge is exposed from `semiotic/experimental` as
  `unstable_toDataPitfallsChain` / `unstable_buildDataPitfallsBridge`, with
  return-path helpers for DataPitfalls PR #35 reports:
  `unstable_toDataPitfallsNotifications` for chart-level findings and
  `unstable_toDataPitfallsAnnotations` for host-anchored Semiotic v3
  annotations. The GoFish DisplayList adapter remains `unstable_fromGofishIR`
  on the same endpoint. Neither adapter is part of the stable API surface yet.
- **Force layout worker session.** `runForceLayoutWorker` reuses a long-lived
  `ForceLayoutWorkerSession` (request IDs, no spawn/terminate per layout),
  matching the physics worker lifecycle. Abort cancels the pending request
  without killing the shared worker.
- **Growing-window default cap.** `windowMode: "growing"` now defaults
  `maxCapacity` to **100_000** (was 1_000_000). Dev builds log a one-time
  warning when the buffer first crosses 50_000 points.
- **`world-atlas` is an optional peer.** Built-in reference geographies still
  work when the package is installed; consumers who never call
  `resolveReferenceGeography` no longer take it as a hard dependency.
  (Still a devDependency for tests/docs.)
- **Library build target** raised from `es2015` to **`es2020`**.
- **CI:** full gate suite runs once on Node 22; other engines run a smoke
  matrix (install, dist, vitest, typecheck).
- **size-limit** budgets added for `physics`, `server`, `ai`, `recipes`,
  `utils`, and `value` entry points.
- **Stream frames memoized:** `StreamXYFrame`, `StreamOrdinalFrame`,
  `StreamNetworkFrame`, `StreamGeoFrame`, and `StreamPhysicsFrame` are
  `React.memo`-wrapped so parent re-renders with stable props skip the
  frame body.
- **Interaction canvas idle skip** on XY and Geo (one clear when hover ends).
- **Shared `frameThemeColors`** module for version-cached theme/background
  resolution (StreamXYFrame uses it; other frames can adopt the same helper).
- **`RingBuffer.resize`** uses `slice` for shrink (avoids O(n²) `shift` loops
  when a growing window hits its cap).
- **`pipelineIdentityOps`** shared helpers for id-keyed remove/update paths.
- **Shared `paintCanvasBackground`** helper used by XY / Ordinal / Network / Geo
  frames (CSS-var-safe fill, transparent + backgroundGraphics opt-outs).
- **Network dirty-canvas path:** full clear/redraw only when data, transition,
  particles, encodings, or continuous animation need it — annotation-only rAF
  retries no longer thrash the data canvas.
- **Root entry diet:** physics HOCs (`GaltonBoardChart`, `GauntletChart`,
  `PhysicsPileChart`, etc.) are **no longer exported from `semiotic`**. Import
  from `semiotic/physics` (or `semiotic/ai` for tooling). Measured full
  package entry ~233 KB gz (was ~296 KB gz).
- **XY decay/pulse** share a version-cached datum→index map
  (`buildDatumIndexMap`) so continuous frames do not rebuild the map twice.
- **Geo dirty-canvas path:** hover-only repaints skip the data canvas and
  only update the interaction layer.
- **Shared `paintNeeds` helpers** (`needsDataCanvasPaint` /
  `needsInteractionCanvasPaint`) used by Network/Geo/XY paint gates.
- **Test typecheck is clean:** baseline emptied (**~228 → 0** known errors).
  Cleared keyboardNav (82), ordinalSceneBuilders (45), recipes, heatmap,
  hydration suites, networkColoring, and the remaining debt files.

### Deprecated

- **`GuantletChart`** typo alias of `GauntletChart` — use `GauntletChart`.
  Removal planned for the next major.

### Docs

- `CONTRIBUTING.md` / `DEVELOPMENT.md` updated for the tsup + Vite toolchain
  (removed stale Rollup/Parcel/`src/processing` guidance).

## [3.7.5] - 2026-06-24

### Fixed

- **ForceDirectedGraph edge width now honors a weight field.** A string `edgeWidth`
  accessor (e.g. `edgeWidth="weight"`) read the property off the `RealtimeEdge`
  wrapper instead of the underlying edge data, so every edge silently fell back to
  width 1. Field and function `edgeWidth` accessors now resolve against the raw edge
  (mirroring node styling), and the `semiotic/server` `renderChart` path gained the
  same `edgeWidth`/`edgeColor`/`edgeOpacity` handling for SSR parity.
- **Crowded bar-chart category labels no longer overlap.** Ordinal category axes
  (BarChart and siblings) now thin their tick labels to an evenly-spaced subset when
  too many bins crowd the axis — the classic temporal-histogram case. Charts with few
  enough categories to fit are unchanged.
- **Custom-layout overlays no longer drift on the first responsive resize.** XY custom
  layouts (`XYCustomChart`, GoFish recipes) skipped the layout re-run on a
  dimension-only change and took `computeScene`'s fast coordinate-remap path, which
  rescales canvas scene nodes but never regenerates the SVG overlays — so glyph chrome
  (e.g. the GoFish flower petals) stayed at the pre-measurement width and sat offset
  from their scene nodes until any other change forced a rebuild. Custom layouts now
  always re-run on a size change, keeping overlays and scene nodes aligned.

### Changed

- **BarChart suggestion caveat for temporal categories.** When a BarChart's category
  axis holds time-bin labels (month/weekday names, `YYYY-MM`, `Q3`, `Week 12`, or a
  temporal field name), `suggestCharts` now surfaces a caveat pointing toward a
  time-aware treatment (real dates + LineChart/AreaChart, or a temporal histogram for
  streaming counts).

## [3.7.4] - 2026-06-15

### Added

- **Lineage DAG recipe helpers.** `semiotic/recipes` now exports lineage DAG helpers for
  data-flow and KStreams-style network layouts, with tests covering stable topology layout.
- **KStreams docs demo.** The docs add a KStreams recipe page and example data,
  plus expanded custom network chart guidance for selection-aware layouts.

### Fixed

- **Network custom layout selection metadata.** Network custom layouts now preserve selection
  metadata through pipeline layout and render paths, with regression coverage for selection
  actions and `NetworkCustomChart` behavior.

### Changed

- Refreshed developer/dependency tooling, including Prettier, TypeScript ESLint, Rollup, and Sharp.

## [3.7.3] - 2026-06-13

### Added

- **OpenAI Apps domain verification for hosted MCP.** HTTP mode now serves the raw
  `OPENAI_APPS_CHALLENGE_TOKEN` from `/.well-known/openai-apps-challenge`, allowing
  ChatGPT Apps domain verification against Cloud Run and other HTTPS-hosted MCP origins without
  committing the token.
- **Cloud Run verification playbook.** `deploy/cloud-run` documents the Challenge Base URL shape,
  token environment variable, and `curl` check for ChatGPT Apps verification, and the wrapper now
  tracks the `semiotic@^3.7.3` release line.

### Tests

- Added MCP HTTP regression coverage for the OpenAI Apps challenge route while confirming the
  unauthenticated OAuth protected-resource probe continues to return 404.

## [3.7.2] - 2026-06-12

### Added

- **Stateless MCP HTTP mode for hosted connectors.** `semiotic-mcp --http` now creates an
  ephemeral MCP server + Streamable HTTP transport per request, returns JSON responses instead of
  holding long-lived SSE streams open, and exposes `/mcp`, `/healthz`, and `/health` endpoints. This
  makes the read-only MCP tool surface suitable for autoscaling serverless hosts such as Cloud Run.
- **Cloud Run deployment wrapper.** `deploy/cloud-run` packages a minimal public MCP deployment that
  runs the published `semiotic-mcp` binary, documents unauthenticated read-only deployment, health
  endpoints, host allowlisting, and ChatGPT/Claude connector setup, and includes hosted-app privacy
  and terms pages for app review.

### Changed

- **MCP HTTP hardening.** HTTP mode normalizes the `Host` header for optional
  `MCP_ALLOWED_HOSTS` DNS-rebinding protection, returns clean 404s for non-MCP paths including
  `.well-known/*` probes, makes request teardown idempotent, and closes each per-request transport
  promptly to avoid serverless keep-alive leaks.
- **Docs dark-mode polish.** The visible `AccessibleNavTree` selected row now resolves through
  `--semiotic-surface`, `--semiotic-grid`, and `--semiotic-bg`, with `--semiotic-text` applied to
  visible rows. The Accessibility / Structured Navigation bidirectional BarChart now mirrors the
  docs theme by switching between `carbon` and `carbon-dark`.
- **Annotation blog demo reliability.** The "Annotations That Get Contested, and Heard" chart now
  uses numeric XY coordinates with month tick formatting, so editorial-status callouts render on the
  visible line while the prose and navigation tree keep human-readable month labels.
- **Cloud Run wrapper release line.** The Cloud Run package now depends on `semiotic@^3.7.2` so the
  hosted wrapper resolves the 3.7.2 MCP server after the npm package is published.

### Fixed

- Fixed a light selected-row fallback in the accessible navigation tree when the docs site was in
  dark mode but no `--semiotic-surface` token was present.
- Fixed the bidirectional sync demo's BarChart rendering as a light Carbon island inside dark docs.
- Fixed missing visual annotations in the contested-annotations blog demo caused by string month
  values being used as XY coordinates.

## [3.7.1] - 2026-06-11

### Added

- **Render evidence.** `renderChartWithEvidence()` (`semiotic/server`) returns the SVG plus a
  machine-readable `RenderEvidence` object computed from the rendered scene graph — mark counts by
  scene type, resolved axis domains, an `empty` flag, category/node/edge counts, annotation count,
  and the accessible name — so agent repair loops and CI assertions can verify a chart actually drew
  data marks without pixel inspection. The MCP `renderChart` tool now returns the same evidence block
  alongside its SVG/PNG output.
- **Misleading-design diagnostics.** `diagnoseConfig()` gains a deception-check pack: inverted
  extents (`INVERTED_AXIS`), unlabeled dual-axis series (`DUAL_AXIS_UNLABELED`), trend windows
  cropped to a favorable slice (`CHERRY_PICKED_WINDOW`), negative values in part-to-whole encodings
  (`PART_TO_WHOLE_NEGATIVE` — an error for pie/donut/funnel), non-interpolating `curve="basis"`
  smoothing (`NON_PASSING_CURVE`), slope-distorting aspect ratios (`EXTREME_ASPECT_RATIO`), and
  over-sliced pies (`PIE_TOO_MANY_SLICES`). These patterns mislead human readers and — per the
  chart-deception literature — vision-language models the same way.
- **Theme contrast conformance gate.** Every shipped theme preset is now tested against WCAG-derived
  floors (4.5:1 for text/tooltip/annotation roles, 3:1 for the focus indicator), with sub-3:1 mark
  colors pinned in an exact-match known-exceptions ledger so palette regressions fail and
  improvements must shrink the ledger. The axe integration scan re-enables the `color-contrast`
  rule on the strength of the gate.
- **Scorecard top-1 agreement.** The capability quality scorecard now reports strict
  `top1AgreementRate` beside the lenient top-3 rate (current canonical set: 93% top-1 / 100% top-3),
  ranks the top-3 over *distinct components* rather than variants of one chart, and gains fixtures
  for the previously unexercised Heatmap, GaugeChart, FlowMap, and DistanceCartogram descriptors.
- **ChatGPT Apps widget (experimental).** The MCP server gains `renderInteractiveChart`, which
  renders a static-data chart through the same server render path as `renderChart` and returns a
  `text/html;profile=mcp-app` widget (`ui://semiotic/chart-widget.html`) with fit/zoom, data,
  hover, and render-evidence controls for ChatGPT developer-mode connectors over
  `semiotic-mcp --http`. A deployment playbook lives in the repo as `CHATGPT_APPS_DEPLOYMENT.md`,
  and an MCP protocol test suite covers the tool and widget resource end to end.
- **Docs prerender route artifacts.** The docs build now emits one prerendered HTML file per
  route with sanitized, route-specific machine-readable content in each page's `<noscript>`
  fallback, plus a `docs/build/llms-routes.json` route index for agent readers; the docs route
  check verifies the output.

### Changed

- **Theme legibility fixes (WCAG AA).** `pastels` `textSecondary`/`focus`/`annotation`, `bi-tool`
  `textSecondary`, and the `tufte-dark`/`journalist`/`playful` `annotation` colors were deepened to
  clear the contrast floors; the empty-state / BigNumber-empty / data-table-caption fallback color
  moved from `#999` (2.8:1) to `#666`, matching the default theme's `textSecondary`.
- **Capability descriptor judgment fixes.** `DifferenceChart` no longer takes full `compare-series`
  marks when it would silently drop series beyond its native two; flat `BarChart` yields on crossed
  two-categorical matrices (Grouped/Stacked/Heatmap show the matrix) and on raw-observation data;
  `ChoroplethMap` requires at least two area features (a one-region choropleth has nothing to
  compare).
- `contrastRatio()` now parses 3-digit hex shorthand (`#333`), making the default themes measurable.

### Tests

- Colocated tests for the `NetworkCustomChart` and `OrdinalCustomChart` escape hatches (the
  XY variant was already covered).

## [3.7.0] - 2026-06-07

### Added

- **Accessibility audit, descriptions, and structured reader navigation.** `auditAccessibility()` /
  `formatAccessibilityAudit()` grade chart configs against Chartability-style heuristics, while
  `describeChart()`, `buildNavigationTree()`, `AccessibleNavTree`, and `useNavigationSync()` provide
  layered chart descriptions, WAI-ARIA tree navigation, bidirectional tree/canvas focus sync, and
  annotation-anchor focus for non-visual readers.
- **IDID reader-grounding and receivability primitives.** `describeChart()` can emit an optional L4
  communicative-act sentence from a chart capability, `buildReaderGrounding()` combines description,
  intent, and structure into one agent-readable payload, `AudienceProfile.receptionModality` lets
  `suggestCharts()` penalize charts a non-visual audience cannot receive, and
  `accessibilityCaveats()` feeds audit warnings into recommendation caveats.
- **Conversation-arc telemetry.** `enableConversationArc()`, `disableConversationArc()`,
  `getConversationArcStore()`, `useConversationArc()`, and `summarizeArc()` expose a bounded,
  opt-in event stream for suggestion, interrogation, navigation, export, and annotation-status
  events, with zero overhead while disabled. `registerConversationArcSink()`,
  `createLocalStorageConversationArcSink()`, `createIndexedDBConversationArcSink()`,
  `createWebhookConversationArcSink()`, `loadConversationArc()`, and `replayConversationArc()` add
  opt-in durable capture and replay hydration without duplicating sink or analytics events.
- **Variant-discovery API and MCP tool.** `proposeVariant()` emits registered variants,
  conservative heuristic transforms, and same-intent cross-family alternatives;
  `evaluateVariantProposal()` scores fit, novelty, risk, rubric deltas, and audience bias; and
  MCP now exposes `proposeChartVariants` for agent-driven variant exploration.
- **Chart repair workflow primitive.** `repairChartConfig()` and the MCP `repairChartConfig` tool
  use capability fit and chart suggestions to critique a proposed chart choice and return safer
  alternatives for agent retry loops.
- **`semiotic/value` and `BigNumber`.** A focal-value KPI component now ships as a lightweight value
  entry point, with formatting, threshold, comparison/target, staleness, push-buffer, and slot APIs
  for embedding trend or chart context.
- **First-class annotation design assistance for 3.7.0.** `autoPlaceAnnotations` now composes collision-aware placement, curved connector routing, density budgets, progressive disclosure, responsive shedding, redundant association cues, cohesion modes, audience-aware amount, and defensive annotations. Per-annotation `emphasis` establishes hierarchy, while provenance confidence supplies a default reading order when hierarchy is not explicit.
- **Annotation provenance and editorial lifecycle.** `AnnotationProvenance` and `AnnotationLifecycle` carry actor, evidence, confidence, stable identity, freshness, editorial status, and supersession metadata. `applyAnnotationLifecycle`, `applyAnnotationStatus`, and `filterAnnotationsByStatus` keep visual treatment, descriptions, and structured navigation aligned on the current annotation set.
- **Stable semantic annotation anchors.** `anchor: "semantic"` / `lifecycle.anchor: "semantic"` now re-resolves annotations through `provenance.stableId` after data refresh, using point scene nodes or matching data rows before falling back to the recorded coordinate when the target is gone.
- **Annotation reception surfaces.** `describeChart` leads with author-marked features, `buildNavigationTree` adds an Annotations branch, and the accessibility audit checks color-only note-to-target association.
- **Annotation connector diagnostics.** `diagnoseConfig()` now warns about far notes without a
  connector and very long connectors, keeping placement guidance aligned with the annotation design
  assistant.
- **Annotation design guidance docs.** The first-class Annotations docs section now includes Overview, Design Guidance, Advanced Annotations, and Provenance & Lifecycle pages with live examples.
- **Linked-hover series mode.** `linkedHover={{ mode: "series" }}` now resolves each chart's
  series-identity field automatically, with `seriesField` available as an override for cross-chart
  series highlighting.
- **Capability-driven visual baseline gate.** `check:visual-baseline-capabilities` derives SSR and
  linked-hover visual coverage requirements from `chartSpecs.ts`, verifies the current Playwright
  evidence, and keeps the remaining SSR/CSR parity and linked-hover interaction snapshots in
  one-way burn-down maps. It is wired into CI, `release:check`, and `prepublishOnly`.
- **Shareable, restorable docs playgrounds.** Every `/playground/*` page now
  serializes its knob + dataset state into the URL (`?sc=…&ds=…`) and restores it
  on load, with "Copy link" and "Copy config (JSON)" affordances. The round-trip
  dogfoods the library's own `toConfig` / `toURL` / `fromURL` / `fromConfig` /
  `copyConfig` so a playground configuration becomes a portable, inspectable
  `ChartConfig` artifact; non-serializable composite playgrounds degrade
  gracefully (no toolbar, no URL writes).
- **Faithful "Copy" in docs live examples.** The code a docs `LiveExample` copies to the clipboard
  now serializes the real props the chart rendered with, instead of the trimmed/elided display stub —
  so copied example code reproduces the example rather than referencing undefined or shortened values.
  Display stays readable; copy is runnable. The pure code-generation moved to a React-free
  `codegen` module.
- **Generated, complete `llms.txt`.** `docs:llms` (`scripts/generate-llms-txt.mjs`) regenerates the
  root `llms.txt` retrieval index with the full chart catalog derived from `chartSpecs` (grouped by
  family, every charted component), each entry tagged with its communicative act
  (`resolveCommunicativeAct`) so an agent reader gets what a chart is *for*, not just what it shows.
  Replaces the previously hand-maintained (and stale) index; kept fresh by the `check:llms` gate in CI
  and `release:check`, and regenerated during `website:build`.
- **Docs: per-chart "At a glance" grounding panel.** A reusable `ChartGrounding` component renders,
  live for each chart, the communicative act it performs (`buildReaderGrounding`), a layered L1–L3
  description (`describeChart`), the chart type's reader caveats, and an accessibility badge
  (`auditAccessibility` — hovering the badge lists the specific findings; clicking opens the full
  audit) — the reader/agent grounding for the chart, computed from the shipped intelligence APIs so it
  can't drift. Now on all 39 static chart pages (props centralized in a reviewed fixtures map;
  realtime/push-only charts are exempt), and enforced by `check:docs-coverage`.
- **Docs: "Reshape to unlock" generative suggestions.** The `/choose` picker now goes beyond charts the
  data already fits: from a flat table's field profile it proposes the *transform* that unlocks
  Semiotic's distinctive charts — pivot two columns into a **Sankey**, stamp an event log with time for
  a **ProcessSankey**, nest categories into a **Treemap**, etc. — each with the reshape and why that
  chart is worth it. Surfaces the flow/temporal/hierarchy/geo charts that a fit-only recommender can
  never reach. Driven by a pure `suggestReshapes(profile)` heuristic.
- **Docs: "Choose a Chart" front door.** A new top-level `/choose` page profiles a dataset and ranks
  the catalog by fit and communicative act (live `suggestCharts`), showing each recommendation's score,
  reasons, and caveats with links to the chart pages. An audience selector demonstrates how the ranking
  shifts per reader — with the biasing familiarity/targets and their rationale shown — and surfaces
  governed stretch picks. Users can arrive with data and intent instead of a component name.
- **Docs: a11y hooks & theming serialization.** The Accessibility docs now cover the preference hooks
  `useReducedMotion` / `useHighContrast` and the `useNavigationSync` tree↔canvas sync hook; the Theming
  docs now cover `resolveThemePreset`, `themeToCSS`, `themeToTokens`, and building custom theme objects.
  Custom Charts cross-links the related Cookbook recipes.
- **Docs: AI authoring & tooling pages.** The Intelligence docs section gains four pages closing the
  previously-undocumented AI surface: **CLI & MCP** (every `npx semiotic-ai` flag and every
  `npx semiotic-mcp` tool, with agent setup), **Variant Discovery & Repair** (`proposeVariant`,
  `evaluateVariantProposal`, `registerVariantDiscovery`, `repairChartConfig`), **Capability Authoring**
  (the `ChartCapability` descriptor, `registerChartCapability`, `registerIntent`, and the intent
  taxonomy), and **Audience Profiles** (the `AudienceProfile` shape, suggestion bias, stretch picks,
  reception modality, and governance).
- **Playground control-drift gate.** `check:docs-playground-controls` checks each playground's
  `select` knobs against `chartSpecs.ts`: a knob bound to an enum-typed prop can no longer offer an
  option the chart doesn't accept. It only gates enum-typed props (and treats `mapProps`-transformed
  pages as informational), so an enum member renamed in the API now fails the build instead of
  leaving a dead knob. Wired into CI, `release:check`, and `prepublishOnly`.
- **Prop-table drift gate.** `check:docs-prop-tables` resolves each chart's prop surface from
  `chartSpecs.ts` (`ownProps` over resolved `PROP_BAGS`) and AST-checks every chart page's
  documented prop names against it, failing if a statically-required prop is undocumented. It keeps
  the hand-authored tables (and their curation) verifiable against the canonical registry rather than
  replacing them; `--verbose` reports props documented but absent from `chartSpecs` as a follow-up
  backlog. Wired into CI, `release:check`, and `prepublishOnly`.
- **Docs coverage gate + per-page quality bar.** `check:docs-coverage` derives the required
  chart-page set from `chartSpecs.ts` and verifies every chart page renders the standard contract
  (`ComponentMeta`, a prop table, and an interactive example), with one-way burn-down maps for the
  three charts documented elsewhere. Wired into CI, `release:check`, and `prepublishOnly`. The
  previously-inconsistent `ConnectedScatterplot`, `DifferenceChart`, `LikertChart`, `OrbitDiagram`,
  `BigNumber`, and `ProcessSankey` pages were backfilled to meet the bar.
- **Expanded SSR/CSR visual parity matrix.** Shared Playwright fixtures now cover the high-risk
  SSR paths for `DifferenceChart`, `Heatmap`, `QuadrantChart`, geo maps, and statistical ordinal
  charts, plus frame background/foreground graphics, a dark-theme SSR case, annotation callouts,
  progressive disclosure, lifecycle/status styling, geo annotations, and a network widget
  annotation browser fixture. The `supportsSSR` burn-down drops from 29 to 17 entries.

### Changed

- **Default tick/axis font size raised from 10px to 12px** across every shipped theme, the runtime
  light/dark/high-contrast defaults, and the SVG-overlay CSS-var fallbacks, so axis text clears
  Chartability's 9pt/12px legibility floor out of the box. `auditAccessibility`'s
  `perceivable.small-text` heuristic now reports `pass` on the defaults instead of warning, and the
  `ChartGrounding` docs badge leads with the verdict ("Passes a11y · N advisories") with the specific
  findings surfaced on hover. Override per chart via `theme.typography.tickSize` or the
  `--semiotic-tick-font-size` CSS variable.
- Annotation note-type semantics are centralized so layout, density, diagnostics, and accessibility checks agree on what counts as a note and which notes draw connectors.
- Static SVG annotation rendering now uses the shared note renderer for labels and callouts, including `callout-circle` and `callout-rect`.
- React hooks linting now enforces `react-hooks/rules-of-hooks`, with exhaustive-deps staged as a
  warning while legacy dependency sites are burned down.
- `check:capabilities` now rejects `serverChartConfigs.ts` entries that are absent from
  `chartSpecs.ts`, with an explicit server-only exception for `Sparkline`.

### Fixed

- Hook-order regressions across loading/empty/data transitions were fixed across the HOC catalog,
  including the remaining Minimap validation early-return path, so charts no longer trip React's
  "Rendered more hooks than during the previous render" failure when async data arrives.
- **Animated network charts (OrbitDiagram and other hierarchy layouts) no longer crash the tab when
  given unmemoized function props.** The hierarchy-ingest effect in `StreamNetworkFrame` no longer
  re-runs on pipeline-config identity changes — so a parent passing fresh inline-arrow callbacks
  (`nodeStyle`, `revolution`, …) on each render no longer re-ingests data and fires a `setState` per
  render, which previously compounded with the continuous animation frame loop until React's
  max-update-depth guard tripped and the page ran out of memory. Config/style changes are still
  applied (via the dedicated `updateConfig` effect), and data/dimension changes still re-ingest.
- `callout-circle` and `callout-rect` are now handled by the default annotation rules instead of being documented but silently skipped.
- Label and callout rules now pass connector disable, opacity, and stroke-dasharray metadata through to the annotation renderer, allowing lifecycle and editorial status treatments to render as documented.
- Value-anchored annotations now have explicit regression coverage for sort, filter, and rescale
  reflow so labels stay bound to their data values rather than incidental array positions.
- Progressive disclosure now reveals deferred annotations in geo frames and correctly hides/reveals network HTML widget annotations.
- Colored statistical overlays are no longer misclassified as color-only annotation-to-target correspondence failures.
- Variant discovery now mirrors `suggestCharts` for non-visual audiences: `evaluateVariantProposal`
  audits a proposal's props and folds the receivability penalty into its fit, so
  `proposeChartVariants` no longer ranks variants that can't be received via the declared modality.
- The "horizontal ranked view" variant heuristic is restricted to categorical charts that actually
  expose `orientation` + `sort` (`BarChart`, `GroupedBarChart`, `StackedBarChart`, `DotPlot`),
  preventing unsupported prop leakage onto Pie/Donut/Gauge/Likert/Swimlane.
- The MCP `proposeChartVariants` tool strips the non-serializable `buildProps` function from each
  proposal in `structuredContent`, keeping the JSON output transport-safe while preserving the
  computed `props`.

## [3.6.0] - 2026-05-31

### Added

- **`semiotic/ai` subpath — the AI-facing API surface as a first-class entry point.** 211 KB gzip; the heuristic engine works without any LLM call, but every primitive returns LLM-friendly structured context so a model can ride on top. The entry covers four families of capability:
  - **Recommendation.** `suggestCharts(data, options?)` returns ranked chart suggestions for a profiled dataset and optional intent; each suggestion carries a runnable `props` object, an intent-score breakdown, the chart's rubric (familiarity / accuracy / precision), human-readable `reasons[]`, and `caveats[]`. `suggestDashboard` returns a multi-panel composite covering distinct analytical intents (with `intentsMissing` for honesty about what the data can't show). `suggestStretchCharts` returns the literacy-growth surface — charts the audience is unfamiliar with but the data actually supports. `scoreChart` and `explainCapabilityFit` give single-chart introspection. `useChartSuggestions` is the React hook wrapping the same engine for live UI.
  - **Profiling.** `profileData(data)` returns a `ChartDataProfile` with candidate fields per role (x / y / size / category / series / time), distinct counts, monotonicity, structure detection (hierarchy / network / geo). `diffProfile` reports schema changes between two profiles. `inferIntent` is a zero-dependency regex classifier that maps natural-language phrases (`"why is X different?"`, `"compare these"`, `"trend over time"`) to one of 13 built-in intents.
  - **Audience calibration.** `AudienceProfile` is a serializable per-organization config — `familiarity` (chart → 1-5 number map) and `targets` (chart → `{direction: "increase" | "decrease", weight, reason}`) — that biases recommendations toward what a specific audience already knows AND toward charts the organization is trying to grow into. Three built-in personas (`executivePersona`, `analystPersona`, `dataScientistPersona`) ship as starting points; bias is meaningful (target weight 2 = ±2.0 on a 5-point composite score) and visible (the audience's verbatim rationale string lands on `reasons[]` so the policy is auditable in the UI).
  - **Capability descriptors per chart.** Every chart now ships a `<ChartName>.capability.ts` next to its TSX, declaring `family`, `rubric`, `fits(profile) → reason | null`, `intentScores`, optional `variants`, `caveats`, and `buildProps`. The registry is runtime-extensible via `registerChartCapability` / `unregisterChartCapability` so consumers can add their own charts to the recommendation pool without forking the engine.
  - 13 built-in intents in `intents.ts`: `trend`, `compare-series`, `compare-categories`, `rank`, `part-to-whole`, `distribution`, `correlation`, `flow`, `hierarchy`, `geo`, `outlier-detection`, `composition-over-time`, `change-detection`. Each carries a descriptor with synonyms, alias phrases, and a default scorer; `registerIntent` extends the taxonomy at runtime.
- **`useChartInterrogation` and `useChartFocus` hooks (`semiotic/ai`)** — the headless conversational primitives. `useChartInterrogation` gives consumers a `{ ask, history, summary, annotations, loading, error, reset }` surface; the consumer brings their own LLM via `onQuery`, and the hook supplies it with the profiled summary, the suggestion list, and the current focus datum as structured context. Returned annotations route directly to the chart's standard `annotations` prop so the AI's response can render as callouts, threshold lines, and bands, not just text. `useChartFocus` subscribes to the chart's observation store and returns the current point-of-focus (`{ datum, x, y, source }`), with configurable event-type filtering for sticky-focus UIs.
- **`semiotic-mcp` server** — Model Context Protocol server (`npx semiotic-mcp`) exposing `renderChart`, `interrogateChart`, `suggestCharts`, and `diagnoseConfig` as MCP tools so agents inside Claude Code, Cursor, Windsurf, and other MCP-aware environments can drive Semiotic directly. The interrogation tool returns the same statistical summary and AI-facing instructions the hook produces; the suggestion tool returns ranked structured content with runnable props.
- **`semiotic-ai` CLI extensions** — `--doctor` validates a `{component, props, data}` JSON spec against `validateProps` + `diagnoseConfig`; `--schema` emits the chart-schema JSON; `--compact` and `--examples` produce LLM-prompt-sized context. Pair with the MCP server for agent workflows that need both schema and validation in one place.
- **Three case-study blog posts** — `/blog/charts-that-know-what-theyre-for` (the recommendation engine and audience layer), `/blog/anchored-conversations` (point-anchored AI conversation via `useChartFocus` + `useChartInterrogation`), and `/blog/live-conversational-dashboard` (the streaming + interrogation + annotation composition). The three together describe the product surface 3.6.0 makes possible.

### Changed

- **AreaChart is now a single-series chart.** Multi-series area overlays are an occlusion nightmare; the capability rejects the multi-series intent scores it previously claimed and `buildProps` subselects to the leading series (largest cumulative y) when the input has 2+ groups, surfacing a `caveats[]` line so the reader knows they're looking at one slice. Gradient (`gradientFill: true`, `areaOpacity: 0.55`) is the baseline default. `trend` score is 5 for clean single-series and 3 when subselected. `LineChart.trend` yields to AreaChart on single-series (4 vs AreaChart's 5) but still wins on multi-series (5 vs AreaChart's 3) because LineChart shows the whole dataset.
- **DifferenceChart accepts 2+ series via top-2 subselection.** Previously rejected anything other than `seriesCount === 2`; now picks the two series with the highest cumulative y from the input and emits a `caveats[]` line when subselecting from 3+ series. Same ordered-x guard the other time-series capabilities apply (`xProvenance === "scatter" && !monotonicX` is rejected) so the chart no longer shows up for scatter-shaped data with two categorical groups.
- **Scatterplot and ConnectedScatterplot prefer the canonical 2-numeric form when a sequence axis is present.** With a strong-x (time or named) AND 2+ other numerics in the dataset, both charts plot the two numerics against each other (revenue × profit) instead of recapitulating a line chart on the sequence axis. ConnectedScatterplot threads the sequence as `orderAccessor` so the path encodes temporal progression. ConnectedScatterplot's `correlation` intent scores 5 when canonical (vs 4 otherwise), and Scatterplot's `correlation` steps back to 4 when canonical is available so ConnectedScatterplot wins the tiebreak — both charts fit, but the one with the temporal annotation is strictly more informative.
- **`X_FIELD_HINT` recognizes calendar-segment field names.** The profiler's x-axis name regex now matches `quarter`, `qtr`, `fiscal`, and `week` in addition to the existing `year` / `month` / `day` / `date` / `time` / `timestamp`. Without this, data shaped as `{quarter, revenue, region}` fell into scatter-fallback provenance and series detection never fired — `lineBy` / `areaBy` were silently dropped and multi-series time-series charts zigzagged across regions.

## [3.5.4] - 2026-05-21

### Added

- **`band` prop on `LineChart` and `AreaChart` (and `StreamXYFrame`)** — asymmetric min/max envelope drawn under the lines/areas, driven by independent `y0Accessor` / `y1Accessor`. Distinct from the existing `boundsAccessor` (symmetric ±offset) and from `AreaChart.y0Accessor` (which replaces the area baseline). Pass a single `BandConfig` or an array of them for percentile fans (e.g. p25/p75 stacked on top of p10/p90). Per-series by default — one ribbon per `lineBy` / `colorBy` group, colored from the parent line at 0.2 fillOpacity. Pass `perSeries: false` for an aggregate min/max envelope across all series. Non-interactive by default (hovers pass through to the line on top); set `interactive: true` if the band should participate in hit testing. Band y0/y1 values feed `yExtent` auto-derivation so a tall envelope can never clip, with explicit `yExtent` still winning.
  - **Tooltip enrichment now covers every interaction surface**: the hovered datum carries `band: { y0, y1 }` (first band) and `bands: [...]` (all bands) on the pointer hover path, each `allSeries[i].datum` in multi-mode, and the keyboard-navigation datum — one shared `enrichDatumWithBand` helper drives all three. Bounds-sourced ribbons stay decorative and are excluded from the contract.
  - **Default tooltip surfaces band values automatically**: configure `band` without supplying a custom `tooltip` function and the default tooltip gains one row pair per band (low + high). String accessors become labels; function accessors fall back to `low` / `high`. Custom tooltips still read `datum.band` / `datum.bands` directly. Live demo at `/charts/line-chart#band`.
- **`tickAnchor: "edges"` on `frameProps.axes[i]`** — flips the leftmost tick's `text-anchor` to `start` and the rightmost to `end` on horizontal axes (and `dominant-baseline` to `hanging` / `auto` on vertical axes) so edge tick labels can't overflow the plot area. Default `"middle"` keeps existing behavior. Pairs naturally with `axisExtent: "exact"`: exact pins the domain to the literal data min/max, edges keeps the labels readable at those bounds. Edge detection is pixel-based, not array-index-based, so inverted y scales (the default `[height, 0]`) and reversed x scales (streaming `arrowOfTime: "left"`) anchor the right edges. Closes a common wrapper-library workaround that previously routed through `xFormat` returning ReactNodes with `translateX` math.
- **`--semiotic-tick-font-size` and `--semiotic-axis-label-font-size` CSS variables** — emitted from the canonical theme typography fields (`tickSize`, `labelSize`) alongside the existing `--semiotic-tick-font-family` and `--semiotic-title-font-size`. Both `themeToCSS` (raw string serialization) and `ThemeProvider` (inline style) write them; `themeToTokens` exports them as DTCG `dimension` tokens. SVG axes consume the variables via `style={{ fontSize: "var(--semiotic-tick-font-size, 10px)" }}` so a CSS-var override on any ancestor (`<div style={{ "--semiotic-tick-font-size": "14px" }}>`) flows down without consumers needing `!important`. Landmark ticks bump by `calc(... + 1px)` so the +1 size stays relative to the var.
- **`data-orient` attributes and per-axis class names on axis groups** — each axis now renders as its own `<g class="semiotic-axis semiotic-axis-{bottom|left|right|top}" data-orient="…">` inside the `.stream-axes` wrapper. Consumers can target one axis at a time from external CSS without affecting the others: `[data-orient='left'] text { font-size: 14px }` works. Tick text carries `class="semiotic-axis-tick"`, axis labels `class="semiotic-axis-label"`, and chart titles `class="semiotic-chart-title"` for class-based targeting too.
- **`loadingContent` prop on all HOCs** — sibling to `emptyContent`. When `loading` is true and `loadingContent` is set, it renders in place of the default shimmer-bar skeleton (wrapped in the same sized container so the chart slot stays reserved). Pass `false` to suppress the loading UI entirely (the early-return becomes null and a consumer's outer loading state takes over). Threaded through `useChartSetup`, `useNetworkChartSetup`, and `useCustomChartSetup`; all 47 HOCs accept it via `BaseChartProps`.

### Fixed

- **`website:build` parcel resolution for the Atom feed link** — `docs/public/index.html` previously declared `<link rel="alternate" href="/blog/feed.xml">` with an absolute path so prerendered nested routes (e.g. `/charts/line-chart/`) wouldn't resolve it as `/charts/line-chart/blog/feed.xml`. Parcel's HTML packager couldn't resolve the absolute path during build, so the website build failed. Moved the link injection into `scripts/prerender.mjs` alongside the existing `/llms.txt` alternate injection — same strip-and-inject pattern, same absolute-URL semantics, and Parcel no longer sees the unresolvable reference in source HTML.

### Changed

- **`boundsAccessor` and `band` now share one rendering primitive.** Both public envelope APIs normalize to a single `resolvedRibbons: ResolvedRibbon[]` array at the PipelineStore layer, then flow through `xySceneBuilders/ribbonScene.ts` — one scene builder, one y-extent expansion pass, one style cascade. `boundsScene.ts` and `bandScene.ts` are deleted; the public prop surfaces stay distinct (asymmetric pairs read better as `band` than as a `boundsAccessor` union return type) but the implementation is no longer duplicated. The bounds ribbon also now correctly skips datums with null/NaN `y` (previously the coerced `+null === 0` could silently render a ribbon around the implicit-zero "value" of a missing row). The `kind: "bounds" | "band"` discriminator on each ribbon lets the hover handler restrict `datum.band` / `datum.bands` enrichment to band-sourced envelopes — bounds stays decorative-only, matching its prior contract.

## [3.5.3] - 2026-05-18

### Added

- **`DifferenceChart` (XY)** — two-series A/B comparison chart that fills the area between two series with a color that switches at each crossover (`seriesAColor` where A > B, `seriesBColor` where B > A). Crossover x-values are linearly interpolated so adjacent segments meet at zero-width vertices (no jagged seams). Both series can be drawn as overlay lines on top of the fill via `showLines` (default `true`). Renders through `chartType: "mixed"` with the segment groups in `areaGroups` — single frame, single set of scales, perfect geometric alignment between fill and overlay. Push API supported (HOC owns internal raw-data state; push triggers segment recomputation). Classic uses: temperature anomaly, forecast vs. actual, budget variance, any A/B comparison where the direction of the difference is the message. Live demos + Quick Start streaming toggle at `/charts/difference-chart`. New SSR config + validation map entry + chartSpecs entry → schema regenerated.
- **`axisExtent` prop on all XY and ordinal HOCs** — `"nice"` (default, current behavior) uses d3-scale's rounded tick generator; `"exact"` pins the first and last tick to the literal data min/max with equidistant intermediate ticks. Applies to XY x/y axes and the ordinal value (r) axis only; no-op on network/geo/hierarchy. In exact mode the pipeline ALSO skips `extentPadding` so the domain reflects the literal data bounds, not a padded version — explicit `tickValues`, `xExtent`/`yExtent`/`rExtent` still win over both modes. Three demos at `/features/axes#axis-extent` (temporal LineChart, Scatterplot, SwarmPlot). Centralized `equidistantTicks` + `ticksForMode` helpers in `src/components/charts/shared/axisExtent.ts`.
- **`roundedTop` on SwimlaneChart** — pixel radius rounds the outermost ends of each lane (left+right for horizontal, top+bottom for vertical). Middle segments stay square so adjacent pieces butt against each other; single-segment lanes round all four corners. Implemented via a new `cornerRadii?: { tl, tr, br, bl }` field on `RectSceneNode` and shared shape utilities in `src/components/stream/renderers/cornerRadii.ts` (canvas and SVG renderers share the geometry; each owns its drawing language). Live demo at `/charts/swimlane-chart#rounded-corners`.
- **`buildHistogramTooltip` helper** — histogram-specific default tooltip for `RealtimeHistogram`, sibling to `buildWaterfallTooltip` / `buildHeatmapTooltip`. Surfaces `range: <binStart>–<binEnd>`, `count: <total>`, and `category: <category>` instead of the canonical `x:`/`y:` shape, which produced empty strings on aggregated bin datums. Falls back to the canonical shape when a non-binned datum sneaks through.
- **`tickValues` on XY axes (`frameProps.axes[i].tickValues`)** — explicit per-axis tick positions, mirroring the ordinal frame's `rTickValues`. Previously the field appeared in the docs and the docs LiveExample but was silently ignored by `SVGOverlay`'s tick computation; now it bypasses both d3's "nice" generator and `axisExtent: "exact"` and wins over `includeMax`. Pixel-distance filtering still drops overlapping labels. Accepts `Array<number | Date>`. Pinning regression test in `SVGOverlay.tickValues.test.tsx`.
- **ProcessSankey `systemInTimeAccessor` / `systemOutTimeAccessor` and `showLabels`** — optional per-edge lifecycle timestamps let a source band show mass waiting before the edge departs and a target band show mass retained after the edge arrives. The band outline now extends to those lifecycle bounds and paints per-edge gradient stubs; `showLabels={false}` suppresses dense band labels without dropping the legend. The docs page adds a helpdesk-ticket example plus the Process Sankey vs. classic Sankey recipe.
- **Docs blog** — `/blog` now has article and index routes, a distinct no-sidebar shell, Atom feed generation, social-card generation, route prerender metadata, and seven launch entries covering release notes, chart explainers, and case studies.

### Fixed

- **Area canvas renderer respects CSS-variable fills** — `areaCanvasRenderer.ts` now resolves `style.fill` through the existing `resolveCanvasFill` helper (same primitive bars use), so `var(--…)` references resolve from the canvas DOM ancestor. Previously the fill path skipped this resolution while the stroke path included it — passing a CSS variable as the area fill produced no visible color (canvas silently rejects unresolved CSS vars) and the gradient path fell back to the sentinel blue regardless of the requested color. Affects any chart that emits area-type scene nodes with `var(--…)` fills.
- **DifferenceChart accessor coercion** — `xAccessor` / `seriesAAccessor` / `seriesBAccessor` outputs now flow through a `toNumber` coercer that handles `Date` (→ `getTime()` ms) and numeric strings (`"5"` → `5`) before the `Number.isFinite` filter. Previously, time-series data (Date objects in `xAccessor`) and CSV-style numeric strings were silently dropped at the segment-algorithm guard, producing an empty chart.
- **DifferenceChart crossover detection across non-finite rows** — the segment algorithm now tracks the last VALID point (not `sorted[i - 1]`) for crossover comparison, so a NaN gap between two valid rows no longer suppresses the segment break that should sit between them.
- **DifferenceChart `remove()` / `update()` synchronous return values** — both methods compute results from a `useRef`-backed live buffer and return them synchronously at call time. The earlier pattern built results inside the `setState` updater, which could return empty arrays under React 18+ concurrent batching if the updater was deferred or replayed.
- **DifferenceChart bounded push buffer** — new top-level `windowSize` prop caps the raw-row buffer with FIFO eviction. Long-running streams no longer accumulate unbounded rows that the segment algorithm has to re-sort and re-segment on every render. The previous `frameProps.windowSize` recommendation in the docs had no effect (the underlying frame receives static data from this chart, not streaming inputs), so the docs streaming example and Quick Start were updated to use the new prop.
- **ProcessSankey hover and tooltip regressions** — decorative gradient stubs opt out of hit testing, filled bezier-body hits now return finite pointer coordinates for ProcessSankey's custom datum shape, and the default tooltip no longer turns short numeric domains (day/month indices) into 1970 dates.
- **ProcessSankey SSR parity for lifecycle stubs** — `renderChart("ProcessSankey", …)` now threads `systemInTimeAccessor` and `systemOutTimeAccessor` into the shared scene builder, so static SVG output uses the same lifecycle band bounds as the client HOC.
- **Blog metadata correctness** — blog entry dates are formatted at UTC midnight so US timezones do not display the previous day, and the Atom feed link is absolute so prerendered nested routes do not point at `/charts/blog/feed.xml`.

### Changed

- **`extentPadding` skipped in `axisExtent="exact"` mode** — both `PipelineStore` and `OrdinalPipelineStore` now treat `extentPadding` as 0 when `config.axisExtent === "exact"`, so the scale domain pins to the literal data min/max and the first/last ticks read as the actual bounds. Trade-off documented: glyphs at the extremes can sit at the plot edge in exact mode. Default `"nice"` keeps the existing padded domain.
- **Per-corner radius geometry centralized** — `hasAnyCornerRadius` and corner-clamping logic extracted from `barCanvasRenderer.ts` and `SceneToSVG.tsx` to a shared `cornerRadii.ts` module. Each renderer keeps its own path-tracing primitives (`arcTo` vs SVG `A`); the geometry agrees by construction.
- **Capability matrix regenerated and release-gated** — `ai/capabilities.json` and `docs/capabilities.md` now index all 45 chart schemas, including `DifferenceChart`; `QuadrantChart` is marked `supportsSSR: true` to match its `renderChart` registration; `check:capabilities` is wired into CI, `release:check`, and `prepublishOnly`.
- **Blog registry drift is release-gated** — new `check:blog-entries` keeps `docs/src/blog/entries.js` and `entries-meta.js` in sync, and runs during `website:build`, CI, `release:check`, and `prepublishOnly`.
- **Server-rendered QuadrantChart officially supported** — the SSR config emits quadrant fills, centerlines, and labels via `svgPreRenderers`, which also powers the QuadrantChart blog OG card.

## [3.5.2] - 2026-05-10

### Added

- **`useSeriesFeatures` hook** — `forecast` + `anomaly` props are now first-class on AreaChart, Scatterplot, and ConnectedScatterplot (previously LineChart-only). Each consumer collapses from ~85 LOC of synthetic-key + lazy-load + state-management boilerplate to ~10 lines via the shared hook. `series-features`, `forecast`, and `anomaly` capability tags surface through `chartSpecs.ts` / `ai/capabilities.json` for agent discovery.
- **`useEncodingDomain` hook** — generic `[min, max]` tracker over bounded data + push-mode values, extracted from BubbleChart's `sizeBy` logic. Scatterplot's `sizeBy` now picks up correctly-scaled radii in push mode (previously a latent bug that returned the raw `sizeBy` value as the pixel radius). String-field accessors hitting numeric-string values (`"5"`, `"12"`) coerce cleanly instead of leaking strings into downstream math.
- **`useStreamStatus` hook** — user-facing observer for push-API charts. Wraps a ref, intercepts `push`/`pushMany`, and exposes a reactive `status` enum (`"idle"` | `"active"` | `"stale"`) plus `lastPushTime`. Surfaced via `semiotic/utils` and `semiotic/realtime`. Wrap-once symbol guard prevents StrictMode double-wrap.
- **`useXYLineStyle` hook (Phase 2 step 5 of the HOC/Frame audit)** — the line-side analogue of `useXYPointStyle`. LineChart, MultiAxisLineChart, and MinimapChart (both main + overview lines) all collapse to a single hook call covering the five-step recipe: base stroke width → color resolution → optional group-aware fill → `mergeShapeStyle` primitives overlay → `wrapStyleWithSelection`. A `resolveStroke(d, group?)` override absorbs MultiAxisLineChart's per-series colorMap; unset selection-hook / primitives args keep MinimapChart's main + overview paths intact (no-ops on the wraps preserve referential identity). LineChart's forecast/anomaly segment-aware wrap stays HOC-side as a post-pass over the hook's output — the lazy-load + state-management contract has no counterpart in the other two consumers. Net ~65 LOC removed across the three HOCs. 15 unit tests pin the recipe.
- **Bundle-size truth source** — `scripts/sync-bundle-sizes.mjs` reads `package.json#exports`, gzips each `*.module.min.js`, and upserts marker-block sections in README.md, CLAUDE.md, and `ai/system-prompt.md` (the synced `.cursorrules` / `.windsurfrules` / `.github/copilot-instructions.md` / `.clinerules` / `docs/public/llms-full.txt` follow from CLAUDE.md). `check:bundle-sizes` is wired into `release:check`, `prepublishOnly`, and the CI workflow alongside the other doc-correctness gates, so dependency bumps that nudge a bundle past its rounded KB boundary now fail CI when the docs haven't been regenerated. Drops the stale `// 200 KB gzip` hero comment in the README — the autogenerated table is the only source of truth.
- **`radialGeometry` helpers** — `sweepToAngles`, `valueToAngle`, `computeArcBoundingBox` extracted from GaugeChart into a shared module, exposed via `semiotic/utils`. Custom radial-chart authors (`XYCustomChart`, bespoke layouts) no longer have to re-derive the gauge sweep math.
- **ProcessSankey temporal validators** — `validateProcessSankey` and `formatProcessSankeyIssue` exported from `semiotic` and `semiotic/network`. External code (data pipelines, AI agents, server-side validators) can pre-check graphs against the same value-conservation + endpoint-resolution rules the chart enforces.
- **`regression` prop on Scatterplot, BubbleChart, ConnectedScatterplot, BarChart, DotPlot** — sugar over the trend annotation. Accepts `true` | method string (`"linear"` | `"polynomial"` | `"loess"`) | full `RegressionConfig`. Ordinal charts treat categories as integer indices and project the regression line through the band scale (with linear interpolation between band centers for LOESS fractional indices).
- **FlowMap push API** — joined the realtime-capable HOC family. The frame gained a `geo-lines` variant on `useFrameImperativeHandle` plus `pushLine` / `pushManyLines` / `removeLine` / `getLines` / `lineIdAccessor` on `GeoPipelineStore`. `supportsPush: true` in capabilities; docs streaming demo flipped from `setState(flows)` to `ref.current.push(flow)`.
- **Capability matrix at `ai/capabilities.json`** — 44 charts indexed across 5 categories with `renderModes` / `supportsPush` / `supportsSSR` / `supportsLegend` / `supportsSelection` / `supportsLinkedHover` / `colorModel` / `layoutMode` / `specialFeatures` fields. Generated alongside `docs/capabilities.md` by `npm run docs:capabilities`; locked against `chartSpecs.ts` by `check:capabilities`. `suggestCharts({ capabilities })` accepts push/linkedHover/ssr/selection/legend constraints and surfaces a `filteredOut` list with reasons. New `/features/capabilities` website page renders an interactive filterable matrix.

### Changed

- **ProcessSankey particles unified with SankeyDiagram** — particles now ride the canvas + `ParticlePool` path. The HOC writes pre-computed cubic bezier control points onto each ribbon spec; `NetworkPipelineStore`'s particle-pool gate broadened from `chartType === "sankey"` to also accept `customNetworkLayout`. SVG particle overlay deleted (~80 LOC, including the `<circle>`-per-particle allocation per frame). Prop surface aligned: `showParticles` + `particleStyle` (same `ParticleStyle` shape as SankeyDiagram). Individual `particleRadius` / `particleDuration` / `particleDensity` / `particleMaxPerEdge` props removed. Particles inherit source-band colors via `nodeColorMap` binding through invisible color-binding scene nodes.
- **Ribbon geometry unified** — new `src/components/geometry/ribbonGeometry.ts` is the single source of truth for the M-C-L-C-Z ribbon path emission. SankeyDiagram passes `cp1X = xi(curvature)`, `cp2X = xi(1-curvature)` (d3-sankey S-curve); ProcessSankey passes `cp1X = cp2X = cx` (lane-aware single-point bend). Both buildScenes.ts (SSR) and the HOCs (CSR) call the same helper.
- **`algorithm.js` → `algorithm.ts`** — last JS file in the chart source tree migrated to TypeScript with all types inlined as the canonical source (`algorithm.d.ts` deleted). 7 import sites updated to drop the `.js` extension; test file converted with type-annotated fixtures.
- **`getSize` clamps to `sizeRange`** — normalized position is now clamped to `[0, 1]` before mapping into the size range, so a pushed point whose `sizeBy` value falls outside the running domain (most common in push-mode initial state) renders at the boundary radius instead of producing an arbitrarily large pixel value.
- **Push-mode bezier carry-through** — `NetworkPipelineStore.ingestBounded` now copies pre-computed `bezier` from raw edges onto internal `RealtimeEdge` records, validated against the `BezierCache` shape (object + `circular: boolean` + 4-point or non-empty-segments + finite `halfWidth`). Malformed shapes are silently dropped instead of crashing the particle pipeline.
- **Edge value preservation** — bounded ingestion now uses `Number.isFinite(numValue) ? numValue : 1` instead of `Number(v) || 1`, so a legitimate `value: 0` edge survives end-to-end (e.g. suppressed-flow markers in particle pipelines).
- **Particle CSS variable resolution** — `networkParticleRenderer` runs all colors through `resolveCSSColor` so `particleStyle.color="var(--semiotic-primary)"` and theme-token-returning `edgeColorFn` results paint correctly (canvas's `fillStyle` silently rejects CSS custom properties otherwise).
- **Particle color resolution moved out of the renderer** — functional `particleStyle.color` is now invoked in `getParticleColor` with a `resolveEdgeEndpoint`-resolved `RealtimeNode`. Custom-layout charts (ProcessSankey) where `edge.source` is a string id now correctly invoke the user's color function instead of falling back to a hardcoded default.
- **Keyboard nav skips invisible scene nodes** — `extractNetworkNavPoints` skips `r <= 0` circles and `w <= 0 || h <= 0` rects (matching the canvas renderer's own skip gates). Keyboard focus on ProcessSankey now lands on a real band/ribbon instead of an off-canvas color-binding placeholder.
- **Bundle counts** — `semiotic/ai` covers 40 HOCs (XY + ordinal + network + realtime); `semiotic/recipes` added to the table; full schema covers 44 charts.
- **Documentation refreshed** — README, `CLAUDE.md`, `ai/system-prompt.md`, and the synced `.cursorrules` / `.windsurfrules` / `.github/copilot-instructions.md` / `.clinerules` / `docs/public/llms-full.txt` all carry current bundle sizes, chart counts, and entry-point inventory.
- **Bundle-size docs corrected** — earlier in this release cycle the README/CLAUDE.md/ai/system-prompt.md bundle table briefly carried inflated numbers because `npm run dist` (no `--production`) writes non-minified output to `dist/*.module.min.js`. The published artifacts come from `npm run dist:prod`, which terser-minifies. Both `scripts/sync-bundle-sizes.mjs` and `size-limit` read `dist/*.module.min.js` directly, so a local `dist` build silently substituted unminified bytes into the docs. The corrected numbers (xy 81 KB gz, ordinal 66 KB, network 62 KB, etc.) now reflect actual published artifacts. The bundle-size check tolerates ±3 KB build-machine variance so local↔CI minor differences don't fail without real growth.

### Fixed

- Fixed ProcessSankey particles not flowing when `showParticles` was toggled on (root cause: `customNetworkLayout` charts skipped `finalizeLayout`, so pre-computed bezier never reached `store.edges`).
- Fixed ProcessSankey particles rendering as light grey instead of inheriting source-node category color.
- Fixed `Number.isFinite` coercion in `useEncodingDomain` so the running domain is always numeric.

## [3.5.1] - 2026-05-05

### Added

- Added explicit extent examples and tests covering chart-level `xExtent`/`yExtent` pass-through.

### Fixed

- Fixed `yExtent` handling so explicit user bounds continue to control the rendered domain instead of being overridden by envelope-derived extents.
- Fixed realtime heatmap tooltip metadata so bin-center values are available and `agg="sum"` tooltips report summed values.

## [3.5.0] - 2026-05-02

### Added

- **`tooltip="multi"` hover-anywhere tooltips for LineChart, AreaChart, and StackedAreaChart** — opt-in mode that surfaces a multi-series tooltip anywhere inside the rendered x span, not only within `hoverRadius` of an explicit data point. This uses the shared `StreamXYFrame` multi-tooltip path, so multi hovers are cursor-anchored within the data range. Interpolation remains generous between sparse path samples but is range-bounded so explicit `xExtent` padding does not clamp to first/last values. Stacked areas report per-series band height instead of cumulative stack top, and synthetic no-hit hovers carry data-space `xValue`/`xAccessor` data for linked crosshair and observations. SSR is unchanged because tooltips are gated on pointer-driven `hoverPoint`.
- **`useHydrationLifecycle` hook** — extracts the post-hydration paint pattern that was previously duplicated as a 12-line `useEffect` across all four Stream Frames (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`). Each frame now has a 7-line `useHydrationLifecycle({ ... })` call. Three things happen on every commit-after-hydration: cancel the intro animation if we just rehydrated from SSR, mark the scene dirty, paint synchronously via `renderFnRef.current()`. Frame-specific cleanup (XY/Ordinal clearing the streaming adapter, Geo clearing tile cache) is supplied via the `cleanup` option. Adding hydration support to a hypothetical fifth frame is now a single hook call instead of a copy-paste-and-modify exercise.
- **`HYDRATION.md` integration recipe** — `src/components/stream/HYDRATION.md` codifies the six-step pattern for adding hydration support to a new Stream Frame: import hooks, gate SSR branch on `isServerEnvironment || (!hydrated && wasHydratingFromSSR)`, attach `responsiveRef` on the SVG branch, wire `useHydrationLifecycle`, implement `cancelIntroAnimation()` on the store, mark the bundle `clientOnly: true`. Codifying this in source (not just memory) means the next contributor doesn't have to reverse-engineer the pattern from four examples — Phase 3.5's geo backfill happened because I miscounted frame families and missed Stream Geo from Phase 3 scope; doc-as-code prevents the same kind of miss.
- **SSR-vs-CSR pixel-level Playwright gate** — `integration-tests/ssr-parity.spec.ts` + the new `ssr-parity-examples/` fixture snapshot both server-rendered SVG (via `renderChart`) and client-rendered canvas for the same chart matrix (LineChart, BarChart, PieChart, SankeyDiagram, Treemap). The SSR side renders into a `page.setContent` payload — no fixture file needed — while the CSR side renders through the live HOC components. 30 darwin baselines committed (5 charts × 2 sides × 3 browsers). Both sides baseline independently rather than direct pixel-comparing each other (SVG and canvas rendering pipelines differ in subtle ways and won't match byte-for-byte), so any drift in either pipeline lands as a snapshot diff for a maintainer to review.
- **SSR-vs-CSR structural parity test** — `src/components/server/ssr-csr-parity.test.tsx` exercises the two SSR code paths (`renderChart` from `semiotic/server` and the in-frame SSR branch via `renderToString(<Component />)`) for the same chart matrix. Asserts both paths emit the dominant data-mark primitive with counts within a 3× ratio. Catches the regression class where one pipeline silently emits zero or wildly different data marks than the other — manual-placeholder users would otherwise see a different rendering than auto-hydrating users without anyone noticing until a real consumer hit it. Surfaces an expected divergence (`renderChart` is bare data marks, the in-frame path includes SVGOverlay chrome) which the assertions are tuned to permit.

- **Interaction-state visual snapshots — 4 new states across XY + LinkedCharts** — Closes the bulk of the P1 "Interaction-State Visual Snapshots" item. Added pixel-stable Playwright snapshots for four user-driven states the existing structural tests didn't pin visually:
  - **`hoverHighlight` dim** (LineChart multi-series with `hoverHighlight: true`): pointer over series A, series B should dim. Fixture in `xy-examples/index.js` + test in `xy-frame.spec.ts` "Interaction states" describe.
  - **Brush selection rect** (Scatterplot with `linkedBrush`): drag from (0.2w, 0.2h) to (0.8w, 0.8h), capture the resulting brush rect + selection-dim state.
  - **Legend isolate** (LineChart multi-series with `legendInteraction: "isolate"`): click `.legend-item:first` for series A, capture series B dim.
  - **Linked-hover cross-highlight** (existing `linked-hover` fixture in `coordinated-examples/index.js`): pointer over the scatter half of the LinkedCharts dashboard, capture the matching-category bars staying lit while non-matching dim. Test in `brush-selection.spec.ts` "Visual snapshots" describe.

  All four use the same `page.mouse.move`/`page.mouse.down|up`/`locator.click` + `waitForRafs(page, 4)` settling pattern as the existing `xy-scatter-hover-state` snapshot. `maxDiffPixels: 200` because pointer-driven states have more anti-aliased motion edges than default-state renders. 12 darwin baselines committed (4 interactions × 3 browsers); ran clean twice consecutively for pixel-stability. Remaining gap recorded in OUTSTANDING_WORK: click-locked crosshair (2-step click-to-lock + click-to-unlock interaction) — lower-priority follow-up since the linked-hover snapshot already covers most of the regression surface.
- **HOC-level visual snapshots — animated-HOC backfill closes the 43/43 coverage matrix** — Added pixel-stable default-theme Playwright snapshots for the 5 HOCs whose canvases were intentionally never visually stable: 4 realtime charts (`RealtimeHistogram`, `RealtimeSwarmChart`, `RealtimeWaterfallChart`, `RealtimeHeatmap`) and `OrbitDiagram`. The technique that made it work: rather than freezing rAF or pinning a frame count (the approach the prior OUTSTANDING_WORK note pre-emptively flagged), simply pass static `data` arrays + omit the continuous-animation props (`decay`/`pulse`/`transition`/`staleness` for realtime, `animated: false` for Orbit). Without those props, the canvas stabilizes after initial paint and ordinary `waitForChartReady` (default `stable: true`) succeeds — no rAF instrumentation needed. Fixtures live alongside the streaming-mode siblings in `realtime-examples/index.js` (with `seedHistData` / `seedWaterfallData` / `seedSwarmData` / `seedHeatmapData` constants) and `network-examples/index.js`. Tests are scoped to a "HOC default coverage (static)" describe in each spec so the streaming-mode tests stay separate. 15 darwin baselines committed (5 charts × 3 browsers); ran clean twice in a row to confirm pixel-stability. After this pass, **every HOC in `chartSpecs.ts` (43/43) has a default-theme visual snapshot**, closing the P1 HOC-Level Visual Snapshots item. Remaining infrastructure work — bootstrap Linux baselines from the CI `playwright-snapshots` artifact — stays open as a one-time CI/user dance.
- **HOC-level visual snapshots — static-mode coverage complete (ordinal + geo backfill)** — Added default-theme Playwright snapshots for the 4 remaining static-mode HOCs that didn't have any: `DotPlot` and `RidgelinePlot` in `ordinal-frame.spec.ts` (fixtures land in `ordinal-examples/index.js`), `FlowMap` and `DistanceCartogram` in `geo-charts.spec.ts` (fixtures in `geo-examples/index.js`). Each follows the XY-family pattern from the prior pass — single "HOC default coverage" describe per spec, looping the testIds through a shared `toHaveScreenshot` body. 12 darwin baselines committed (4 charts × 3 browsers). FlowMap fixture pins 5-node + 5-edge synthetic flow data with a `simpleAreas` background; DistanceCartogram pins a 5-node hub+spokes layout with `cost` accessor for the cartogram distortion. After this pass every static-mode HOC in the registry has at least one default-theme visual snapshot. 99/99 ordinal + geo Playwright tests pass on darwin (was 87 before; +12); vitest 3574/3574 unchanged.
- **HOC-level visual snapshots — XY family fully covered + suite-wide color-drift re-baseline** — Added default-theme Playwright snapshots for the 6 XY HOCs that didn't have any: `StackedAreaChart`, `ConnectedScatterplot`, `QuadrantChart`, `MultiAxisLineChart`, `ScatterplotMatrix`, `MinimapChart`. Each gets a fixture entry in `integration-tests/xy-examples/index.js` (deterministic small data, `colors` palette where categorical) + a `toHaveScreenshot` test in `xy-frame.spec.ts`'s new "HOC default coverage" describe. 18 darwin baselines committed (6 charts × 3 browsers). The Linux baselines auto-generate on the next CI push via the existing smoke-fallback workflow (`HAVE_LINUX` check in `.github/workflows/node.js.yml`); commit them from the `playwright-snapshots` artifact to flip the regression gate on for Linux runners.

  Same pass re-baselined ~50 pre-existing snapshots that had drifted by ~0.02% pixel diff — sub-perceptual color shift introduced by the 2026-04-28 d3-scale-chromatic → `colorPalettes.ts` swap (linear RGB interpolation between 9-11 stops vs d3's basis-spline 256-stop LUTs; ΔE < 1 across every gradient as documented in the helper, but enough to cross `maxDiffPixels: 100` on charts with anti-aliased edges over 50k+ pixels). Affected: `xy-range-plot`, `ord-gauge-180/240/needle`, `histogram-stroke-{light,dark,scoped}`, `funnel-{light,dark}`, `tree-{light,dark}`, `choropleth-{light,dark}` under primitive-theme-matrix, `waterfall-{light,dark}`, `heatmap-{tufte,bi-tool}`, `likert-{light,dark}` under status-scale-theme-matrix. Many of these previously had chromium-darwin only — firefox-darwin and webkit-darwin baselines now committed alongside, extending the regression gate to all three darwin browsers for those tests.

  Remaining HOC visual coverage gaps (recorded in OUTSTANDING_WORK P1): `RealtimeHistogram`/`RealtimeSwarmChart`/`RealtimeWaterfallChart`/`RealtimeHeatmap` (continuous animation — needs rAF freeze), `DotPlot`/`RidgelinePlot`/`OrbitDiagram`/`FlowMap`/`DistanceCartogram`. These ship as follow-on PRs since each requires its own fixture page entry.

  Total: 732/732 Playwright tests pass on darwin after re-baseline; vitest 3574/3574 unchanged.
- **Realtime HOCs auto-fit `windowSize` to bounded data — closes the Consumer Workaround Audit P0 item** — new `resolveRealtimeWindowSize(windowSizeProp, data)` helper at `src/components/charts/realtime/resolveWindowSize.ts` is wired into all 5 realtime HOCs (`RealtimeLineChart`, `RealtimeHistogram`, `RealtimeSwarmChart`, `RealtimeWaterfallChart`, `RealtimeHeatmap`) where the prior `windowSize = 200` destructure default lived. Resolution rule: explicit user `windowSize` always wins (a 10-point window over a 100-point archive is a legitimate "show the last 10" view); otherwise auto-fit to `Math.max(data?.length ?? 0, 200)`. Closes the historical `windowSize={data.length}` workaround that consumers had to write to keep static `data` arrays larger than 200 points from silently truncating against the sliding-window cap during bulk ingest. Our own `docs/src/pages/theming/SemanticColorsPage.js` had the workaround on the histogram example — removed in the same diff. Streaming-only consumers see no change (the 200 floor preserves the prior default when `data` is absent or empty); push API behavior is identical (the buffer can still grow via `windowMode="growing"` or be consumed via `ref.current.push()` regardless of the resolved size). 7 round-trip tests cover the resolution rules including the explicit-zero edge case. The helper is intentionally not exported from any public sub-path — it's an HOC-internal seam, not a consumer API. Closes the Consumer Workaround Audit P0 next-work bullet ("Audit realtime chart usage for `windowSize={data.length}` or other bounded-mode workarounds; consider first-class bounded mode on realtime HOCs where static-data use is common").
- **OUTSTANDING_WORK P0 cleared (second sweep)** — TypeScript Surface Cleanup, Consumer Workaround Audit, and `validationMap` Composition all closed; P0 is empty again. The validationMap entry was a self-marked "skip if Chart Spec Registry ships" — registry shipped, file is generated, item retires automatically. Re-open P0 only when a new release-confidence or doc-correctness gap surfaces.
- **TypeScript `any` cleanup pass (321 → 274; -47, ~15%) — closes the long-running OUTSTANDING_WORK item** — final sweep across the highest-leverage hotspots called out in the original entry, then the item retires:
  - **`colorUtils.ts`** — `getColor(dataPoint: any, …, colorScale?: (v: any) => string)` and `getSize(dataPoint: any, …)` re-typed with `Datum` and `(v: string) => string`. The internal `dataPoint[colorBy]` access (which is genuinely `unknown`-shaped because Datum is loose) now stringifies once at the seam, matching what d3 ordinal scales do internally and threading `string[]` cleanly through `scaleOrdinal<string, string>` without the prior `as (v: any) => string` casts on the return type.
  - **`SceneToSVG.tsx`** — replaced 3 unsafe arc-noop casts with a typed `ARC_NOOP: DefaultArcObject` constant; replaced the `dominantBaseline` cast-to-`any` with a cast to React's typed `SVGAttributes["dominantBaseline"]` union (the cast stays — it's the boundary between our free-form `NetworkLabel.baseline` string and React's strict SVG-spec union — but it's no longer a type-safety bypass).
  - **`hierarchyLayoutPlugin.ts`** — typed every `root: any` parameter as `HierarchyNode<Datum>`, every `d: any` position-setter parameter as the layout-specific `HierarchyPointNode<Datum>` / `HierarchyRectangularNode<Datum>` / `HierarchyCircularNode<Datum>` (matching d3's per-layout node-type contract), and the descendant `nodeMap` from `Map<any, RealtimeNode>` to `Map<HierarchyNode<Datum>, RealtimeNode>`. The 3 layout-specific subtype casts at the dispatch site are the genuine boundary — `layoutType` discriminant carries the type information, but TS can't see it without an explicit cast — and they're typed-cast not `any`-cast.
  - **`orbitLayoutPlugin.ts`** — same treatment for the orbit-specific layout (`buildOrbitLayout(root: Datum)`, `buildTree(parentDatum: Datum)`, `pieGen.value((kid) => …)`); typed the `__orbitState` cache via the existing `unknown` field on `NetworkPipelineConfig`; replaced the revolution-style callback's `(n: any) => number` with a structural `DepthLike` shape (`{ depth?: number }`) that names exactly what the function reads; dropped a forgotten null SceneDatum cast (`SceneDatum` is already `Datum | null`).
  - **`chordLayoutPlugin.ts`** — the per-node `arcData` and per-edge `chordData` extension fields are now declared as typed `unknown`-bag fields on `RealtimeNode` / `RealtimeEdge` (the same pattern `__hierarchyNode` / `__radius` use), so callsites narrow at the read site instead of untyped arcData access. The `arc.centroid()` argument now constructs an explicit `DefaultArcObject` from the `ChordGroup` rather than casting; the one remaining cross-type cast (`Chord` → `ribbonGenerator`'s expected `Ribbon` parameter, where d3's configured-radius generator never reads the missing `radius` field) is now a typed `as unknown as Parameters<typeof ribbonGenerator>[0]` boundary cast with a comment instead of an unsafe any cast.
  - **`XYBrushOverlay.tsx`** + **`OrdinalBrushOverlay.tsx`** — typed the d3-brush ref as `BrushBehavior<unknown>`, the brush event callbacks as `D3BrushEvent<unknown>`, and the brush-group selection as `Selection<SVGGElement, …>` so all 12 unsafe brush casts on `g.call(brushFn)` / `g.call(brushFn.move, …)` resolve cleanly through d3-brush's typed call signatures. Brushes are now fully typed at the d3 boundary — no `any` remains in either overlay.

  This closes the OUTSTANDING_WORK "TypeScript Surface Cleanup" P0 item per the rationale called out in earlier passes: the remaining ~274 anys cluster in places where the cost-benefit doesn't pencil — vendored sankey-plus type stubs (16, intentional), `renderToStaticSVG.tsx` SSR boilerplate (27, hits many type seams across the server bundle), `fromVegaLite.ts` (11, dynamic Vega-Lite spec shape), `canvasMock.ts` (10, test utility deliberately loose), plus many small per-component sites that would each save 1–3 lines for non-trivial structural work. The principle stays: prefer modeling real shapes over mechanical replacement, and accept boundary casts that are legibly named (`as DefaultArcObject`, `as HierarchyPointNode<Datum>`) over unsafe any casts. New `any` in PRs is now opportunistic-flag territory, not a tracked backlog item.
- **Drop four d3 micro-deps via inlined replacements** — audited every d3-* dependency in `package.json` and removed the four where the dependency was clearly bigger than the surface we used:
  - **`d3-scale-chromatic`** → `src/components/charts/shared/colorPalettes.ts`. We use 3 categorical schemes (`schemeCategory10`, `schemeTableau10`, `schemeSet3`) and 19 sequential/diverging interpolators (`interpolate{Blues,Reds,Greens,Oranges,Purples,Greys,Viridis,Plasma,Inferno,Magma,Cividis,Turbo,RdBu,PiYG,PRGn,BrBG,RdYlBu,RdYlGn,Spectral}`). Categorical schemes are byte-identical hex arrays from the original ColorBrewer/Tableau/Vega palettes. Interpolators sample the canonical palette at 9–11 stops (vs d3's 256-stop precomputed LUTs) and use linear RGB interpolation rather than d3's Catmull-Rom basis splines — the ΔE across the gradient is sub-perceptual (< 1) for every palette, and binned legend output (the dominant consumer pattern) is identical at typical N=5–9. Output format matches d3's effective `Rgb#toString()` shape (`#rrggbb` for opaque colors), caught in transit by an SSR snapshot test that asserted on the hex form. **~76KB unpacked saved.**
  - **`d3-tile`** → inlined ~30 lines of slippy-tile math at the top of `GeoTileRenderer.ts`. The `tile()` chained-setter API was over-abstracted for a single call site; the math itself is just "given a viewport size + Mercator scale + translate, which tile triples cover it and what's the per-tile pixel offset." `tileWrap` is a one-line antimeridian wrap. **~20KB unpacked saved.**
  - **`d3-format`** → `src/components/charts/shared/numberFormat.ts`. Implements the chart-axis-relevant subset of d3's spec syntax: `[,][.precision][~][type]` with types `f`, `%`, `e`, `d`, `s`, `r`, `g`, plus the unparseable-spec fallback to `Intl.NumberFormat`. 19 round-trip tests lock in parity with d3 for the format strings semiotic emits internally and the realistic spec subset consumers pass via `xFormat`/`yFormat`/`valueFormat`. Dropped fill/align/sign/symbol/width and the binary/octal/hex/code-point/comma-rounded types — none of those appear in chart axis labels. **~42KB unpacked saved.**
  - **`d3-time-format`** → `src/components/charts/shared/timeFormat.ts`. strftime token parser backed by `Intl.DateTimeFormat` pinned to `en-US` for `%b`/`%B`/`%a`/`%A` (matches d3-time-format's default-locale behavior — `timeFormatDefaultLocale` is opt-in over there too — and keeps tick labels stable across CI runners, browser system locales, and SSR snapshot baselines). Handles `%Y`/`%y`/`%m`/`%d`/`%e`/`%H`/`%I`/`%M`/`%S`/`%L`/`%p`/`%b`/`%B`/`%a`/`%A`/`%j`/`%%` (every token semiotic emits internally + the realistic chart-axis subset). Pre-tokenizes the spec so per-tick formatting walks a resolved program rather than re-scanning the spec string. `dayOfYear` (`%j`) reads local calendar components and projects onto a UTC integer day count to avoid 23h/25h DST days skewing the integer division. 13 round-trip tests cover semiotic's default `%b %d, %Y` form and each token. Dropped `%U`/`%W`/`%Z`/`%c`/`%x`/`%X`/`%f` — none appear in chart axis labels. Also drops the transitive `d3-time` (~40KB) since `d3-time-format` was its only consumer in the tree. **~120KB unpacked saved (incl. d3-time).**

  Cumulative: ~258KB unpacked install-size reduction, ~40KB gzipped on the `xy`/`ordinal`/`network`/`geo`/`realtime` bundles. No public API change; the four removed packages plus `@types/d3-scale-chromatic`/`@types/d3-format`/`@types/d3-time-format` come out of `package.json`. Companion analysis identified `d3-brush`/`d3-selection`/`d3-zoom` as theoretically droppable but the bundle savings (~150KB) don't justify the touch-event correctness risk concentrated in the resulting custom pointer model — left those alone. Full suite (3560 tests across 192 files; +32 from the new format-shim suites) green; all 9 release gates clean; rebuilt bundles smoke-tested via `check:pack`.
- **`check:jsdoc-coverage` gate** — new `scripts/check-jsdoc-coverage.mjs` enforces a minimum agent-visible documentation surface on every HOC registered in `chartSpecs.ts`: a top-line one-sentence summary (TypeDoc renders this as the component blurb on `/api/charts`) and at least 2 `@example` blocks (examples drive `/api/typedoc`, generated AI docs, and the MCP `getSchema` prompt context — a single example doesn't show variation). Replaces the previous baseline of "TypeDoc resolves the type" — that only proved the JSDoc parsed, not that any of it was useful, so a new HOC could ship with zero examples and nothing in CI would notice. The 2026-04-26 38/38 audit was hand-checked at the time but had no regression detection; today's gate locks it in. Initial run flagged 8 gaps the previous audit missed: `AreaChart` and `StackedAreaChart` (a single `@example` apiece — both got a second covering gradients/normalization), and all 5 realtime charts (1 `@example` each, plus `RealtimeHistogram` had a multi-scenario block flattened into a single `@example` — split into proper separate blocks). Backwards-compat aliases (`export const RealtimeHistogram = RealtimeTemporalHistogram`) are followed once: the gate audits the canonical declaration so the alias's intentionally-minimal `@deprecated` block stays honest. Wired into `release:check`, `prepublishOnly`, and the CI workflow alongside `check:test-quality`. Closes the API Reference Documentation P0 next-work bullet.
- **`check:ai-examples-coverage` gate** — new `scripts/check-ai-examples-coverage.mjs` catches drift in `ai/examples.md`, the canonical copy-paste reference that ships in the npm tarball. Two failure modes: (1) **stale chart references** — a chart was renamed or removed in `chartSpecs.ts` but its section in `examples.md` survived, so agents that follow the example produce code that fails type-check (heuristic identifier match against the registry, with an explicit allowlist for non-chart surface APIs like `ThemeProvider` / `LinkedCharts` / `Tooltip` so they don't false-positive); (2) **coverage gaps** — a renderable chart was added to `chartSpecs.ts` but `examples.md` was never updated, so MCP / `--doctor` agents that read the file as the canonical example reference can't find a starting point. The 22-chart copy-paste backlog at gate-shipping time (`SwarmPlot` / `BoxPlot` / `RidgelinePlot` / `DotPlot` / `PieChart` / `DonutChart` / `GaugeChart` / `FunnelChart` / `SwimlaneChart` / `LikertChart` / `BubbleChart` / `QuadrantChart` / `MultiAxisLineChart` / `CandlestickChart` / `ScatterplotMatrix` / `MinimapChart` / `ChoroplethMap` / `ProportionalSymbolMap` / `FlowMap` / `DistanceCartogram` / `RealtimeSwarmChart` / `RealtimeWaterfallChart`) is captured in a one-way `COVERAGE_BASELINE` set inline in the script — mirrors `check:test-quality`'s burn-down approach: any baseline name that becomes covered in a future PR must be removed from the set in the same diff (otherwise a regression that drops the example would silently pass), and adding a NEW name to the baseline requires diff justification. The HOC's source-level `@example` blocks are still enforced by `check:jsdoc-coverage`, and MCP / `--doctor` agents still discover each chart through `chartSpecs.ts` + `getSchema`, so the baseline charts aren't agent-invisible — just narrative-light in the canonical copy-paste file. Wired into `release:check`, `prepublishOnly`, and the CI workflow alongside `check:ai-contracts`. Closes the AI Surface Behavior Contracts P0 next-work bullet (the "regenerate examples from runtime fixtures and diff" half — the rule-section regeneration half was already covered by `check:ai-contracts`).
- **OUTSTANDING_WORK P0 cleared** — all four previously-tracked P0 items are closed (API Reference Documentation, Chart Spec Registry, AI Surface Behavior Contracts, Test Quality Gate). The doc now points at the gates that hold the line for each, so future drift surfaces in CI rather than as backlog text. Re-open P0 only when a new release-confidence or doc-correctness gap surfaces — it should be the place that catches "we haven't written the gate yet," not "we keep meaning to come back to this."
- **Canvas render-helper module (`canvasRenderHelpers.ts`)** — extracted four primitives that recurred across `bar`/`area`/`line`/`pointCanvasRenderer.ts` in byte-identical form: `resolveCurveFactory(curve)` (the d3-shape token switch was duplicated identically between `area` and `line`; adding a curve token previously required two lockstep edits), `resolveCanvasFill(ctx, fill, fallback)` (replaces the `(typeof X === "string" ? resolveCSSColor(ctx, X) : X) || fallback` form that appeared 5+ times across the four renderers and silently fell back to `#000000` when consumers passed CSS-variable strings), `buildLinearFillGradient(ctx, fillGradient, baseFill, x0, y0, x1, y1)` (replaces `barCanvasRenderer`'s `buildBarGradient` and `areaCanvasRenderer`'s inline gradient block — both implemented the same `colorStops` / `topOpacity` two-shape switch with the same offset clamping and the same `parseCanvasColor` opacity-form normalization; `bar` already filtered NaN offsets before the 2-stop minimum check, `area` filtered them inline and could silently render a 1-stop transparent fill — the helper unifies on `bar`'s stricter behavior, with the renderer falling back to flat fill when the helper returns `null`), and `buildColorStopGradient(ctx, strokeGradient, x0, y0, x1, y1)` (replaces the stroke-side colorStops gradient construction in `area`'s top-stroke branch and `line`'s stroke branch). Renderer-specific path tracing (rounded-corner bar paths, area decay strips, line threshold-color crossings, area `traceAreaPath` with curve-vs-linear branching) stays in the renderer that owns the mark — this is an extraction of mechanical seam boilerplate, not an abstraction over what each mark draws. Net renderer surface: 784 → 686 lines (-98), with 163 lines of helpers added (net +65, but every duplication is gone — adding a new curve token, gradient form, or fill resolution case is one edit instead of four). New `canvasRenderHelpers.test.ts` (11 tests) locks in null-return semantics for pathological inputs (1-stop colorStops, NaN offsets), fallback behavior on null/undefined fills, and the linear-fallback sentinel. Companion P3 plan for a `findNearestSceneNode` hit-tester factory was audited and skipped — only XY + Ordinal share the quadtree-fast-path + closest-wins shape (~10 line overlap), Network and Geo have genuinely different two-loop / three-phase structures, and the per-mark hit functions that make up the bulk of each tester don't share. Full suite (3515 tests) green; `check:test-quality` baseline (156) unchanged.
- **`setupCanvasMock` adoption sweep — four rAF stubbing flavors + leak-tight cleanup** — `setupCanvasMock` now accepts `stubRaf: boolean | "noop" | "microtask"` so the four test-side rAF cadences live in one place: `true` (default, synchronous fire) for assertions that just want a paint, `false` for force-simulation specs that need jsdom's setTimeout cadence, `"noop"` for "observe initial mount-time state" regression suites that would recurse under sync fire (the per-frame `*Style → pipelineConfig` regression specs in `StreamGeoFrame.test.tsx` and `StreamNetworkFrame.test.tsx` now use this), and `"microtask"` for tests where sync fire would recurse `scheduleRender` but jsdom's setTimeout latency is too costly (the StrictMode HOC suite). Migration cleared the last three test files reimplementing canvas + Path2D + rAF/cAF spies inline (`StreamGeoFrame.test.tsx`, `StreamNetworkFrame.test.tsx`, `StrictMode.test.tsx`); `StrictMode.test.tsx`'s previous `teardownMocks` only restored rAF/cAF and leaked `getContext` + `Path2D` into later test files via the shared `HTMLCanvasElement.prototype` and `globalThis`, which the helper's symmetric capture-then-restore now closes. Sync-fire flavor returns rAF id `0` deliberately: `useFrame.scheduleRender` treats `rafRef.current` as a truthy "pending" flag (`if (rafRef.current) return`), and the assignment sequence `rafRef.current = requestAnimationFrame(cb)` lets a non-zero return overwrite the renderer's own `rafRef.current = 0` reset and silently coalesce the next `scheduleRender` into a phantom pending rAF. Caught during the migration when the previously-inlined sync stubs in `DotPlot.streaming-order` / `LikertChart.streaming-order` / `StreamOrdinalFrame` / `StreamXYFrame` push-API specs started returning `getScales() === undefined` after the second push; the docstring on the sync branch now spells out the invariant so a future "let's number the ids properly" change won't regress it. `noop` and `microtask` flavors return monotonically-increasing ids because their callers never relied on the truthy-flag invariant. The paired `cancelAnimationFrame` mock now honors cancellation for the `"microtask"` flavor (tracks ids in a `cancelled` set; the deferred callback no-ops on fire) so production cleanup paths — `useFrame` unmount, `DataSourceAdapter` chunk timers, `MinimapChart` polling — don't leak into post-unmount state updates or runaway loops in StrictMode-style tests; sync-fire and noop flavors don't need it (already-fired and never-fires respectively). Full suite (3515 tests across 189 files) green; `check:test-quality` baseline (156 mount-only candidates) unchanged.
- **Shared AI/MCP component metadata** — `ai/componentMetadata.cjs` is now the shared source for component category, import, renderability, and registry metadata across the CLI, MCP resources, and surface-parity checks. `check:surface` is wired into release gates so schema, `semiotic/ai`, MCP renderability, and server-renderer support cannot drift silently.
- **Shared chart recommendation engine** — `ai/chartSuggestions.cjs` powers both MCP `suggestChart` and `npx semiotic-ai --suggest`, with recommendations for network, hierarchy, geographic, temporal, categorical, and magnitude data shapes. The CLI supports stdin on all platforms via fd `0`.
- **MCP protocol smoke coverage** — `src/__tests__/scenarios/mcp-protocol.test.ts` exercises stdio JSON-RPC and Streamable HTTP initialization/tools-list flows, including robust parsing for JSON and SSE responses.
- **API docs extraction coverage** — `api-docs-extraction.test.js` locks down TypeDoc re-export resolution, props alias handling, function-signature formatting, examples, inherited-prop labels, and component summaries.
- **Docs route smoke check** — `check:docs-routes` validates prerendered homepage/API routes, route metadata, sitemap entries, and generated API JSON assets; `website:build` now runs it after prerender.
- **AI behavior contracts** — `ai/behaviorContracts.cjs` is now the structured source for agent-visible semantic rules that schema parity cannot express: categorical color precedence, required prop combinations, push/ref behavior, ID-accessor mutation requirements, and renderChart/static-data boundaries. `semiotic-ai --doctor` and MCP `diagnoseConfig` now accept `usageMode: "static" | "push"` so static/renderChart configs still require data while ref-push React HOCs can intentionally omit it. The MCP `semiotic://behavior-contracts` resource and generated AI docs consume the same rule metadata; `check:ai-contracts` is wired into release gates.
- **Test quality gate** — `check:test-quality` baselines existing frame/canvas mount-only assertion candidates and fails when new candidates are introduced without updating the baseline. The release and prepublish gates now run it so new tests must prefer semantic assertions against scene summaries, rendered output, callbacks, or user-visible behavior.
- **Streaming legend frame-domain subscriptions** — `StreamOrdinalFrame` and `StreamXYFrame` expose `legendCategoryAccessor` and `onCategoriesChange`; pushed legends now populate, shrink, relabel, and clear after insert/remove/update/clear. `LinkedCharts` has a live category registry so unified legends and shared category colors update from child chart domains.
- **ThemeProvider first-render coverage** — new tests prove preset/object themes, CSS custom properties, prop changes, and forced-colors initialization are visible to children on the first render.
- **PipelineStore config-only cache regressions** — cache tests now cover scene rebuilds from `themeSemantic.primary`, `themeSequential`, and `barColors` changes without data ingest.
- **HOC JSDoc coverage** — every public HOC (38/38) now ships with at least 2 `@example` blocks, a top-line summary that cross-references sibling charts via `{@link}`, and `@default` annotations on the most-used optional props. Previously only 5 HOCs had any examples; the rest relied on schema summaries. Format is consistent across families: simple usage → encoded variants → push-API or advanced cases. Surfaced through TypeDoc (`/api/typedoc`) and TypeScript hover-help.
- **streamProps construction helpers** — `src/components/charts/shared/streamPropsHelpers.ts` exposes three pure helpers that replace the spreads recurring in every XY/ordinal HOC's `streamProps = { ... }` literal: `buildBaseMetadataProps` (the `...(title && { title })` chain across `title`/`description`/`summary`/`accessibleTable`/`className`/`animate`, with per-field truthy-vs-defined gates that match the inline form), `buildTooltipProps` (the `tooltip === false ? () => null : (normalizeTooltip(tooltip) || defaultTooltipContent)` ternary), and `buildCustomBehaviorProps` (the conditional `customHoverBehavior` / `customClickBehavior` spread, with a `linkedHoverInClickPredicate` flag so geo / `CandlestickChart`-style HOCs that exclude `linkedHover` from the click predicate get the right semantics from the same helper). 19 HOCs migrated across the four families; the 9 holdouts have non-standard variants (LineChart's 4-state `tooltip === "multi"` branch, ChoroplethMap's 4-state `tooltip === true` branch, the geo HOCs' `resolved.X` metadata destructure, LikertChart and FunnelChart's chart-specific tooltip flow, MultiAxisLineChart's series unitization, QuadrantChart's overlay graphics) and stay inline because the helper would have to grow more knobs than the boilerplate it's saving. Net 19 files changed, 228 deletions vs 171 insertions (-57 lines on the HOC surface; the helper module adds ~135). The bigger win is centralizing the three predicates so a future change to the linked-hover-vs-click wiring rule edits one spot instead of 19. Unused `normalizeTooltip` imports in the migrated files dropped during the same pass; typecheck + 3515 unit tests + chart-specs / context7 / mcp-registry / test-quality gates all green.
- **AI-discoverability prep + DISCOVERABILITY.md playbook** — `server.json` at the repo root refreshed for the official MCP Registry publish flow (version + npm identifier sync'd to current `package.json`, title/websiteUrl/registryBaseUrl fields added that the registry validator wants). README gained an `mcp-name: io.github.nteract/semiotic` literal string in the MCP Server section (registry validator substring-matches it as proof the npm package and the registry entry are the same artifact) and a "Where to find Semiotic for AI assistants" section linking the discovery surfaces (Context7, DeepWiki, GitMCP, MCP Registry, Smithery) plus the agent-facing files that ship inside the package (`CLAUDE.md`, `llms.txt`, `llms-full.txt`, `ai/schema.json`, `ai/behaviorContracts.cjs`). New `check:mcp-registry` gate (`scripts/check-mcp-registry.mjs`) cross-references all three sources — `server.json`, `package.json#mcpName` / `name` / `version`, and the README literal — and fails the build if any of them drift, since drift only surfaces at publish time otherwise. Wired into `release:check`, `prepublishOnly`, and the CI workflow alongside `check:context7`. New top-level `DISCOVERABILITY.md` documents the 9 places worth listing Semiotic with copy-pasteable submission text and CLI commands; the README's discovery section is the consumer-facing summary, `DISCOVERABILITY.md` is the maintenance playbook.
- **Context7 manifest + freshness gate** — `context7.json` lives at the repo root and points the Context7 indexer at the agent-facing surface (`CLAUDE.md`, `docs/public/llms-full.txt`, `docs/src/pages/charts`, `ai/`) with `excludeFolders` for `dist`/`build`/`node_modules`/snapshot dirs, plus a `rules` array distilled from `behaviorContracts.cjs` (sub-path imports, push-mode `data` semantics, ID-accessor requirements for `remove`/`update`, categorical color precedence, geo-import discipline, required prop combinations, server-rendering boundaries). New `check:context7` gate (`scripts/check-context7.mjs`) validates JSON syntax, the 255-char-per-rule limit Context7 silently rejects on, that every `folders` entry resolves on disk, and that the sub-path rule's import names line up with `package.json`'s `exports` keys. Wired into `release:check`, `prepublishOnly`, and the CI workflow. `behaviorContracts.cjs` carries an inline maintenance note pointing edits at `context7.json` so content drift between the two stays visible during code review (the gate catches format drift but not semantic drift).
  - **`useFrameImperativeHandle(ref, { variant, frameRef, overrides?, deps? })`** at `src/components/charts/shared/useFrameImperativeHandle.ts` — extracts the 7-method `RealtimeFrameHandle` bridge (`push` / `pushMany` / `remove` / `update` / `clear` / `getData` / `getScales`) every HOC implemented inline. Three variants: `"xy"` (vanilla pass-through to `frameRef.current`), `"network"` (topology-walking `removeNode` / `updateNode`), and `"geo-points"` (`removePoint`-based with emulated `update`). HOCs with bespoke wrappers — `BubbleChart`'s wrapped push that tracks the streaming size domain, `SankeyDiagram` / `ChordDiagram`'s edge-shaped `getData` — pass `overrides` to selectively replace methods while keeping the variant defaults for the rest. `MultiAxisLineChart` and `LikertChart` keep their inline handles (per-series unitization and pre-aggregation diverge enough that the helper would fight rather than help). Migrated 22 HOCs across the four families.
  - **`const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, ...rest } = resolved`** — every HOC unpacked the post-`useChartMode` alias bundle into a 9-to-11-line block of `const X = resolved.X` lines. Replaced with a single destructure across 32 HOCs. Plain JS object destructuring (no helper, no API surface, no test) handles the same job, including the `?? false` fallback case that ForceDirectedGraph uses (translates cleanly to the destructure-default `showLabels = false` form because the `ChartModeResult` shape allows only `boolean | undefined`).
- **`useChartSetup` unification closed** — the standing question of whether `useChartSetup` should grow optional inputs for dual-axis (`MultiAxisLineChart`) and projection (geo) cases is resolved with no API change. `MultiAxisLineChart` already integrates by passing `colorBy: SERIES_FIELD` (a synthetic series field) and bumping `marginDefaults.left/right` to 70 for the dual-axis layout — the unitization step that makes the chart dual-axis lives above setup, not inside it. `ProportionalSymbolMap`, `FlowMap`, and `DistanceCartogram` integrate cleanly today with the existing setup surface; the d3-geo projection lives inside `StreamGeoFrame`, not in any HOC-reachable seam, so there is no "pre-projected coordinates" path that wants exposing. `ChoroplethMap` is a separate shape (sequential gradient legend driven by a value scale, not categorical) and is intentionally outside `useChartSetup`'s scope. Outcome: no new optional inputs added, no new consumers in the queue — the unification work is complete.
- **LineChart drops standalone `useStreamingLegend` — `useChartSetup` owns the full legend pipeline** — LineChart used to layer a separate `useStreamingLegend` call on top of `useChartSetup`: that hook re-tracked discovered categories via `wrapPush`/`wrapPushMany`, registered them with the parent `LinkedCharts` via `useLinkedChartCategories`, and produced a `streamingLegend` element + `streamingMarginAdjust` that the HOC merged on top of `setup.legend` / `setup.margin`. After this change, `useChartSetup` already does the equivalent end-to-end: `useChartLegendAndMargin` (called inside setup) registers the live category domain with `LinkedCharts`, and the synthesized `legendColorScale` + `setup.legend` carry the same provider → scheme → theme → STREAMING_PALETTE precedence the marks use. LineChart now spreads `setup.legendBehaviorProps` (which includes `legendCategoryAccessor` + `onCategoriesChange` for the frame, plus the legend slot and legend-interaction handlers) and reads `setup.legend` / `setup.margin` directly. `useStreamingLegend` stays in the codebase as a low-level escape hatch for aggregator HOCs that need to intercept push calls BEFORE ingest (LikertChart re-aggregating streamed rows into level × count); its docstring now flags this as a niche case and points new code at `setup.legend` / `setup.margin`. No behavior change in either bounded or push mode for LineChart consumers; 3507 unit tests including the dedicated push-mode legend color regression suite continue to pass.
- **Test quality gate burn-down: ordinal bar family + Playwright** — Two passes against the mount-only assertion baseline:
  - **Ordinal bar family unit tests:** `BarChart.test.tsx` (16 mount-only checks), `StackedBarChart.test.tsx` (8), and `GroupedBarChart.test.tsx` (1) replaced their `expect(frame).toBeTruthy()` mount-only assertions with semantic checks against the props the HOC actually forwards to `StreamOrdinalFrame`: `chartType`, `data`, `oAccessor`/`rAccessor`, `projection`, `oSort` (plus a sortedness check on the pre-sorted data when `sort` is `"asc"`/`"desc"`), `barPadding`, `enableHover`, `showGrid`, `size`, `stackBy`, `groupBy`, `normalize`, `legend.legendGroups[0].items` (distinct colors per category for `colorScheme` checks), and `frameProps` escape-hatch overrides. Caught and locked in a real distinction along the way: `GroupedBarChart` routes through `chartType: "clusterbar"`, not `"bar"`. The intentional sparse-array hardening test gets the documented `// test-quality-gate: allow-mount-only` opt-out so the gate doesn't fight a test whose whole purpose is to prove no-crash-on-sparse-input.
  - **Playwright integration specs:** 9 `canvas.toBeVisible()` / `svg.toBeVisible()` mount-only checks across `accessibility.spec.ts`, `brush-selection.spec.ts`, `coordinated-views.spec.ts`, `geo-charts.spec.ts`, `hoc-legend.spec.ts`, `realtime-charts.spec.ts`, and `streaming-regression.spec.ts` replaced with semantic `aria-label` regex matches (`/\d+/`). The data canvas's `aria-label` is set by `computeCanvasAriaLabel` only after the scene populates (e.g. `scatter, 50 points`), so the new check requires real paint — a regression that wires the canvas up but never draws would slip past `toBeVisible()` but trip the regex. The coordinated-views hover test now asserts a `.stream-frame-tooltip` element appears after hover (proving the interaction-canvas hit-test resolved a point) instead of just checking the overlay canvas exists.
  - **Net baseline change:** 190 → 156 mount-only candidates (~18% reduction across both passes). The Playwright sweep is the higher-leverage half: those tests run in a real browser, where mount-only checks are blind to drawn-pixels regressions that semantic assertions catch.
- **Sparse-array prop hardening across every ingestion path** — public chart HOCs now filter `null`/non-object entries from array props (`data`, `points`, `nodes`, `edges`, `flows`, `series`, `areas`) before any iteration. CSV/loader pipelines commonly emit `[null, validRow, undefined]`-shaped input, which previously crashed inside `useChartSetup`, `useColorScale`, `inferNodesFromEdges`, the choropleth geometry validator, and the StreamFrame ingestion path. A new shared identity-preserving helper at `src/components/charts/shared/sparseArray.ts#filterSparseArray` returns the original reference when nothing is dropped (preserving `useMemo` cache hits in the clean case) and is wired through every ingestion seam:
  - `useChartSetup` filters its `data` input and exposes the sanitized array as `setup.data`; the empty-state check filters `rawData` too, so `[null, undefined]` lands on the empty-state UI rather than rendering blank.
  - `DataSourceAdapter` filters `setBoundedData`, `setReplacementData`, `push`, and `pushMany`. Push-mode `ref.pushMany([null, valid])` now silently drops the null and lands the valid row instead of crashing extent reads inside the pipeline store.
  - `StreamGeoFrame.pushPoint`/`pushMany` and `StreamNetworkFrame.pushEdge`/`pushManyEdges` mirror the same filtering at the geo/network frame boundaries (those frames don't route through `DataSourceAdapter`).
  - 26 HOCs replaced their `safeData = data || []` with the identity-preserving filter; `MultiAxisLineChart`'s `series` prop, the network family's `nodes`/`edges`, and `ChoroplethMap`'s resolved `areas` got the same treatment.
  - `ForceDirectedGraph`/`SankeyDiagram`/`ChordDiagram` empty-state checks route through their filtered arrays so sparse-only input triggers empty UI.
  - `ProportionalSymbolMap` and `FlowMap` were migrated to drop their own pre-setup filter and read `setup.data` directly (eliminates the double-scan when `useChartSetup` would re-filter the same array).
  - A new `EMPTY_ARRAY` singleton (frozen) is used as the stable push-mode default in HOCs that need an array literal; per-render churn through the sparse-filter `useMemo` is gone.
  - New regression test `src/__tests__/scenarios/sparse-array-hardening.test.tsx` covers one HOC per data-iteration shape, plus push-mode ingestion drops and empty-state routing — 17 cases, all green.
- **Push-mode legend color regression suite (XY + geo)** — `src/__tests__/scenarios/push-mode-legend-colors.test.tsx` exercises the legend-color synthesis precedence (`CategoryColorProvider` → explicit `colorScheme` array → string scheme name → `ThemeProvider` categorical → default theme) against `LineChart` (xy / `useStreamingLegend` path) and `ProportionalSymbolMap` (geo / `useChartSetup` path) mounted in push mode for each tier. 10 tests total. The "bare push" tier's behavior is documented inline: it resolves to `LIGHT_THEME.colors.categorical` because the theme store seeds a non-empty default categorical palette, leaving `STREAMING_PALETTE` as a defense-in-depth fallback rather than a reachable production path. Negative-anti-source assertions catch any regression that surfaces `STREAMING_PALETTE` from a wrongly-ordered precedence chain.
- **StreamGeoFrame push-mode legend category emission** — `StreamGeoFrame` now reads `legendCategoryAccessor` + `onCategoriesChange` from props and emits the live category domain after every scene rebuild, mirroring `StreamXYFrame` / `StreamOrdinalFrame`. Push-mode geo HOCs (`ProportionalSymbolMap`, `FlowMap`) now propagate their discovered categories back through `useChartSetup`'s `frameCategories` state, so the synthesized legend renders with the correct swatches the moment data starts flowing. Previously the props were accepted on the HOC side but unread by the frame, so push-mode geo legends never populated. Frame-level coverage in `StreamGeoFrame.test.tsx` exercises the emission across `pushMany` / `removePoint` / `clear` so a regression in the wiring is caught at the frame level, not just through HOC scenarios.
- **Chart Spec Registry — Phases 1–4 (all 43 chart families)** — `src/components/charts/shared/chartSpecs.ts` is the single source of truth for the prop specifications of every Semiotic HOC: 15 ordinal + 12 XY + 7 network + 4 geo + 5 realtime = 43 charts. Three pure generators in `scripts/lib/chart-specs-generators.mjs` (`generateSchemaToolEntry`, `generateValidationMapEntry`, `generateMetadataEntry`) produce `ai/schema.json`, `validationMap.ts`, and `componentMetadata.cjs` entries from each `ChartSpec`; `scripts/regenerate-schema.ts` re-baselines `ai/schema.json` from the registry. A 130-test round-trip suite (`chart-specs-round-trip.test.ts`) iterates over `CHART_SPECS` and asserts deep structural equality on the parsed schema tool entry and validationMap entry per chart, plus componentMetadata category correctness and a top-level set-parity check that `CHART_SPECS` keys exactly match the canonical name sets in `ai/schema.json`, `validationMap.ts`, and `ai/componentMetadata.cjs`. `check:chart-specs` is wired into release/prepublish gates and the CI workflow. Adding a new chart is now one edit (a `ChartSpec` entry) plus regeneration; previously it required three coordinated hand-edits across schema/validation/metadata files.

### Changed

- **Docs prerendering pipeline** — route extraction handles nested and multiline route declarations, root and nested pages get idempotent canonical/LLM alternate/JSON-LD/noscript metadata, homepage metadata is normalized consistently, and prerender functions can be imported directly for scenario tests.
- **TypeDoc API reference** — `/api/typedoc` now covers the full chart HOC surface, resolves re-exported props declarations instead of stopping at reference stubs, shows component summaries/examples, formats callback prop signatures, and labels inherited props from shared interfaces.
- **ThemeProvider initialization** — the scoped ThemeStore is seeded with the resolved initial theme before children render. This removes the previous light-theme-first path for `useTheme()`, chart color defaults, and CSS variables.
- **Canvas theme bridge** — `useFrame` owns theme-change invalidation from a layout-timed effect: clear CSS-var color cache, mark the frame dirty, and schedule a repaint whenever the ThemeStore theme changes.
- **Streaming legends and linked colors** — push-mode legends now source swatch colors from the same provider/theme/color-scale path as rendered marks, so child legends and unified `LinkedCharts` legends agree.
- **HOC shared setup unification** — `LineChart`, `AreaChart`, `StackedAreaChart`, `QuadrantChart`, `ConnectedScatterplot`, `BubbleChart`, `ProportionalSymbolMap`, `FlowMap`, and `DistanceCartogram` now use `useChartSetup` for categorical color scales, legends, selection/hover/click behavior, loading/empty states, and margins, while keeping chart-specific logic (statistical overlays, gap handling, direct-label margins, line/area/stack transforms, size domains, quadrant overlays, projection, flow point→edge hover translation, and cartogram layout) local. `useChartSetup` itself now synthesizes a push-mode legend color scale from discovered categories using the same precedence as `useColorScale` (provider → explicit scheme → theme → STREAMING_PALETTE), so legend swatches and rendered marks agree on every converted chart without each one needing to layer `useStreamingLegend` separately.
- **StackedAreaChart AI contract** — `areaBy` is now marked required in the AI schema and validation map, matching the existing LLM guidance that StackedAreaChart needs an explicit grouping field for stacked series.
- **HOC rendering scenario tests** — high-value public wrapper smoke tests now assert scene summaries, legend labels, annotation labels, and explicit empty/loading states instead of only proving that a canvas mounted.
- **OUTSTANDING_WORK.md** — collapsed into an active priority backlog only; completed dependency migrations, theming milestones, AI/MCP work, prerendering, streaming legend work, quadtree work, and cache/theme fixes were removed from the backlog and recorded here instead.

### Removed

- **`check:schema` / `check-schema-freshness.js`** — schema↔validation per-prop drift is now construction-guaranteed by the Chart Spec Registry round-trip (`check:chart-specs`). The CLAUDE.md component-coverage cross-check that lived inside `check:schema` is preserved as a slim, focused gate at `scripts/check-claude-md-coverage.js` (`npm run check:claude-md-coverage`). `check:surface` no longer asserts schema↔validation name parity (also covered by registry round-trip) and instead focuses on `semiotic/ai` exports, MCP renderable registry entries, AI component metadata, and server renderChart configs. CI workflow and release/prepublish gate scripts are updated accordingly.

### Fixed

- **Production builds preserve `"use client"` after terser** — `npm run dist:prod` was failing the post-build directive-placement gate: every client bundle's minified output came out missing the directive. Root cause: `useClientPlugin.renderChunk` was prepending `"use client";` to the output, then terser's `renderChunk` ran AFTER it and silently dropped the top-level string expression through its parse → compress → emit pipeline (default terser doesn't preserve `"use client"` the way it preserves `"use strict"`). Fix: split `useClientPlugin`'s registration so its `transform` hook still scans modules during the parse phase but its `renderChunk` is appended LAST in the plugin array — after terser. The directive is the absolute final write to the chunk; terser never sees it. Caught by the inverse-direction post-build assertion that gates client-only bundles must carry the directive (added in the previous round); without that gate the regression would have shipped silently.
- **`PipelineStore.ingest` is idempotent on identical bounded data refs** — the SSR branch in every Stream Frame calls `store.ingest({ inserts: data, bounded: true })` from inside render. React StrictMode renders components twice in dev mode, so the second render's ingest would clear the buffer and re-fill it from the same data array — wasted work, and a real correctness risk if a future change made the second pass non-trivially different. Now: the first call records `_lastBoundedInsertsRef`; a subsequent call with the same reference returns `false` immediately as a no-op. `clear()` resets the dedupe ref so post-clear ingests re-run normally. Streaming (non-bounded) ingests are unaffected — each push is meaningful and shouldn't dedupe.
- **Build's `"use client"` detection accepts leading comments** — the rollup plugin used `code.startsWith('"use client"')`, which silently missed every source file that opened with a JSDoc block (StreamOrdinalFrame, useFrame, useHydration, useChartSetup, several others — 7 files total). Bundles still ended up directive-tagged in practice because each chunk pulled in *some* other module that opened with the bare directive, but a future change isolating one of those JSDoc-headered files into its own chunk would silently lose the directive on its bundle. Replaced with `hasLeadingUseClientDirective()` that skips leading whitespace + line comments + block comments before checking — the same way Next.js / React's parsers interpret the directive. Added: (1) a 14-case unit test covering positive (with/without leading comments, single vs double quotes) and negative (directive in a string, after an import, no directive at all) inputs; (2) a complementary post-build assertion that `clientOnly: true` bundles MUST carry the directive on output (catches the inverse regression where a detection bug silently drops the tag from a chart-family bundle, which would crash Next.js Server Components importing from that sub-path with browser-API errors at runtime).
- **`cancelIntroAnimation` now clears per-node `_introClipFraction`** — `synthesizeIntroPositions` sets `_introClipFraction = 0` on line and area scene nodes (the canvas renderers consume it directly to clip the path from the left). The earlier Phase 4 `cancelIntroAnimation` cleared `prevPositionMap` / `prevPathMap` / `activeTransition` but left the per-node flag, which would silently produce a fully-clipped (blank) line / area chart on the first canvas paint after SSR hydration. Now walks the scene and resets the flag to `undefined` for line / area nodes. Regression test in `PipelineStore.cancelIntro.test.ts` asserts every line node's clipFrac is undefined after cancel.
- **CSR mounts skip the wasted SVG render** — the SSR/hydration gate on every Stream Frame was `if (isServerEnvironment || !hydrated)`, which forced a full SVG render on the first render of every client-side mount, even when there was no SSR HTML to match. Tightened to `if (isServerEnvironment || (!hydrated && wasHydratingFromSSR))` — the SSR signal we already use for intro-animation cancellation now also gates this branch. CSR mounts skip the SVG render entirely and go straight to canvas; SSR rehydration still gets the byte-identical SVG output it needs. Net effect: one less synchronous scene-build + SVG conversion per client-only chart mount, with no behavior change for SSR consumers.
- **`createStore` no longer calls `createContext` at module load** — even with the `"use client"` directive removed from `semiotic/server`, the bundle still pulled in `createStore.tsx`, which called `React.createContext` eagerly when each store factory ran. React Server Components ship a build of `react` that omits `createContext` entirely, so importing `semiotic/server` from a Server Component threw `(0, p.createContext) is not a function` before `renderChart` ever ran. Refactored `createStore` to defer the `createContext` call until `Provider` / `useSelector` actually executes — both of which only run on the client. Added an `RSC import safety` regression test that mocks `react` to throw on `createContext` and asserts the factory call doesn't trip it. Caught by the SSR demo's `manual-placeholder` route at request time.
- **`ForceDirectedGraph` accepts `nodeIdAccessor` (camelCase)** — the historical prop name was `nodeIDAccessor` (uppercase ID), which was inconsistent with the rest of the network HOCs (`SankeyDiagram`, `ChordDiagram`, `TreeDiagram`, `OrbitDiagram` all use camelCase `nodeIdAccessor`). The casing inconsistency surfaced during the SSR demo's verification matrix. Both prop names are accepted now; `nodeIdAccessor` is canonical and `nodeIDAccessor` is a `@deprecated` alias slated for removal in 4.0. When both are passed, `nodeIdAccessor` wins. Codemod follow-up tracked for the external `semiotic-codemod` repo: a `force-directed-graph-node-id` transform that renames the JSX attribute on existing `<ForceDirectedGraph>` usages.
- **`semiotic/server` no longer carries `"use client"`** — the build's directive plugin tagged any chunk that contained a transitively-imported client module, which leaked the directive into the server-only entry point. Calling `renderChart` (or any other server export) from a Next.js Server Component threw at runtime: "Attempted to call X() from the server but X is on the client." The fix is a per-bundle `serverOnly` flag on the build config that opts the server bundle out of the directive unconditionally, plus a post-build assertion (`assertDirectivePlacement`) that fails the build if the regression ever returns. Caught by an SSR demo that exercised the manual-placeholder pattern; the auto-hydrating XY/ordinal/network HOCs were unaffected because they don't import from `semiotic/server`.
- **HOC JSDoc accuracy pass** — 13 doc inaccuracies caught and corrected against source: `ForceDirectedGraph` `nodeSize` / `nodeSizeRange` defaults, push-mode opt-in for `nodes`/`edges`, and the fabricated `frameProps.initialPositions`; `PieChart.startAngle` units (degrees, not radians) and the matching example value; `PieChart.valueAccessor` aggregation by `Math.abs` for negatives; `QuadrantChart` example commentary; `ChoroplethMap.areas` shape (`Feature[]`, not `FeatureCollection`) and the async `resolveReferenceGeography` example pattern; `MinimapChart` examples that referenced non-existent `chart`, `minimapHeight`, `initialExtent`, `onBrushChange` props; `ScatterplotMatrix` example that wrapped the matrix in an outer `<LinkedCharts>` even though the component already creates its own provider internally; `ProportionalSymbolMap` push example missing the `id` field required by `pointIdAccessor`. All examples now match the real prop surface and copy-paste cleanly.
- **AI chart suggestions copy/paste correctness** — ForceDirectedGraph suggestions no longer imply nodes are optional, hierarchy suggestions reference the provided data shape, heatmap recommendations require two dimensions plus a value, sample inputs are capped, and generated JSX string props are escaped safely with `JSON.stringify`.
- **MCP HTTP test robustness** — startup retries wait for child-process exit before rebinding; response parsing handles plain JSON and SSE data events instead of assuming a single `data:` line.
- **Prerender structured-data duplication** — injected JSON-LD now carries the same `data-jsonld="semiotic"` marker the client hook checks, preventing duplicate runtime scripts. De-duplication is scoped to Semiotic-owned JSON-LD rather than all SoftwareApplication schemas.
- **Prerender metadata consistency** — canonical and `og:url` metadata are normalized together, including the homepage URL shape.
- **SSR alignment test isolation** — `ssr-alignment.test.ts` checks a temporary SceneToSVG copy instead of mutating tracked source files during parallel Vitest runs.
- **GaugeChart LLM docs** — machine-readable docs now correctly list `thresholds` as optional, matching the TypeScript API.
- **`validateProps` data shape handling** — the `"none"` data shape is handled explicitly so no-data components do not accidentally fall through realtime validation assumptions.

### Tooling

- **3324 unit tests pass** after the latest backlog cleanup and cache regression additions.

## [3.4.2] - 2026-04-23

### Added

- **`gradientFill` on `BarChart`** — same API as `AreaChart.gradientFill`: `true` for a default 80%→5% opacity fade on the resolved bar color, `{ topOpacity, bottomOpacity }` for explicit opacity stops, or `{ colorStops: [{offset, color}, ...] }` for arbitrary multi-color gradients. Direction always runs from each bar's tip (opposite the baseline) toward its base, so positive/negative and vertical/horizontal orientations all do the right thing. The scene builder now tags every rect with `roundedEdge` unconditionally (previously only when `roundedTop > 0`) so gradient direction resolves without requiring rounded corners. New `buildBarGradient` helper in `barCanvasRenderer.ts` builds the `CanvasGradient` per bar; `StackedBarChart` / `GroupedBarChart` get it for free via the shared scene + renderer.
- **SVG / SSR rendering for bar gradients** — `ordinalSceneNodeToSVG` in `SceneToSVG.tsx` emits `<defs><linearGradient>` + `fill="url(#id)"` for rect nodes carrying `fillGradient`. Works through both `renderToStaticSVG` (server) and `animatedGif` (GIF export) automatically since both delegate to the shared scene-to-SVG converter. Uses `gradientUnits="userSpaceOnUse"` with absolute coords so each bar's gradient tracks its own rect. New `safeSvgId` helper coerces category names containing spaces/punctuation to a legal SVG id charset before embedding them in the gradient's `id` and `url(#...)` reference.
- **`renderers/colorUtils.ts`** — shared `parseCanvasColor(ctx, color)` used by both `barCanvasRenderer` and `areaCanvasRenderer`. Resolves any valid CSS color (named like `"steelblue"`, `hsl()`, `rgb()`, hex short/long) to an `[r, g, b]` tuple via a `ctx.fillStyle` round-trip that the browser normalizes. Uses a sentinel-probe pattern so silently-rejected invalid colors (canvas ignores them and leaves `fillStyle` at the previous value) fall back safely instead of being mis-parsed as the prior color. Unified the two previously-duplicated local `parseColor` helpers. Bar-gradient dev demos on `/charts/bar-chart` cover three shapes: opacity fade, multi-color stops, and horizontal bars.

### Changed

- **JSX transform flipped to the automatic runtime.** `tsconfig.json` and `tsconfig.mcp.json` now use `"jsx": "react-jsx"` instead of the classic `"jsx": "react"`. JSX compiles to imports from `react/jsx-runtime` rather than `React.createElement(...)`, matching React 17+ guidance and removing the "outdated JSX transform" runtime warning that was peppering test output. ESLint flat config layers `reactPlugin.configs["jsx-runtime"].rules` on top of `recommended` to disable `react/react-in-jsx-scope` and `react/jsx-uses-react` (both obsolete under the new runtime). 17 test files lost their now-redundant `import React from "react"` imports; the 51 files that reference `React.X` types kept theirs. Rollup's `external` predicate in `scripts/build.mjs` extended to cover the `react/jsx-runtime` and `react/jsx-dev-runtime` subpaths alongside the existing `react-dom/server` entry (auto-external marks package roots external but not subpaths).
- **Empty legends no longer reserve margin.** `useChartLegendAndMargin` previously returned a truthy legend object with `legendGroups: [{ items: [], label: "" }]` when mounted with no `data` (push-API pattern) plus `colorBy` — that reserved 110px of right margin and rendered only the legend's header neatline. Zero-item legends now resolve to `undefined`, so no margin is reserved and the chart uses the full width until categories arrive. Surfaced by the "Update: Bar Chart" demo on `/features/push-api`.
- **Dependency hygiene.** `react-router` and `marked-gfm-heading-id` moved from `dependencies` → `devDependencies` (both are docs-only — never imported by anything under `src/`). Removed `tslib` as an explicit dev dep (no `importHelpers: true` in either tsconfig, so TypeScript never emits tslib references). `@testing-library/dom` now an explicit `devDependency` (was a transitive peer of `@testing-library/react@16+`; missing on `npm install --legacy-peer-deps` and broke 79 test files on the publish workflow). Net: Cloud consumers installing the library get 19 runtime deps instead of the 22 they were getting before. `grep -c "react-router\|marked-gfm-heading-id\|tslib" dist/semiotic.module.min.js` returns 0.

### Fixed

- **Publish workflow OOM in `prepublishOnly`.** Four of the five `node scripts/build.mjs` invocations across package.json scripts were missing the `--max-old-space-size=8192` flag that `dist` and `dist:prod` carry; the one that ran on publish hit Node's 4GB default heap ceiling and died during rollup minification with a mark-compact GC failure (exit 134). All five invocations (`build:analyze`, `build:prod`, `pretest:dist`, `release:check`, `prepublishOnly`) now share the heap bump, and the last two route through `npm run dist:prod` so there's one source of truth for how to invoke the build.
- **`parseCanvasColor` detects silently-rejected invalid colors.** The browser ignores invalid CSS color assignments without throwing — `fillStyle` stays at whatever was set before. Without a probe, feeding an invalid color to the parser would mis-read the *previous* color as the caller's input. Added a sentinel-set-first pattern: assign `#010203` before the user's color, then compare; if the sentinel is still there (and the input wasn't literally the sentinel), return the fallback tuple. Also guards the non-string `fillStyle` case (`CanvasGradient` / `CanvasPattern`).
- **`buildBarGradient` / `buildRectSVGGradient`: < 2 valid stops falls back to solid.** Both previously checked `fg.colorStops.length >= 2` but then filtered out `NaN` offsets inside the loop — a configured list of 2 stops with one NaN produced a single-stop gradient (flat color) or, on the SVG path, emitted `offset="NaN"` which invalidates the whole gradient. Now both filter for finite offsets first, clamp, then require ≥2 valid survivors before building.
- **Bar renderer preserves `CanvasPattern` fills when `fillGradient` is set.** The opacity branch of `buildBarGradient` used a hardcoded `"#4e79a7"` fallback when the resolved fill wasn't a string, silently replacing a `CanvasPattern` fill with a grey gradient. Now guards: if the resolved fill isn't a string, the gradient is skipped entirely and the pattern fill renders as intended.
- **Candlestick transition exit stubs preserve bodyWidth.** `snapshotPositions` now captures `node.bodyWidth` into `prev.w` so the candlestick exit node reads the pre-transition width instead of falling through to the 6px default on the final frame. `getNodeIdentity` prefers an existing `_transitionKey` over the datum-derived key so exit stubs stay stable across overlapping transitions (affects all exit-node types, not just candlestick).
- **`CandlestickChart` OHLC validation gap.** When the user asks for OHLC mode but the data is missing `open`/`close` fields, `warnMissingField` and `validateArrayData` now cover all four accessors. Previously the scene builder silently dropped bars and the chart rendered blank with no feedback.

### Tooling

- **`noUnusedLocals` / ESLint cleanup pass.** 17 test files under `src/components/` and `src/__tests__/scenarios/` had bare `import React from "react"` imports that existed only to satisfy the classic JSX transform. Removed with the transform flip. The 51 files that use `React.SomeType` / `React.ComponentProps<>` kept their imports.
- **3246 unit tests pass** (was 3216 in 3.4.1). Net adds: 9 `buildBarGradient` tests + 6 SVG `gradientFill` tests in `SceneToSVG.test.tsx` + 1 `BarChart` empty-legend suppression test + 8 `parseCanvasColor` tests covering hex normalization, named colors, invalid-with-string-prev, invalid-with-non-string-prev, and the sentinel-self edge case + 2 `ordinalSceneBuilders` tests for roundedEdge tagging and fillGradient attachment + 2 NaN-stop fallback tests.

### Docs

- **`/charts/bar-chart`** — new "Gradient Fill" section under Examples with three live demos (default opacity fade, multi-color colorStops, horizontal direction flip) and a props-table row. Generator seeds match the page's existing deterministic pattern (no `Math.random()` at module scope).
- **OUTSTANDING_WORK.md** — added "Legend auto-population from pushed categories [YELLOW]" under the Push API section. Captures the 3.4.2 short-circuit (empty legends don't reserve margin), the real design (an `onCategoriesChange` callback on StreamOrdinalFrame + StreamXYFrame threading through `useChartSetup` state into `useChartLegendAndMargin`'s existing `categories` param), known landmines (first-ingest timing, sorted-array dedupe, XY's `groupAccessor` variant, `LinkedCharts` + `CategoryColorProvider` interaction), and an estimated ~150 LOC surface across 5 files.

## [3.4.1] - 2026-04-22

### Added

- **`CandlestickChart` HOC** (`semiotic/xy`) — wraps `chartType="candlestick"` with the same mode-aware, animated, push-API conventions as the other XY HOCs. Required: `highAccessor`, `lowAccessor`. Optional: `openAccessor` + `closeAccessor` — omit both and the chart degrades to a range/dumbbell visualization (endpoint dots + wick, no body). Honors `mode="primary" | "context" | "sparkline"`: `scalePadding` scales from width (12 / 10 / 3) to keep leftmost/rightmost bars from clipping, `extentPadding` drops to 2% at widths ≤200 so the y-domain isn't padded into uselessness, and sparkline zeroes `top`/`bottom` margin (axes are stripped, so the 2px defaults were dead space). Full docs page at `/charts/candlestick-chart` with static ↔ streaming toggle, range-chart demo, compact-mode grid for OHLC + Range, and an Animation section demoing data-morph (seeded regenerate button) and a sliding push/remove window.
- **Candlestick animation support** — the transition pipeline in `pipelineTransitions.ts` gained full enter/update/exit branches for `type: "candlestick"` nodes. Bars matching by x-identity smoothly interpolate all four y-coords (`openY`, `closeY`, `highY`, `lowY`) when data updates; new bars fade in; scrolled-off bars fade out with a held-in-place gray stub. Snapshot carries `bodyWidth` too so exits don't jump to a 6px fallback on the final frame. Renderer now composites `decayOpacity * style.opacity` so decay and transition fades stack. `getNodeIdentity` prefers an existing `_transitionKey` over the datum-derived key so exit stubs stay stable across overlapping transitions (fixes a latent reshuffle risk for *all* exit-node types, not just candlestick).
- **Server-side rendering for candlestick** — `renderChart("CandlestickChart", ...)` works through a new entry in `serverChartConfigs.ts`. Passthrough config: HOC-level accessors map 1:1 to frame-level ones; `openAccessor`/`closeAccessor` are forwarded without defaults so `PipelineStore` can auto-detect range mode.
- **`compactMode: boolean` on `useChartMode` return** — the context∨sparkline union now lives on the hook instead of being recomputed in each HOC. `GaugeChart` consumes it (replaces the local `modeIsContext || modeIsSparkline` flag and collapses three conditional-render branches into one).
- **`candlestick-range-*` visual regression fixtures** — 3 new modes × 3 browsers = 9 baselines added to the chart-modes matrix specifically covering range-mode rendering (the path that motivated the dot-radius cap).

### Changed

- **Candlestick sparkline rendering** — three rendering changes converge to make high/low lines actually visible at 120×24:
  - Wick is drawn **on top** of the body at `layout.height < 60` with a 2px minimum stroke. At sparkline heights the protrusion above/below a tiny body is often <2px and lands on subpixel boundaries, antialiasing to ~11% alpha (invisible). Drawing the wick last shows the full high-low range as a continuous line through the body.
  - **Range-mode dot radius** scales with `bodyWidth/2` and caps at `layout.height * 0.12` (was hardcoded `max(wickWidth * 2, 4)` — ≥4px always, marble-sized on a 24px row). Scales up for primary/context.
  - Scene builder now computes the **same gap-derived `bodyWidth`** in OHLC and range modes so the renderer has a scale-aware basis for dot sizing.
- **`GaugeChart` needle formula simplification** — `innerRadius > 20 ? innerRadius - 8 : radius - 1`. The `Math.max(1, ...)` / `Math.max(2, ...)` floors in the previous formula were dead: the guarded expression is always well above the floor in either branch.
- **Type safety sweep** — ~216 `any` types eliminated across the codebase. Scene-node interfaces, scale helpers, hook returns, and accessor resolution gained concrete types. No behavior change; catches more regressions at compile time.
- **Major dependency updates** — `@playwright/test` + `playwright-chromium` `^1.17.1` → `^1.59.1` (regenerated 9 darwin baselines for chromium font-rendering shifts on label-heavy charts), `vitest` + `@vitest/coverage-v8` + `@vitest/ui` `^4.0.18` → `^4.1.4`, `typedoc` `^0.28.17` → `^0.28.19`, `@axe-core/playwright` `^4.11.1` → `^4.11.2`, `@modelcontextprotocol/sdk` 1.27.1 → 1.29.0, `@types/node` aligned to Node 22.19.17 (matches the Volta-pinned runtime). `.node-version` corrected from `18` → `22.22.1`.

### Fixed

- **`RealtimeHistogram.showLegend` dead pass-through** — `showLegend` was being fed into `useChartMode` but the resolved value was never consumed (the HOC doesn't construct a `legend` prop for StreamXYFrame). Removed the feed-in and updated the comment to explain the absence.
- **`arrowOfTime` wrongly exposed on `StreamOrdinalFrame`** — removed. The prop only applies to XY time-series layouts; its presence on the ordinal frame was a leftover from a shared-types refactor.
- **Doc TOC duplicate-key warning** — two sections titled "When to reach for which" on `/theming/semantic-colors` slugged to the same React key. Renamed to "When to reach for which role" and "When to reach for which primitive"; `PageLayout` additionally de-dupes TOC keys defensively so a transient DOM overlap during route transitions can't re-surface the warning. `item.id` still carries the real heading id for anchor navigation; `item.key` is a separate React-only identifier.
- **Shadowed cookbook import in `App.js`** — `import CandlestickChartPage from "./pages/cookbook/..."` was re-importing the same symbol used by the new `/charts/` route, so the charts-route fell through to the cookbook recipe. Renamed to `CandlestickCookbookPage`.

### Tooling

- `ai/schema.json` and `validationMap.ts` gained `CandlestickChart` entries; `check-schema-freshness.js` and `check-ssr-alignment.js` both pass.

## [3.4.0] - 2026-04-18

### Added

- **Tooltip format cascade** — `valueFormat` on ordinal HOCs and `xFormat`/`yFormat` on XY HOCs now flow through to the default tooltip automatically, so a BarChart with `valueFormat: d => \`$\${d/1000}k\`` shows "$450k" on both the axis and the tooltip. Wired into: BarChart, StackedBarChart, GroupedBarChart, DotPlot, SwarmPlot, SwimlaneChart, LineChart, AreaChart, StackedAreaChart, Scatterplot, BubbleChart, ConnectedScatterplot, QuadrantChart, Heatmap. `buildOrdinalTooltip` and `buildDefaultTooltip` gained format params; a new `applyFormat` helper wraps formatter calls in try/catch so a misbehaving formatter falls back to the built-in `formatVal` instead of breaking the tooltip. Custom `tooltip` props still fully override the default (re-pass the formatter inside `Tooltip({format})` / `MultiLineTooltip({fields:[{format}]})` if you want it to apply). New "Format Cascade" section on `/features/tooltips`.
- **`sort: "auto"` on ordinal HOCs** — preserves insertion order while streaming and falls through to value-desc on static data. Applied to `oSort` on the frame and to `sort` on BarChart / StackedBarChart / GroupedBarChart / DotPlot. **DotPlot's default changed from `sort: true` to `sort: "auto"`** — fixes categories shuffling during streaming in the quick-start docs demo and any push-API usage.
- **`replace()` method on `StreamOrdinalFrameHandle`** — atomically swaps the dataset while preserving the store's category insertion-order memory and the transition position snapshot. Routes through a new `DataSourceAdapter.setReplacementData()` (emits `{bounded: true, preserveCategoryOrder: true}`); falls through to progressive chunking for large replacements. `LikertChart`'s re-aggregation now uses `replace()` instead of `clear() + pushMany()` so streaming question order stays stable across ticks.
- **`Changeset.preserveCategoryOrder`** — new flag on the ingest changeset. When true on a bounded changeset, the store replaces the buffer contents but does NOT clear its category insertion-order memory, and marks itself as having received streaming-sourced data. The machinery that makes aggregator HOCs (LikertChart, future density/bin charts) behave like live streams even though the transport is wholesale replacement.
- **`getScales()` on the shared `RealtimeFrameHandle`** (optional) — routed through 8 ordinal HOCs + 9 XY HOCs + 5 realtime HOCs. Returns the frame's resolved scales (`{o, r, projection}` for ordinal, `{x, y}` for XY). Network/geo/hierarchy HOCs stay compliant by virtue of the method being optional.
- **`LikertChartHandle`** — narrowed ref handle type exported from the public entry point. Extends `RealtimeFrameHandle` and types `getScales()` as returning `OrdinalScales`, so `ref.current?.getScales()?.o.domain()` works without casts.
- **`useFrame` composition hook** (`src/components/stream/useFrame.ts`) — extracts shared Tier A concerns across all four Stream Frames (size + responsive sizing, margin merge, foreground/background graphics resolution, animate → transition, current theme subscription, stable accessible-table id, rAF-coalesced render scheduling with unmount cleanup, pointer-coalesced hover handlers, theme-change effect). ~300 lines of duplication removed. No behavioral change for consumers.
- **FlowMap SSR support** — `renderChart("FlowMap", ...)` now works server-side via a new `flowMap` entry in `serverChartConfigs.ts`. Expands `{flows, nodes}` into the line-shape StreamGeoFrame expects, with value-proportional edge widths, `edgeColorBy` / `edgeWidthRange` / `edgeOpacity` / `edgeLinecap` honored. Function-valued `edgeColorBy` returning literal CSS colors passes through unchanged (via shared `getColor`).
- **`LikertChart`** added to the server-side `ChartName` union — was registered in `CHART_CONFIGS` but absent from the TS union, so `renderChart("LikertChart", ...)` would type-error despite working at runtime.
- **`animate` prop on every HOC chart** — `animate?: boolean | { duration?, easing?, intro? }` wired across all XY, ordinal, network, and geo HOCs. Stream Frames resolve `animate` → `transition` internally, with synthesized intro animations: bars from baseline, wedges from collapsed arc, lines/areas clipped from left, points from `r=0`, network nodes from chart center, geo points from center. Wedge angle interpolation for pie/donut data changes. Respects `prefers-reduced-motion`.
- **Quadtree spatial index** for point hit testing on XY (scatter/bubble), Geo (proportional symbol maps), and Ordinal (swarm plots) when point count exceeds 500. Each store tracks `maxPointRadius` so the hit tester widens its query for variable-size points (BubbleChart, proportional symbols). Shared `findHitPointInQuadtree` (`src/components/stream/quadtreeHitTest.ts`) uses `quadtree.visit()` to enumerate every candidate within the search region, eliminating the nearest-only miss that `quadtree.find()` had on heterogeneous-radius scenes.
- **`Path2D` cache on network edges** (`NetworkBezierEdge` / `NetworkRibbonEdge` / `NetworkCurvedEdge`) — `_cachedPath2D` + `_cachedPath2DSource` fields invalidate when `pathD` changes. Shared between `NetworkCanvasHitTester` and `networkEdgeRenderer`.
- **`waitForChartReady` / `waitForAllChartsReady` / `waitForRafs` / `waitForStreamingUpdate`** in `integration-tests/helpers.ts` — event-driven Playwright waits replacing the per-spec `waitForVisualization` + `waitForTimeout(N)` pattern.
- **`HoverPointerCoords` type** in `hoverUtils.ts` — narrower hover-handler signature replacing the `as unknown as React.MouseEvent` cast that the rAF-coalesced path used to need.
- **`ordinalFixtures.ts` + `recordCanvasOps` test utilities** — shared sample datasets for bar-chart tests; behavior-level draw-op recorder that replaces brittle `toHaveBeenCalledTimes` assertions in canvas-renderer tests.
- **`describe.each` combinatorial coverage** for `lineCanvasRenderer` over (curve × decay × thresholds), exercising the path-selection invariants that previously had a single test.
- **3000+ unit tests passing** (was 2890 in 3.3.x). Added cache-invalidation regressions for `_colorMapCache`, `_colorSchemeMap`, `_categoryIndexCache`, `_stackExtentCache`, accessor explicit-clear, ParticlePool free-list, `findHitPointInQuadtree` variable-radius, `resolveCSSColor` version counter, swimlane bandwidth clamp.
- **Theme-driven selection opacity** — `theme.colors.selectionOpacity` (already defined on `SemioticTheme`; built-in presets set it to 0.1–0.15) is now wired into the dimming applied by `hoverHighlight`, legend isolate, and linked selections. Previously the value was emitted as the `--semiotic-selection-opacity` CSS variable but never read. A new `useResolvedSelection(selection)` hook merges the theme value into the selection config; every HOC plus `Treemap` now passes through it. Resolution order is `selection.unselectedOpacity` (per-chart) → `theme.colors.selectionOpacity` → `DEFAULT_SELECTION_OPACITY` (library fallback). Clients that previously reached into the package to change `DEFAULT_SELECTION_OPACITY` can now do `<ThemeProvider theme={{ colors: { selectionOpacity: 0.5 } }}>` instead.

### Changed

- **Function comparator on ordinal `sort` / `oSort` is now a category-key comparator** — prior types said `(row, row) => number` but the frame always invoked it with category name strings, so any user passing a row-comparator was getting silently incorrect ordering. Tightened to `(a: string, b: string) => number` on BarChart, DotPlot, GroupedBarChart, StackedBarChart, and the frame's `oSort` type. `useSortedData` treats function-valued sort (and `"auto"`) as pass-through since the frame owns category ordering. No usages in `src/`, `docs/src/`, or `integration-tests/` passed a function comparator.
- **Stream Frame perf pass** — `OrdinalPipelineStore` decay/pulse no longer rebuild a `Map<datum, index>` every frame (cached against `_dataVersion`); pulse wedge inner loop went from `O(wedges × data)` to `O(matches per category)` via `getCategoryIndexMap`. `PipelineStore` stacked-area extent fused into a single pass; `resolveColorMap` short-circuits on `_ingestVersion`. Geo line projection fused project + filter into one pass.
- **`ParticlePool.spawn()`** — O(1) free-list (stack of free indices) replaced the O(capacity) linear scan. `evaluateBezier` rewritten as `evaluateBezierInto(out)` so positions write into the particle directly — zero per-particle allocation per frame.
- **rAF-coalesced pointermove** in all four Stream Frames — caps hit-testing + React re-renders at the display refresh rate (60 Hz) instead of the native pointer rate (often 120–240 Hz). `onMouseLeave` cancels any pending move; latest coords always processed.
- **CSS-var color cache** (`resolveCSSColor`) — version-counter design plus a singleton `MutationObserver` on `document.documentElement` and a `prefers-color-scheme` `matchMedia` listener. Themes/class toggles/media-query swaps that bypass React still invalidate; per-frame `getComputedStyle` thrashing is gone.
- **`DEFAULT_SELECTION_OPACITY`: 0.2 → 0.5** — unselected (dimmed) elements stay readable when a selection is active. Override via `selection.unselectedOpacity` (per-chart) or `theme.colors.selectionOpacity` (via `ThemeProvider`, applies to every chart). Built-in theme presets set this to 0.1–0.15.
- **`barPadding` ratio clamped to ≤ 0.9** in `OrdinalPipelineStore` — degenerate layouts (e.g. horizontal swimlane where `showCategoryTicks: false` shrinks the left margin and the vertical content area is less than `barPadding * 2`) no longer paint zero-bandwidth bands.

### Fixed

- **Streaming ordinal category shuffle** — re-aggregating from a live buffer (LikertChart) or pushing into DotPlot made categories visibly jump around when per-category values changed rank. Two root causes, both fixed: (1) `replace()` now routes through the new `preserveCategoryOrder` ingest path so the category Set isn't wiped on every re-aggregation; (2) `sort: "auto"` (DotPlot's new default) collapses to insertion-order while streaming instead of value-desc.
- **Composing charts as `position: absolute` overlays no longer hides the base layer** — StreamXYFrame and StreamOrdinalFrame used to paint `--semiotic-bg` across the full canvas regardless of whether the chart was on top of another. Pass `frameProps={{ background: "transparent" }}` on the overlay to short-circuit the fill; the built-in composed-brush demos (`/charts/realtime-histogram`) now use this pattern. Network/Geo frames already behaved correctly.
- **MultiAxis ordinal `rExtents` not cleared on bounded ingest** — when `rAccessor` is an array, the per-axis `rExtents[i]` instances are distinct from `this.rExtent`, so clearing only the latter left stale min/max on subsequent bounded replacements. All per-accessor extents now clear together.
- **Streaming axis rendered ghost ticks after `replace()` dropped a category** — `resolveCategories` retains its insertion-order memory for FIFO stability on re-appearance, but only the `undefined`/`"auto"` branch was filtering to live categories. Explicit `"desc"`/`"asc"`/`false`/comparator branches rendered empty columns for evicted categories. Live-category filtering now happens once at the top of the function and every branch reads from it.
- **DataSourceAdapter progressive-chunk timer state** — `scheduleNext` early returns (completed dataset, superseded data) didn't reset `chunkTimer`, so `setBoundedData` / `clearLastData` could call `cancelAnimationFrame` on a stale token. Every exit path now resets `chunkTimer = 0`, preserving the "`chunkTimer === 0` iff no rAF scheduled" invariant. Fixed in both `setBoundedData` and the new `setReplacementData`.
- **`setReplacementData` microtask race** — a `push()` / `pushMany()` buffered just before a `replace()` could flush after the replacement and append stale points onto the fresh dataset. `setReplacementData` now clears the pushBuffer + `flushScheduled` state before emitting the changeset.
- **`react-dom/server` stripped to `(void 0)(...)` in the server bundle** — `rollup-plugin-auto-external` marks package roots external but not subpaths, so `renderToStaticMarkup` was being tree-shaken to an undefined binding. Added `id === "react-dom/server"` to the rollup external predicate. Verified no other production subpath imports hit the same trap.
- **`StreamOrdinalFrameHandle.replace()` JSDoc and atomicity** — routes through `setBoundedData`-style progressive chunking for large datasets, not a single synchronous change. Corrected the "Atomically replace" wording to describe the actual two-phase behavior (small datasets synchronous, large datasets chunked).
- **DataSourceAdapter unmount cleanup** — `StreamXYFrame` and `StreamOrdinalFrame` now call `adapter.clear()` in their lifecycle cleanup so in-flight progressive chunking and pending push microtasks can't fire after unmount.
- **MinimapChart polling rAF** — tracks its handle and cancels on unmount + data change. Was leaking a recursive `requestAnimationFrame` poll that kept calling `setOverviewScales` on unmounted components.
- **Cache invalidation completeness** — `PipelineStore._stackExtentCache` now invalidates on `timeAccessor` / `valueAccessor` / `runtimeMode` changes; `OrdinalPipelineStore._colorSchemeMap` on `themeCategorical` / `colorAccessor`; `OrdinalPipelineStore._categoryIndexCache` on `categoryAccessor` / `oAccessor`.
- **Accessor re-resolution gates** — `updateConfig` blocks for x/y/time/value (`PipelineStore`) and category/o/value/r (`OrdinalPipelineStore`) used `config.X !== undefined`, which silently skipped re-resolution when a caller explicitly cleared an accessor (`{xAccessor: undefined}` — valid React pattern). Switched to `"X" in config` so defined → undefined transitions revert to the fallback key.
- **GeoCanvasHitTester wasted fallback** — when a quadtree is built, the linear scan after a quadtree miss is now skipped (the visit-based path is authoritative). Per-hit `.filter()` array allocations for areas/lines also removed.
- **StreamGeoFrame hover via `e.currentTarget`** — handler reads `canvasRef.current` instead so it works under the rAF-coalesced path that passes a synthetic `{clientX, clientY}` payload.
- **`_resetCSSColorCacheForTest` observer leak** — disconnects the global `MutationObserver` and `matchMedia` listener it installed; bumps `currentVersion` rather than resetting to 0 so any surviving WeakMap entries can't be re-validated.

### Security

- Bumped `hono` 4.12.8 → 4.12.14 and `@hono/node-server` to 1.19.14 (transitive via `scripts/og-server.mjs`). Resolves seven advisories — six in `hono` (cookie validation, IPv4-mapped IPv6 mismatch, path traversal in `toSSG`, `serveStatic` slash bypass, `hono/jsx` HTML injection) and one in `@hono/node-server` (`serveStatic` middleware bypass via repeated slashes). All moderate; reachable only from the OG-image build script, not from the published library.

### Tooling

- **Dev deps:** `@modelcontextprotocol/sdk` 1.27.1 → 1.29.0, `esbuild` 0.27.4 → 0.28.0, `@types/node` aligned to Node 22.19.17 (matches the Volta-pinned runtime).
- **Realtime encoding docs** — new "Tuning for streaming cadence" subsection on `/features/realtime-encoding` with guidance on duration-vs-push-interval tradeoffs (fast / pulsed / slow streams) and the `replace()` requirement for aggregator HOCs to participate in the transition system.
- **CLAUDE.md / AI docs** — "Composing overlays" pitfall note added.
- `scripts/create-release-branch.sh` now (a) syncs `ai/schema.json` version to the bumped package version, (b) verifies `CHANGELOG.md` has an entry for the new version, and (c) gates on `npm audit --audit-level=moderate`. Override the audit floor with `AUDIT_LEVEL=...` if a release is intentionally shipping with known low-severity transitives.
- `prettier` 3.8.1 → 3.8.3 (dev-only patch).

### Removed

- The per-spec `waitForVisualization` helpers in 9 Playwright spec files (consolidated into `integration-tests/helpers.ts`).

## [3.3.1] - 2026-04-11

### Added

- **`sort` prop on StackedBarChart and GroupedBarChart** — Default: `false` (data insertion order). Accepts `"asc"`, `"desc"`, `boolean`, or custom `(a, b) => number` comparator. Maps to frame `oSort`. Previously categories were always sorted by total value.
- **`edgeIdAccessor`** on `NetworkPipelineConfig` — Enables `removeEdge(edgeId)` single-ID edge removal. Accepts string or function accessor. Throws descriptive error if not configured when single-ID form is used.
- **Transition exits on `remove()`** — `remove()` now calls `snapshotPositions()` before buffer mutation in PipelineStore and OrdinalPipelineStore. Removed items get fade-out exit transitions instead of vanishing instantly.
- **Selection clearing on `remove()`** — All three stream frames (XY, Ordinal, Network) clear hover state when the removed datum matches the current hover. Prevents stale tooltips and ghost highlights.
- **`serverChartConfigs.ts`** — Extracted `renderChart()` dispatch from a 400-line switch statement into a lookup table of `{ frameType, buildProps }` entries. Each chart type is independently readable and testable.
- **Shared `computeDecayOpacity()`** — Decay algorithm consolidated from 4 inline implementations (OrdinalPipelineStore, NetworkPipelineStore, GeoPipelineStore) into the existing `pipelineDecay.ts` utility. Single source of truth.
- **`HoverData` unified type** — All four stream frames now construct typed `HoverData` objects instead of ad-hoc shapes. Network frames use `nodeOrEdge` field (replaces untyped `type`); geo frames use `properties` field. Fixed GeoFrame mismatch where tooltip and `customHoverBehavior` received different shapes. **Breaking**: Network `customHoverBehavior`/`tooltipContent` callbacks no longer receive `d.type` — use `d.nodeOrEdge` instead.
- **SSR angle convention fix** — SVG wedge/arc rendering adds `π/2` to convert from canvas convention (0 = 3 o'clock) to d3-shape convention (0 = 12 o'clock). Fixes -90° rotation on all SSR pie, donut, gauge, and chord charts.
- **SSR hierarchy theme colors** — Treemap, CirclePack, and TreeDiagram `colorByDepth` now uses `config.colorScheme` (from theme) instead of hardcoded `DEPTH_PALETTE`. Default fill uses first scheme color instead of `#4d430c`.
- **SSR GaugeChart needle** — Needle rendered via React elements (XSS-safe), positioned from inner (margin-adjusted) dimensions, uses `resolveTheme()` for color, divide-by-zero guard on `gMax === gMin`.
- **SSR `sweepAngle` passthrough** — `sweepAngle` was on the props but missing from the `pipelineConfig` builder. Gauge arcs now render with correct sweep.
- **SSR `hierarchySum` string resolution** — String `valueAccessor` (e.g., `"value"`) now resolved to a function before passing to `d3-hierarchy.sum()`.
- **SSR bottom legend positioning** — Legend placed at `totalHeight - margin.bottom + 38` (below axes) instead of hardcoded offset that overlapped chart area.
- **SSR ID uniqueness** — All SVG element IDs (`data-area`, `axes`, `grid`, `legend`, `chart-title`, `annotations`, `semiotic-title`, `semiotic-desc`, hatch patterns) prefixed with `_idPrefix` in multi-chart documents. `renderDashboard` passes per-chart prefixes.
- **88 new tests** — Push API edge cases (17), server rendering coverage (27), HOC rendering integration (22), callback wiring + accessibility + bad data resilience (22). Plus 9 PipelineStore cache invalidation tests.
- **Ordinal scene builder tests refactored** — 14 exact-pixel assertions replaced with relationship/proportional assertions. Tests now survive layout constant changes.

### Changed

- **Unsafe any casts reduced: 240 → 164** — Hover data types, renderer arrays, pipeline config, accessor utils, SSR prop threading.
- **SSR `frameProps` override priority** — `frameProps` spread first, explicit top-level props override. `margin`/`colorScheme`/`legendPosition` only override when defined (not `undefined`).
- **SSR gallery** — All 15 charts use `renderChart` with explicit themes (11 different presets). Dark-themed charts have dark card backgrounds.

### Fixed

- **`getColor()` / `getSize()` null datum guard** — Optional chaining prevents crash when datum is undefined.
- **`ProportionalSymbolMap` sizeDomain crash** — `filter(Boolean)` + optional chaining in accessor.
- **`resolveCSSColor` cache** — Restored per-canvas `WeakMap` cache with `has()` check (handles falsy values). `clearCSSColorCache()` invalidates on theme change.
- **`pieceStyle` merge null guard** — User `frameProps.pieceStyle` returning `undefined`/`null` no longer crashes spread.
- **GeoFrame hover/click shape mismatch** — `customHoverBehavior` and `tooltipContent` now receive the same `HoverData` object.
- **Bottom legend overlap** — Positioned below axes area in reserved margin.

## [3.3.0] - 2026-04-08

### Added

- **`semiotic/server` production API** — `renderChart(component, props)` renders 27+ HOC chart types to standalone SVG strings. Supports all themes, legends (4 positions), grid, annotations (y-threshold, x-threshold, category-highlight, widget, enclose), and accessibility attributes (`role="img"`, `<title>`, `<desc>`, `aria-labelledby`). SVG groups have `id` attributes for Figma layer naming (`data-area`, `axes`, `grid`, `annotations`, `legend`, `chart-title`).
- **`renderDashboard(charts, options)`** — Multi-chart dashboard layout with title, theme, configurable columns. Each chart entry supports `colSpan` for wide charts.
- **`renderToImage(component, props, options)`** — PNG/JPEG rasterization via sharp (peer dependency). Configurable `scale` for retina output.
- **`renderToAnimatedGif(chartType, data, props, options)`** — Animated GIF from streaming data windows. Options: `fps`, `transitionFrames`, `easing`, `decay`, `windowSize`, `loop`, `scale`.
- **`generateFrameSequence(frames)`** — Snapshot-based animation for topology changes (network failover, edge removal). Each frame is an independent `renderChart` call.
- **SVG hatch patterns** — `createSVGHatchPattern()` for server-rendered diagonal hatch fills. Used by FunnelChart vertical mode for dropoff bars.
- **Push API `remove()` and `update()`** — Selective data removal and in-place update across all stores (RingBuffer, PipelineStore, OrdinalPipelineStore, NetworkPipelineStore) and all HOC/frame handles. `remove(id)` or `remove([ids])` by ID (requires `pointIdAccessor`/`dataIdAccessor`). `update(id, updater)` for in-place mutation. Network: `removeNode(id)` cascades to edges, `removeEdge(source, target)` removes parallel edges.
- **`pointIdAccessor` / `dataIdAccessor`** — ID accessor props on BaseChartProps for `remove()` and `update()` targeting.
- **GaugeChart server rendering** — Sweep angle, start angle, inner radius, threshold zone fills, needle indicator.
- **FunnelChart server rendering** — Horizontal and vertical modes with trapezoid connectors. Vertical mode supports hatch pattern dropoff bars.
- **Sparkline server rendering** — `renderChart("Sparkline", props)` with no axes, 2px margins, no grid/legend/title.
- **6 interactive docs pages** — Render Studio, Theme Showcase, Dashboard Gallery, Email Preview, Export & Embed (with real GIF downloads), Push API demo.

### Changed

- **`hoverHighlight` simplified** — Changed from `boolean | "series"` to just `boolean`. Any truthy value triggers series-based dimming (requires `colorBy`).
- **CSS variable resolution in canvas** — `resolveCSSColor()` resolves `var(--name, fallback)` via `getComputedStyle` at paint time. Per-canvas cache avoids repeated calls within a paint cycle; `clearCSSColorCache()` invalidates on theme change. All 9 canvas renderers updated.
- **`extentPadding` nullish coalescing** — Changed `|| 0.05` to `?? 0.05` so `extentPadding: 0` is respected.
- **Swimlane `skipMaxPad`** — Prevents trailing gap in swimlane charts by skipping max-side extent padding.
- **`frameProps.pieceStyle` merging** — Ordinal HOCs now merge user's `pieceStyle` with computed base style instead of excluding it. Enables stroke overrides.
- **`resolveGroupColor()` in server rendering** — XY line/area style fallbacks call `resolveGroupColor(group)` instead of hardcoding `#007bff`. Theme categorical colors flow through to server SVG.
- **Force layout `iterations: 0`** — Now skips simulation entirely for pinned node positions. Previously warm-start detection overrode to 40 iterations.
- **Background rect positioning** — Server SVG background rect renders at SVG root, not inside translated group (fixes Figma import).
- **Dependency bumps** — vite 8.0.5, typedoc 0.28.18, vulnerable devdeps fixed.

### Fixed

- **Server legend margin** — Legend position expands margin before width/height calculation (right:100, left:100, bottom:70, top:40).
- **Server `frameProps` passthrough** — `frameProps` spread into renderer common object so `pieceStyle`, `lineStyle` flow through.
- **Server `effectiveColorScheme`** — Falls back to `theme.colors.categorical` when `colorScheme` prop not set.
- **Network `remove()` return value** — Returns node data before removal instead of empty array.
- **RingBuffer `update()` snapshot safety** — Proper type-aware cloning (array spread for arrays, object spread for objects).
- **Timestamp buffer desync on remove** — Lockstep compaction removes matching indices from timestamp buffer.
- **`buildRealtimeNodes` preserving positions** — Uses `x: d.x ?? 0, y: d.y ?? 0` instead of hardcoded zeros.
- **Dark mode CSS var strokes** — Docs site sets `--semiotic-bg` in both dark/light blocks. `LiveExample` uses MutationObserver for chart remount on theme toggle.

## [3.2.3] - 2026-04-03

### Added

- **GaugeChart** — New ordinal HOC for single-value gauges with threshold zones, needle indicator, and configurable sweep angle. Built on StreamOrdinalFrame radial projection (reuses pie/donut rendering pipeline). Supports `fillZones={false}` for fixed-zone displays where only the needle moves (e.g. election needle). Exported from `semiotic` and `semiotic/ordinal`.
- **Range/dumbbell plot** — Candlestick chart type now supports range mode: omit `openAccessor`/`closeAccessor` and provide only `highAccessor`/`lowAccessor` to render vertical lines with endpoint dots. Single `rangeColor` via `candlestickStyle`. No new HOC — demonstrates StreamXYFrame flexibility.
- **`scalePadding`** — Pixel inset on XY scale ranges to prevent glyph clipping at chart edges. Available on `StreamXYFrameProps`; HOCs pass via `frameProps={{ scalePadding: 12 }}`. Domain and tick values unchanged.
- **`xScaleType="time"`** — New scale type creates `d3.scaleTime` for Date-aware tick generation. Required for landmark ticks with timestamp data.
- **`sweepAngle`** — New prop on `StreamOrdinalFrameProps` limiting pie/donut arc to less than 360° (used internally by GaugeChart).
- **Multi-point tooltip** — `tooltip="multi"` on LineChart shows all series values at hovered X with color swatches. Custom functions receive `datum.allSeries` with `{group, value, valuePx, color, datum}`.
- **Click-to-lock crosshair** — In `linkedHover` x-position mode, click locks the crosshair. Escape or click again to unlock. Source-aware unlock prevents multi-chart interference.
- **Hover-based sibling dimming** — `hoverHighlight` on all HOCs dims non-hovered series on data mark hover (requires `colorBy`).
- **Per-series fillArea** — `fillArea={["A","B"]}` on LineChart fills named series as areas, others stay as lines. New `"mixed"` chart type with dedicated scene builder.
- **Multi-color gradient fills** — `gradientFill={{ colorStops: [{offset, color}] }}` on AreaChart for semantic color bands. Supports `transparent`.
- **Line stroke gradients** — `lineGradient={{ colorStops }}` on LineChart/AreaChart for horizontal gradient strokes.
- **Axis config extensions** — `includeMax` forces domain-max tick, `autoRotate` rotates labels 45° when crowded, `gridStyle` ("dashed"|"dotted"|string) for grid lines, `landmarkTicks` bolds month/year boundaries.
- **`baselinePadding`** — Boolean prop on bar chart HOCs. Default `false` makes bars flush with 0 baseline.
- **`hoverRadius`** — Configurable hit-test distance (default 30px) on all XY HOCs and `StreamXYFrameProps`.
- **ReactNode tick labels** — `xFormat`, `yFormat`, `categoryFormat` accept `=> string | ReactNode` with `<foreignObject>` fallback.
- **Tick deduplication** — Adjacent identical tick labels automatically removed.
- **`getHitRadius`** and `MultiPointTooltip` exported from `semiotic/utils`.
- **`isTimeLandmark`** and **`toDate`** exported from `hitTestUtils.ts` (shared across SVGOverlay and tests).

### Fixed

- **30px default hit radius** — All 4 hit testers (XY, Network, Geo, Ordinal) now use `getHitRadius()` from shared `hitTestUtils.ts`. Previous 12px Fitts's law cap was too small for comfortable interaction.
- **`lineDataAccessor` data flattening** — StreamXYFrame now flattens line-object data before pipeline ingestion. Previously the pipeline read `xAccessor` on line objects (which lack that field), producing NaN extents.
- **`scaleTime` domain comparison** — `valueOf()` comparison for Date objects prevents stale scales from blocking updates.
- **Annotation dark mode** — `Annotation.tsx` text uses `var(--semiotic-text)`, connectors use `var(--semiotic-text-secondary)` instead of hardcoded black.
- **SwimlaneChart `showCategoryTicks={false}`** — Now suppresses both tick labels and axis title.
- **Floating point tooltip precision** — `formatValue` rounds via `toPrecision(6)`.
- **Default tick format Date-aware** — `defaultTickFormat` handles Date objects (formats as "Jan 7" style).
- **`bodyWidth: 0` on candlestick** — Body rect skipped entirely, no invisible canvas elements.
- **Ordinal bar baseline** — Value axis baseline draws at `rScale(0)`, not chart edge. Include-zero applied before padding.
- **Remap fast-path with `scalePadding`** — Disabled proportional remap when padding is set (forces full rebuild for correctness).
- **Candlestick `updateConfig`** — OHLC accessors and `candlestickRangeMode` recomputed on prop changes.

### Changed

- **`baselineStyle` renamed to `gridStyle`** — Applies to grid lines (not axis baselines, which stay solid).
- **Build system** — `rollup-plugin-typescript2` replaced with `@rollup/plugin-typescript` (fixes TS compilation).
- **Playwright CI** — `serve-examples:ci` script skips redundant `npm run dist`. Timeout bumped to 120s.

## [3.2.2] - 2026-03-30

### Added

- **Exhaustive scene builder test coverage** — 346 new tests across all XY scene builders (line, area, stacked area, point, swarm, heatmap, waterfall, candlestick, bar) and ordinal scene builders (funnel, bar-funnel, swimlane). Tests assert actual coordinates, baselines, cumulative positions, and style resolution — not just "it didn't crash."
- **FunnelChart and LikertChart HOC tests** — First test suites for the two previously untested HOCs. FunnelChart: 29 tests covering horizontal/vertical modes, multi-category mirroring, connector opacity, tooltip metadata. LikertChart: 31 tests covering raw/pre-aggregated modes, diverging colors, neutral sentinels, error states.
- **Render pipeline benchmarks** — `benchmarks/unit/render-pipeline.bench.ts` covering scene builder throughput (scatter 50k: 4ms, line 10k: 0.45ms, stacked area 10k: 1.3ms), RingBuffer push/iteration, and end-to-end ingest-to-scene-build. Identified heatmap at 50k (49ms) as the only builder exceeding frame budget.
- **Dev-mode `d.data` access warning** — Frame callbacks (`nodeStyle`, `edgeStyle`, `nodeSize`) now warn in development when users access properties that exist on `.data` but not on the RealtimeNode/RealtimeEdge wrapper (e.g., `d.category` instead of `d.data?.category`). Zero production overhead. Applied to all 5 layout plugins (sankey, force, chord, orbit, hierarchy).
- **Streaming-first docs narrative** — Landing page and Getting Started page restructured to lead with the streaming engine (push API, two-canvas RAF loop, ring buffer, decay/pulse/staleness/transitions) as the primary differentiator.

### Performance

- **Heatmap scene builder optimized** — Streaming path uses flat `Int32Array`/`Float64Array` grids instead of `Map<string, {data[]}>`, eliminating 50k string key allocations and per-datum array pushes. Static path uses numeric Map keys and precomputed 256-entry color LUT (cached per scheme) instead of per-cell `scaleSequential` calls. Streaming 50k points into 20×20 grid: **0.37ms** (was ~49ms with Map+string approach). Static path ~15% faster at high cardinality.

### Fixed

- **`@modelcontextprotocol/sdk` removed from production dependencies** — The MCP CLI (`semiotic-mcp`) now bundles the SDK via esbuild, so `npm install semiotic` no longer pulls in the 4MB+ MCP SDK and its transitive deps. The bundled CLI works identically — zero behavior change for `npx semiotic-mcp` users.
- **`@types/d3-quadtree` moved to devDependencies** — Type declaration packages are always dev-only.
- **Stacked area points at wrong Y position** — `emitPointNodes` used raw `ctx.getY` instead of cumulative stacked Y. Fixed by adding `yGetOverride` parameter and computing stacked positions from `buildStackedAreaNodes`' `stackedTops` map — no duplicate stacking pass.
- **Null Y datums assigned stacked Y** — Added `y != null && !Number.isNaN(y)` guard before setting stacked point positions.
- **Stale forecast overlays on prop removal** — Early return in LineChart effect when both `forecast` and `anomaly` become falsy now clears previous statistical overlays.
- **GeoCanvasHitTester inconsistent hit radius** — Quadtree path used `(r||4)+4`, linear scan used `Math.max((r||4)+5, 12)`. Unified to `Math.max((r||4)+5, 12)` everywhere.
- **backgroundGraphics not honoring margins** — StreamXYFrame and StreamGeoFrame rendered `backgroundGraphics` outside the margin-translated `<g>`. Fixed in both client and SSR paths.

## [3.2.1] - 2026-03-30

### Added

- **LikertChart** — new ordinal HOC for Likert scale survey data. Horizontal (default): diverging bar chart centered at 0% with negative levels extending left, positive right, and neutral (odd count) split 50/50 across the centerline. Vertical: stacked 100% bar chart. Supports raw integer scores (1-based, auto-aggregated) and pre-aggregated (question, level, count) data. Works with any scale size (3-point to 7-point+). Push API for streaming — the chart accumulates raw data and re-aggregates percentages on each push.
- **`onClick` prop on all HOCs** — Direct click handler receiving `(datum, { x, y })` with the original unwrapped datum. Works on lines, bars, areas, pie slices, nodes, and geo features. No more `onObservation` filtering or `frameProps.customClickBehavior` escape hatch for simple click handling.
- **`categoryFormat` prop on ordinal HOCs** — Custom formatting function for individual category tick labels. Receives `(label, index?)` and returns a formatted string. Covers truncation, abbreviation, and custom labeling without dropping to `frameProps.oLabel`.
- **`category-highlight` annotation type** — Highlights a specific category column/row in ordinal charts with a semi-transparent band. Usage: `{ type: "category-highlight", category: "Q3", color: "#4589ff", opacity: 0.15 }`. Uses raw band scale from annotation context for correct positioning.
- **`labelPosition` on threshold annotations** — `y-threshold` supports `"left"` | `"center"` | `"right"` (default). `x-threshold` supports `"top"` (default) | `"center"` | `"bottom"`. Previously labels were fixed at right/top.
- **Coordinate-based linked crosshair** — `linkedHover={{ name: "sync", mode: "x-position", xField: "time" }}` broadcasts the hovered X data value across charts. Consuming charts render a synced vertical crosshair at that X position with independent Y values. Wired through all 9 XY HOCs via shared `getCrosshairProps` utility. Crosshair positions are cleaned up on unmount.
- **Tooltip viewport-aware flip** — Tooltips auto-flip horizontally and vertically when near container edges. Uses `useLayoutEffect` measurement with proper dependency array for precise flip decisions. Applied to all four stream frames (XY, ordinal, network, geo).
- **Data-driven histogram bin snapping** — RealtimeTemporalHistogram brush now snaps to actual computed bin boundaries (binary search via `floorBinBoundary`/`ceilBinBoundary`) instead of uniform grid math. Works with irregular bin widths. `snapDuring: true` enables continuous snap feedback during drag. Bin boundaries are defensively sorted. Auto-populated from pipeline store — zero config change for existing usage.
- **IBM Carbon color palettes** — `CARBON_CATEGORICAL_14` (14-color), `CARBON_ALERT` (danger/warning/success/info), and `"carbon"`/`"carbon-dark"` theme presets. Exported from `semiotic` and `semiotic/utils`. Integrated into Theme Explorer and Theme Provider docs.
- **Legend line wrapping** — horizontal legends now wrap to multiple rows when items exceed the available chart width, preventing overflow. Applies to all charts with `legendPosition="bottom"` or `"top"`.
- **`showPoints` on AreaChart and StackedAreaChart** — Data point markers are now supported on area charts, matching LineChart's existing `showPoints`/`pointRadius` props. Scene builders (line, area, stacked area) now emit `PointSceneNode` entries when `pointStyle` is configured, and `pointCanvasRenderer` is included in the renderer dispatch for all three chart types.

### Changed

- **ThemeProvider categorical colors flow to all HOCs** — When `colorBy` is set but `colorScheme` is not explicitly provided, charts now use the ThemeProvider's `colors.categorical` palette instead of falling back to d3 `category10`. Priority: explicit `colorScheme` > theme categorical > `"category10"`. Previously, ordinal and XY charts always defaulted to `category10` regardless of theme.
- **12px minimum hit target (Fitts's law)** — All four canvas hit testers (XY, ordinal, network, geo) now enforce `Math.max(node.r + 5, 12)` as the minimum interactive hit radius. Previously formulas varied across hit testers (some as small as 5px), making small points difficult to hover.
- **`useColorScale` `colorScheme` parameter is now optional** — Callers that don't pass a color scheme get the effective scheme fallback instead of requiring an explicit argument. Fallback uses scheme-based scale instead of hardcoded `"#999"`.
- **`LinkedCrosshairStore` optimized subscriptions** — `useCrosshairPosition` uses no-op subscribe/snapshot when the crosshair name is undefined, avoiding unnecessary store subscriptions on charts that don't use crosshairs.

### Fixed

- **Legend `styleFn` contract** — LikertChart (and any chart using custom `legendGroups`) now passes `(item: LegendItem, index)` to `styleFn` correctly, fixing grey legend swatches.
- **LikertChart tooltip** — shows category name (bold) and level name with percentage/count instead of raw internal field values. Uses standard tooltip chrome (dark background, rounded corners) matching all other charts.
- **`category-highlight` annotation in ordinal charts** — Annotations now receive the raw band scale (`scales.o`) and `projection` in the annotation context, fixing cases where the `oCentered` wrapper didn't expose `.bandwidth()`.
- **Crosshair cleanup on unmount** — Linked crosshair positions are cleared when a chart unmounts or when crosshair config changes, preventing stale crosshair markers in coordinated dashboards.
- **`FlippingTooltip` `useLayoutEffect` dependency array** — Added proper dependencies (`children`, `className`, `containerWidth`, `containerHeight`) to prevent stale measurements.
- **Removed dead `slicePadding` prop** — Removed from PieChart and DonutChart interfaces, validation map, schema, tests, and all documentation. The prop was declared but never wired to any rendering logic.
- **Removed unused `DEFAULT_COLOR` import in Heatmap** — Eliminated dead import.

### Removed

- **`slicePadding` prop on PieChart/DonutChart** — This prop was never functional. Use `frameProps={{ oPadding: value }}` for slice padding.

## [3.2.0] - 2026-03-25

### Added

- **Hover dot color matching** — The hover indicator dot now automatically matches the hovered element's color (line stroke, area stroke, point fill) instead of hardcoded blue. Override with `frameProps={{ hoverAnnotation: { pointColor: "#custom" } }}`. Fallback chain: explicit `pointColor` → element color → `--semiotic-primary` CSS var → `#007bff`. Affects all XY and Geo charts.
- **`pointColor` option on `HoverAnnotationConfig`** — New opt-in override for hover dot color on Stream Frames.
- **Adaptive time tick formatting** — New `adaptiveTimeTicks(granularity?)` export from `semiotic`. Produces hierarchical axis labels: first tick is fully qualified, subsequent ticks only show what changed (e.g. seconds when the minute is the same, full timestamp when the hour rolls over). Tick labels auto-space based on label width to prevent overlap.
- **Forecast: training line styling** — `trainStroke` ("darken" or CSS color), `trainLinecap` ("round"), `trainUnderline` (true | "lighten"), `trainOpacity`, `forecastOpacity` on `ForecastConfig`. Enables dashed training lines with solid underlines for visual distinction.
- **Forecast: per-datum anomaly styling** — `anomalyColor`, `anomalyRadius`, and `anomalyStyle` on `ForecastConfig` now accept functions `(datum) => value` for data-driven anomaly rendering (e.g. sizing dots by anomaly count).
- **Forecast: multi-metric boundary duplication** — `_groupBy` internal field on `ForecastConfig`. When `lineBy` and `forecast` are both active, boundary points are duplicated within each metric group (not across groups), preventing stray cross-metric connecting lines in interleaved data.
- **`training-base` segment type** — New segment for solid underlines beneath dashed training lines. PipelineStore renders training-base first (insertion order) so the solid line appears beneath the dashed one.
- **`resolveNodeColor` shared utility** — Extracted to `sceneUtils.ts`, used by both StreamXYFrame and StreamGeoFrame for consistent hover color resolution. Handles `CanvasPattern` fills correctly.
- **128 new unit tests** — Multi-metric boundary duplication (3 tests), ThemeStore dark mode merging (5 tests), PipelineStore reproduction (9 tests), LineChart integration (8 tests), plus expanded statisticalOverlays coverage.

### Fixed

- **SVGOverlay left axis label missing in dual-axis mode** — `MultiAxisLineChart` passes left axis label via `axes` config, but SVGOverlay only read the `yLabel` prop (which is suppressed in dual-axis mode). Now reads `leftAxis?.label || yLabel`.
- **ThemeStore `mode: "dark"` merged onto wrong base** — `{ mode: "dark", colors: { categorical: [...] } }` was merging onto `LIGHT_THEME`, so dark-mode text/background/grid colors were lost. Now correctly merges onto `DARK_THEME`.
- **Tick label overlap on time axes** — X-axis tick spacing now accounts for actual label width (estimated at 6.5px/char) instead of using a fixed 55px minimum, preventing label collision on dense time axes.
- **`tickFormat` signature expanded** — `AxisConfig.tickFormat` and `xFormat` now receive `(value, index, allTickValues)` so formatters can produce hierarchical labels (e.g. show full date only on first tick or at boundary crossings).
- **Function accessors with forecast/anomaly** — When `xAccessor` or `yAccessor` is a function, resolved values are now baked into data under `__resolvedX`/`__resolvedY` fields so the statistical overlay pipeline and annotation renderer can access them by string key.
- **Geo hover ring color** — Geo frame point hover ring now uses `resolveNodeColor` (shared utility) instead of inline logic, and correctly handles `CanvasPattern` fills.
- **Tick color dark mode fallback** — SVGOverlay tick color CSS var chain is now `--semiotic-text-secondary` → `--semiotic-text` → `#666`, improving visibility when only `--semiotic-text` is set.
- **Annotation accessor fallback** — SVGOverlay annotation renderer receives `"__resolvedX"`/`"__resolvedY"` when accessors are functions, preventing annotations from rendering at wrong positions.

### Changed

- **`SegmentType` union expanded** — Added `"training-base"` to the exported type.
- **`ForecastConfig` interface expanded** — Added `trainStroke`, `trainLinecap`, `trainUnderline`, `trainOpacity`, `forecastOpacity`, `anomalyStyle`, `_groupBy`. `anomalyColor` and `anomalyRadius` now accept functions.
- **HOC early return guard** — LineChart (and other HOCs with statistical overlays) no longer returns early before loading/empty state, ensuring all hooks are called unconditionally (React rules of hooks compliance).

## [3.1.2] - 2026-03-21

> **Note:** v3.1.1 was yanked from npm due to broken MCP tool schemas. Upgrade directly from 3.1.0 to 3.1.2.

### Fixed

- **MCP server tools received no arguments** — all 5 tools used empty `{}` Zod schemas, causing the MCP SDK to strip all incoming parameters. Every tool call silently fell into "missing field" error paths. Fixed by defining proper Zod input schemas for all tools (`getSchema`, `suggestChart`, `renderChart`, `diagnoseConfig`, `reportIssue`).
- **MCP geo chart rendering** — `renderHOCToSVG` called `validateProps` which rejected geo components not in its validation map. Geo components (ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram) now skip validation and render correctly.
- **MCP `--port` parsing** — `--http` without `--port` no longer produces NaN (falls back to 3001).
- **MCP "top-level fields" dead code** — removed unreachable spread logic from `renderChart`/`diagnoseConfig` handlers; updated Zod descriptions to match actual schema behavior (MCP SDK strips fields not in Zod schema).
- **suggestChart Histogram heuristic** — removed unreachable `data.length >= 10` check (suggestChart accepts 1–5 samples per its Zod schema).
- **renderHOCToSVG validation fragility** — tightened unknown-component skip check to require exactly one "Unknown component" error instead of `.every()` over all errors.

### Added

- **MCP geo chart support** — ChoroplethMap, ProportionalSymbolMap, FlowMap, and DistanceCartogram added to the MCP render registry (25 renderable components total).
- **MCP HTTP transport** — `npx semiotic-mcp --http --port 3001` starts a session-based HTTP server with CORS headers for browser-based MCP inspectors and remote access.
- **suggestChart input validation** — Zod schema enforces `.min(1).max(5)` on data array.

## [3.1.1] - 2026-03-21 (yanked)

### Added

- **MCP `reportIssue` tool** — generates pre-filled GitHub issue URLs for bug reports and feature requests directly from AI coding assistants. No auth required.
- **MCP `getSchema` tool** — returns the prop schema for a specific component on demand, reducing token overhead vs loading the full 63KB schema. Omit `component` to list all 30 chart types.
- **MCP `suggestChart` tool** — analyzes a data sample and recommends chart types with confidence levels and example props. Supports `intent` parameter for narrowing suggestions (comparison, trend, distribution, relationship, composition, geographic, network, hierarchy).
- **MCP server documentation** — comprehensive setup instructions, tool descriptions, and usage examples in README.
- **npm keywords** — `mcp`, `model-context-protocol`, `mcp-server`, and other discovery keywords for MCP directory indexing.
- **CI coverage thresholds** — unit test coverage gated at 62/52/63/65% (statements/branches/functions/lines) with `@vitest/coverage-v8`.
- **CI bundle size guardrails** — `size-limit` checks for all 6 entry bundles in CI pipeline.
- **axe-core accessibility scanning** — automated `@axe-core/playwright` scans across all chart category pages in E2E tests.
- **Self-healing error boundaries** — `SafeRender` runs `diagnoseConfig` on chart failures (dev mode) and displays actionable fix suggestions alongside the error message.
- **61 new unit tests** — coverage for `withChartWrapper` (SafeRender, warnDataShape, warnMissingField, renderEmptyState, renderLoadingState), network utilities, and push API on 7 ordinal chart types.

### Changed

- **MCP server** — added `getSchema`, `suggestChart`, and `reportIssue` tools (5 tools total). Added geo chart rendering support (ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram).
- **npm description** — updated to highlight MCP server capability for discoverability.
- **`prepublishOnly` cleans dist/** — prevents stale dynamic import chunks from accumulating in published tarball.

### Fixed

- **MCP `component` key leaking into props** — flat-shape calls like `{ component: "LineChart", data: [...] }` no longer pass `component` as a chart prop.
- **Missing dynamic import chunk** — `dist/*-statisticalOverlays-*.js` added to `files` array so forecast/anomaly features work when consumed via ESM.

## [3.1.0] - 2026-03-20

### Added

- **Geographic visualization** — new `semiotic/geo` entry point with 4 HOC chart components and a low-level `StreamGeoFrame`, all canvas-rendered with d3-geo projections.
  - **`ChoroplethMap`** — sequential color encoding on GeoJSON features. Supports `areaOpacity`, function or string `valueAccessor`, and reference geography strings (`"world-110m"`, `"world-50m"`, etc.).
  - **`ProportionalSymbolMap`** — sized/colored point symbols on a geographic basemap with `sizeBy`, `sizeRange`, and `colorBy`.
  - **`FlowMap`** — origin-destination flow lines with width encoding, animated particles (`showParticles`, `particleStyle`), and `lineType` ("geo"|"line").
  - **`DistanceCartogram`** — ORBIS-style projection distortion based on travel cost. Concentric ring overlay (`showRings`, `ringStyle`, `costLabel`), north indicator (`showNorth`), configurable `strength` and `lineMode`.
  - **`StreamGeoFrame`** — low-level geo frame with full control over areas, points, lines, canvas rendering, and push API for streaming.
- **`GeoCanvasHitTester`** — spatial indexing for hover/click hit detection on canvas-rendered geo marks.
- **`GeoParticlePool`** — object-pool polyline particle system for animated flow particles. Supports `"source"` color inheritance, per-line color functions, and configurable spawn rate.
- **`GeoTileRenderer`** — slippy-map tile rendering on a background canvas. Mercator-only with retina support. Configurable `tileURL`, `tileAttribution`, `tileCacheSize`.
- **Zoom/Pan** — all geo charts accept `zoomable`, `zoomExtent`, `onZoom`, with imperative `getZoom()`/`resetZoom()` on the frame ref. Re-renders projection directly (no CSS transform).
- **Drag Rotate** — `dragRotate` prop for globe spinning (defaults true for orthographic). Latitude clamped to [-90, 90].
- **Reference geography** — `resolveReferenceGeography("world-110m")` returns Natural Earth GeoJSON features. `mergeData(features, data, { featureKey, dataKey })` joins external data into features.
- **Geo particles** — `showParticles` and `particleStyle` on `FlowMap` and `StreamGeoFrame` for animated dots flowing along line paths.
- **6 geo documentation pages** — ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram, StreamGeoFrame, and GeoVisualization overview.
- **2 geo playground pages** — interactive prop exploration for geo charts.
- **1 geo recipe page** — ORBIS-style distance cartogram walkthrough.
- **Geo test suites** — unit tests for FlowMap (25 tests), ChoroplethMap (16 tests), DistanceCartogram (19 tests), colorUtils (+6 tests), hooks (+3 tests).

- **Accessibility foundation** — moves Semiotic from ~30% to ~70% WCAG 2.1 AA compliance.
  - **Canvas `aria-label`** — every `<canvas>` element now has a computed `aria-label` describing chart type and data shape (e.g., "scatter chart, 200 points"). All four Stream Frames: `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`.
  - **Legend keyboard navigation** — interactive legend items are focusable (`tabIndex={0}`, `role="option"`), with `role="listbox"` on the container. Enter/Space activates (click), Arrow keys navigate between items. Visible focus ring on keyboard focus.
  - **`aria-multiselectable`** on legend listbox when `legendInteraction="isolate"` or `customClickBehavior` is present.
  - **`aria-selected`** on legend items reflecting isolation state.
  - **`aria-live="polite"` region** — `AriaLiveTooltip` component mirrors tooltip text for screen reader announcements on hover.
  - **SVG `<title>` and `<desc>`** — all SVG overlays (`SVGOverlay`, `OrdinalSVGOverlay`, `NetworkSVGOverlay`) include `role="img"` and accessible `<title>`/`<desc>` elements derived from the chart title.
  - **`aria-label` on ChartContainer toolbar buttons** — Export, Fullscreen, and Copy Config buttons have descriptive labels and title attributes.
  - **35 Playwright integration tests** — `integration-tests/accessibility.spec.ts` covering canvas aria-labels, AriaLiveTooltip, legend keyboard traversal, focus rings, SVG title/desc, and ChartContainer toolbar buttons.

- **Streaming legend support** — new `useStreamingLegend` hook discovers categories from pushed data and builds legends dynamically with minimal re-renders via version counter. Integrated into StackedBarChart, PieChart, DonutChart, GroupedBarChart.

- **Streaming regression test suite** — 20+ Playwright integration tests (`streaming-regression.spec.ts`) covering:
  - Canvas pixel sampling to verify colored fills (saturation > 0.1) across 8 streaming chart types
  - Legend items appear after push API data arrives (4 chart types)
  - Area chart tooltip contains numeric values, not dashes
  - LineChart streaming stability (no "Maximum update depth" errors)
  - Force graph content centroid within 30% of canvas center
  - Error-free rendering across all 11 streaming test fixtures

- **Performance: color map cache** — `PipelineStore` caches the category→color map across rebuilds using a sorted category set as cache key. Skips rebuild when categories are unchanged. (`PipelineStore.ts`)
- **Performance: stacked area cache** — `PipelineStore` caches stacked area cumulative sums using a `buffer.size + ingestVersion` hash. Skips expensive groupData + cumulative sum computation when data is unchanged. (`PipelineStore.ts`)

### Fixed

#### Streaming Color Pipeline (root cause)

- **Grey fills on push API charts** — When using `ref.current.push()`, HOC charts passed undefined color scales to style functions, causing grey fallback fills. Fixed end-to-end:
  - HOC `pieceStyle`/`pointStyle`/`lineStyle` functions now omit fill/stroke when colorScale is unavailable
  - `OrdinalPipelineStore.resolvePieceStyle` fills in from the frame's color scheme when HOC returns no fill
  - `PipelineStore.resolveLineStyle`/`resolveAreaStyle`/point scene builder do the same for XY charts
  - New `resolveGroupColor` method provides centralized `STREAMING_PALETTE` assignment for streaming groups
  - Affected charts: StackedBarChart, PieChart, DonutChart, GroupedBarChart, BubbleChart, StackedAreaChart, AreaChart, LineChart, Scatterplot, QuadrantChart, ChordDiagram

#### Runtime Errors

- **LineChart infinite re-render loop** — circular dependency between `useEffect` → `setSegmentAwareStyle` → `baseLineStyle` → `colorScale` → `statisticalResult`. Fixed by guarding statistical effect to only run when forecast/anomaly is present and deriving `effectiveLineStyle` without unnecessary state.
- **`createColorScale` crash on undefined data** — added null guards (`d?.` + `.filter(v => v != null)`) so push API charts with sparse data don't throw.
- **`OrdinalSVGOverlay` duplicate React keys** — keys now include category/group for uniqueness across stacked/grouped layouts.

#### Tooltips

- **Area/StackedArea tooltips showing "-"** — `hitTestAreaPath` now extracts the specific data point at the hover index (like `hitTestLine` does) instead of returning the entire data array.
- **Ordinal frame tooltips** — default tooltip now shows category + value using `__oAccessor`/`__rAccessor` metadata.
- **Geo chart tooltips** — ChoroplethMap shows country names (not numeric IDs), ProportionalSymbolMap shows formatted metrics with labels, FlowMap shows source → target with values.

#### Layout & Interaction

- **Force graph centering** — added `forceCenter` to simulation, strengthened `forceX`/`forceY`, clamped node positions to canvas bounds. Fixed `finalizeLayout` overwriting force-computed positions from stale bounding boxes during streaming warm-starts.
- **Streaming force refresh** — force simulation now runs on topology changes during push API streaming.
- **FIFO category ordering** — streaming ordinal charts preserve insertion order instead of re-sorting by value (fixes violin/histogram column flicker).
- **Edge hit areas** — expanded to 5px minimum tolerance across XY lines, network edges (bezier + path), and geo lines. Added `pointToSegmentDist` for accurate perpendicular distance. Line hit tolerance now scales with stroke width.
- **Network edge ctx.lineWidth leak** — `hitTestBezierEdge` and `hitTestPathEdge` now save/restore `ctx.lineWidth` around `isPointInStroke` calls.
- **Sankey crossing reduction** — added barycenter-based initial node ordering before iterative relaxation.
- **QuadrantChart streaming** — fixed quadrant backgrounds disappearing after first point; points now auto-color by quadrant when no `colorBy` provided.
- **Anti-meridian line handling** — geo lines that wrap across the projection edge are split into segments with smooth opacity fades.
- **Distance cartogram centering** — center node is pinned to viewport center during streaming.
- **Orthographic drag jank** — pointer-move rotations now coalesce via `pendingRotationRef`, applying once per rAF frame.

#### Visual / Dark Mode

- **Orbit diagram** — ring/connecting lines changed from `currentColor` (invisible on canvas) to `rgba(128,128,128,0.35)`. Root nodes use scheme color instead of grey depth palette.
- **Treemap/CirclePack labels** — luminance-based contrast text color (white on dark fills, dark on light fills). Treemap parent labels positioned at top-left of rectangle.
- **ScatterplotMatrix diagonal histograms** — now colored by category with O(1) Map lookups instead of grey fills with O(n) `.indexOf()`.
- **Dark mode fixes** — serialization page text contrast, streaming system model background, candlestick wick color, uncertainty tooltip background.

#### Bug Fixes

- **`tooltip={false}` now correctly disables tooltips** on all 22 remaining HOCs. The pattern `normalizeTooltip(tooltip) || defaultTooltipContent` was replaced with an explicit `tooltip === false ? undefined : ...` check.
- **`normalizeTooltip` unwrap heuristic tightened** — the HoverData unwrap now only triggers when the object has `.type === "node" | "edge"` AND `.data`, preventing false unwraps when a user's datum has a `.data` property.
- **ForceDirectedGraph empty state** — `renderEmptyState` now checks `nodes` instead of `edges`, so a graph with nodes but no edges no longer shows the empty state.
- **ChoroplethMap validation** — added GeoJSON-aware validation that checks for a `geometry` property on area features, replacing the inapplicable `validateArrayData` check.
- **"Rendered more hooks than during previous render"** in `FlowMap` and `ChoroplethMap` — hooks were called after early returns for loading/empty states. All hooks now run unconditionally before any early return.
- **`colorScale` crash with null areas in ChoroplethMap** — `useMemo` now returns a fallback sequential scale when `resolvedAreas` is null during async loading.
- **Variable name collision in ChoroplethMap** — local `areaStyle` renamed to `areaStyleFn` to avoid collision with destructured prop.
- **Function `colorBy` produced undefined colors** — `useColorScale` now derives categories from data when `colorBy` is a function and builds a proper ordinal scale. `getColor` maps non-CSS-color strings through `colorScale`.
- **LineChart validation** — `validateArrayData` now receives the raw `data` prop instead of post-processed `safeData`, so push API mode (`data` undefined) correctly skips validation instead of triggering "No data provided".
- **QuadrantChart `sizeDomain` NaN** — `sizeBy` values are now filtered to finite numbers before computing min/max, preventing NaN propagation to point radius.

#### Documentation (25+ fixes)

- Home page: meaningful tooltips on bar chart, bubble chart, network graph (degree centrality)
- Streaming sankey pastel colors, chord multi-color fix
- Highlight hover uses distinct red line, more distinctive custom theme
- Top/bottom legend examples, chart container year controls work
- Responsive frame data fix, styling offset fix, linked dashboard color consistency
- Candlestick dark mode, uncertainty tooltip dark mode, isotype chart person icons
- Radar/isotype duplicate key fix, network explorer `.data` wrapper access
- Rosling bubble annotations/extent/tooltip, benchmark log scale fix, forecast sparkline card
- Force graph sparse preset parameters, choropleth playground sizing
- DocumentFrame: added 100+ missing prop names to `processNodes`
- Tile map: production provider documentation

## [3.0.1] - 2026-03-12

### Added

- **`emphasis` prop** — all charts accept `emphasis="primary" | "secondary"`. `ChartGrid` detects `emphasis="primary"` on children and spans them across two grid columns for F-pattern dashboard layouts.
- **`directLabel` rendering** — new `"text"` annotation type in `annotationRules.tsx` so `directLabel` labels actually render. Automatic right margin expansion prevents label clipping.
- **`gapStrategy` fixes** — `"break"` now correctly splits lines at null boundaries using synthetic `_gapSegment` group keys. `"interpolate"` filters gap points in the HOC before data enters the pipeline, preventing `resolveAccessor`'s unary `+` from coercing `null` to `0`.
- **Chart States docs page** (`/features/chart-states`) — dedicated page for empty, loading, and error state documentation. Moved from LineChart and ChartContainer pages.
- **Gap strategy tabs** — consolidated three separate subsections in LineChart docs into a tabbed interface.
- **Tabs component** — reusable tab switcher for docs pages.

### Changed

- **Export default format** — `exportChart()` now defaults to PNG instead of SVG. PNG export composites the canvas data layer underneath the SVG overlay, producing a complete chart image. SVG export only captures the overlay (axes, labels).
- **Type widening** — eliminated unsafe any casts at HOC/Frame boundaries by widening `rFormat`, `oSort`, `colorBy`, and `TooltipFieldConfig.accessor` types in stream type definitions.

### Fixed

- **Export captured only axes** — PNG export now finds the `<canvas>` element and draws it as the base layer before compositing the SVG overlay on top.
- **`directLabel` annotations silently dropped** — `type: "text"` was not a recognized annotation type; it fell through to the default case and returned `null`.
- **`gapStrategy="break"` drew lines through gaps** — flattening re-merged segments because the Frame re-grouped by the original `groupAccessor`.
- **`gapStrategy="interpolate"` dropped to zero** — `resolveAccessor` used `+(d)[key]` which converted `null` to `0`.
- **`colorBy` type mismatch in network charts** — hierarchy charts that color by depth index returned a number, but the type expected a string. Added `String()` coercion.
- **Duplicate `amplitude` property** in `StreamOrdinalFrameProps`.

## [3.0.0] - 2026-03-10

Complete rewrite of Semiotic. Stream-first canvas architecture, 37 HOC chart
components, full TypeScript, AI tooling, coordinated views, realtime encoding,
and native server-side rendering.

### Architecture

**Stream-first rendering.** All frames are canvas-first with SVG overlays for
labels, axes, and annotations. Legacy frame names (`XYFrame`, `OrdinalFrame`,
`NetworkFrame`) have been removed entirely.

| Frame | Purpose |
|---|---|
| `StreamXYFrame` | Line, area, scatter, heatmap, candlestick charts |
| `StreamOrdinalFrame` | Bar, pie, boxplot, violin, swarm charts |
| `StreamNetworkFrame` | Force, sankey, chord, tree, treemap, circlepack |

Every frame supports a ref-based push API for streaming data.

**Functional components + hooks.** All components converted from class-based to
functional. Full TypeScript strict mode with generic type parameters on all
Frame and Chart components. `"use client"` directives for React Server
Components compatibility.

### Added

#### Chart Components (HOCs)

38 higher-order chart components that wrap the core Frames with curated,
simple prop APIs.

**XY Charts** (wrap StreamXYFrame):
- `LineChart` — line traces with curve interpolation, area fill, and point markers
- `AreaChart` — filled area beneath a line
- `StackedAreaChart` — multiple stacked area series
- `Scatterplot` — point clouds with color and size encoding
- `ConnectedScatterplot` — sequential path through 2D space with Viridis gradient
- `BubbleChart` — sized circles with optional labels
- `Heatmap` — 2D binned density visualization

**Ordinal Charts** (wrap StreamOrdinalFrame):
- `BarChart` — vertical/horizontal bars with sort and color encoding
- `StackedBarChart` — stacked categorical bars
- `GroupedBarChart` — side-by-side grouped bars
- `SwarmPlot` — force-directed point distribution
- `BoxPlot` — statistical box-and-whisker
- `Histogram` — binned frequency distribution
- `ViolinPlot` — kernel density per category
- `DotPlot` — sorted dot strips
- `PieChart` — proportional slices
- `DonutChart` — ring variant of PieChart

**Network Charts** (wrap StreamNetworkFrame):
- `ForceDirectedGraph` — force-simulation node-link diagrams
- `ChordDiagram` — circular connection matrix
- `SankeyDiagram` — flow diagrams with weighted edges
- `TreeDiagram` — hierarchical tree layouts
- `Treemap` — space-filling hierarchical rectangles
- `CirclePack` — nested circle packing
- `OrbitDiagram` — animated orbital hierarchy with solar/atomic/flat modes

**Realtime Charts** (canvas-based streaming):
- `RealtimeLineChart` — streaming line
- `RealtimeHistogram` — streaming histogram bars
- `RealtimeSwarmChart` — streaming scatter
- `RealtimeWaterfallChart` — streaming waterfall/candlestick
- `RealtimeHeatmap` — streaming 2D heatmaps with grid binning

All chart components feature:
- Full TypeScript generics (`LineChart<TDatum>`)
- Sensible defaults for width, height, margins, colors, hover
- `frameProps` escape hatch for accessing the underlying Frame API
- Automatic legend rendering when `colorBy` is set
- Smart margin expansion to accommodate legends and axis labels
- Built-in error boundary (never blanks the page) and dev-mode validation warnings

#### Server-Side Rendering

Two SSR paths, both producing identical SVG output:

**Component-level SSR** — Stream Frames detect server context
(`typeof window === "undefined"`) and render `<svg>` elements with scene
nodes instead of `<canvas>`. Same component, same props — works automatically
in Next.js App Router, Remix, and Astro.

**Standalone SSR** — `semiotic/server` entry point for Node.js environments
(email, OG images, PDF, static sites):

```js
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

- `renderToStaticSVG(frameType, props)` — generic entry point
- `renderXYToStaticSVG(props)` — XY-specific
- `renderOrdinalToStaticSVG(props)` — ordinal-specific
- `renderNetworkToStaticSVG(props)` — network-specific
- Shared SceneToSVG converters used by both paths

#### Realtime Visual Encoding System
- `decay` prop — configurable opacity fade for older data (linear, exponential, step modes)
- `pulse` prop — glow flash effect on newly inserted data points with configurable duration/color
- `transition` prop — smooth position interpolation with ease-out cubic easing
- `staleness` prop — canvas dimming + optional LIVE/STALE badge when data feed stops
- All four features work on StreamXYFrame, StreamOrdinalFrame, and all realtime HOCs
- Features compose freely (e.g., decay + pulse creates a data trail with flash-on-arrival)

#### Marginal Graphics
- `marginalGraphics` prop on `StreamXYFrame`, `Scatterplot`, and `BubbleChart`
- Four types: **histogram**, **violin**, **ridgeline**, **boxplot**
- Margins auto-expand to 60px minimum when marginals are configured

#### Coordinated Views
- `LinkedCharts` — cross-highlighting, brushing-and-linking, and crossfilter between any charts
- Selection hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`
- `ScatterplotMatrix` — N×N grid with hover cross-highlight or crossfilter brushing
- `CategoryColorProvider` — stable category→color mapping across charts

#### Threshold-based Line Coloring
- Annotations with `type: "threshold"` automatically split lines into colored segments
- Interpolates exact crossing points between data samples

#### ThemeProvider
- `ThemeProvider` wraps charts and injects CSS custom properties
- Presets: `"light"` (default) and `"dark"`
- `useTheme()` hook

#### Layout & Composition
- `ChartGrid` — CSS Grid layout with auto columns
- `ContextLayout` — primary + context panel layout

#### AI Tooling

- **`semiotic/ai`** — HOC-only surface optimized for LLM code generation
- **`ai/schema.json`** — machine-readable prop schemas for every component
- **MCP server** (`npx semiotic-mcp`) — renders charts as SVG tools for any MCP client
  - Per-component tools for all 21 SVG-renderable chart types
  - Generic `renderChart` tool accepting `{ component, props }`
  - `diagnoseConfig` tool for anti-pattern detection
- **`validateProps(componentName, props)`** — prop validation with Levenshtein typo suggestions
- **`diagnoseConfig(componentName, props)`** — anti-pattern detector with 12 checks:
  `EMPTY_DATA`, `EMPTY_EDGES`, `BAD_WIDTH`, `BAD_HEIGHT`, `BAD_SIZE`,
  `ACCESSOR_MISSING`, `HIERARCHY_FLAT_ARRAY`, `NETWORK_NO_EDGES`,
  `DATE_NO_FORMAT`, `LINKED_HOVER_NO_SELECTION`, `MARGIN_OVERFLOW_H`, `MARGIN_OVERFLOW_V`
- **CLI** (`npx semiotic-ai`) — `--schema`, `--compact`, `--examples`, `--doctor`
- **`CLAUDE.md`** — instruction file for Claude, Cursor, Copilot, Windsurf, and Cline
- **Schema freshness CI** — cross-references schema.json, VALIDATION_MAP, and CLAUDE.md

#### Other
- `onObservation` — structured events (hover, click, brush, selection) on all HOCs
- `useChartObserver` — aggregates observations across LinkedCharts
- `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX` — chart serialization
- `fromVegaLite(spec)` — translate Vega-Lite specs to Semiotic configs
- `exportChart()` — download charts as PNG (default) or SVG
- `ChartErrorBoundary` — React error boundary
- `DetailsPanel` — click-driven detail panel inside `ChartContainer`
- Data transform helpers (`semiotic/data`): `bin`, `rollup`, `groupBy`, `pivot`
- `Tooltip` and `MultiLineTooltip` components with field-based configuration
- Keyboard navigation utilities

#### Granular Bundle Exports

Eight separate entry points for reduced bundle sizes:

| Entry Point | Contents |
|---|---|
| `semiotic` | Full library |
| `semiotic/xy` | XY Frame + XY charts |
| `semiotic/ordinal` | Ordinal Frame + ordinal charts |
| `semiotic/network` | Network Frame + network charts |
| `semiotic/realtime` | Realtime charts |
| `semiotic/server` | SSR rendering functions |
| `semiotic/ai` | HOC-only surface for AI generation |
| `semiotic/data` | Data transform utilities |

#### HOC Shared Infrastructure

Extracted shared logic from all HOC chart components into reusable hooks:

- **`useChartSelection` hook** — selection/hover setup used by 21 charts
- **`useChartLegendAndMargin` hook** — legend + margin auto-expansion used by 18 charts
- **`buildOrdinalTooltip` helper** — shared tooltip builder for ordinal charts
- **Network utilities** — `flattenHierarchy`, `inferNodesFromEdges`, `resolveHierarchySum`, `createEdgeStyleFn`

### Changed

#### Build System

- Rollup 2.x → Rollup 4.x with Terser minification
- Modern ESM output with `const` bindings (ES2015 target)
- `sideEffects: false` for aggressive tree-shaking
- Modern `exports` field in package.json for proper ESM/CJS resolution

#### React 18 Requirement

Minimum React version is now 18.1.0 (was 16.x in v1, 17.x in v2).
Also supports React 19.

#### Network Layout Refactoring

The monolithic `processing/network.ts` has been split into focused layout plugins:
sankey, force, chord, tree, cluster, treemap, circlepack, partition.

### Removed

- **All legacy frames** — `XYFrame`, `OrdinalFrame`, `NetworkFrame` and their Responsive/Spark variants. Use `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`.
- **`FacetController`** — use `LinkedCharts`
- **`RealtimeSankey`**, **`RealtimeNetworkFrame`** — use `StreamNetworkFrame` with `chartType="sankey"`
- **`baseMarkProps`**, **`ProcessViz`**, **`Mark`**, **`SpanOrDiv`** — removed internal utilities

### Fixed

- Chord diagram arc/ribbon angle alignment
- Stacked area streaming flicker (stable sort of groups)
- Violin plot IQR positioning
- Sankey particle colors
- Canvas clip region (marks no longer draw into margins)
- Tooltip position flipping at chart edges
- Stacked bar color encoding, streaming aggregation, and category flicker
- Force layout initial positions (phyllotaxis spiral)
- Treemap hover (smallest containing rect wins)
- Axis label floating-point noise and overlap
- ThemeProvider integration with SVG overlay axes and canvas background
- HOC chart data validation (visible error element instead of blank)
- 30+ additional rendering, theming, and coordination fixes

---

## [2.0.0-rc.12] - 2021

Version 2.0 was an internal milestone that began the transition from class
components to functional components and introduced initial TypeScript support.
It was never promoted to a stable release.

Notable changes from v1:
- Initial functional component conversions
- TypeScript adoption began
- React 17 compatibility

---

## [1.20.6] - 2020-12-02

- Add `customClickBehavior` with hover pointer state for legend interactions
- Make difference between vertical and horizontal group rendering explicit

## [1.20.5] - 2020-01-21

- Fix canvas interactivity with custom canvas function

---

For the complete v1.x changelog, see the
[git history](https://github.com/nteract/semiotic/commits/main).

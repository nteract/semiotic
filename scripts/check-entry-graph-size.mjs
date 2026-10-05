#!/usr/bin/env node
/**
 * Chunk-aware entry graph size gate.
 *
 * After shared ESM chunks, family facades (`xy.module.min.js`, etc.) are ~2 KB
 * re-export shells. Classic size-limit measures only those shells against
 * 95–135 KB budgets and always passes. This script walks each entry's static
 * `import` graph (including `chunk-*.module.min.js`), sums gzip sizes, and
 * enforces budgets that reflect real cold-load cost.
 *
 * Usage (after `npm run dist:prod`):
 *   node scripts/check-entry-graph-size.mjs
 *   node scripts/check-entry-graph-size.mjs --print
 */

import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { constants as zlibConstants, gzipSync } from "node:zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..")
const DIST = join(REPO_ROOT, "dist")
const printOnly = process.argv.includes("--print")

/**
 * Budgets are gzip totals for entry + reachable static ESM chunks. They guard
 * whole-facade cold loads (a CDN or unbundled `import * from "semiotic/xy"`).
 * What an application actually ships for one named import is gated by
 * `npm run check:cold-consumer` (code-split, eager graph) and
 * `scripts/treeshake-isolation.test.mjs`.
 */
const ENTRY_GRAPHS = [
  // Intentional feature cost (2026-10-04): centered histogram bins, scoped/
  // controlled linked crosshairs, declarative chart/theme tooltip chrome, and
  // ordering of pre-click hover work add 1.1–2.0 KiB gzip versus a built
  // unmodified HEAD. No dependency or family coupling was added: 19 isolation/
  // minifier tests pass and the named multi-import graph remains 307.6/308 KiB.
  // Only affected facade budgets below include this public runtime growth;
  // each retains less than 0.5 KiB headroom over its measured production graph.
  // Bumped 360→375: CrucibleChart + netEnsemble/wordTrails recipe growth
  // pushed the full facade to ~362.6 KB gzip; other family budgets absorbed
  // the same growth with headroom to spare.
  // Bumped 375→376 (3.8.6): the native BigNumber static renderer makes the
  // formerly React-only value card render-evidence-capable through
  // semiotic/server. This is a measured sub-KiB graph increase, not a new
  // shared runtime; keep the one-KiB headroom narrow.
  // Bumped 376→377: SVG axis/legend/title text now carries a plain
  // `font-size` presentation-attribute fallback alongside the existing
  // CSS-var style, so consumers with no CSS engine over the SVG (a
  // style-stripping sanitizer, the Figma plugin's importer, static
  // rasterizers) still get a sane size instead of silently inheriting the
  // host document's. Sub-KiB text-attribute growth across the shared SVG
  // overlay chunk, not a new dependency.
  // Bumped 377→384: ProcessSankey's renderer-aware quality scorer, capped/
  // hugged lane placement, reusable 1D layout kernel, and scene-repaint
  // invalidation add 5.4 KiB gzip to the full facade. The kernel remains
  // comfortably inside the recipes-specific budget below; this is chart
  // functionality, not a new runtime dependency. The production graph is
  // 382.4 KiB, leaving 1.6 KiB of headroom.
  // Bumped 384→396: ProcessSankey packing/ordering refinements, worker client,
  // bonded multi-slot units, feeder runway, and quality product surface land
  // in the full facade. Production graph measures 394.4 KiB gzip.
  // Bumped 396→397: subsequent shared-frame behavior and documentation
  // surfaces measure 396.5 KiB gzip; retain half a KiB of headroom.
  // Bumped 397→399: the shared tooltip/theme accessibility surface adds
  // 1.8 KiB gzip to the canonical facade (398.8 KiB measured).
  // Bumped 399→400: production gzip can vary by a few hundred bytes around
  // the rounded 399.0 KiB measurement; retain a full KiB of guard headroom.
  // Lowered 400→385 (2026-09-30): the facade measures 383.7 KiB gzip after
  // XY transitions moved to an on-demand chunk; keep a narrow guard band
  // instead of 16 KiB of unreviewed headroom.
  // Bumped 385→387 (2026-09-30): the facade exports DirectManipulationMarkers
  // and pointerToLocalPoint, XY/ordinal frames gain the interactiveGraphics
  // control layer, and diagnoseConfig gains the annotation field-typo check;
  // measures 385.5 KiB gzip.
  // Feature graph: 387.3 KiB (previous built HEAD: 385.9 KiB).
  { entry: "semiotic.module.min.js", label: "semiotic", limitKb: 387.75 },
  // Bumped 150→154: custom-layout painter registration now loads on demand
  // rather than retaining every painter in every chart HOC. The lightweight
  // readiness bridge and fallback paint selection live in the shared XY
  // runtime; the measured LineChart graph is 154.6 KiB gzip. Leave a full
  // KiB guard band for changes to that shared runtime.
  // LineChart moved into the primary identity graph so providers from
  // `semiotic/themes/react` and `LinkedCharts` share store instances with it.
  // This costs the family ~3 KiB but removes a split-instance correctness bug.
  // Bumped 159→160 (3.9.2): shared XY frame title/accessibility defaults
  // add a sub-KiB shared-graph increase.
  // Bumped 160→161: multi-series edge snapping, keyboard multi focus, and
  // histogram column hover (bar plugin) measure 160.01 KiB gzip.
  // Bumped 161→162: BumpChart's text-sized endpoint-label margins (shared
  // with renderChart) measure 161.43 KiB gzip.
  // Bumped 162→163: 3.11.1 left xy at 161.96 KiB; BumpChart's per-glyph
  // endpoint-label width estimate measures 162.04 KiB gzip.
  // Bumped 163→164: BumpChart's UTC Date x labels (locale/time-zone-free, so
  // browser and renderChart agree) and time-aware default tooltip dates
  // measure 163.02 KiB gzip after trimming both helpers.
  // Bumped 164→165: one hatch tile for canvas and SVG (device-resolution
  // canvas tile, lineOpacity), value-banded bar fills, domain-anchored
  // semantic area fills, and tooltip flip state measure 164.5 KiB gzip.
  // Lowered 165→163.5 (2026-09-30): the XY transition engine loads on demand
  // (only `animate`/`transition` charts fetch it); measures 162.3 KiB gzip.
  // Feature graph: 164.6 KiB (previous built HEAD: 163.2 KiB).
  { entry: "xy.module.min.js", label: "xy", limitKb: 165 },
  // One-chart micro boundary: LineChart registers only its line/area/mixed
  // renderer family. Keep the budget narrow so unrelated HOCs or direct
  // StreamXYFrame consumers cannot quietly rejoin this graph.
  // Bumped 121→122: shared selection matching of covered ranges (histogram
  // bins against point selections) and multi-series edge snapping measure
  // 121.24 KiB gzip.
  // Bumped 122→123: under-layer band fills (canvas and SVG pre-render pass,
  // shared by every StreamXYFrame chart) measure 122.02 KiB gzip.
  // Bumped 123→124: the shared hatch tile, var()-safe label boxes, and
  // tooltip flip state (all shared by every StreamXYFrame chart) measure
  // 123.2 KiB gzip.
  // Lowered 124→122 (2026-09-30): on-demand transitions measure 121.0 KiB gzip.
  // Feature graph: 123.3 KiB (previous built HEAD: 121.9 KiB).
  { entry: "semiotic-line.module.min.js", label: "line", limitKb: 123.5 },
  // The opt-in text adapter stays isolated. This budgets Semiotic's code;
  // @chenglou/pretext remains an external optional peer, like React.
  { entry: "semiotic-text.module.min.js", label: "text (adapter)", limitKb: 2 },
  // Opt-in isometric pictograms + perspective toggle; no frame or engine code.
  { entry: "semiotic-network-perspective.module.min.js", label: "network/perspective (kit)", limitKb: 4 },
  // Access contracts compose AI grounding/audit systems; keep them off chart
  // production graphs while retaining a narrow tooling budget.
  // Bumped 35→36: authored hierarchy rollups and choropleth coverage/range/
  // rank branches replace the former flat mark dump. Production measures
  // 35.4 KiB gzip; these are the public navigation semantics, not a runtime
  // dependency leak.
  // Bumped 36→37: the contract marker lattice now includes policy lineage and
  // correction provenance in the access surface. Measured graph reaches
  // 36.1 KiB gzip.
  { entry: "semiotic-access.module.min.js", label: "access", limitKb: 37 },
  // Evidence envelopes include data profiles and grounding; this is tooling,
  // not a chart runtime dependency. The public aesthetic-evaluation evidence
  // adds its reusable color-evidence normalization here. CI measures 50.1 KiB
  // gzip, so retain a narrow one-KiB guard band rather than the inherited
  // 180 KiB ceiling that could not detect accidental runtime coupling.
  // Its isolated neutral build now measures 46.4 KiB, so restore the original
  // 51 KiB ceiling instead of carrying forward shared-chunk inflation.
  { entry: "semiotic-evidence.module.min.js", label: "evidence", limitKb: 51 },
  // New renderer-independent interpretation-contract boundary. This includes
  // claims, time, policy, grounding, collection, and loss-aware transfer
  // utilities without React or a chart renderer. The initial surface measured
  // 107.6 KiB gzip.
  // Closed structural validation, bound identity/time checks, correction
  // lineage, and collection-scoped transfer audits complete that public
  // contract. Its isolated graph measures 113.4 KiB gzip; keep a reviewable
  // 3.6 KiB guard band.
  // Bumped 117→118→119→120→121: policy telemetry sidecar support and policy
  // lineage provenance fields increase the shared contract surface. Production
  // graph now measures 120.8 KiB gzip.
  // light metadata path on this shared chart contract boundary.
  {
    entry: "semiotic-artifact.module.min.js",
    label: "artifact",
    // NA5 binds prepared Atlas payloads as data and registers three chart
    // identities. The published contract graph now measures 121.6 KiB gzip.
    // Bumped 122→123: histogram valueBands and annotation labelColor in the
    // chart specs measure 122.2 KiB gzip.
    limitKb: 123
  },
  {
    entry: "semiotic-artifact-react.module.min.js",
    label: "artifact/react",
    limitKb: 8
  },
  // Bumped 130→131: the shared hatch tile, var()-safe label boxes, and
  // tooltip flip state measure 130.0 KiB gzip, level with the old limit.
  // Feature graph: 132.1 KiB (previous built HEAD: 131.0 KiB).
  { entry: "ordinal.module.min.js", label: "ordinal", limitKb: 132.5 },
  // Bumped 140→147: ProcessSankey layout/worker/ordering growth on the network
  // subpath. Production graph measures 144.8 KiB gzip.
  // Bumped 147→148: topology-safe boundary-fan centering and exclusive sibling
  // row reuse measure 147.1 KiB gzip, retaining less than 1 KiB of headroom.
  // Bumped 148→149 (3.9.0): the opt-in accessible-table portal keeps focusable
  // summary controls outside consumer-owned role=img roots. After lazy-splitting
  // the portal implementation, the network graph measures 148.1 KiB gzip.
  // Bumped 149→151 (3.9.0): shared legend/axis chrome now reserves the
  // actual frameProps legend side and keeps direct/static chart geometry in
  // parity. The shared client graph measures 149.8 KiB gzip; retain a
  // reviewable KiB of headroom instead of splitting common chrome at release.
  // The custom-layout readiness bridge is shared by StreamXYFrame consumers.
  // Current production graphs: network 154.3 KiB, geo 111.6 KiB gzip.
  // Bumped 156→157: visualization text now inherits the theme font family,
  // including network labels in live and SSR frames. Linux CI measures the
  // resulting network graph at 156.2 KiB; retain less than 1 KiB headroom.
  // Bumped 157→163: network `perspective`. Every network chart registers the
  // projection engine so a JSON/SSR `perspective="isometric"` renders on first
  // paint; ground grid, plates, regions, routing and extrusion lazy-load. The
  // graph measures 162.2 KiB gzip (main 152.4 KiB).
  // Bumped 163→164.5: perspective pieces have thickness by default (tokens,
  // slab side walls, stacked hierarchy levels, edge shadows). It is the first
  // paint of every projected chart, so it ships with the eager engine, not the
  // lazy extras. Measures 163.9 KiB gzip.
  // Bumped 164.5→165.5: custom-layout decorations follow a perspective
  // (exported NetworkPerspectiveGround/Billboard, a realm-shared lazy context
  // so recipes and frames in separate bundles meet, invisible-fill wall guards,
  // a dev warning for unplaced decorations). Measures 164.7 KiB gzip.
  // Bumped 165.5→166.5: the shared hatch tile, var()-safe label boxes, and
  // tooltip flip state measure 165.8 KiB gzip.
  // Shared lazy-module loading changes measure 166.7 KiB; retain narrow headroom.
  // Feature graph: 167.9 KiB (previous built HEAD: 166.8 KiB).
  { entry: "network.module.min.js", label: "network", limitKb: 168.25 },
  { entry: "geo.module.min.js", label: "geo", limitKb: 113 },
  // Bumped 160→161 (3.9.0): compact-frame legend reservation now carries the
  // resolved plot height through every realtime chart so legends cannot erase
  // the drawable area. Production graph measures 160.2 KiB gzip.
  // Bumped 161→163 (3.9.0): shared legend/axis/title chrome also respects
  // final frameProps overrides and prevents static/live plot geometry drift.
  // The reachable graph measures 162.0 KiB gzip; keep one KiB headroom.
  // Bumped 163→164: histogram category breakdowns, column multi hover, and
  // bin time-range selection matching measure 163.45 KiB gzip.
  // Bumped 164→165: under-layer band fills for histogram and line annotations
  // measure 164.26 KiB gzip.
  // Bumped 165→168: StreamNetworkFrame's perspective shell (projected outline
  // painting, ordered paint, loader). Frame-only bundles fetch the engine on
  // first use rather than bundling it; measures 167.6 KiB gzip.
  // Bumped 168→168.5: the same frame shell now shares its perspective context
  // across bundles, guards walls on invisible fills and warns in development
  // about unplaced layout decorations (168.1 KiB measured). The placement
  // components themselves stay out of this graph.
  // Bumped 168.5→170: histogram value-banded fills (canvas and SVG), the
  // shared hatch tile, and tooltip flip state measure 169.3 KiB gzip.
  // Lowered 170→168.5 (2026-09-30): on-demand XY transitions measure
  // 167.4 KiB gzip.
  // Feature graph: 170.5 KiB (previous built HEAD: 168.5 KiB).
  { entry: "realtime.module.min.js", label: "realtime", limitKb: 171 },
  // Bumped 160→161 (3.8.6): PacketFlow and Crucible now join the shared
  // physics selection contract. The chart-local split keeps source modules
  // bounded, while the reachable graph gains less than one KiB gzip.
  // Bumped 161→162: the current shared graph measures 161.2 KiB gzip.
  // Bumped 162→163: the consistent tooltip/theme surface adds 0.7 KiB gzip
  // to the physics facade (162.7 KiB measured).
  // Bumped 163→164 (3.9.0): physics frames share the opt-in accessible-table
  // portal contract. The lazy implementation leaves the graph at 163.1 KiB.
  // Bumped 164→166 (3.9.0): title and legend chrome now shares the same
  // theme/placement contract across rendering families. The common client
  // graph measures 164.3 KiB gzip; retain a narrow release headroom.
  // The shared StreamXYFrame custom-layout bridge measures 166.8 KiB here.
  // Bumped 168→169: the shared hatch tile and tooltip flip state measure
  // 167.9 KiB gzip.
  // Feature graph: 169.4 KiB (previous built HEAD: 168.3 KiB).
  { entry: "physics.module.min.js", label: "physics", limitKb: 169.75 },
  // Bumped 240→242 (3.9.0): static Gauge SVG content and opt-in geometry
  // precision add serializer/runtime code to the server entry.
  // Bumped 242→244: the published Atlas readers and renderer-aware server
  // configs add 1.6 KiB gzip to the reachable graph (243.6 KiB measured).
  // Bumped 244→245: Linux CI measures 244.2 KiB gzip; retain 0.8 KiB headroom.
  // Bumped 245→246: BumpChart endpoint-label margins, Gauge center content,
  // and area opacity parity reach the static renderer (245.69 KiB measured).
  // Bumped 246→248: MinimapChart's static overview brush (mask, handles,
  // extent labels) and the LinearBrush geometry and label layout it shares
  // with the browser reach the static renderer (247.66 KiB measured).
  // Bumped 248→249: static under-layer band fills and GaugeChart hub-fitted
  // centers reach the static renderer (248.26 KiB measured).
  // Bumped 249→260: static rendering installs the perspective engine and its
  // extras synchronously so renderChart/MCP draw every perspective feature
  // (259.3 KiB measured).
  // Bumped 260→261.5: perspective thickness (tokens, slab walls, edge
  // shadows) in the same engine (260.8 KiB measured).
  // Bumped 261.5→262.5: static value-banded histogram bars, standalone-safe
  // (var()-free) annotation label paints, and the shared hatch tile measure
  // 261.8 KiB gzip.
  { entry: "server.module.min.js", label: "server", limitKb: 262.5 },
  // Bumped 450→460: the public numeric audit + chart contract evaluator adds
  // ~5–6 KB gzip to the AI graph; ChartContainer loads the same code lazily.
  // Bumped 460→462 (3.8.6): BumpChart (+ its ribbon geometry) joins the AI graph.
  // Bumped 462→475 (3.8.6): ChainReactionChart's physics runtime, schema, and
  // capability wiring join the AI surface. Keep the canonical AI catalog whole.
  // Bumped 475→480 (3.8.6): the current shared capability/accessibility graph
  // measures 477.3 KB gzip after the portable-policy and audit work; this keeps
  // a narrow 2.7 KB headroom without changing the canonical AI catalog.
  // Bumped 481→487: the same ProcessSankey layout capabilities join the
  // canonical AI chart catalog. The production graph is 485.8 KiB, leaving
  // 1.2 KiB of headroom.
  // Bumped 487→500: ProcessSankey continues to expand on the AI catalog path.
  // Production graph measures 498.0 KiB gzip.
  // Bumped 500→501: current gzip measurements reach 500.1 KiB; retain
  // sub-KiB headroom for the stable, canonical AI chart catalog.
  // Bumped 503→504: boundary-hub ordering and its typed helper add 0.1 KiB
  // gzip to the AI catalog (503.1 KiB measured); retain reviewable headroom.
  // Bumped 504→505: production CI graph measures 504.3 KiB gzip after the
  // release hardening pass. Keep one KiB of explicit headroom so the AI
  // endpoint does not fail on a sub-KiB boundary fluctuation.
  // Bumped 505→506: BumpChart's validated ranking capability, collision-safe
  // label controls, and AI description/caveat handling add 0.1 KiB to the
  // reachable graph. Retain one KiB of explicit headroom.
  // Bumped 506→510: the unified evaluateChart data/deception/accessibility
  // surface is exported from the AI entry point. The current graph measures
  // 508.1 KiB; retain reviewable headroom for the evaluator's shared audits.
  // Bumped 510→512 (3.9.0): composable/schema-aware intents, identifier-safe
  // profiling and re-derivation, suggestion prop contracts, and semantic
  // viability evidence measure 511.1 KiB after dependency and registry splits.
  // Bumped 512→514 (3.9.0): typed suggestion preparation, narration
  // diagnostic refresh, and render-evidence memoization complete the public
  // AI repair/render flow. Production graph measures 512.4 KiB gzip.
  // Bumped 514→516 (3.9.0): the shared legend/axis/title hardening reaches
  // the canonical AI chart catalog through the client-primary graph. It
  // measures 514.5 KiB gzip; keep one KiB of explicit, reviewable headroom.
  // Bumped 523→527: the canonical AI catalog reaches the same shared
  // custom-layout readiness path. Current production graph: 526.4 KiB gzip.
  // Bumped 527→532 (semiotic/line): moving LineChart into the primary client
  // identity graph shares ThemeProvider/LinkedCharts store instances with the
  // micro entry. This adds ~4.1 KiB to AI's shared graph; measured 530.5 KiB,
  // leaving 1.5 KiB headroom.
  // Bumped 532→538: the two built-in portable recipe pilots add their
  // manifests plus calendar/parallel runtime layouts to the generic
  // ChartRecipe host. Production measures 536.0 KiB gzip; the raw layouts
  // remain shared with semiotic/recipes rather than duplicated HOCs.
  // Bumped 538→540 after completing the recipe and semantic-navigation
  // tranches: production measures 538.6 KiB gzip. Keep less than 1.5 KiB of
  // runway around the canonical catalog rather than dropping accepted schema
  // or reader behavior to preserve a stale round number.
  // Bumped 540→545: the public aesthetic-policy evaluator and its color-
  // evidence normalization join the canonical AI catalog. Linux CI measures
  // 543.5 KiB gzip; retain 1.5 KiB of reviewable headroom for that accepted
  // public analysis surface.
  // Bumped 545→570: the AI compatibility surface re-exports the renderer-
  // independent contract evaluator, claim/time audits, refusal outcomes, and
  // safe grounding helpers. Production measures 567.2 KiB gzip; chart-family
  // entries do not inherit this opt-in tooling graph.
  // Bumped 570→579→582: the completed contract hardening above is also exported
  // from this compatibility surface. Production measures 582.4 KiB gzip;
  // retain 1.5 KiB of headroom without widening chart-family entries.
  // Chart-config reports now bind component/recipe identity, the full
  // contract, and serialized payload, while a missing report fails closed.
  // Focused policy/hash boundaries leave the compatibility graph at 576.2 KiB
  // without widening chart families; retain 3.8 KiB of review headroom.
  // Bumped 584→586: esbuild 0.28.2 plus overlay/format/brush catalog work
  // measure 584.8 KiB gzip. Keep ~1 KiB of headroom; chart-family budgets
  // still have unused runway.
  // Bumped 586→594: the published Atlas reader catalog and compatibility
  // surface add 7.2 KiB gzip (593.2 KiB measured).
  // Bumped 594→595: multi-series edge snapping (shared with keyboard focus)
  // and index-keyed LineChart gap segments add 0.7 KiB gzip; production
  // measures 594.7 KiB.
  // Bumped 595→596: histogram category breakdowns, column multi hover, and
  // corrected realtime/physics tooltip specs measure 595.45 KiB gzip.
  // Bumped 596→597: adaptiveTimeTicks label options and rendered-tick
  // relabeling of index-aware formatters measure 596.03 KiB gzip.
  // Bumped 597→598: BumpChart text-sized endpoint-label margins measure
  // 597.27 KiB gzip.
  // Bumped 598→599: 3.11.1 left 598.0 KiB with no headroom; GaugeChart
  // hub-fitted primitive centers measure 598.03 KiB gzip.
  // Bumped 599→600: under-layer band fills, per-glyph BumpChart label widths,
  // and histogram tooltip time ranges measure 599.02 KiB gzip.
  // Bumped 600→610: the AI graph carries the network charts' perspective
  // engine and the static renderer's extras (609.5 KiB measured).
  // Bumped 610→612: perspective thickness in that engine (611.2 KiB measured).
  // Bumped 612→614: axis-config key validation, value-banded histogram
  // fills, and the shared hatch tile measure 613.5 KiB gzip.
  // Feature graph: 614.7 KiB (previous built HEAD: 613.3 KiB).
  { entry: "semiotic-ai.module.min.js", label: "ai", limitKb: 615 },
  // Bumped 100→101: transitDiagramLayout's public detail modes, source-rooted
  // line derivation, and station-rendering contract extend the curated recipes
  // entry. Linux CI measures 100.3 KiB gzip; retain a reviewable 0.7 KiB
  // runway for this accepted public API growth.
  // Bumped 101→102: motifBraidLayout joins the recipes entry so NetworkCustomChart
  // SSR/CSR parity can consume the Motif Braid scene. Production measures
  // 101.4 KiB gzip; keep a sub-KiB runway for this accepted layout export.
  // NA5's public static readers repartition the shared layout chunk: +292
  // gzip bytes for this complete facade. The retained waffleLayout consumer
  // remains 1,765 bytes (+1 gzip byte / -1 raw byte); no new retained runtime.
  // Bumped 102.5→104: the complete reader graph measures 103.2 KiB gzip
  // after the published Atlas layout exports were included.
  // Bumped 104→105: every network recipe places its decorations under a
  // `perspective` (ground/billboard placement, declared fit bounds, Mermaid's
  // solid pieces). Measures 104.5 KiB gzip.
  { entry: "semiotic-recipes.module.min.js", label: "recipes", limitKb: 105 },
  // Optional readers reuse the existing network/physics hosts and stores.
  // Initial complete graphs: 272.3 KiB for readers, 13.4 KiB for pure Core.
  // Bumped 275→277: the published reader graph measures 276.7 KiB gzip
  // after the complete Atlas surface was wired into the package entry.
  // Approved 256-byte allowance for dense-pile settling: 283,747 bytes gzip,
  // with unchanged simulation output and a faster Linux coverage regression.
  // Bumped 277.25→286.5: Atlas readers reuse NetworkCustomChart, which now
  // registers the perspective engine (285.8 KiB measured).
  // Bumped 286.5→288: perspective thickness in that engine (287.4 KiB measured).
  // Bumped 288→289.5: Atlas layouts (dependency forest) and NetworkCustomChart
  // place their decorations under a perspective (288.7 KiB measured).
  // Bumped 289.5→290.5: the shared hatch tile, var()-safe label boxes, and
  // tooltip flip state measure 289.8 KiB gzip.
  // Shared lazy-module loading changes measure 290.5 KiB; allow 0.5 KiB headroom.
  // Feature graph: 291.8 KiB (previous built HEAD: 290.6 KiB).
  { entry: "semiotic-atlas.module.min.js", label: "atlas", limitKb: 292 },
  { entry: "semiotic-atlas-core.module.min.js", label: "atlas/core", limitKb: 15 },
  // Config serialization preserves and validates the optional interpretation
  // sidecar. Isolating the neutral utility graph removes unrelated shared
  // contract chunks and returns production to 96.5 KiB, so restore the 110 KiB
  // ceiling rather than retaining transient graph-inflation allowances.
  { entry: "semiotic-utils.module.min.js", label: "utils", limitKb: 110 },
  { entry: "semiotic-value.module.min.js", label: "value", limitKb: 25 }
]

function collectImports(filePath, seen = new Set()) {
  const abs = resolve(filePath)
  if (seen.has(abs) || !existsSync(abs)) return seen
  seen.add(abs)
  let src
  try {
    src = readFileSync(abs, "utf8")
  } catch {
    return seen
  }
  // ESM static imports: import … from "./chunk-….module.min.js"
  const re = /from\s*["'](\.?\.?\/[^"']+\.js)["']/g
  let m
  while ((m = re.exec(src))) {
    const rel = m[1]
    const next = resolve(dirname(abs), rel)
    collectImports(next, seen)
  }
  // Side-effect imports: import "./chunk-….js"
  const re2 = /import\s*["'](\.?\.?\/[^"']+\.js)["']/g
  while ((m = re2.exec(src))) {
    const next = resolve(dirname(abs), m[1])
    collectImports(next, seen)
  }
  return seen
}

function gzipSize(filePath) {
  const buf = readFileSync(filePath)
  return gzipSync(buf, { level: zlibConstants.Z_BEST_COMPRESSION }).length
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

if (!existsSync(DIST)) {
  console.error("dist/ missing — run `npm run dist:prod` first")
  process.exit(1)
}

let failed = false
const rows = []

for (const { entry, label, limitKb } of ENTRY_GRAPHS) {
  const entryPath = join(DIST, entry)
  if (!existsSync(entryPath)) {
    console.warn(`  skip ${label}: ${entry} not found`)
    continue
  }
  const files = collectImports(entryPath)
  let totalGzip = 0
  let totalRaw = 0
  for (const f of files) {
    const raw = readFileSync(f).length
    totalRaw += raw
    totalGzip += gzipSize(f)
  }
  const limit = limitKb * 1024
  const ok = totalGzip <= limit
  if (!ok) failed = true
  rows.push({
    label,
    entry,
    files: files.size,
    totalGzip,
    totalRaw,
    limit,
    ok
  })
}

console.log("Chunk-aware entry graph sizes (entry + static ESM imports, gzip):")

function printRows(rowsToPrint) {
  for (const r of rowsToPrint) {
    const mark = r.ok ? "✓" : "✗"
    console.log(
      `  ${mark} ${r.label.padEnd(10)} ${formatKb(r.totalGzip).padStart(10)} / ${formatKb(r.limit).padStart(10)}  (${r.files} files, raw ${formatKb(r.totalRaw)})`
    )
  }
}

const passingRows = rows.filter((row) => row.ok)
const failingRows = rows.filter((row) => !row.ok)

console.log("\nPassing entry graphs:")
printRows(passingRows)
console.log("\nFailing entry graphs:")
if (failingRows.length === 0) console.log("  none")
else printRows(failingRows)

if (printOnly) process.exit(0)

if (failed) {
  console.error(
    "\nOne or more entry graphs exceed their chunk-aware gzip budget.\n" +
      "  Facades alone are ~2 KB; budgets measure the reachable shared-chunk graph.\n" +
      "  Raise limits only with a PR note, or split the heavy shared chunk."
  )
  process.exit(1)
}

console.log("\n✓ all entry graphs within chunk-aware budgets")

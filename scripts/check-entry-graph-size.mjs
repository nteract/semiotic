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
 * Budgets are gzip totals for entry + reachable static ESM chunks.
 * Aligned loosely with Claude.md subpath gz sizes (+ headroom for d3 noise).
 */
const ENTRY_GRAPHS = [
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
  { entry: "semiotic.module.min.js", label: "semiotic", limitKb: 400 },
  // Bumped 150→154: custom-layout painter registration now loads on demand
  // rather than retaining every painter in every chart HOC. The lightweight
  // readiness bridge and fallback paint selection live in the shared XY
  // runtime; the measured LineChart graph is 154.6 KiB gzip. Leave a full
  // KiB guard band for changes to that shared runtime.
  // LineChart moved into the primary identity graph so providers from
  // `semiotic/themes/react` and `LinkedCharts` share store instances with it.
  // This costs the family ~3 KiB but removes a split-instance correctness bug.
  { entry: "xy.module.min.js", label: "xy", limitKb: 159 },
  // One-chart micro boundary: LineChart registers only its line/area/mixed
  // renderer family. Keep the budget narrow so unrelated HOCs or direct
  // StreamXYFrame consumers cannot quietly rejoin this graph.
  { entry: "semiotic-line.module.min.js", label: "line", limitKb: 121 },
  // Access contracts compose AI grounding/audit systems; keep them off chart
  // production graphs while retaining a narrow tooling budget.
  // Bumped 35→36: authored hierarchy rollups and choropleth coverage/range/
  // rank branches replace the former flat mark dump. Production measures
  // 35.4 KiB gzip; these are the public navigation semantics, not a runtime
  // dependency leak.
  { entry: "semiotic-access.module.min.js", label: "access", limitKb: 36 },
  // Evidence envelopes include data profiles and grounding; this is tooling,
  // not a chart runtime dependency. The production graph is 49.8 KiB, so
  // retain a narrow explicit guard band rather than the inherited
  // 180 KiB ceiling that could not detect accidental runtime coupling.
  { entry: "semiotic-evidence.module.min.js", label: "evidence", limitKb: 50 },
  { entry: "ordinal.module.min.js", label: "ordinal", limitKb: 130 },
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
  { entry: "network.module.min.js", label: "network", limitKb: 157 },
  { entry: "geo.module.min.js", label: "geo", limitKb: 113 },
  // Bumped 160→161 (3.9.0): compact-frame legend reservation now carries the
  // resolved plot height through every realtime chart so legends cannot erase
  // the drawable area. Production graph measures 160.2 KiB gzip.
  // Bumped 161→163 (3.9.0): shared legend/axis/title chrome also respects
  // final frameProps overrides and prevents static/live plot geometry drift.
  // The reachable graph measures 162.0 KiB gzip; keep one KiB headroom.
  { entry: "realtime.module.min.js", label: "realtime", limitKb: 163 },
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
  { entry: "physics.module.min.js", label: "physics", limitKb: 168 },
  // Bumped 240→242 (3.9.0): static Gauge SVG content and opt-in geometry
  // precision add serializer/runtime code to the server entry. Production
  // graph measures 240.8 KiB gzip; retain measured one-KiB headroom.
  { entry: "server.module.min.js", label: "server", limitKb: 242 },
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
  { entry: "semiotic-ai.module.min.js", label: "ai", limitKb: 540 },
  { entry: "semiotic-recipes.module.min.js", label: "recipes", limitKb: 100 },
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

console.log(
  "Chunk-aware entry graph sizes (entry + static ESM imports, gzip):\n"
)
for (const r of rows) {
  const mark = r.ok ? "✓" : "✗"
  console.log(
    `  ${mark} ${r.label.padEnd(10)} ${formatKb(r.totalGzip).padStart(10)} / ${formatKb(r.limit).padStart(10)}  (${r.files} files, raw ${formatKb(r.totalRaw)})`
  )
}

if (printOnly) process.exit(0)

if (failed) {
  console.error(
    "\n✗ One or more entry graphs exceed their chunk-aware gzip budget.\n" +
      "  Facades alone are ~2 KB; budgets measure the reachable shared-chunk graph.\n" +
      "  Raise limits only with a PR note, or split the heavy shared chunk."
  )
  process.exit(1)
}

console.log("\n✓ all entry graphs within chunk-aware budgets")

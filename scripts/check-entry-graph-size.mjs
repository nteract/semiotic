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
  { entry: "semiotic.module.min.js", label: "semiotic", limitKb: 396 },
  { entry: "xy.module.min.js", label: "xy", limitKb: 150 },
  { entry: "ordinal.module.min.js", label: "ordinal", limitKb: 130 },
  // Bumped 140→147: ProcessSankey layout/worker/ordering growth on the network
  // subpath. Production graph measures 144.8 KiB gzip.
  { entry: "network.module.min.js", label: "network", limitKb: 147 },
  { entry: "geo.module.min.js", label: "geo", limitKb: 110 },
  { entry: "realtime.module.min.js", label: "realtime", limitKb: 160 },
  // Bumped 160→161 (3.8.6): PacketFlow and Crucible now join the shared
  // physics selection contract. The chart-local split keeps source modules
  // bounded, while the reachable graph gains less than one KiB gzip.
  { entry: "physics.module.min.js", label: "physics", limitKb: 161 },
  { entry: "server.module.min.js", label: "server", limitKb: 240 },
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
  { entry: "semiotic-ai.module.min.js", label: "ai", limitKb: 500 },
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

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
  { entry: "semiotic.module.min.js", label: "semiotic", limitKb: 375 },
  { entry: "xy.module.min.js", label: "xy", limitKb: 150 },
  { entry: "ordinal.module.min.js", label: "ordinal", limitKb: 130 },
  { entry: "network.module.min.js", label: "network", limitKb: 140 },
  { entry: "geo.module.min.js", label: "geo", limitKb: 110 },
  { entry: "realtime.module.min.js", label: "realtime", limitKb: 160 },
  { entry: "physics.module.min.js", label: "physics", limitKb: 160 },
  { entry: "server.module.min.js", label: "server", limitKb: 240 },
  // Bumped 450→460: the public numeric audit + chart contract evaluator adds
  // ~5–6 KB gzip to the AI graph; ChartContainer loads the same code lazily.
  { entry: "semiotic-ai.module.min.js", label: "ai", limitKb: 460 },
  { entry: "semiotic-recipes.module.min.js", label: "recipes", limitKb: 100 },
  { entry: "semiotic-utils.module.min.js", label: "utils", limitKb: 110 },
  { entry: "semiotic-value.module.min.js", label: "value", limitKb: 25 },
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
    ok,
  })
}

console.log("Chunk-aware entry graph sizes (entry + static ESM imports, gzip):\n")
for (const r of rows) {
  const mark = r.ok ? "✓" : "✗"
  console.log(
    `  ${mark} ${r.label.padEnd(10)} ${formatKb(r.totalGzip).padStart(10)} / ${formatKb(r.limit).padStart(10)}  (${r.files} files, raw ${formatKb(r.totalRaw)})`,
  )
}

if (printOnly) process.exit(0)

if (failed) {
  console.error(
    "\n✗ One or more entry graphs exceed their chunk-aware gzip budget.\n" +
      "  Facades alone are ~2 KB; budgets measure the reachable shared-chunk graph.\n" +
      "  Raise limits only with a PR note, or split the heavy shared chunk.",
  )
  process.exit(1)
}

console.log("\n✓ all entry graphs within chunk-aware budgets")

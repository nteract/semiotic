#!/usr/bin/env node
/* global console, process */
/**
 * Measures gzip size of every public-subpath ESM bundle in `dist/`,
 * formats two views (table + bullet list), and upserts them into the
 * docs targets that surface bundle sizes to consumers and AI agents.
 *
 * Source of truth: stable `package.json#exports` entries → resolves each
 *   subpath to its `*.module.min.js` artifact under `dist/`. The script
 *   intentionally ignores unstable preview exports such as
 *   `semiotic/experimental`.
 *
 * Marker blocks (same pattern as `generate-ai-behavior-contracts.mjs`):
 *   <!-- semiotic-bundle-sizes:start -->
 *   ...generated content...
 *   <!-- semiotic-bundle-sizes:end -->
 *
 * Targets:
 *   - README.md                  full table view
 *   - CLAUDE.md                  compact bullet list
 *   - ai/system-prompt.md        compact bullet list
 *
 * Sub-path "what's inside" blurbs for the README table are kept in a
 * static map below. They are short by design (one HOC name + count)
 * and don't need to live in the build — but they DO need to stay in
 * sync with the catalog, so the script throws if a subpath has no
 * blurb to print.
 *
 * Usage after `npm run dist:prod`:
 *   node scripts/sync-bundle-sizes.mjs            # write (regen mode)
 *   node scripts/sync-bundle-sizes.mjs --check    # CI gate; non-zero exit on drift
 *   node scripts/sync-bundle-sizes.mjs --print    # print to stdout only
 */

import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs"
import { gzipSync, constants as zlibConstants } from "node:zlib"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const args = new Set(process.argv.slice(2))
const checkOnly = args.has("--check")
const printOnly = args.has("--print")

const MARKER_START = "<!-- semiotic-bundle-sizes:start -->"
const MARKER_END = "<!-- semiotic-bundle-sizes:end -->"
// Unstable preview bundles are packaged for collaborators but are intentionally
// omitted from the consumer-facing bundle-size table and CI drift gate.
const IGNORED_EXPORTS = new Set(["./experimental"])

// Subpath → short "what's inside" blurb shown in the README table.
// Keep these short and stable; they describe *which charts/utilities*
// each bundle ships, not implementation detail.
const BLURBS = {
  ".":          "Everything below (full bundle)",
  "./xy":       "LineChart, AreaChart, Scatterplot, Heatmap, + 8 more XY charts",
  "./ordinal":  "BarChart, PieChart, BoxPlot, Histogram, + 11 more categorical charts",
  "./network":  "ForceDirectedGraph, SankeyDiagram, ProcessSankey, Treemap, + 4 more",
  "./geo":      "ChoroplethMap, FlowMap, DistanceCartogram, ProportionalSymbolMap",
  "./realtime": "RealtimeLineChart, RealtimeHistogram, + 4 streaming charts",
  "./server":   "renderChart, renderDashboard, renderToImage, renderToAnimatedGif",
  "./utils":    "ThemeProvider, validators, serialization — no chart components",
  "./recipes":  "Pure layout functions (waffle, marimekko, flextree, dagre, …)",
  "./themes":   "Theme presets only (tufte, carbon, etc.)",
  "./data":     "bin, rollup, groupBy, pivot, fromVegaLite",
  "./value":    "BigNumber — focal-value KPI / scorecard (SingleValueFrame POC)",
  "./physics":  "GaltonBoardChart, EventDropChart, PhysicsPileChart, CollisionSwarmChart, PhysicalFlowChart, PhysicsCustomChart",
  "./physics/matter": "Matter.js migration helpers + optional peer guard (no chart components)",
  "./physics/rapier": "Rapier peer guard + adapter decision metadata (no chart components)",
  "./ai":       "All schema-backed charts + validation — optimized for LLM code generation",
  "./ai/core":  "suggestCharts, validateProps, describeChart, repairChartConfig, tool adapters — no chart components",
}

// Display order — independent of `package.json` key order so the
// table reads consistently. Larger bundles first within each rank
// (XY, ordinal, network, geo, realtime, server) so the "pick the
// smallest sub-path that fits your charts" message lands clearly.
const ORDER = [
  "./xy", "./ordinal", "./network", "./geo", "./realtime", "./server",
  "./utils", "./recipes", "./themes", "./data", "./value", "./physics",
  "./physics/matter", "./physics/rapier", "./ai", "./ai/core", ".",
]

// `./` → "semiotic", "./xy" → "semiotic/xy", "." → "semiotic".
function subpathToImportPath(subpath) {
  if (subpath === ".") return "semiotic"
  if (subpath.startsWith("./")) return `semiotic/${subpath.slice(2)}`
  return subpath
}

function resolveBundleFile(exportValue) {
  if (typeof exportValue === "string") return exportValue
  if (exportValue && typeof exportValue === "object") {
    return exportValue.import ?? exportValue.module ?? exportValue.default ?? null
  }
  return null
}

function gzipSize(absolutePath) {
  const raw = readFileSync(absolutePath)
  // -9 maximum compression to match the `gzip -9c` baseline used by
  // build dashboards. The default level (`-6`) would inflate sizes by
  // ~5% and produce numbers that don't match what `bundlephobia` /
  // `pkg-size` quote either.
  const gz = gzipSync(raw, { level: zlibConstants.Z_BEST_COMPRESSION })
  return gz.length
}

function assertProductionBundle(absolutePath, bundleRel, errors) {
  const text = readFileSync(absolutePath, "utf8")
  if (text.includes("sourceMappingURL=")) {
    errors.push(`${bundleRel} contains a sourceMappingURL comment, so it was built without production minification. Run \`npm run dist:prod\`.`)
  }
}

function relFromRoot(absolutePath) {
  return `./${absolutePath.slice(repoRoot.length + 1)}`
}

function localModuleSpecifiers(text) {
  const specifiers = new Set()
  const patterns = [
    /\b(?:import|export)\s*[^"'()]*?\s*from\s*["'](\.\/[^"']+)["']/g,
    /\bimport\s*["'](\.\/[^"']+)["']/g,
    /\bimport\(\s*["'](\.\/[^"']+)["']\s*\)/g,
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(text)) !== null) {
      specifiers.add(match[1])
    }
  }
  return specifiers
}

function resolveBundleFiles(entryAbs, errors) {
  const seen = new Set()
  const files = []
  const visit = (absolutePath) => {
    if (seen.has(absolutePath)) return
    seen.add(absolutePath)
    if (!existsSync(absolutePath)) {
      errors.push(`Referenced bundle chunk missing: ${relFromRoot(absolutePath)} (run \`npm run dist:prod\`)`)
      return
    }
    const text = readFileSync(absolutePath, "utf8")
    files.push(absolutePath)
    for (const specifier of localModuleSpecifiers(text)) {
      visit(resolve(dirname(absolutePath), specifier))
    }
  }
  visit(entryAbs)
  return files
}

function gzipBundleSize(absolutePaths) {
  // Code-split chunks are separate network transfers, so sum each file's gzip
  // size instead of gzipping their concatenation as one artificial blob.
  return absolutePaths.reduce((sum, absolutePath) => sum + gzipSize(absolutePath), 0)
}

function kbRound(bytes) {
  return Math.round(bytes / 1024)
}

function measure() {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"))
  const exports = pkg.exports ?? {}
  const rows = []
  const errors = []

  for (const subpath of ORDER) {
    if (!Object.prototype.hasOwnProperty.call(exports, subpath)) {
      errors.push(`Missing export entry for ${subpath} in package.json`)
      continue
    }
    if (!Object.prototype.hasOwnProperty.call(BLURBS, subpath)) {
      errors.push(`Missing blurb for ${subpath} in sync-bundle-sizes.mjs (update BLURBS)`)
      continue
    }
    const bundleRel = resolveBundleFile(exports[subpath])
    if (!bundleRel) {
      errors.push(`Could not resolve bundle file for ${subpath}`)
      continue
    }
    const bundleAbs = resolve(repoRoot, bundleRel)
    if (!existsSync(bundleAbs)) {
      errors.push(`Bundle file missing: ${bundleRel} (run \`npm run dist:prod\`)`)
      continue
    }
    statSync(bundleAbs) // throws if unreadable
    const bundleFiles = resolveBundleFiles(bundleAbs, errors)
    for (const absolutePath of bundleFiles) {
      assertProductionBundle(absolutePath, relFromRoot(absolutePath), errors)
    }
    rows.push({
      subpath,
      importPath: subpathToImportPath(subpath),
      bundle: bundleRel,
      kb: kbRound(gzipBundleSize(bundleFiles)),
      blurb: BLURBS[subpath],
    })
  }

  // Cross-check: every stable package export key should appear in ORDER
  // (except the metadata-only `./package.json` and explicitly ignored
  // preview exports). Catches a fresh stable export landing without an
  // ORDER + BLURBS update.
  for (const subpath of Object.keys(exports)) {
    if (subpath === "./package.json" || IGNORED_EXPORTS.has(subpath)) continue
    if (!ORDER.includes(subpath)) {
      errors.push(`Export ${subpath} is not listed in ORDER (sync-bundle-sizes.mjs)`)
    }
  }

  if (errors.length > 0) {
    console.error("✗ bundle-sizes measurement failed:")
    for (const err of errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  return rows
}

// ── Renderers ──────────────────────────────────────────────────────────

function renderTable(rows) {
  // Two-bold formatting on the KB column matches the prior hand-
  // maintained table's emphasis.
  const lines = [
    "| Entry Point | gzip | What's inside |",
    "|---|---|---|",
  ]
  for (const row of rows) {
    lines.push(`| \`${row.importPath}\` | **${row.kb} KB** | ${row.blurb} |`)
  }
  return lines.join("\n")
}

function renderCompact(rows) {
  // Compact one-line summary for CLAUDE.md / ai/system-prompt.md.
  // Lists every subpath inline; full-bundle entry appears last so the
  // "if you import everything" anchor reads naturally.
  const pieces = rows.map((row) => {
    if (row.subpath === ".") return null
    const unit = "KB"
    return `\`${row.importPath}\` (${row.kb}${unit} gz)`
  }).filter(Boolean)
  const full = rows.find((r) => r.subpath === ".")
  const trailer = full ? ` Full \`semiotic\` is ${full.kb}KB gz.` : ""
  return pieces.join(", ") + "." + trailer
}

function generatedTableBlock(rows) {
  return [
    MARKER_START,
    "<!-- Auto-generated by `scripts/sync-bundle-sizes.mjs`. Edit dist/*, not this block. -->",
    "",
    renderTable(rows),
    "",
    MARKER_END,
  ].join("\n")
}

function generatedCompactBlock(rows, { listItem = false } = {}) {
  // `listItem: true` prefixes a markdown bullet so the block can sit
  // inside an existing list (CLAUDE.md's Quick Start) without breaking
  // markdown's list grouping when rendered.
  const prefix = listItem ? "- " : ""
  return [
    MARKER_START,
    "<!-- Auto-generated by scripts/sync-bundle-sizes.mjs — do not edit by hand. -->",
    `${prefix}**Use sub-path imports** — ${renderCompact(rows)}`,
    MARKER_END,
  ].join("\n")
}

// ── Upsert ─────────────────────────────────────────────────────────────

function upsertMarkerBlock(content, block) {
  const start = content.indexOf(MARKER_START)
  if (start === -1) return null // caller decides whether to error or no-op
  // Constrain the end-marker search to AFTER the start marker so an
  // earlier occurrence of `MARKER_END` (in an unrelated example, a
  // duplicated block, or quoted prose) doesn't cause a false miss.
  const end = content.indexOf(MARKER_END, start + MARKER_START.length)
  if (end === -1) return null
  const replaceEnd = end + MARKER_END.length
  return content.slice(0, start) + block + content.slice(replaceEnd)
}

/** Pull every "<number> KB" pair out of a marker block. Both the table
 *  and the compact bullet form share this pattern. */
function extractKbValues(block) {
  const out = []
  const re = /(\d+)\s*KB/gi
  let m
  while ((m = re.exec(block)) !== null) out.push(Number(m[1]))
  return out
}

/** Per-bundle tolerance in KB. Even production-minified terser
 *  output can swing 1-2 KB across node/npm/rollup versions and
 *  source-map placement, so an integer-KB rounded value can flip
 *  between local and CI builds. Real feature growth lands in
 *  5-30 KB chunks per bundle, so a 3 KB threshold trips on real
 *  changes while tolerating build-machine noise. The
 *  `docs:bundle-sizes` write step always writes the freshly-
 *  measured exact value; this only governs `--check`. */
const KB_TOLERANCE = 3

function blocksWithinTolerance(rendered, existing) {
  const a = extractKbValues(rendered)
  const b = extractKbValues(existing)
  // Different number of KB entries → structural change (added a
  // bundle, dropped a bundle); always fail.
  if (a.length === 0 || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > KB_TOLERANCE) return false
  }
  return true
}

const TARGETS = [
  { path: "README.md",           render: (rows) => generatedTableBlock(rows),                       required: true },
  { path: "CLAUDE.md",           render: (rows) => generatedCompactBlock(rows, { listItem: true }), required: true },
  { path: "ai/system-prompt.md", render: (rows) => generatedCompactBlock(rows),                     required: true },
]

function main() {
  const rows = measure()

  if (printOnly) {
    console.log("Bundle sizes (gzip, KB):\n")
    for (const row of rows) {
      console.log(`  ${row.importPath.padEnd(20)}  ${String(row.kb).padStart(4)} KB`)
    }
    return
  }

  const stale = []
  for (const target of TARGETS) {
    const filePath = resolve(repoRoot, target.path)
    const original = readFileSync(filePath, "utf8")
    const block = target.render(rows)
    const next = upsertMarkerBlock(original, block)
    if (next == null) {
      if (target.required) {
        console.error(`✗ ${target.path}: missing marker block ${MARKER_START} / ${MARKER_END}`)
        process.exit(1)
      }
      continue
    }
    if (next === original) continue
    if (checkOnly) {
      // Tolerance-aware compare: build-machine differences of ±3 KB
      // per bundle aren't real drift. The committed doc shows the
      // last `docs:bundle-sizes` write; only flag when reality has
      // diverged enough that the user-facing numbers would mislead.
      const existingBlock = extractMarkerBlock(original)
      if (existingBlock != null && blocksWithinTolerance(block, existingBlock)) continue
      stale.push(target.path)
    } else {
      writeFileSync(filePath, next)
      console.log(`✓ wrote bundle sizes → ${target.path}`)
    }
  }

  if (checkOnly && stale.length > 0) {
    console.error(`\n✗ bundle-size docs drifted beyond ±${KB_TOLERANCE} KB tolerance from current \`dist/\` output:`)
    for (const path of stale) console.error(`  - ${path}`)
    console.error("\nRebuild + regenerate with:")
    console.error("  npm run dist:prod && npm run docs:bundle-sizes")
    process.exit(1)
  }

  if (checkOnly) {
    console.log(`✓ bundle-size docs within ±${KB_TOLERANCE} KB of dist/*.module.min.js`)
  }
}

function extractMarkerBlock(content) {
  const start = content.indexOf(MARKER_START)
  if (start === -1) return null
  const end = content.indexOf(MARKER_END, start + MARKER_START.length)
  if (end === -1) return null
  return content.slice(start, end + MARKER_END.length)
}

main()

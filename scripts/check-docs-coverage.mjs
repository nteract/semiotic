#!/usr/bin/env node
/**
 * Docs coverage + per-page quality gate (strategy Phase 0).
 *
 * The required chart-page set is derived from `chartSpecs.ts` (the same
 * source `check:capabilities` uses), so a newly specced chart cannot ship
 * without interactive docs and existing pages cannot silently degrade.
 *
 * Two locks:
 *
 *   1. **Coverage** — every chart in `chartSpecs.ts` has a
 *      `docs/src/pages/charts/<Name>Page.js`. Charts intentionally documented
 *      elsewhere (cookbook, a sibling's page) live in DOCS_PAGE_BURN_DOWN with
 *      a reason; that map is one-way and meant to shrink.
 *
 *   2. **Per-page quality bar** — every chart page renders the standard
 *      contract: a `ComponentMeta` header, a prop table (`PropTable` or the
 *      TypeDoc-driven `ApiPropTable`), and at least one interactive/rendered
 *      example (`LiveExample`, `StreamingDemo`, `StreamingToggle`, or a direct
 *      render of the component). Known exceptions live in QUALITY_BURN_DOWN.
 *
 * New drift fails immediately. A burn-down entry that is no longer needed
 * (page landed, or chart removed from specs) is also a failure, so the maps
 * can't go stale.
 *
 * Usage: node scripts/check-docs-coverage.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const chartsDir = join(repoRoot, "docs/src/pages/charts")

const errors = []
const note = (m) => errors.push(m)

// ── Burn-down maps (one-way; intended to shrink) ───────────────────────

// Charts in chartSpecs that intentionally do NOT have a dedicated
// `<Name>Page.js`. Each entry must say where the chart IS documented.
const DOCS_PAGE_BURN_DOWN = new Map([
  ["RidgelinePlot", "documented in the Cookbook (/cookbook/ridgeline-plot), not a dedicated chart page"],
  ["TemporalHistogram", "static sibling documented on the RealtimeHistogram page"],
  ["MinimapChart", "no dedicated page yet — overview/detail wrapper; tracked for a future page"],
])

// Chart pages that exist but don't yet meet the full per-page quality bar.
// Keyed by `<chart>:<signal>` where signal is meta | proptable | example.
const QUALITY_BURN_DOWN = new Map([])

// ── Inputs ─────────────────────────────────────────────────────────────

const specNames = new Set(parseCapabilityMatrix().map((e) => e.name))

const pageFiles = existsSync(chartsDir)
  ? readdirSync(chartsDir).filter((f) => f.endsWith("Page.js"))
  : []
const pageCharts = new Set(pageFiles.map((f) => f.replace(/Page\.js$/, "")))

if (pageFiles.length === 0) {
  note(`No chart page files found under docs/src/pages/charts — is the path correct?`)
}

// ── Lock 1: coverage ───────────────────────────────────────────────────

for (const chart of [...specNames].sort()) {
  if (pageCharts.has(chart)) continue
  if (DOCS_PAGE_BURN_DOWN.has(chart)) continue
  note(
    `${chart}: in chartSpecs.ts but has no docs/src/pages/charts/${chart}Page.js. ` +
      `Add a chart page, or add an explicit DOCS_PAGE_BURN_DOWN entry with where it is documented.`,
  )
}

// Stale coverage burn-down: chart now has a page, or no longer in specs.
for (const [chart, reason] of DOCS_PAGE_BURN_DOWN) {
  if (pageCharts.has(chart)) {
    note(`DOCS_PAGE_BURN_DOWN is stale: ${chart} now has a page file — remove it from the map.`)
  } else if (!specNames.has(chart)) {
    note(`DOCS_PAGE_BURN_DOWN is stale: ${chart} is no longer in chartSpecs — remove it (reason was: ${reason}).`)
  }
}

// ── Lock 2: per-page quality bar ───────────────────────────────────────

// Charts where a static-data <ChartGrounding> panel doesn't fit: realtime
// (push-only — no static config to describe) and the TileMap concept page
// (not a single capability component). These pass the grounding signal
// automatically; the intended direction is for this set to only shrink.
const GROUNDING_EXCLUDE = new Set([
  "RealtimeLineChart", "RealtimeHistogram", "RealtimeSwarmChart",
  "RealtimeWaterfallChart", "RealtimeHeatmap", "TileMap",
])

const SIGNALS = {
  meta: (src) => /<ComponentMeta[\s/>]/.test(src),
  proptable: (src) => /<(PropTable|ApiPropTable)[\s/>]/.test(src),
  // An interactive/rendered example: a live example, a streaming demo, or a
  // direct render of the component itself.
  example: (src, chart) =>
    /<(LiveExample|StreamingDemo|StreamingToggle)[\s/>]/.test(src) ||
    new RegExp(`<${chart}[\\s/>]`).test(src),
  // The reader/agent grounding panel (act + description + caveats + a11y),
  // required on every static chart page.
  grounding: (src, chart) =>
    GROUNDING_EXCLUDE.has(chart) || /<ChartGrounding[\s/>]/.test(src),
}
const SIGNAL_LABEL = {
  meta: "a <ComponentMeta> header",
  proptable: "a <PropTable> / <ApiPropTable>",
  example: "an interactive example (<LiveExample>/<StreamingDemo>/<StreamingToggle> or a direct render)",
  grounding: "a <ChartGrounding> panel (or a GROUNDING_EXCLUDE entry)",
}

const usedQualityBurnDown = new Set()

for (const chart of [...pageCharts].sort()) {
  const src = readFileSync(join(chartsDir, `${chart}Page.js`), "utf8")
  for (const [signal, test] of Object.entries(SIGNALS)) {
    if (test(src, chart)) continue
    const key = `${chart}:${signal}`
    if (QUALITY_BURN_DOWN.has(key)) {
      usedQualityBurnDown.add(key)
      continue
    }
    note(`${chart}Page.js is missing ${SIGNAL_LABEL[signal]}. Add it, or add a QUALITY_BURN_DOWN entry "${key}".`)
  }
}

// Stale quality burn-down: page now satisfies the signal, or page is gone.
for (const key of QUALITY_BURN_DOWN.keys()) {
  const [chart, signal] = key.split(":")
  if (!pageCharts.has(chart)) {
    note(`QUALITY_BURN_DOWN is stale: ${chart} has no page file — remove "${key}".`)
  } else if (!usedQualityBurnDown.has(key)) {
    const src = readFileSync(join(chartsDir, `${chart}Page.js`), "utf8")
    if (SIGNALS[signal]?.(src, chart)) {
      note(`QUALITY_BURN_DOWN is stale: ${chart} now satisfies "${signal}" — remove "${key}".`)
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("✗ docs coverage drift detected:\n")
  for (const m of errors) console.error(`  - ${m}\n`)
  process.exit(1)
}

const covered = specNames.size - DOCS_PAGE_BURN_DOWN.size
console.log(
  "✓ docs coverage clean: " +
    `${covered}/${specNames.size} specced chart(s) have a dedicated page ` +
    `(${DOCS_PAGE_BURN_DOWN.size} burn-down), ` +
    `${pageCharts.size} chart page(s) meet the ComponentMeta + prop-table + example + grounding bar ` +
    `(${QUALITY_BURN_DOWN.size} burn-down, ${GROUNDING_EXCLUDE.size} grounding-exempt).`,
)

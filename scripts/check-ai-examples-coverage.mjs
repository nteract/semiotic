#!/usr/bin/env node
/**
 * Drift gate for the agent-facing examples surface (`ai/examples.md`).
 *
 * `ai/examples.md` ships in the npm tarball as the canonical
 * copy-paste reference for both human users and AI agents that read
 * `semiotic/ai`. It's hand-curated (per-chart narrative is more useful
 * than auto-generation here), so it's prone to two drift classes:
 *
 *   1. **Stale chart references** — a chart was renamed or removed in
 *      `chartSpecs.ts` but its section in `examples.md` survived. Agents
 *      that follow the example will produce code that fails type-check
 *      because the import no longer exists.
 *   2. **Coverage gaps** — a renderable chart was added to
 *      `chartSpecs.ts` (and surfaces via MCP `getSchema` /
 *      `--doctor`) but `examples.md` was never updated. Agents that
 *      read the file as the canonical example reference can't find
 *      a starting point for the new chart.
 *
 * The companion checks are: `check:ai-contracts` (regenerates rule
 * sections in CLAUDE.md / llms-full.txt / system-prompt.md);
 * `check:claude-md-coverage` (mentions-of-each-chart in CLAUDE.md);
 * `check:chart-specs` (registry round-trip). This file fills the only
 * remaining gap: the hand-curated example reference.
 *
 * Run via `npm run check:ai-examples-coverage`. Wired into
 * `release:check`, `prepublishOnly`, and the CI workflow.
 */
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// ── Discover the canonical chart name list from chartSpecs.ts ─────────
//
// Mirrors `check:chart-specs`'s parser shape. Filtering by
// `renderable: true` would be tighter — only renderable charts truly
// belong in `ai/examples.md` since that's the surface MCP/CLI agents
// reach for. Both are checked.

const chartSpecsPath = join(repoRoot, "src/components/charts/shared/chartSpecs.ts")
const chartSpecsSource = readFileSync(chartSpecsPath, "utf8")

const SPEC_BLOCK_RE = /^ {2}([A-Z][A-Za-z]+):\s*\{\n([\s\S]*?)^ {2}\},?$/gm
const NAME_RE = /^\s*name:\s*"([^"]+)"/m
const RENDERABLE_RE = /^\s*renderable:\s*(true|false)/m

const allCharts = new Set()
const renderableCharts = new Set()

for (const match of chartSpecsSource.matchAll(SPEC_BLOCK_RE)) {
  const body = match[2]
  const nameMatch = NAME_RE.exec(body)
  if (!nameMatch) continue
  const name = nameMatch[1]
  allCharts.add(name)
  const renderableMatch = RENDERABLE_RE.exec(body)
  // Default to true if not explicitly set — matches the registry's
  // own default-on convention for unmarked entries (the only entries
  // that explicitly set `renderable: false` are the ones that fail the
  // server-side render path).
  if (!renderableMatch || renderableMatch[1] === "true") {
    renderableCharts.add(name)
  }
}

if (allCharts.size === 0) {
  console.error("✗ check:ai-examples-coverage parsed 0 charts from chartSpecs.ts — file structure may have changed")
  process.exit(1)
}

// ── Discover the chart names referenced in ai/examples.md ─────────────

const examplesPath = join(repoRoot, "ai/examples.md")
const examplesSource = readFileSync(examplesPath, "utf8")

const referencedCharts = new Set()

// 1. Section headers: `### <Name>` or `### <Name> (variant)`. The
//    chart name must appear at the start of an h3.
for (const m of examplesSource.matchAll(/^###\s+([A-Z][A-Za-z]+)/gm)) {
  referencedCharts.add(m[1])
}

// 2. Inside fenced code blocks: any `<ChartName ...>` JSX-style usage
//    or `import { ChartName } from "semiotic..."` line. The header
//    rule above is the primary reference; the in-code rule catches
//    charts mentioned only inside an example body (e.g. multi-chart
//    composition examples).
for (const m of examplesSource.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)) {
  referencedCharts.add(m[1])
}
for (const m of examplesSource.matchAll(/import\s+\{[^}]+\}\s+from\s+"semiotic[^"]*"/g)) {
  for (const ident of m[0].match(/\b[A-Z][A-Za-z]+\b/g) || []) {
    if (ident !== "Semiotic") referencedCharts.add(ident)
  }
}

// ── Cross-check ───────────────────────────────────────────────────────

const errors = []

// Stale: referenced in examples but no longer in chartSpecs. Skip a
// known-safe allowlist of non-chart identifiers that show up in JSX
// (ThemeProvider, LinkedCharts, etc.) — these are surface APIs but
// not registry entries.
const NON_CHART_ALLOWLIST = new Set([
  "ThemeProvider", "LinkedCharts", "CategoryColorProvider", "ChartContainer",
  "ChartGrid", "ContextLayout", "Tooltip", "MultiLineTooltip", "Annotation",
  "StreamNetworkFrame", "StreamXYFrame", "StreamOrdinalFrame", "StreamGeoFrame",
  "Sparkline", "SkipToTableLink", "AccessibleDataTable", "RealtimeFrameHandle",
  "Datum", "App", "Component", "Fragment", "StrictMode", "Suspense",
])
const stale = []
for (const name of referencedCharts) {
  if (NON_CHART_ALLOWLIST.has(name)) continue
  // Capitalized words that are React-flavored but not chart names
  // (e.g. "Semiotic", "CSS", "JSX") — only flag identifiers that look
  // like a chart name pattern AND aren't in chartSpecs.
  if (!allCharts.has(name)) {
    // Heuristic: a chart name has at least 4 chars and ends in
    // `Chart`, `Plot`, `Map`, `Diagram`, `Heatmap`, `Histogram`,
    // `Scatterplot`, `Pack`, `Treemap`, `Cartogram`. This filters out
    // section-header words like "Synced" / "Truncated" without a
    // hard-coded allowlist getting longer over time.
    if (/^([A-Z][a-z]+)+(?:Chart|Plot|Map|Diagram|Heatmap|Histogram|Scatterplot|Pack|Treemap|Cartogram|Graph|Realtime[A-Z][A-Za-z]*)$/.test(name) ||
        /^Realtime[A-Z]/.test(name)) {
      stale.push(name)
    }
  }
}
if (stale.length) {
  errors.push(`ai/examples.md references chart names not in chartSpecs.ts: ${stale.join(", ")}.\n   Either add the chart back to the registry or remove its example.`)
}

// Coverage: baseline of charts known to be missing from `ai/examples.md`
// at the time this gate shipped (2026-04-28). The HOC's source-level
// `@example` blocks are still enforced by `check:jsdoc-coverage`, and
// MCP / `--doctor` agents still discover the chart through
// `chartSpecs.ts` + `getSchema`. This baseline lets the gate catch
// **new** drift (a new chart added to chartSpecs without any
// reference in `ai/examples.md`) while the 22-chart copy-paste backlog
// stays opportunistic.
//
// To remove a name from the baseline: add a section for the chart in
// `ai/examples.md`, then delete the entry below. Adding a NEW name
// here requires explaining in the diff why the chart is intentionally
// narrative-only — the burn-down direction is one-way.
const COVERAGE_BASELINE = new Set([
  "SwarmPlot", "BoxPlot", "RidgelinePlot", "DotPlot",
  "PieChart", "GaugeChart", "FunnelChart",
  "SwimlaneChart", "LikertChart",
  "BubbleChart", "QuadrantChart", "MultiAxisLineChart",
  "CandlestickChart", "ScatterplotMatrix", "MinimapChart",
  "ChoroplethMap", "ProportionalSymbolMap", "FlowMap", "DistanceCartogram",
  "RealtimeSwarmChart", "RealtimeWaterfallChart",
])

const missing = []
const baselineHits = new Set()
for (const name of renderableCharts) {
  if (!referencedCharts.has(name)) {
    if (COVERAGE_BASELINE.has(name)) {
      baselineHits.add(name)
    } else {
      missing.push(name)
    }
  }
}
if (missing.length) {
  errors.push(`ai/examples.md is missing examples for ${missing.length} new renderable chart(s): ${missing.join(", ")}.\n   Each renderable chart in chartSpecs.ts should have at least one copy-paste example. Add a section to ai/examples.md or, if the chart isn't agent-relevant, mark it \`renderable: false\` in chartSpecs.ts with a comment explaining why.`)
}

// Burn-down direction is one-way: any baseline entry that's now
// covered should be removed. Otherwise the baseline grows stale and
// stops doing useful work.
const drift = []
for (const name of COVERAGE_BASELINE) {
  if (referencedCharts.has(name)) drift.push(name)
}
if (drift.length) {
  errors.push(`COVERAGE_BASELINE in scripts/check-ai-examples-coverage.mjs is stale: ${drift.join(", ")} are now covered in ai/examples.md and must be removed from the baseline. (Otherwise a future regression that drops the example would silently pass.)`)
}

// ── Output ────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("\n✗ ai/examples.md drift detected:\n")
  for (const msg of errors) console.error(`  - ${msg}`)
  console.error(
    "\nFix the references above. `ai/examples.md` ships in the npm tarball as the canonical " +
      "copy-paste reference for both humans and AI agents — drift here surfaces as " +
      "broken-import errors when agents follow the file.",
  )
  process.exit(1)
}

const covered = renderableCharts.size - baselineHits.size
console.log(
  `✓ ai/examples.md coverage clean (${covered}/${renderableCharts.size} renderable charts referenced; ` +
    `${baselineHits.size} on the burn-down baseline; ` +
    `${referencedCharts.size} total identifiers including composition surface APIs).`,
)

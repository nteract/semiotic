#!/usr/bin/env node
/**
 * Generate docs/public/llms.txt — the llms.txt-convention index an agent reads
 * first (https://llmstxt.org).
 *
 * The chart catalog is the part that drifts (a chart is added; the hand-kept
 * list isn't), so it is GENERATED from `chartSpecs.ts` — grouped by family,
 * every charted component with a page, each enriched with its communicative
 * act via `resolveCommunicativeAct` so the agent reader gets *what the chart is
 * for*, not just what it shows. The prose sections (Docs, Intelligence,
 * Features, AI Integration, Optional) are curated constants below.
 *
 *   node scripts/generate-llms-txt.mjs          # write docs/public/llms.txt
 *   node scripts/generate-llms-txt.mjs --check   # fail if out of date (CI gate)
 *
 * Run via tsx (imports chartSpecs.ts). Wired through package.json `docs:llms`
 * and `check:llms`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { CHART_SPECS } from "../src/components/charts/shared/chartSpecs.ts"
import { getCapability } from "../src/components/ai/chartCapabilities.ts"
import { resolveCommunicativeAct } from "../src/components/ai/describeChart.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const outPath = join(repoRoot, "docs/public/llms.txt")
const chartsDir = join(repoRoot, "docs/src/pages/charts")

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
const hasPage = (name) => existsSync(join(chartsDir, `${name}Page.jsx`))

// ── Generated: the chart catalog, grouped by family ────────────────────────

const FAMILY_ORDER = [
  ["xy", "XY"],
  ["ordinal", "Ordinal"],
  ["network", "Network"],
  ["geo", "Geo"],
  ["value", "Value"],
  ["realtime", "Realtime"],
  ["physics", "Physics"],
]

function chartCatalog() {
  const byFamily = new Map(FAMILY_ORDER.map(([k]) => [k, []]))
  for (const spec of Object.values(CHART_SPECS)) {
    if (!byFamily.has(spec.category)) continue
    if (!hasPage(spec.name)) continue // skip charts without a dedicated page (dead link)
    let act
    try {
      act = resolveCommunicativeAct(spec.name, getCapability(spec.name))
    } catch {
      act = undefined
    }
    // resolveCommunicativeAct returns a CommunicativeAct string (e.g. "tracking").
    const actLabel = typeof act === "string" ? act : act && (act.label || act.id)
    const actSuffix = actLabel ? ` _(act: ${String(actLabel).toLowerCase()})_` : ""
    // Keep index entries to one scannable line — first sentence, capped.
    let desc = (spec.description || "").trim()
    const firstSentence = desc.match(/^.*?\.(?=\s|$)/)
    if (firstSentence) desc = firstSentence[0]
    if (desc.length > 150) desc = `${desc.slice(0, 147).trimEnd()}…`
    byFamily.get(spec.category).push(
      `- [${spec.name}](/charts/${kebab(spec.name)}): ${desc}${actSuffix}`,
    )
  }
  const blocks = []
  for (const [key, label] of FAMILY_ORDER) {
    const rows = byFamily.get(key)
    if (!rows || rows.length === 0) continue
    blocks.push(`## Charts — ${label}\n\n${rows.join("\n")}`)
  }
  return blocks.join("\n\n")
}

// ── Curated prose sections ──────────────────────────────────────────────────

const INTRO = `# Semiotic

> React data visualization library designed for AI-assisted development. Charts, network graphs, streaming data, and coordinated dashboards with machine-readable schemas, an MCP server, and structured instruction files so LLMs generate correct code without examples.`

const DOCS = `## Docs

- [Getting Started](/getting-started): Installation, quick examples, and first chart
- [Choose a Chart](/choose): Profile a dataset and rank charts by fit and communicative act
- [Charts](/charts): All chart types with live examples, prop tables, and grounding panels
- [Frames](/frames): StreamXYFrame, StreamOrdinalFrame, StreamNetworkFrame — full control API
- [Features](/features): Axes, tooltips, interaction, responsive, composition, accessibility
- [Theming](/theming/theme-provider): ThemeProvider, presets, semantic colors, serialization
- [Cookbook](/cookbook): Advanced patterns and recipes
- [Playground](/playground): Interactive, shareable prop exploration for every chart type`

const INTELLIGENCE = `## Intelligence (AI surface)

- [Chart Suggestions](/intelligence/suggestions): suggestCharts — rank charts for a dataset and intent
- [Capability Authoring](/intelligence/capability-authoring): ChartCapability descriptors, registerChartCapability, registerIntent
- [Audience Profiles](/intelligence/audience-profiles): AudienceProfile — familiarity, targets, stretch picks, reception modality
- [Variant Discovery & Repair](/intelligence/variant-discovery): proposeVariant, evaluateVariantProposal, repairChartConfig
- [Interrogation](/intelligence/interrogation): useChartInterrogation — chat with a chart's data
- [Agent-Reader Grounding](/intelligence/reader-grounding): buildReaderGrounding — description + intent + structure payload
- [CLI & MCP](/intelligence/cli-mcp): npx semiotic-ai flags and the npx semiotic-mcp tool server`

const FEATURES = `## Features

- [Coordinated Views](/features/linked-charts): LinkedCharts, cross-highlighting, crossfilter brushing
- [Composition](/features/composition): ChartGrid, ContextLayout, CategoryColorProvider
- [Responsive](/features/responsive): responsiveWidth, responsiveHeight
- [Accessibility](/accessibility/overview): Keyboard navigation, ARIA, audit, descriptions, structured navigation, preference hooks
- [Annotations](/annotations/overview): Labels, callouts, thresholds, placement, density, and analytical overlays
- [Annotation Provenance & Lifecycle](/annotations/provenance-lifecycle): Provenance, freshness, editorial status, and supersession
- [Serialization](/intelligence/serialization): toConfig, fromConfig, toURL, copyConfig, configToJSX
- [Server Rendering](/using-ssr): renderChart, renderToImage, renderToAnimatedGif, renderDashboard`

const AI_INTEGRATION = `## AI Integration (machine-readable)

- [CLAUDE.md](/CLAUDE.md): Full AI assistant guide with all props and patterns
- [schema.json](/schema.json): Machine-readable component schemas
- [API Reference](/api-reference.md): Compact system prompt for context-constrained agents
- [Examples](/examples.md): Copy-paste code examples for every chart type
- [llms-full.txt](/llms-full.txt): Expanded single-file documentation dump`

const OPTIONAL = `## Optional

- [Cookbook — Radar](/cookbook/radar-plot): Radar/spider charts
- [Cookbook — Timeline](/cookbook/timeline): Timeline visualizations
- [Cookbook — Marginal Graphics](/cookbook/marginal-graphics): Distribution plots in scatter margins
- [Custom Charts](/features/custom-charts): XY/Ordinal/Network custom layouts and semiotic/recipes
- [Vega-Lite Translator](/intelligence/vega-lite): Convert Vega-Lite specs to Semiotic`

function render() {
  return [INTRO, DOCS, chartCatalog(), INTELLIGENCE, FEATURES, AI_INTEGRATION, OPTIONAL].join("\n\n") + "\n"
}

// ── Write / check ───────────────────────────────────────────────────────────

const content = render()
const check = process.argv.includes("--check")

if (check) {
  const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : ""
  if (existing !== content) {
    console.error(
      "✗ docs/public/llms.txt is out of date. Run `npm run docs:llms` and commit the result.",
    )
    process.exit(1)
  }
  console.log("✓ llms.txt is up to date.")
} else {
  writeFileSync(outPath, content)
  const charts = (content.match(/^- \[/gm) || []).length
  console.log(`✓ wrote docs/public/llms.txt (${content.split("\n").length} lines, ${charts} entries).`)
}

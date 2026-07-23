#!/usr/bin/env node
/* global console, process */
/**
 * Capability-driven visual baseline coverage gate.
 *
 * The required chart list comes from `chartSpecs.ts` via the same parser
 * used by `check:capabilities`. The current fixture set is intentionally
 * smaller than the complete capability matrix, so the gaps are captured as
 * one-way burn-down baselines:
 *
 *   - Add a Playwright SSR/CSR parity case for a chart, then remove it from
 *     `SSR_PARITY_BURN_DOWN` in the same diff.
 *   - Add a linked-hover interaction-state snapshot for a chart, then remove
 *     it from `LINKED_HOVER_BURN_DOWN` in the same diff.
 *
 * New capability drift fails immediately: a newly `supportsSSR` chart or a
 * newly `supportsLinkedHover` chart must either land with matching visual
 * coverage or be added to the relevant burn-down map with an explicit reason.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

const errors = []
const note = (message) => errors.push(message)

function readRepoFile(relPath) {
  const absPath = join(repoRoot, relPath)
  if (!existsSync(absPath)) {
    note(`Missing expected visual-baseline evidence file: ${relPath}`)
    return ""
  }
  return readFileSync(absPath, "utf8")
}

function setDiff(a, b) {
  return [...a].filter((item) => !b.has(item)).sort()
}

function sortedSet(values) {
  return new Set([...values].sort())
}

const matrix = parseCapabilityMatrix()
const chartNames = new Set(matrix.map((entry) => entry.name))
const ssrCharts = sortedSet(
  matrix.filter((entry) => entry.ssr).map((entry) => entry.name)
)
const linkedHoverCharts = sortedSet(
  matrix.filter((entry) => entry.linkedHover).map((entry) => entry.name)
)

// ── SSR/CSR parity coverage ─────────────────────────────────────────

const ssrParitySpecPath = "integration-tests/ssr-parity.spec.ts"
const ssrParityFixturePath = "integration-tests/ssr-parity-fixtures.js"
const ssrParitySource = readRepoFile(ssrParitySpecPath)
const ssrParityFixtureSource = readRepoFile(ssrParityFixturePath)
const SSR_COMPONENT_RE = /component:\s*"([^"]+)"/g
const ssrParityCharts = sortedSet(
  [...ssrParityFixtureSource.matchAll(SSR_COMPONENT_RE)].map((match) => match[1])
)
const SSR_PARITY_NON_REGISTRY_CHARTS = new Map([
  [
    "XYCustomChart",
    "custom-layout escape hatch; SSR parity is valid, but chartSpecs tracks named recipes instead",
  ],
  [
    "OrdinalCustomChart",
    "custom-layout escape hatch; SSR parity is valid, but chartSpecs tracks named recipes instead",
  ],
  [
    "NetworkCustomChart",
    "custom-layout escape hatch; SSR parity is valid, but chartSpecs tracks named recipes instead",
  ],
  [
    "GeoCustomChart",
    "custom-layout escape hatch; SSR parity is valid, but chartSpecs tracks named recipes instead",
  ],
])
const ssrParityRegistryCharts = sortedSet(
  [...ssrParityCharts].filter((chart) => !SSR_PARITY_NON_REGISTRY_CHARTS.has(chart))
)

if (!/toHaveScreenshot\(`ssr-csr-\$\{c\.id\}\.png`/.test(ssrParitySource)) {
  note(`${ssrParitySpecPath} no longer appears to snapshot side-by-side SSR/CSR parity sheets.`)
}

for (const chart of ssrParityCharts) {
  if (SSR_PARITY_NON_REGISTRY_CHARTS.has(chart)) continue
  if (!chartNames.has(chart)) {
    note(`${ssrParityFixturePath} has an SSR parity case for unknown chart ${chart}.`)
  }
  if (!ssrCharts.has(chart)) {
    note(
      `${ssrParityFixturePath} has an SSR parity case for ${chart}, but chartSpecs.ts does not mark supportsSSR=true.`
    )
  }
}

// Known SSR-capable charts that still need chart-specific SSR/CSR parity
// cases. Do not add to this map casually; the intended direction is down.
const SSR_PARITY_BURN_DOWN = new Map([
  ["CollisionSwarmChart", "physics HOC SSR/CSR parity needs a settled-simulation fixture"],
  ["EventDropChart", "physics HOC SSR/CSR parity needs a settled-simulation fixture"],
  ["PhysicalFlowChart", "experimental route-flow physics HOC SSR/CSR parity needs a deterministic path fixture"],
  ["GaltonBoardChart", "physics HOC SSR/CSR parity needs a settled-simulation fixture"],
  ["PhysicsPileChart", "physics HOC SSR/CSR parity needs a settled-simulation fixture"],
  ["ProcessFlowChart", "process-flow physics HOC SSR/CSR parity needs a settled-capacity fixture"],
  ["GauntletChart", "gauntlet physics HOC SSR/CSR parity needs a deterministic gate-route fixture"],
])

const ssrBurnDownCharts = new Set(SSR_PARITY_BURN_DOWN.keys())
const missingSsrCoverage = setDiff(ssrCharts, new Set([...ssrParityRegistryCharts, ...ssrBurnDownCharts]))
const staleSsrBurnDown = [...ssrBurnDownCharts]
  .filter((chart) => !ssrCharts.has(chart) || ssrParityRegistryCharts.has(chart))
  .sort()

if (missingSsrCoverage.length) {
  note(
    `SSR-capable charts without SSR/CSR parity coverage or burn-down entry:\n  ${missingSsrCoverage.join(", ")}\n  Add a case to ${ssrParitySpecPath}, or add an explicit temporary entry to SSR_PARITY_BURN_DOWN.`
  )
}
if (staleSsrBurnDown.length) {
  note(
    `SSR_PARITY_BURN_DOWN is stale:\n  ${staleSsrBurnDown.join(", ")}\n  Remove entries whose parity case has landed or whose chart no longer supports SSR.`
  )
}

// ── Linked-hover interaction-state coverage ─────────────────────────

const linkedHoverEvidence = [
  {
    charts: ["Scatterplot", "BarChart"],
    source: "integration-tests/brush-selection.spec.ts",
    fixture: "integration-tests/coordinated-examples/index.js",
    requiredSnippets: [
      "linked-hover dims non-matching categories on sibling chart",
      "linked-hover-state.png",
    ],
  },
  {
    charts: ["Scatterplot", "LineChart", "AreaChart", "StackedAreaChart"],
    source: "integration-tests/brush-selection.spec.ts",
    fixture: "integration-tests/coordinated-examples/index.js",
    requiredSnippets: [
      "linked-hover dims XY series targets",
      "linked-hover-xy-series-state.png",
    ],
  },
  {
    charts: ["Scatterplot", "GroupedBarChart", "StackedBarChart", "DonutChart", "PieChart", "FunnelChart"],
    source: "integration-tests/brush-selection.spec.ts",
    fixture: "integration-tests/coordinated-examples/index.js",
    requiredSnippets: [
      "linked-hover dims ordinal composition targets",
      "linked-hover-ordinal-state.png",
    ],
  },
  {
    charts: ["Scatterplot", "BoxPlot", "DotPlot", "Histogram", "RidgelinePlot", "SwarmPlot", "ViolinPlot"],
    source: "integration-tests/brush-selection.spec.ts",
    fixture: "integration-tests/coordinated-examples/index.js",
    requiredSnippets: [
      "linked-hover dims statistical ordinal targets",
      "linked-hover-statistical-state.png",
    ],
  },
]

const linkedHoverCoveredCharts = new Set()
for (const evidence of linkedHoverEvidence) {
  const source = readRepoFile(evidence.source)
  const fixture = readRepoFile(evidence.fixture)
  for (const snippet of evidence.requiredSnippets) {
    if (!source.includes(snippet)) {
      note(`${evidence.source} no longer contains linked-hover evidence snippet: ${snippet}`)
    }
  }
  for (const chart of evidence.charts) {
    if (!chartNames.has(chart)) {
      note(`Linked-hover visual evidence references unknown chart ${chart}.`)
    }
    if (!linkedHoverCharts.has(chart)) {
      note(
        `Linked-hover visual evidence references ${chart}, but chartSpecs.ts does not mark supportsLinkedHover=true.`
      )
    }
    if (!fixture.includes(chart)) {
      note(`${evidence.fixture} no longer appears to render ${chart} for linked-hover evidence.`)
    }
    linkedHoverCoveredCharts.add(chart)
  }
}

// Known linked-hover-capable charts that still need chart-specific
// interaction-state screenshots. Do not add to this map casually; the
// intended direction is down.
const LINKED_HOVER_BURN_DOWN = new Map([
  ["BubbleChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["BumpChart", "new in 3.8.6: no chart-specific linked-hover interaction snapshot yet"],
  ["CandlestickChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["ConnectedScatterplot", "no chart-specific linked-hover interaction snapshot yet"],
  ["DifferenceChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["Heatmap", "no chart-specific linked-hover interaction snapshot yet"],
  ["MultiAxisLineChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["QuadrantChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["LikertChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["SwimlaneChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["ChordDiagram", "no chart-specific linked-hover interaction snapshot yet"],
  ["CirclePack", "no chart-specific linked-hover interaction snapshot yet"],
  ["ForceDirectedGraph", "no chart-specific linked-hover interaction snapshot yet"],
  ["OrbitDiagram", "no chart-specific linked-hover interaction snapshot yet"],
  // ProcessSankey: supportsLinkedHover is false until selection wiring lands
  // (HOC hard-codes selection/linkedHover to undefined).
  ["SankeyDiagram", "no chart-specific linked-hover interaction snapshot yet"],
  ["TreeDiagram", "no chart-specific linked-hover interaction snapshot yet"],
  ["Treemap", "no chart-specific linked-hover interaction snapshot yet"],
  ["ChoroplethMap", "no chart-specific linked-hover interaction snapshot yet"],
  ["DistanceCartogram", "no chart-specific linked-hover interaction snapshot yet"],
  ["FlowMap", "no chart-specific linked-hover interaction snapshot yet"],
  ["ProportionalSymbolMap", "no chart-specific linked-hover interaction snapshot yet"],
  ["RealtimeHeatmap", "no chart-specific linked-hover interaction snapshot yet"],
  ["RealtimeHistogram", "no chart-specific linked-hover interaction snapshot yet"],
  ["RealtimeLineChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["RealtimeSwarmChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["RealtimeWaterfallChart", "no chart-specific linked-hover interaction snapshot yet"],
  ["TemporalHistogram", "no chart-specific linked-hover interaction snapshot yet"],
])

const linkedHoverBurnDownCharts = new Set(LINKED_HOVER_BURN_DOWN.keys())
const missingLinkedHoverCoverage = setDiff(
  linkedHoverCharts,
  new Set([...linkedHoverCoveredCharts, ...linkedHoverBurnDownCharts])
)
const staleLinkedHoverBurnDown = [...linkedHoverBurnDownCharts]
  .filter((chart) => !linkedHoverCharts.has(chart) || linkedHoverCoveredCharts.has(chart))
  .sort()

if (missingLinkedHoverCoverage.length) {
  note(
    `Linked-hover-capable charts without interaction visual coverage or burn-down entry:\n  ${missingLinkedHoverCoverage.join(", ")}\n  Add a linked-hover interaction snapshot, or add an explicit temporary entry to LINKED_HOVER_BURN_DOWN.`
  )
}
if (staleLinkedHoverBurnDown.length) {
  note(
    `LINKED_HOVER_BURN_DOWN is stale:\n  ${staleLinkedHoverBurnDown.join(", ")}\n  Remove entries whose interaction snapshot has landed or whose chart no longer supports linked hover.`
  )
}

if (errors.length) {
  console.error("✗ visual baseline capability coverage drift detected:\n")
  for (const message of errors) console.error(`  - ${message}\n`)
  process.exit(1)
}

console.log(
  "✓ visual baseline capability coverage clean: " +
    `${ssrParityRegistryCharts.size}/${ssrCharts.size} SSR-capable chart(s) have SSR/CSR parity cases ` +
    `(+ ${SSR_PARITY_NON_REGISTRY_CHARTS.size} custom-HOC parity cases), ` +
    `(${SSR_PARITY_BURN_DOWN.size} burn-down), ` +
    `${linkedHoverCoveredCharts.size}/${linkedHoverCharts.size} linked-hover chart(s) have interaction evidence ` +
    `(${LINKED_HOVER_BURN_DOWN.size} burn-down).`
)

"use strict"

// Maintenance note: when you change the agent-facing rules in this
// file (especially anything in CONTRACTS), update the parallel `rules`
// array in `context7.json` so the Context7 index stays in sync. The
// `check:context7` gate validates format (255-char-per-rule limit,
// folder references, sub-path drift vs `package.json` exports) but
// can't detect *content* drift between this file and the manifest —
// keeping them aligned is part of the same edit.

const path = require("path")
const fs = require("fs")

const DOC_MARKER_START = "<!-- semiotic-behavior-contracts:start -->"
const DOC_MARKER_END = "<!-- semiotic-behavior-contracts:end -->"

// Components whose static config requires `data` are derived from
// `ai/schema.json` rather than maintained as a hand-curated list.
//
// A component needs data in STATIC usage if its schema declares a `data` input
// prop — NOT merely if `data` is in the `required` array. `required` lists the
// semantic accessors a chart needs (highAccessor, subcategoryAccessor, series,
// …), and several data-driven charts don't put `data` itself there:
// CandlestickChart, MultiAxisLineChart, QuadrantChart, DifferenceChart,
// LikertChart, and SwimlaneChart. Keying off `required.includes("data")` missed
// exactly those — they'd render blank with no data yet passed --doctor / MCP
// diagnoseConfig as "OK" in static mode. Keying off the presence of a `data`
// property catches them (and still includes the charts that DO list `data`).
//
// `STATIC_DATA_COMPONENTS` is exported as a Set and rebuilt from disk at
// module load time.
function loadStaticDataComponentsFromSchema() {
  // Source layout has this file at `<repo>/ai/behaviorContracts.cjs` and the
  // schema at `<repo>/ai/schema.json` — `__dirname` works directly.
  // The MCP server bundles this module into `<repo>/ai/dist/mcp-server.js`
  // via esbuild, so when invoked from there `__dirname` is `<repo>/ai/dist/`
  // and the schema lives one directory up. Try both layouts; use whichever
  // resolves first.
  const candidates = [
    path.join(__dirname, "schema.json"),
    path.join(__dirname, "..", "schema.json"),
  ]
  for (const schemaPath of candidates) {
    try {
      const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"))
      const out = new Set()
      for (const tool of schema.tools || []) {
        const properties = tool.function?.parameters?.properties || {}
        // Data-driven if the schema declares a `data` input prop, regardless of
        // whether `data` appears in `required` (see note above).
        if ("data" in properties) out.add(tool.function.name)
      }
      if (out.size > 0) return out
    } catch {
      // try next candidate
    }
  }
  // Defensive fallback: if schema.json is unavailable (e.g. unusual install
  // layout), fall back to an empty set so callers fail safe — they'll see
  // "data not required" everywhere, which is permissive but won't crash.
  return new Set()
}

const REQUIRED_COMBINATIONS = [
  {
    component: "StackedAreaChart",
    required: ["areaBy"],
    staticRequired: ["data", "areaBy"],
    pushRequired: ["areaBy"],
    summary: "Stacked areas need a flat data array plus areaBy to identify the stacked series.",
  },
  {
    component: "BubbleChart",
    required: ["sizeBy"],
    staticRequired: ["data", "sizeBy"],
    pushRequired: ["sizeBy"],
    summary: "Bubbles need sizeBy in addition to x/y accessors so radius encodes data rather than a constant point size.",
  },
  {
    component: "StackedBarChart",
    required: ["stackBy"],
    staticRequired: ["data", "stackBy"],
    pushRequired: ["stackBy"],
    summary: "Stacked bars need stackBy to split each category into stack segments.",
  },
  {
    component: "GroupedBarChart",
    required: ["groupBy"],
    staticRequired: ["data", "groupBy"],
    pushRequired: ["groupBy"],
    summary: "Grouped bars need groupBy to split each category into side-by-side bars.",
  },
  {
    component: "SwimlaneChart",
    required: ["subcategoryAccessor"],
    staticRequired: ["data", "subcategoryAccessor"],
    pushRequired: ["subcategoryAccessor"],
    summary: "Swimlanes need subcategoryAccessor; colorBy defaults to the same field when not provided.",
  },
  {
    component: "GaugeChart",
    required: ["value"],
    staticRequired: ["value"],
    pushRequired: [],
    summary: "GaugeChart is value-only. thresholds, min, max, sweep, and arcWidth are optional.",
  },
  {
    component: "ForceDirectedGraph",
    required: ["nodes", "edges"],
    staticRequired: ["nodes", "edges"],
    pushRequired: ["nodes", "edges"],
    summary: "ForceDirectedGraph schema/rendering requires nodes and edges. If an agent infers nodes from edge endpoints, it must materialize a nodes array before returning code.",
  },
]

const PUSH_MODE_COMPONENTS = [
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "Scatterplot",
  "BubbleChart",
  "ConnectedScatterplot",
  "CandlestickChart",
  "MultiAxisLineChart",
  "QuadrantChart",
  "DifferenceChart",
  "BarChart",
  "StackedBarChart",
  "GroupedBarChart",
  "SwarmPlot",
  "BoxPlot",
  "Histogram",
  "ViolinPlot",
  "RidgelinePlot",
  "DotPlot",
  "PieChart",
  "DonutChart",
  "LikertChart",
  "SwimlaneChart",
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ChordDiagram",
  "ProportionalSymbolMap",
  "DistanceCartogram",
]

const STATIC_DATA_COMPONENTS = loadStaticDataComponentsFromSchema()

const BEHAVIOR_CONTRACTS = [
  {
    id: "accessibility.description-props",
    category: "accessibility",
    title: "Accessible chart text uses direct chart props",
    severity: "warning",
    appliesTo: {},
    summary: "High-level charts expose title for the visible name, description for a concise accessible description, summary for a screen-reader-only takeaway and interaction guidance, and accessibleTable for the data-table fallback.",
    agentAction: "Put title, description, summary, and accessibleTable directly on the chart component when they appear in its schema. For generated L1–L3 description or a navigable chart tree, use ChartContainer with chartConfig plus describe and/or navigable; do not invent frameProps fields.",
  },
  {
    id: "props.data-required-by-usage-mode",
    category: "required-props",
    title: "Data required by usage mode",
    severity: "error",
    appliesTo: {
      components: PUSH_MODE_COMPONENTS,
    },
    summary: "Static usage (`renderChart`, MCP previews, SSR snapshots, and copy/paste examples with immediate data) requires data in props. React push mode selects live ingestion by omitting data and mutating through a ref.",
    agentAction: "Pass usageMode=\"push\" to `semiotic-ai --doctor` when validating ref-based JSX with no data prop. Keep usageMode=\"static\" or omit it for renderChart/MCP/static configs where data must be present.",
  },
  {
    id: "color.category-precedence",
    category: "color",
    title: "Categorical color precedence",
    severity: "info",
    appliesTo: {
      propsAny: ["colorBy", "colorScheme"],
    },
    summary: "When colorBy is set, CategoryColorProvider/LinkedCharts category maps win for mapped categories. Unmapped categories fall back to explicit colorScheme, then ThemeProvider colors.categorical, then the built-in categorical fallback.",
    agentAction: "Use colorBy for categorical encodings. Use CategoryColorProvider or LinkedCharts for cross-chart consistency, colorScheme for per-chart fallback palettes, and avoid frameProps style functions unless intentionally bypassing HOC color resolution.",
  },
  {
    id: "props.required-combinations",
    category: "required-props",
    title: "Required prop combinations",
    severity: "error",
    appliesTo: {
      components: REQUIRED_COMBINATIONS.map((entry) => entry.component),
    },
    summary: "Some chart families need semantic props beyond data. These combinations are enforced by validation/schema for static configs and remain required in push mode unless explicitly noted.",
    agentAction: "Before returning code, check the selected component against the required combinations list. For push mode, omit data but keep semantic props such as areaBy, sizeBy, stackBy, and groupBy.",
    combinations: REQUIRED_COMBINATIONS,
  },
  {
    id: "streaming.push-mode-data",
    category: "streaming",
    title: "Push mode omits data",
    severity: "warning",
    appliesTo: {
      components: PUSH_MODE_COMPONENTS,
    },
    summary: "HOC push mode is selected by omitting the data prop entirely. Passing data={[]} is static empty data and can clear/reinitialize the frame on render.",
    agentAction: "For live charts, create a ref, omit data, then call ref.current.push() or pushMany(). For static renderChart/MCP snapshots, provide data because renderChart cannot push later.",
  },
  {
    id: "streaming.ref-mutations-require-id-accessors",
    category: "streaming",
    title: "Ref mutations need stable IDs",
    severity: "warning",
    appliesTo: {
      components: PUSH_MODE_COMPONENTS,
    },
    summary: "push() and pushMany() can append without IDs, but remove(id) and update(id, updater) require a stable ID accessor: pointIdAccessor for XY/realtime charts, dataIdAccessor for ordinal charts, and nodeIDAccessor/edgeIdAccessor for network operations.",
    agentAction: "When generating code that calls remove() or update(), include the matching ID accessor and make sure pushed rows carry that ID field.",
  },
  {
    id: "rendering.renderchart-static-props",
    category: "rendering",
    title: "renderChart uses static props only",
    severity: "warning",
    appliesTo: {},
    summary: "MCP renderChart and semiotic/server renderChart render a single static SVG/PNG snapshot. Browser-only realtime components and future ref pushes are not renderable through that path.",
    agentAction: "Use renderChart only with renderable HOC components and complete static data. For live behavior, return React code with a ref and do not promise MCP-rendered output.",
  },
]

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function normalizeProps(props) {
  return props && typeof props === "object" && !Array.isArray(props) ? props : {}
}

function appliesToComponent(contract, component) {
  if (!component) return !contract.appliesTo?.components
  const components = contract.appliesTo?.components
  return !components || components.includes(component)
}

function appliesToProps(contract, props) {
  const propsAny = contract.appliesTo?.propsAny
  if (!propsAny || propsAny.length === 0) return true
  return propsAny.some((prop) => hasOwn(props, prop) && props[prop] !== undefined)
}

function behaviorContractsFor({ component, props } = {}) {
  const normalizedProps = normalizeProps(props)
  return BEHAVIOR_CONTRACTS.filter((contract) =>
    appliesToComponent(contract, component) && appliesToProps(contract, normalizedProps)
  )
}

function normalizeUsageMode(usageMode) {
  if (usageMode === "push") return "push"
  if (usageMode === "static" || usageMode === "renderChart" || usageMode === "server") return "static"
  return "static"
}

function dataRequiredForUsageMode(component, usageMode) {
  if (!STATIC_DATA_COMPONENTS.has(component)) return false
  if (normalizeUsageMode(usageMode) === "push" && PUSH_MODE_COMPONENTS.includes(component)) return false
  return true
}

function requiredCombinationsFor(component) {
  return REQUIRED_COMBINATIONS.filter((entry) => !component || entry.component === component)
}

function formatRequiredCombination(entry) {
  const staticRequired = entry.staticRequired || entry.required
  const pushRequired = entry.pushRequired || entry.required.filter((prop) => prop !== "data")
  const pushText = pushRequired.length > 0 ? pushRequired.join(" + ") : "not supported"
  return `${entry.component}: static ${staticRequired.join(" + ")}; push ${pushText}. ${entry.summary}`
}

function formatDoctorBehaviorContracts(contracts) {
  if (!contracts || contracts.length === 0) return ""

  const lines = ["Behavior contracts:"]
  for (const contract of contracts) {
    lines.push(`  - [${contract.id}] ${contract.summary}`)
    if (contract.combinations) {
      for (const combo of contract.combinations) {
        lines.push(`    ${formatRequiredCombination(combo)}`)
      }
    }
    lines.push(`    Action: ${contract.agentAction}`)
  }
  return lines.join("\n")
}

function formatBehaviorContractsMarkdown({ compact = false } = {}) {
  const lines = [
    compact ? "## Behavior Contracts" : "## AI Behavior Contracts",
    "",
    DOC_MARKER_START,
    "",
    "These rules are generated from `ai/behaviorContracts.cjs` and are consumed by `semiotic-ai --doctor`, MCP resources, and docs checks.",
    "",
  ]

  for (const contract of BEHAVIOR_CONTRACTS) {
    lines.push(`- **${contract.title}** (\`${contract.id}\`): ${contract.summary}`)
    if (!compact) {
      lines.push(`  Agent action: ${contract.agentAction}`)
    }
    if (contract.combinations) {
      const combos = contract.combinations.map(formatRequiredCombination).join(" ")
      lines.push(`  Required combinations: ${combos}`)
    }
  }

  lines.push("", DOC_MARKER_END)
  return lines.join("\n")
}

module.exports = {
  BEHAVIOR_CONTRACTS,
  DOC_MARKER_END,
  DOC_MARKER_START,
  PUSH_MODE_COMPONENTS,
  REQUIRED_COMBINATIONS,
  STATIC_DATA_COMPONENTS,
  behaviorContractsFor,
  dataRequiredForUsageMode,
  formatBehaviorContractsMarkdown,
  formatDoctorBehaviorContracts,
  normalizeUsageMode,
  requiredCombinationsFor,
}

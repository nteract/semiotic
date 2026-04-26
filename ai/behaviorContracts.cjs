"use strict"

const DOC_MARKER_START = "<!-- semiotic-behavior-contracts:start -->"
const DOC_MARKER_END = "<!-- semiotic-behavior-contracts:end -->"

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

const STATIC_DATA_COMPONENTS = [
  "LineChart",
  "AreaChart",
  "StackedAreaChart",
  "Scatterplot",
  "BubbleChart",
  "ConnectedScatterplot",
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
]

const BEHAVIOR_CONTRACTS = [
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
  if (!STATIC_DATA_COMPONENTS.includes(component)) return false
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

"use strict"

const CATEGORY_ORDER = ["xy", "ordinal", "network", "geo", "realtime", "physics", "value", "recipe"]

const COMPONENTS_BY_CATEGORY = {
  // BEGIN GENERATED XY CHARTS
  xy: [
    "LineChart",
    "BumpChart",
    "AreaChart",
    "DifferenceChart",
    "StackedAreaChart",
    "Scatterplot",
    "BubbleChart",
    "Heatmap",
    "QuadrantChart",
    "MultiAxisLineChart",
    "WaterfallChart",
    "CandlestickChart",
    "ConnectedScatterplot",
    "ScatterplotMatrix",
    "MinimapChart"
  ],
  // END GENERATED XY CHARTS
  // BEGIN GENERATED ORDINAL CHARTS
  ordinal: [
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
    "GaugeChart",
    "FunnelChart",
    "RadarChart",
    "SwimlaneChart",
    "LikertChart"
  ],
  // END GENERATED ORDINAL CHARTS
  // BEGIN GENERATED NETWORK CHARTS
  network: [
    "MotifBraidChart",
    "DependencyForestChart",
    "ForceDirectedGraph",
    "SankeyDiagram",
    "ProcessSankey",
    "ChordDiagram",
    "TreeDiagram",
    "Treemap",
    "CirclePack",
    "OrbitDiagram"
  ],
  // END GENERATED NETWORK CHARTS
  geo: [
    "ChoroplethMap", "ProportionalSymbolMap", "FlowMap", "DistanceCartogram",
  ],
  // BEGIN GENERATED REALTIME CHARTS
  realtime: [
    "RealtimeLineChart",
    "RealtimeHistogram",
    "TemporalHistogram",
    "RealtimeSwarmChart",
    "RealtimeWaterfallChart",
    "RealtimeHeatmap"
  ],
  // END GENERATED REALTIME CHARTS
  // BEGIN GENERATED PHYSICS CHARTS
  physics: [
    "FlowCircuitChart",
    "GaltonBoardChart",
    "EventDropChart",
    "UnitPileChart",
    "CollisionSwarmChart",
    "PacketFlowChart",
    "ProcessFlowChart",
    "GauntletChart",
    "CrucibleChart",
    "ChainReactionChart"
  ],
  // END GENERATED PHYSICS CHARTS
  value: [
    "BigNumber",
  ],
  recipe: [
    "ParallelCoordinatesRecipe", "CalendarHeatmapRecipe",
  ],
}

const COMPONENT_TO_CATEGORY = new Map()
for (const [category, names] of Object.entries(COMPONENTS_BY_CATEGORY)) {
  for (const name of names) {
    COMPONENT_TO_CATEGORY.set(name, category)
  }
}

// AI's component catalog can expose imperative/custom-layout charts that
// deliberately have no JSON schema. Keep that small extension separate from
// the schema-backed metadata above so chart-spec drift checks retain their
// exact one-to-one inventory contract.
const AI_EXPORT_ONLY_CATEGORIES = {
  PhysicsCustomChart: "physics",
}

function schemaEntries(schema) {
  return schema.tools.map((tool) => tool.function)
}

function categoryForComponent(name) {
  const category = COMPONENT_TO_CATEGORY.get(name)
  if (!category) {
    throw new Error(`No AI component metadata category for "${name}"`)
  }
  return category
}

function categoryForAIExport(name) {
  return COMPONENT_TO_CATEGORY.get(name) ?? AI_EXPORT_ONLY_CATEGORIES[name]
}

function importPathForCategory(category) {
  if (category === "physics") return "semiotic/physics"
  if (category === "recipe") return "semiotic/ai"
  return category === "geo" ? "semiotic/geo" : `semiotic/${category}`
}

function schemaResourceUriForComponent(name) {
  return `semiotic://schema/${encodeURIComponent(name)}`
}

function metadataForComponent(entryOrName) {
  const name = typeof entryOrName === "string" ? entryOrName : entryOrName.name
  const category = categoryForComponent(name)
  // MCP excludes the live Realtime charts. Their public server renderers
  // separately accept bounded data snapshots.
  // TemporalHistogram is the static-data sibling living in the
  // "realtime" category for documentation grouping — it accepts a
  // bounded data array and is renderable through the SSR path like
  // any other static HOC. Matches the name-prefix exclusion the
  // check-surface-parity script applies.
  const isPushOnly = category === "realtime" && name.startsWith("Realtime")
  return {
    name,
    category,
    importPath: ["MotifBraidChart", "DependencyForestChart", "FlowCircuitChart"].includes(name) ? "semiotic/atlas" : importPathForCategory(category),
    schemaResourceUri: schemaResourceUriForComponent(name),
    renderable: !isPushOnly,
    requiresLiveData: isPushOnly,
    description: typeof entryOrName === "string" ? undefined : entryOrName.description,
  }
}

function findComponent(schema, name) {
  const entries = schemaEntries(schema)
  const exact = entries.find((entry) => entry.name === name)
  if (exact) return exact

  const lower = name.toLowerCase()
  return entries.find((entry) => entry.name.toLowerCase() === lower)
}

function componentIndexFromSchema(schema) {
  const components = schemaEntries(schema).map(metadataForComponent)
  const categories = {}
  for (const category of CATEGORY_ORDER) {
    categories[category] = []
  }

  for (const component of components) {
    categories[component.category].push(component.name)
  }

  for (const names of Object.values(categories)) {
    names.sort()
  }

  return {
    version: schema.version,
    totalComponents: components.length,
    renderableComponents: components.filter((component) => component.renderable).length,
    browserOnlyComponents: components.filter((component) => !component.renderable).length,
    requiresLiveDataComponents: components.filter((component) => component.requiresLiveData).length,
    categories,
    components,
  }
}

module.exports = {
  CATEGORY_ORDER,
  COMPONENTS_BY_CATEGORY,
  categoryForComponent,
  categoryForAIExport,
  componentIndexFromSchema,
  findComponent,
  importPathForCategory,
  metadataForComponent,
  schemaResourceUriForComponent,
  schemaEntries,
}

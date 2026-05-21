"use strict"

const CATEGORY_ORDER = ["xy", "ordinal", "network", "geo", "realtime"]

const COMPONENTS_BY_CATEGORY = {
  xy: [
    "LineChart", "AreaChart", "DifferenceChart", "StackedAreaChart", "Scatterplot", "QuadrantChart",
    "MultiAxisLineChart", "CandlestickChart", "BubbleChart", "Heatmap",
    "ConnectedScatterplot", "ScatterplotMatrix", "MinimapChart",
  ],
  ordinal: [
    "BarChart", "StackedBarChart", "LikertChart", "GroupedBarChart", "SwarmPlot",
    "BoxPlot", "Histogram", "ViolinPlot", "RidgelinePlot", "DotPlot", "PieChart",
    "DonutChart", "GaugeChart", "FunnelChart", "SwimlaneChart",
  ],
  network: [
    "ForceDirectedGraph", "SankeyDiagram", "ProcessSankey", "ChordDiagram",
    "TreeDiagram", "Treemap", "CirclePack", "OrbitDiagram",
  ],
  geo: [
    "ChoroplethMap", "ProportionalSymbolMap", "FlowMap", "DistanceCartogram",
  ],
  realtime: [
    "RealtimeLineChart", "RealtimeHistogram", "TemporalHistogram", "RealtimeSwarmChart",
    "RealtimeWaterfallChart", "RealtimeHeatmap",
  ],
}

const COMPONENT_TO_CATEGORY = new Map()
for (const [category, names] of Object.entries(COMPONENTS_BY_CATEGORY)) {
  for (const name of names) {
    COMPONENT_TO_CATEGORY.set(name, category)
  }
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

function importPathForCategory(category) {
  return category === "geo" ? "semiotic/geo" : `semiotic/${category}`
}

function metadataForComponent(entryOrName) {
  const name = typeof entryOrName === "string" ? entryOrName : entryOrName.name
  const category = categoryForComponent(name)
  // Realtime push-streaming charts are browser-only by design.
  // TemporalHistogram is the static-data sibling living in the
  // "realtime" category for documentation grouping — it accepts a
  // bounded data array and is renderable through the SSR path like
  // any other static HOC. Matches the name-prefix exclusion the
  // check-surface-parity script applies.
  const isPushOnly = category === "realtime" && name.startsWith("Realtime")
  return {
    name,
    category,
    importPath: importPathForCategory(category),
    renderable: !isPushOnly,
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
    categories,
    components,
  }
}

module.exports = {
  CATEGORY_ORDER,
  COMPONENTS_BY_CATEGORY,
  categoryForComponent,
  componentIndexFromSchema,
  findComponent,
  importPathForCategory,
  metadataForComponent,
  schemaEntries,
}

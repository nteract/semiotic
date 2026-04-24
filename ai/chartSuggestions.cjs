"use strict"

const VALID_INTENTS = [
  "comparison", "trend", "distribution", "relationship", "composition",
  "geographic", "network", "hierarchy",
]

function summarizeFields(data, keys) {
  const numericFields = []
  const stringFields = []
  const dateFields = []
  const geoFields = {}
  const networkFields = {}
  const hierarchyFields = {}

  for (const key of keys) {
    const values = data.map((d) => d[key]).filter((v) => v != null)
    if (values.length === 0) continue

    const first = values[0]
    if (typeof first === "number") {
      numericFields.push(key)
    } else if (typeof first === "string") {
      if (/^\d{4}[-/]\d{2}/.test(first) && !Number.isNaN(Date.parse(first))) {
        dateFields.push(key)
      } else {
        stringFields.push(key)
      }
    }

    const kl = key.toLowerCase()
    if (kl === "lat" || kl === "latitude") geoFields.lat = key
    if (kl === "lon" || kl === "lng" || kl === "longitude") geoFields.lon = key
    if (kl === "source" || kl === "from") networkFields.source = key
    if (kl === "target" || kl === "to") networkFields.target = key
    if (kl === "value" || kl === "weight" || kl === "amount") networkFields.value = key
    if (kl === "children" || kl === "values") hierarchyFields.children = key
    if (kl === "parent") hierarchyFields.parent = key
  }

  return {
    keys,
    numericFields,
    stringFields,
    dateFields,
    geoFields,
    networkFields,
    hierarchyFields,
  }
}

function suggestCharts(args = {}) {
  const data = args.data
  const intent = args.intent

  if (intent && !VALID_INTENTS.includes(intent)) {
    return {
      ok: false,
      error: `Unknown intent "${intent}". Expected one of: ${VALID_INTENTS.join(", ")}.`,
    }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      error: "Pass { data: [{ ... }, ...] } with 1-5 sample data objects. Optionally include intent: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'geographic' | 'network' | 'hierarchy'.",
    }
  }

  const sample = data[0]
  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    return {
      ok: false,
      error: "Data items must be objects with key-value pairs.",
    }
  }

  const keys = Object.keys(sample)
  const fields = summarizeFields(data, keys)
  const suggestions = []

  const { numericFields, stringFields, dateFields, geoFields, networkFields, hierarchyFields } = fields
  const hasTime = dateFields.length > 0
  const hasCat = stringFields.length > 0
  const hasNum = numericFields.length > 0
  const hasGeo = Boolean(geoFields.lat && geoFields.lon)
  const hasNetwork = Boolean(networkFields.source && networkFields.target)
  const hasHierarchy = Boolean(hierarchyFields.children || hierarchyFields.parent)

  if (hasNetwork && (!intent || intent === "network")) {
    const src = networkFields.source
    const tgt = networkFields.target
    if (networkFields.value) {
      suggestions.push({
        component: "SankeyDiagram",
        confidence: "high",
        reason: `Data has ${src}->${tgt} with ${networkFields.value} - ideal for flow visualization`,
        props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"`, valueAccessor: `"${networkFields.value}"` },
      })
    }
    suggestions.push({
      component: "ForceDirectedGraph",
      confidence: networkFields.value ? "medium" : "high",
      reason: `Data has ${src}->${tgt} edges - force layout shows network structure. Nodes are auto-inferred from edges when not provided.`,
      props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"` },
    })
  }

  if (hasHierarchy && (!intent || intent === "hierarchy")) {
    suggestions.push({
      component: "Treemap",
      confidence: "high",
      reason: `Data has nested ${hierarchyFields.children || "parent"} structure - treemap shows hierarchical proportions`,
      props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"`, ...(numericFields[0] ? { valueAccessor: `"${numericFields[0]}"` } : {}) },
    })
    suggestions.push({
      component: "TreeDiagram",
      confidence: "medium",
      reason: "Tree layout shows hierarchical relationships",
      props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"` },
    })
  }

  if (hasGeo && (!intent || intent === "geographic")) {
    const sizeField = numericFields.find((f) => f !== geoFields.lat && f !== geoFields.lon)
    suggestions.push({
      component: "ProportionalSymbolMap",
      confidence: "high",
      reason: `Data has ${geoFields.lat}/${geoFields.lon} coordinates - map shows spatial distribution`,
      props: { points: "data", xAccessor: `"${geoFields.lon}"`, yAccessor: `"${geoFields.lat}"`, ...(sizeField ? { sizeBy: `"${sizeField}"` } : {}) },
    })
  }

  if (hasTime && hasNum && (!intent || intent === "trend")) {
    const timeField = dateFields[0]
    const valueField = numericFields[0]
    suggestions.push({
      component: "LineChart",
      confidence: "high",
      reason: `Data has dates (${timeField}) and numeric values (${valueField}) - line chart shows trends over time`,
      props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, ...(hasCat ? { lineBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` } : {}) },
    })
    if (hasCat) {
      suggestions.push({
        component: "StackedAreaChart",
        confidence: "medium",
        reason: `Multiple categories (${stringFields[0]}) over time - stacked area shows composition trends`,
        props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, areaBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` },
      })
    }
  }

  if (hasCat && hasNum && (!intent || intent === "comparison" || intent === "composition" || intent === "distribution")) {
    const catField = stringFields[0]
    const valField = numericFields[0]

    if (!intent || intent === "comparison") {
      suggestions.push({
        component: "BarChart",
        confidence: hasTime ? "medium" : "high",
        reason: `Categorical field (${catField}) with values (${valField}) - bar chart for comparison`,
        props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
      })
    }

    if (stringFields.length >= 2 && (!intent || intent === "composition")) {
      suggestions.push({
        component: "StackedBarChart",
        confidence: "medium",
        reason: `Two categorical fields (${stringFields.join(", ")}) - stacked bar shows composition within categories`,
        props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"`, stackBy: `"${stringFields[1]}"` },
      })
    }

    if (!intent || intent === "distribution") {
      suggestions.push({
        component: "Histogram",
        confidence: "medium",
        reason: `Numeric distribution of ${valField} - histogram shows value spread`,
        props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
      })
    }

    if (!intent || intent === "composition") {
      const uniqueCats = new Set(data.map((d) => d[catField])).size
      if (uniqueCats <= 8) {
        suggestions.push({
          component: "DonutChart",
          confidence: "medium",
          reason: `${uniqueCats} categories - donut chart shows proportional composition`,
          props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
        })
      }
    }
  }

  if (numericFields.length >= 2 && (!intent || intent === "relationship")) {
    const xField = numericFields[0]
    const yField = numericFields[1]
    suggestions.push({
      component: "Scatterplot",
      confidence: "high",
      reason: `Two numeric fields (${xField}, ${yField}) - scatterplot shows relationships`,
      props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, ...(hasCat ? { colorBy: `"${stringFields[0]}"` } : {}), ...(numericFields[2] ? { sizeBy: `"${numericFields[2]}"` } : {}) },
    })

    if (numericFields.length >= 3) {
      suggestions.push({
        component: "BubbleChart",
        confidence: "medium",
        reason: "Three numeric fields - bubble chart adds size dimension to scatter",
        props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, sizeBy: `"${numericFields[2]}"` },
      })
    }

    if (hasCat) {
      suggestions.push({
        component: "Heatmap",
        confidence: "medium",
        reason: "Numeric values across dimensions - heatmap shows density/intensity",
        props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${stringFields[0]}"`, valueAccessor: `"${numericFields[0]}"` },
      })
    }
  }

  return {
    ok: true,
    intent,
    fieldSummary: `Fields: ${keys.join(", ")} (${numericFields.length} numeric, ${stringFields.length} categorical, ${dateFields.length} date)`,
    fields,
    suggestions,
  }
}

function formatSuggestionReport(result) {
  if (!result.ok) return result.error

  if (result.suggestions.length === 0) {
    return `Could not confidently recommend a chart type.\n\n${result.fieldSummary}\n\nTry providing intent ('${VALID_INTENTS.join("', '")}') to narrow recommendations, or use getSchema to browse available components.`
  }

  const lines = result.suggestions.map((suggestion, i) => {
    const propsStr = Object.entries(suggestion.props).map(([k, v]) => `${k}=${v}`).join(" ")
    return `${i + 1}. **${suggestion.component}** (${suggestion.confidence} confidence)\n   ${suggestion.reason}\n   \`<${suggestion.component} ${propsStr} />\``
  })

  const themingTip = `\n---\n**Styling**: All charts respond to CSS custom properties on any ancestor element:\n\`\`\`css\n.my-theme {\n  --semiotic-bg: #fff;\n  --semiotic-text: #333;\n  --semiotic-text-secondary: #666;\n  --semiotic-grid: #e0e0e0;\n  --semiotic-border: #e0e0e0;\n  --semiotic-font-family: sans-serif;\n  --semiotic-tooltip-bg: rgba(0,0,0,0.85);\n  --semiotic-tooltip-text: white;\n  --semiotic-tooltip-radius: 6px;\n}\n\`\`\`\nOr use \`<ThemeProvider theme="dark">\` / \`<ThemeProvider theme={{ colors: {...}, typography: {...} }}>\`.\nFor accessibility, use \`colorScheme={COLOR_BLIND_SAFE_CATEGORICAL}\` (import from \`semiotic\`) - 8-color palette safe for all forms of color blindness.`

  return lines.join("\n\n") + themingTip
}

module.exports = {
  VALID_INTENTS,
  formatSuggestionReport,
  suggestCharts,
}

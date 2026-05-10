"use strict"

const path = require("path")

const VALID_INTENTS = [
  "comparison", "trend", "distribution", "relationship", "composition",
  "geographic", "network", "hierarchy",
]
const MAX_SAMPLE_SIZE = 5

// Capability matrix loaded from `ai/capabilities.json` — generated
// from `chartSpecs.ts` via `npm run docs:capabilities`. Used to
// filter suggestions when the caller passes capability constraints.
// Loaded lazily so a test or build that hasn't generated the file
// yet still imports cleanly; if the JSON is missing AND a caller
// passes capability constraints, `suggestCharts` returns an explicit
// error rather than silently filtering everything out (would happen
// because `chartSatisfiesCapabilities` fails closed for unknown
// chart names).
//
// `__dirname` points at the cjs source location at runtime —
// when bundled into `ai/dist/mcp-server.js` `__dirname` is
// `ai/dist/`, so we also probe the parent directory. Mirrors the
// `schema.json` loader's two-candidate pattern.
//
// `_capabilityMatrixLoaded` differentiates "load attempted, file
// missing → empty {}" from "load not yet attempted". Without this
// flag, a build that's missing capabilities.json would set
// `_capabilityMatrix = {}` and every subsequent call would short-
// circuit on `if (_capabilityMatrix)` (because `{}` is truthy) and
// never re-probe — the right behavior for a steady state but
// incompatible with detecting "loader failed".
let _capabilityMatrix = null
let _capabilityMatrixLoaded = false
function loadCapabilityMatrix() {
  if (_capabilityMatrixLoaded) return _capabilityMatrix
  const candidates = [
    path.join(__dirname, "capabilities.json"),
    path.join(__dirname, "..", "capabilities.json"),
  ]
  for (const candidate of candidates) {
    try {
      const json = require(candidate)
      if (json && json.charts) {
        _capabilityMatrix = json.charts
        _capabilityMatrixLoaded = true
        return _capabilityMatrix
      }
    } catch {
      // try next candidate
    }
  }
  _capabilityMatrixLoaded = true
  return _capabilityMatrix
}

// Mapping from the capability arg names callers pass (push,
// linkedHover, ssr, selection, legend) to the chartSpecs field
// names in capabilities.json (supportsPush, supportsLinkedHover,
// etc.). Caller-side names are short for ergonomics; matrix-side
// names mirror the chartSpecs schema so search/grep finds both.
const CAPABILITY_KEY_MAP = {
  push: "supportsPush",
  linkedHover: "supportsLinkedHover",
  ssr: "supportsSSR",
  selection: "supportsSelection",
  legend: "supportsLegend",
}

const VALID_CAPABILITY_KEYS = Object.keys(CAPABILITY_KEY_MAP)

/**
 * Test a chart name against a capability constraint object. Returns
 * `true` when the chart satisfies every constraint (or when no
 * constraints are set). Unknown chart names fail closed — better to
 * drop a suggestion than recommend a chart we can't confirm
 * supports the caller's needs.
 *
 * `requirements` shape:
 *   { push?: boolean, linkedHover?: boolean, ssr?: boolean,
 *     selection?: boolean, legend?: boolean }
 *
 * Each key, when set to `true`, means "the chart MUST support this".
 * `false` means "the chart MUST NOT support this" (rare, but
 * symmetric — useful for "give me a chart that intentionally has no
 * legend"). Unset keys are ignored.
 */
function chartSatisfiesCapabilities(chartName, requirements) {
  if (!requirements || Object.keys(requirements).length === 0) return true
  const matrix = loadCapabilityMatrix()
  if (matrix == null) return false // matrix unavailable — fail closed
  const spec = matrix[chartName]
  if (!spec) return false // unknown chart — fail closed
  for (const [shortKey, want] of Object.entries(requirements)) {
    if (want == null) continue
    const matrixKey = CAPABILITY_KEY_MAP[shortKey]
    if (!matrixKey) continue // unknown short key — ignore (validated upstream)
    const has = spec[matrixKey] === true
    if (has !== want) return false
  }
  return true
}

/**
 * Explain why a chart doesn't satisfy a capability constraint set —
 * used in the `filteredOut[].reason` payload so callers see the
 * specific mismatched constraint(s) rather than the chart's
 * data-shape rationale. Returns null when no mismatch (defensive;
 * callers should only invoke this on charts that already failed
 * `chartSatisfiesCapabilities`).
 */
function explainCapabilityMismatch(chartName, requirements) {
  if (!requirements || Object.keys(requirements).length === 0) return null
  const matrix = loadCapabilityMatrix()
  if (matrix == null) return "capability matrix unavailable (run `npm run docs:capabilities`)"
  const spec = matrix[chartName]
  if (!spec) return `${chartName} not found in capability matrix`
  const mismatches = []
  for (const [shortKey, want] of Object.entries(requirements)) {
    if (want == null) continue
    const matrixKey = CAPABILITY_KEY_MAP[shortKey]
    if (!matrixKey) continue
    const has = spec[matrixKey] === true
    if (has !== want) {
      mismatches.push(`requires ${shortKey}=${want} but ${matrixKey}=${has}`)
    }
  }
  return mismatches.length > 0 ? mismatches.join("; ") : null
}

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

function jsxString(value) {
  return JSON.stringify(String(value))
}

function jsxExpression(value) {
  return `{${value}}`
}

function uniqueNetworkNodes(data, sourceField, targetField) {
  const ids = new Set()
  for (const datum of data) {
    const source = datum[sourceField]
    const target = datum[targetField]
    if (source != null) ids.add(source)
    if (target != null) ids.add(target)
  }
  return Array.from(ids).map((id) => ({ id }))
}

function suggestCharts(args = {}) {
  const data = args.data
  const intent = args.intent
  const capabilities = args.capabilities

  if (intent && !VALID_INTENTS.includes(intent)) {
    return {
      ok: false,
      error: `Unknown intent "${intent}". Expected one of: ${VALID_INTENTS.join(", ")}.`,
    }
  }

  if (capabilities) {
    if (typeof capabilities !== "object" || Array.isArray(capabilities)) {
      return {
        ok: false,
        error: "capabilities must be an object like { push: true, linkedHover: true, ssr: true, selection: true, legend: true }.",
      }
    }
    const unknown = Object.keys(capabilities).filter((k) => !VALID_CAPABILITY_KEYS.includes(k))
    if (unknown.length > 0) {
      return {
        ok: false,
        error: `Unknown capability key(s): ${unknown.join(", ")}. Expected: ${VALID_CAPABILITY_KEYS.join(", ")}.`,
      }
    }
    // Probe matrix availability up front so callers see a clear error
    // instead of an empty-suggestions silent-failure when
    // capabilities.json is missing from the build.
    if (loadCapabilityMatrix() == null) {
      return {
        ok: false,
        error: "Capability matrix unavailable: ai/capabilities.json is missing. Run `npm run docs:capabilities` to generate it. (Capability filtering requires the matrix; suggestions without a `capabilities` arg still work.)",
      }
    }
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      error: "Pass { data: [{ ... }, ...] } with 1-5 sample data objects. Optionally include intent: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'geographic' | 'network' | 'hierarchy', or capabilities: { push, linkedHover, ssr, selection, legend }.",
    }
  }

  if (data.length > MAX_SAMPLE_SIZE) {
    return {
      ok: false,
      error: `Pass 1-${MAX_SAMPLE_SIZE} sample data objects; received ${data.length}. Use a representative sample instead of the full dataset.`,
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
        props: { edges: jsxExpression("data"), sourceAccessor: jsxString(src), targetAccessor: jsxString(tgt), valueAccessor: jsxString(networkFields.value) },
      })
    }
    const nodes = uniqueNetworkNodes(data, src, tgt)
    suggestions.push({
      component: "ForceDirectedGraph",
      confidence: networkFields.value ? "medium" : "high",
      reason: `Data has ${src}->${tgt} edges - force layout shows network structure. ForceDirectedGraph requires explicit nodes, derived here from unique source/target IDs.`,
      setup: [`const nodes = ${JSON.stringify(nodes, null, 2)}`],
      derivedData: { nodes },
      props: { nodes: jsxExpression("nodes"), edges: jsxExpression("data"), nodeIDAccessor: jsxString("id"), sourceAccessor: jsxString(src), targetAccessor: jsxString(tgt) },
    })
  }

  if (hasHierarchy && hierarchyFields.children && Array.isArray(sample[hierarchyFields.children]) && (!intent || intent === "hierarchy")) {
    const childrenAccessor = hierarchyFields.children
    suggestions.push({
      component: "Treemap",
      confidence: "high",
      reason: `Data has nested ${childrenAccessor} structure - treemap shows hierarchical proportions. Use data[0] as the root node from the provided sample.`,
      props: { data: jsxExpression("data[0]"), childrenAccessor: jsxString(childrenAccessor), ...(numericFields[0] ? { valueAccessor: jsxString(numericFields[0]) } : {}) },
    })
    suggestions.push({
      component: "TreeDiagram",
      confidence: "medium",
      reason: `Tree layout shows hierarchical relationships. Use data[0] as the root node from the provided sample.`,
      props: { data: jsxExpression("data[0]"), childrenAccessor: jsxString(childrenAccessor) },
    })
  }

  if (hasGeo && (!intent || intent === "geographic")) {
    const sizeField = numericFields.find((f) => f !== geoFields.lat && f !== geoFields.lon)
    suggestions.push({
      component: "ProportionalSymbolMap",
      confidence: "high",
      reason: `Data has ${geoFields.lat}/${geoFields.lon} coordinates - map shows spatial distribution`,
      props: { points: jsxExpression("data"), xAccessor: jsxString(geoFields.lon), yAccessor: jsxString(geoFields.lat), ...(sizeField ? { sizeBy: jsxString(sizeField) } : {}) },
    })
  }

  if (hasTime && hasNum && (!intent || intent === "trend")) {
    const timeField = dateFields[0]
    const valueField = numericFields[0]
    suggestions.push({
      component: "LineChart",
      confidence: "high",
      reason: `Data has dates (${timeField}) and numeric values (${valueField}) - line chart shows trends over time`,
      props: { data: jsxExpression("data"), xAccessor: jsxString(timeField), yAccessor: jsxString(valueField), ...(hasCat ? { lineBy: jsxString(stringFields[0]), colorBy: jsxString(stringFields[0]) } : {}) },
    })
    if (hasCat) {
      suggestions.push({
        component: "StackedAreaChart",
        confidence: "medium",
        reason: `Multiple categories (${stringFields[0]}) over time - stacked area shows composition trends`,
        props: { data: jsxExpression("data"), xAccessor: jsxString(timeField), yAccessor: jsxString(valueField), areaBy: jsxString(stringFields[0]), colorBy: jsxString(stringFields[0]) },
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
        props: { data: jsxExpression("data"), categoryAccessor: jsxString(catField), valueAccessor: jsxString(valField) },
      })
    }

    if (stringFields.length >= 2 && (!intent || intent === "composition")) {
      suggestions.push({
        component: "StackedBarChart",
        confidence: "medium",
        reason: `Two categorical fields (${stringFields.join(", ")}) - stacked bar shows composition within categories`,
        props: { data: jsxExpression("data"), categoryAccessor: jsxString(catField), valueAccessor: jsxString(valField), stackBy: jsxString(stringFields[1]) },
      })
    }

    if (!intent || intent === "distribution") {
      suggestions.push({
        component: "Histogram",
        confidence: "medium",
        reason: `Numeric distribution of ${valField} - histogram shows value spread`,
        props: { data: jsxExpression("data"), categoryAccessor: jsxString(catField), valueAccessor: jsxString(valField) },
      })
    }

    if (!intent || intent === "composition") {
      const uniqueCats = new Set(data.map((d) => d[catField])).size
      if (uniqueCats <= 8) {
        suggestions.push({
          component: "DonutChart",
          confidence: "medium",
          reason: `${uniqueCats} categories - donut chart shows proportional composition`,
          props: { data: jsxExpression("data"), categoryAccessor: jsxString(catField), valueAccessor: jsxString(valField) },
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
      props: { data: jsxExpression("data"), xAccessor: jsxString(xField), yAccessor: jsxString(yField), ...(hasCat ? { colorBy: jsxString(stringFields[0]) } : {}), ...(numericFields[2] ? { sizeBy: jsxString(numericFields[2]) } : {}) },
    })

    if (numericFields.length >= 3) {
      suggestions.push({
        component: "BubbleChart",
        confidence: "medium",
        reason: "Three numeric fields - bubble chart adds size dimension to scatter",
        props: { data: jsxExpression("data"), xAccessor: jsxString(xField), yAccessor: jsxString(yField), sizeBy: jsxString(numericFields[2]) },
      })
    }
  }

  if (stringFields.length >= 2 && numericFields.length >= 1 && (!intent || intent === "relationship" || intent === "distribution" || intent === "composition")) {
    const xField = stringFields[0]
    const yField = stringFields[1]
    const valueField = numericFields[0]
    suggestions.push({
      component: "Heatmap",
      confidence: "medium",
      reason: `Two categorical fields (${xField}, ${yField}) plus numeric values (${valueField}) - heatmap shows intensity across dimensions`,
      props: { data: jsxExpression("data"), xAccessor: jsxString(xField), yAccessor: jsxString(yField), valueAccessor: jsxString(valueField) },
    })
  }

  // Apply capability filter as the last step so data-shape inference
  // logic stays oblivious to it. Suggestions are kept in their
  // confidence-ranked order; we just drop anything that doesn't
  // satisfy the caller's constraints.
  const filteredSuggestions = capabilities
    ? suggestions.filter((s) => chartSatisfiesCapabilities(s.component, capabilities))
    : suggestions

  return {
    ok: true,
    intent,
    capabilities,
    fieldSummary: `Fields: ${keys.join(", ")} (${numericFields.length} numeric, ${stringFields.length} categorical, ${dateFields.length} date)`,
    fields,
    suggestions: filteredSuggestions,
    // Surface the pre-filter set when a capability constraint was
    // applied — caller can see which suggestions were dropped and
    // whether to relax the constraint.
    ...(capabilities && filteredSuggestions.length < suggestions.length && {
      filteredOut: suggestions
        .filter((s) => !chartSatisfiesCapabilities(s.component, capabilities))
        .map((s) => ({
          component: s.component,
          // The `reason` here is the capability mismatch (which
          // constraint failed), not the original data-shape rationale
          // — callers debugging an empty result need to know which
          // capability to relax, not why the chart was originally
          // suggested.
          reason: explainCapabilityMismatch(s.component, capabilities) || "did not satisfy capability constraints",
        })),
    }),
  }
}

function formatSuggestionReport(result) {
  if (!result.ok) return result.error

  if (result.suggestions.length === 0) {
    const tail = result.capabilities && result.filteredOut && result.filteredOut.length > 0
      ? `\n\nDropped by capability filter (${formatCapabilityConstraints(result.capabilities)}):\n${result.filteredOut.map((s) => `- ${s.component}: ${s.reason}`).join("\n")}\n\nRelax the capability constraints, or use getSchema to browse alternatives.`
      : `\n\nTry providing intent ('${VALID_INTENTS.join("', '")}') to narrow recommendations, or use getSchema to browse available components.`
    return `Could not confidently recommend a chart type.\n\n${result.fieldSummary}${tail}`
  }

  const lines = result.suggestions.map((suggestion, i) => {
    const propsStr = Object.entries(suggestion.props).map(([k, v]) => `${k}=${v}`).join(" ")
    const setup = suggestion.setup ? `${suggestion.setup.join("\n")}\n` : ""
    return `${i + 1}. **${suggestion.component}** (${suggestion.confidence} confidence)\n   ${suggestion.reason}\n\`\`\`tsx\n${setup}<${suggestion.component} ${propsStr} />\n\`\`\``
  })

  const themingTip = `\n---\n**Styling**: All charts respond to CSS custom properties on any ancestor element:\n\`\`\`css\n.my-theme {\n  --semiotic-bg: #fff;\n  --semiotic-text: #333;\n  --semiotic-text-secondary: #666;\n  --semiotic-grid: #e0e0e0;\n  --semiotic-border: #e0e0e0;\n  --semiotic-font-family: sans-serif;\n  --semiotic-tooltip-bg: rgba(0,0,0,0.85);\n  --semiotic-tooltip-text: white;\n  --semiotic-tooltip-radius: 6px;\n}\n\`\`\`\nOr use \`<ThemeProvider theme="dark">\` / \`<ThemeProvider theme={{ colors: {...}, typography: {...} }}>\`.\nFor accessibility, use \`colorScheme={COLOR_BLIND_SAFE_CATEGORICAL}\` (import from \`semiotic/themes\`) - 8-color palette safe for all forms of color blindness.`

  return lines.join("\n\n") + themingTip
}

function formatCapabilityConstraints(capabilities) {
  return Object.entries(capabilities)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")
}

module.exports = {
  VALID_INTENTS,
  VALID_CAPABILITY_KEYS,
  formatSuggestionReport,
  suggestCharts,
  // Exported for tests + callers that want to filter their own
  // chart-name set without re-running the suggestion pipeline.
  chartSatisfiesCapabilities,
  explainCapabilityMismatch,
}

#!/usr/bin/env node
/**
 * Semiotic MCP Server
 *
 * Exposes five tools:
 *   1. renderChart — renders any HOC chart to static SVG
 *   2. diagnoseConfig — anti-pattern detector for chart configurations
 *   3. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
 *   4. getSchema — returns the prop schema for a specific component
 *   5. suggestChart — recommends chart types for a given data shape
 *
 * Usage (Claude Desktop / claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "semiotic": {
 *       "command": "npx",
 *       "args": ["semiotic-mcp"]
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as fs from "fs"
import * as path from "path"
import { renderHOCToSVG } from "./renderHOCToSVG"
import { COMPONENT_REGISTRY } from "./componentRegistry"
import { diagnoseConfig } from "semiotic/ai"

// Load schema.json for version info
const schemaPath = path.resolve(__dirname, "../schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))

// Build MCP server
const server = new McpServer({
  name: "semiotic",
  version: schema.version || "3.0.0",
})

// Build component name → schema lookup from schema.json
const schemaByComponent: Record<string, any> = {}
for (const tool of schema.tools) {
  schemaByComponent[tool.function.name] = tool.function
}

// ── getSchema tool ──────────────────────────────────────────────────────
// Returns the prop schema for a specific component, or lists all components.
server.tool(
  "getSchema",
  `Return the prop schema for a Semiotic chart component. Pass { component: '<name>' } to get its props, or omit component to list all available components. Components marked [renderable] can be passed to renderChart for static SVG output.`,
  {},
  async (args: Record<string, unknown>) => {
    const component = args.component as string | undefined

    if (!component) {
      const all = Object.keys(schemaByComponent).sort()
      const renderable = new Set(Object.keys(COMPONENT_REGISTRY))
      const list = all.map(name => renderable.has(name) ? `${name} [renderable]` : name)
      return {
        content: [{ type: "text" as const, text: `Available components (${all.length}):\n${list.join(", ")}\n\nComponents marked [renderable] can be rendered to SVG via renderChart. Others (Realtime*, Geo) require a browser environment.\n\nPass { component: '<name>' } to get the prop schema for a specific component.` }],
      }
    }

    const entry = schemaByComponent[component]
    if (!entry) {
      const available = Object.keys(schemaByComponent).sort()
      return {
        content: [{ type: "text" as const, text: `Unknown component "${component}". Available: ${available.join(", ")}` }],
        isError: true,
      }
    }

    const renderable = COMPONENT_REGISTRY[component] ? "This component can be rendered to SVG via renderChart." : "This component requires a browser environment and cannot be rendered via renderChart."
    return {
      content: [{ type: "text" as const, text: `${renderable}\n\n${JSON.stringify(entry, null, 2)}` }],
    }
  }
)

// ── suggestChart tool ───────────────────────────────────────────────────
// Analyzes a data sample and recommends appropriate chart types.
server.tool(
  "suggestChart",
  "Recommend Semiotic chart types for a given data sample. Pass { data: [...] } with 1-5 sample objects. Optionally pass { intent: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'geographic' | 'network' | 'hierarchy' } to narrow suggestions. Returns ranked recommendations with example props.",
  {},
  async (args: Record<string, unknown>) => {
    const data = args.data as any[] | undefined
    const intent = args.intent as string | undefined

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        content: [{ type: "text" as const, text: "Pass { data: [{ ... }, ...] } with 1-5 sample data objects. Optionally include intent: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'geographic' | 'network' | 'hierarchy'." }],
        isError: true,
      }
    }

    const sample = data[0]
    if (!sample || typeof sample !== "object") {
      return {
        content: [{ type: "text" as const, text: "Data items must be objects with key-value pairs." }],
        isError: true,
      }
    }

    const keys = Object.keys(sample)
    const suggestions: Array<{ component: string; confidence: string; reason: string; props: Record<string, string> }> = []

    // Classify fields
    const numericFields: string[] = []
    const stringFields: string[] = []
    const dateFields: string[] = []
    const geoFields: { lat?: string; lon?: string } = {}
    const networkFields: { source?: string; target?: string; value?: string } = {}
    const hierarchyFields: { children?: string; parent?: string } = {}

    for (const key of keys) {
      const values = data.map(d => d[key]).filter(v => v != null)
      if (values.length === 0) continue

      const first = values[0]
      if (typeof first === "number") {
        numericFields.push(key)
      } else if (typeof first === "string") {
        // Check for dates — require ISO-like pattern (YYYY-MM or YYYY/MM or YYYY-MM-DD, etc.)
        // to avoid false positives on 4-digit IDs like "1234"
        if (/^\d{4}[-/]\d{2}/.test(first) && !isNaN(Date.parse(first))) {
          dateFields.push(key)
        } else {
          stringFields.push(key)
        }
      }

      // Detect geo fields
      const kl = key.toLowerCase()
      if (kl === "lat" || kl === "latitude") geoFields.lat = key
      if (kl === "lon" || kl === "lng" || kl === "longitude") geoFields.lon = key

      // Detect network fields
      if (kl === "source" || kl === "from") networkFields.source = key
      if (kl === "target" || kl === "to") networkFields.target = key
      if (kl === "value" || kl === "weight" || kl === "amount") networkFields.value = key

      // Detect hierarchy fields
      if (kl === "children" || kl === "values") hierarchyFields.children = key
      if (kl === "parent") hierarchyFields.parent = key
    }

    const hasTime = dateFields.length > 0
    const hasCat = stringFields.length > 0
    const hasNum = numericFields.length > 0
    const hasGeo = geoFields.lat && geoFields.lon
    const hasNetwork = networkFields.source && networkFields.target
    const hasHierarchy = hierarchyFields.children || hierarchyFields.parent

    // Network data
    if (hasNetwork && (!intent || intent === "network")) {
      const src = networkFields.source!
      const tgt = networkFields.target!
      if (networkFields.value) {
        suggestions.push({
          component: "SankeyDiagram",
          confidence: "high",
          reason: `Data has ${src}→${tgt} with ${networkFields.value} — ideal for flow visualization`,
          props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"`, valueAccessor: `"${networkFields.value}"` },
        })
      }
      suggestions.push({
        component: "ForceDirectedGraph",
        confidence: networkFields.value ? "medium" : "high",
        reason: `Data has ${src}→${tgt} edges — force layout shows network structure. Nodes are auto-inferred from edges when not provided.`,
        props: { edges: "data", sourceAccessor: `"${src}"`, targetAccessor: `"${tgt}"` },
      })
    }

    // Hierarchy data
    if (hasHierarchy && (!intent || intent === "hierarchy")) {
      suggestions.push({
        component: "Treemap",
        confidence: "high",
        reason: `Data has nested ${hierarchyFields.children || "parent"} structure — treemap shows hierarchical proportions`,
        props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"`, ...(numericFields[0] ? { valueAccessor: `"${numericFields[0]}"` } : {}) },
      })
      suggestions.push({
        component: "TreeDiagram",
        confidence: "medium",
        reason: "Tree layout shows hierarchical relationships",
        props: { data: "rootObject", childrenAccessor: `"${hierarchyFields.children || "children"}"` },
      })
    }

    // Geographic data
    if (hasGeo && (!intent || intent === "geographic")) {
      const sizeField = numericFields.find(f => f !== geoFields.lat && f !== geoFields.lon)
      suggestions.push({
        component: "ProportionalSymbolMap",
        confidence: "high",
        reason: `Data has ${geoFields.lat}/${geoFields.lon} coordinates — map shows spatial distribution. Import from "semiotic/geo" (not renderable via renderChart — requires browser).`,
        props: { points: "data", xAccessor: `"${geoFields.lon}"`, yAccessor: `"${geoFields.lat}"`, ...(sizeField ? { sizeBy: `"${sizeField}"` } : {}) },
      })
      // Also suggest Scatterplot as a renderable alternative
      suggestions.push({
        component: "Scatterplot",
        confidence: "medium",
        reason: `Renderable alternative to ProportionalSymbolMap — plots ${geoFields.lon}/${geoFields.lat} as x/y coordinates`,
        props: { data: "data", xAccessor: `"${geoFields.lon}"`, yAccessor: `"${geoFields.lat}"`, ...(sizeField ? { sizeBy: `"${sizeField}"` } : {}) },
      })
    }

    // Time series
    if (hasTime && hasNum && (!intent || intent === "trend")) {
      const timeField = dateFields[0]
      const valueField = numericFields[0]
      suggestions.push({
        component: "LineChart",
        confidence: "high",
        reason: `Data has dates (${timeField}) and numeric values (${valueField}) — line chart shows trends over time`,
        props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, ...(hasCat ? { lineBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` } : {}) },
      })
      if (hasCat) {
        suggestions.push({
          component: "StackedAreaChart",
          confidence: "medium",
          reason: `Multiple categories (${stringFields[0]}) over time — stacked area shows composition trends`,
          props: { data: "data", xAccessor: `"${timeField}"`, yAccessor: `"${valueField}"`, areaBy: `"${stringFields[0]}"`, colorBy: `"${stringFields[0]}"` },
        })
      }
    }

    // Categorical + numeric
    if (hasCat && hasNum && (!intent || intent === "comparison" || intent === "composition" || intent === "distribution")) {
      const catField = stringFields[0]
      const valField = numericFields[0]

      if (!intent || intent === "comparison") {
        suggestions.push({
          component: "BarChart",
          confidence: hasTime ? "medium" : "high",
          reason: `Categorical field (${catField}) with values (${valField}) — bar chart for comparison`,
          props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
        })
      }

      if (stringFields.length >= 2 && (!intent || intent === "composition")) {
        suggestions.push({
          component: "StackedBarChart",
          confidence: "medium",
          reason: `Two categorical fields (${stringFields.join(", ")}) — stacked bar shows composition within categories`,
          props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"`, stackBy: `"${stringFields[1]}"` },
        })
      }

      if (data.length >= 10 && (!intent || intent === "distribution")) {
        suggestions.push({
          component: "Histogram",
          confidence: "medium",
          reason: `${data.length}+ data points — histogram shows value distribution`,
          props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
        })
      }

      if (!intent || intent === "composition") {
        const uniqueCats = new Set(data.map(d => d[catField])).size
        if (uniqueCats <= 8) {
          suggestions.push({
            component: "DonutChart",
            confidence: "medium",
            reason: `${uniqueCats} categories — donut chart shows proportional composition`,
            props: { data: "data", categoryAccessor: `"${catField}"`, valueAccessor: `"${valField}"` },
          })
        }
      }
    }

    // Two numeric fields → scatterplot
    if (numericFields.length >= 2 && (!intent || intent === "relationship")) {
      const xField = numericFields[0]
      const yField = numericFields[1]
      suggestions.push({
        component: "Scatterplot",
        confidence: "high",
        reason: `Two numeric fields (${xField}, ${yField}) — scatterplot shows relationships`,
        props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, ...(hasCat ? { colorBy: `"${stringFields[0]}"` } : {}), ...(numericFields[2] ? { sizeBy: `"${numericFields[2]}"` } : {}) },
      })

      if (numericFields.length >= 3) {
        suggestions.push({
          component: "BubbleChart",
          confidence: "medium",
          reason: `Three numeric fields — bubble chart adds size dimension to scatter`,
          props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${yField}"`, sizeBy: `"${numericFields[2]}"` },
        })
      }

      if (numericFields.length >= 2 && hasCat) {
        suggestions.push({
          component: "Heatmap",
          confidence: "medium",
          reason: `Numeric values across dimensions — heatmap shows density/intensity`,
          props: { data: "data", xAccessor: `"${xField}"`, yAccessor: `"${hasCat ? stringFields[0] : yField}"`, valueAccessor: `"${hasCat ? numericFields[0] : numericFields[2] || yField}"` },
        })
      }
    }

    // Fallback
    if (suggestions.length === 0) {
      const fieldSummary = `Fields: ${keys.join(", ")} (${numericFields.length} numeric, ${stringFields.length} categorical, ${dateFields.length} date)`
      return {
        content: [{ type: "text" as const, text: `Could not confidently recommend a chart type.\n\n${fieldSummary}\n\nTry providing intent ('comparison', 'trend', 'distribution', 'relationship', 'composition', 'geographic', 'network', 'hierarchy') to narrow recommendations, or use getSchema to browse available components.` }],
      }
    }

    // Format output
    const lines = suggestions.map((s, i) => {
      const propsStr = Object.entries(s.props).map(([k, v]) => `${k}=${v}`).join(" ")
      return `${i + 1}. **${s.component}** (${s.confidence} confidence)\n   ${s.reason}\n   \`<${s.component} ${propsStr} />\``
    })

    return {
      content: [{ type: "text" as const, text: lines.join("\n\n") }],
    }
  }
)

// ── renderChart tool ─────────────────────────────────────────────────────
// Generic tool that renders any Semiotic HOC chart to static SVG.
// Accepts { component, props } — the single entry point for all chart rendering.
const componentNames = Object.keys(COMPONENT_REGISTRY).sort()
server.tool(
  "renderChart",
  `Render any Semiotic chart to static SVG. Pass { component: '<name>', props: { ... } }. Returns SVG string or validation errors. Available components: ${componentNames.join(", ")}.`,
  {},
  async (args: Record<string, unknown>) => {
    const component = args.component as string
    let props: Record<string, any>
    if (args.props) {
      props = args.props as Record<string, any>
    } else {
      // Flatten shape: { component, data, ... } — strip component before forwarding
      const { component: _, ...rest } = args
      props = rest as Record<string, any>
    }

    if (!component) {
      return {
        content: [{ type: "text" as const, text: `Missing 'component' field. Provide { component: '<name>', props: { ... } }. Available: ${componentNames.join(", ")}` }],
        isError: true,
      }
    }

    if (!COMPONENT_REGISTRY[component]) {
      return {
        content: [{ type: "text" as const, text: `Unknown component "${component}". Available: ${componentNames.join(", ")}` }],
        isError: true,
      }
    }

    const result = renderHOCToSVG(component, props)
    if (result.error) {
      return {
        content: [{ type: "text" as const, text: result.error }],
        isError: true,
      }
    }
    return {
      content: [{ type: "text" as const, text: result.svg! }],
    }
  }
)

// ── diagnoseConfig tool ──────────────────────────────────────────────────
// Anti-pattern detector: checks for common failure modes and returns
// actionable fix instructions.
server.tool(
  "diagnoseConfig",
  "Diagnose a Semiotic chart configuration for common problems (empty data, bad dimensions, missing accessors, wrong data shape, etc). Pass { component: 'LineChart', props: { ... } }. Returns structured diagnoses with fix instructions.",
  {},
  async (args: Record<string, unknown>) => {
    const component = args.component as string
    let props: Record<string, any>
    if (args.props) {
      props = args.props as Record<string, any>
    } else {
      const { component: _, ...rest } = args
      props = rest as Record<string, any>
    }

    if (!component) {
      return {
        content: [{ type: "text" as const, text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
        isError: true,
      }
    }

    const result = diagnoseConfig(component, props)
    if (result.ok) {
      const warnings = result.diagnoses.filter(d => d.severity === "warning")
      const msg = warnings.length > 0
        ? `Configuration looks good with ${warnings.length} warning(s):\n${warnings.map(w => `⚠ [${w.code}] ${w.message}\n  Fix: ${w.fix}`).join("\n")}`
        : `✓ Configuration looks good — no issues detected.`
      return { content: [{ type: "text" as const, text: msg }] }
    }

    const lines = result.diagnoses.map(d => {
      const icon = d.severity === "error" ? "✗" : "⚠"
      const fixLine = d.fix ? `\n  Fix: ${d.fix}` : ""
      return `${icon} [${d.code}] ${d.message}${fixLine}`
    })
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      isError: true,
    }
  }
)

// ── reportIssue tool ─────────────────────────────────────────────────────
// Generates a pre-filled GitHub issue URL for bug reports or feature requests.
// The user (or AI agent) can open the URL to submit — no auth needed.
const REPO = "nteract/semiotic"

server.tool(
  "reportIssue",
  "Generate a GitHub issue URL for Semiotic bug reports or feature requests. Pass { title, body, labels? }. Returns a URL the user can open to submit. For rendering bugs, include the component name, props summary, and any diagnoseConfig output in the body.",
  {},
  async (args: Record<string, unknown>) => {
    const title = args.title as string
    const body = args.body as string
    const labels = args.labels as string[] | string | undefined

    if (!title) {
      return {
        content: [{ type: "text" as const, text: "Missing 'title' field. Provide { title: 'Bug: ...', body: '...', labels?: ['bug'] }." }],
        isError: true,
      }
    }

    const params = new URLSearchParams()
    params.set("title", title)
    if (body) params.set("body", body)
    if (labels) {
      const labelList = Array.isArray(labels) ? labels.join(",") : labels
      params.set("labels", labelList)
    }

    const url = `https://github.com/${REPO}/issues/new?${params.toString()}`
    return {
      content: [{ type: "text" as const, text: `Open this URL to submit the issue:\n\n${url}` }],
    }
  }
)

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error("MCP server error:", err)
  process.exit(1)
})

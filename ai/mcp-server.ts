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
 *
 * HTTP mode (for remote inspectors / web clients):
 *   npx semiotic-mcp --http --port 3001
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import * as fs from "fs"
import * as path from "path"
import * as http from "http"
import { renderHOCToSVG } from "./renderHOCToSVG"
import { COMPONENT_REGISTRY } from "./componentRegistry"
import { diagnoseConfig } from "semiotic/ai"

// Load schema.json for version info
const schemaPath = path.resolve(__dirname, "../schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))

// Build component name → schema lookup from schema.json
const schemaByComponent: Record<string, any> = {}
for (const tool of schema.tools) {
  schemaByComponent[tool.function.name] = tool.function
}

const componentNames = Object.keys(COMPONENT_REGISTRY).sort()
const REPO = "nteract/semiotic"

// ── Tool handlers ────────────────────────────────────────────────────────
// Extracted as named functions so both stdio and HTTP server instances share them.

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean }

async function getSchemaHandler(args: { component?: string }): Promise<ToolResult> {
  const component = args.component

  if (!component) {
    const all = Object.keys(schemaByComponent).sort()
    const renderable = new Set(Object.keys(COMPONENT_REGISTRY))
    const list = all.map(name => renderable.has(name) ? `${name} [renderable]` : name)
    return {
      content: [{ type: "text" as const, text: `Available components (${all.length}):\n${list.join(", ")}\n\nComponents marked [renderable] can be rendered to SVG via renderChart (pass theme parameter for styled output). Others (Realtime*) require a browser environment.\n\nAll charts support CSS custom properties for theming (--semiotic-bg, --semiotic-text, --semiotic-grid, etc.) and <ThemeProvider>. Use COLOR_BLIND_SAFE_CATEGORICAL (import from semiotic) for accessible color palettes.\n\nPass { component: '<name>' } to get the prop schema for a specific component.` }],
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

  const renderableNote = COMPONENT_REGISTRY[component] ? "This component can be rendered to SVG via renderChart." : "This component requires a browser environment and cannot be rendered via renderChart."
  return {
    content: [{ type: "text" as const, text: `${renderableNote}\n\n${JSON.stringify(entry, null, 2)}` }],
  }
}

async function suggestChartHandler(args: { data?: any[]; intent?: string }): Promise<ToolResult> {
  const data = args.data
  const intent = args.intent

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
      if (/^\d{4}[-/]\d{2}/.test(first) && !isNaN(Date.parse(first))) {
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
      reason: `Data has ${geoFields.lat}/${geoFields.lon} coordinates — map shows spatial distribution`,
      props: { points: "data", xAccessor: `"${geoFields.lon}"`, yAccessor: `"${geoFields.lat}"`, ...(sizeField ? { sizeBy: `"${sizeField}"` } : {}) },
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

    if (!intent || intent === "distribution") {
      suggestions.push({
        component: "Histogram",
        confidence: "medium",
        reason: `Numeric distribution of ${valField} — histogram shows value spread`,
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

  // Theming guidance appended to every recommendation
  const themingTip = `\n---\n**Styling**: All charts respond to CSS custom properties on any ancestor element:\n\`\`\`css\n.my-theme {\n  --semiotic-bg: #fff;           /* chart background */\n  --semiotic-text: #333;         /* primary text */\n  --semiotic-text-secondary: #666; /* tick labels */\n  --semiotic-grid: #e0e0e0;      /* grid lines */\n  --semiotic-border: #e0e0e0;    /* axis lines, borders */\n  --semiotic-font-family: sans-serif;\n  --semiotic-tooltip-bg: rgba(0,0,0,0.85);\n  --semiotic-tooltip-text: white;\n  --semiotic-tooltip-radius: 6px;\n}\n\`\`\`\nOr use \`<ThemeProvider theme="dark">\` / \`<ThemeProvider theme={{ colors: {...}, typography: {...} }}>\`.\nFor accessibility, use \`colorScheme={COLOR_BLIND_SAFE_CATEGORICAL}\` (import from \`semiotic\`) — 8-color palette safe for all forms of color blindness.`

  return {
    content: [{ type: "text" as const, text: lines.join("\n\n") + themingTip }],
  }
}

async function renderChartHandler(args: { component?: string; props?: Record<string, any>; theme?: Record<string, string>; format?: string }): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}
  const theme = args.theme
  const format = args.format || "svg"

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

  let svg = result.svg!

  // Inject theme CSS custom properties into the SVG root element.
  // We add a <style> block inside the SVG rather than wrapping in a <div>,
  // because sharp requires pure SVG input for PNG rasterization.
  if (theme && Object.keys(theme).length > 0) {
    const validVars = Object.entries(theme)
      .filter(([k]) => k.startsWith("--semiotic-"))
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")
    if (validVars) {
      svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>:root { ${validVars} }</style>`)
    }
  }

  // PNG rasterization via sharp (optional dependency)
  if (format === "png") {
    try {
      // Dynamic import — sharp is an optional dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharpMod = await (Function('return import("sharp")')() as Promise<any>)
      const sharpFn = sharpMod.default || sharpMod
      const pngBuffer: Buffer = await sharpFn(Buffer.from(svg)).png().toBuffer()
      const base64 = pngBuffer.toString("base64")
      return {
        content: [{ type: "text" as const, text: `data:image/png;base64,${base64}` }],
      }
    } catch (err: any) {
      if (err.code === "MODULE_NOT_FOUND" || err.code === "ERR_MODULE_NOT_FOUND") {
        return {
          content: [{ type: "text" as const, text: `PNG output requires the 'sharp' package. Install it with: npm install sharp\n\nFalling back to SVG output:\n\n${svg}` }],
        }
      }
      return {
        content: [{ type: "text" as const, text: `PNG conversion failed: ${err.message}\n\nSVG output:\n\n${svg}` }],
        isError: true,
      }
    }
  }

  return {
    content: [{ type: "text" as const, text: svg }],
  }
}

async function diagnoseConfigHandler(args: { component?: string; props?: Record<string, any> }): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}

  if (!component) {
    return {
      content: [{ type: "text" as const, text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
      isError: true,
    }
  }

  const result = diagnoseConfig(component, props)
  if (result.ok) {
    const warnings = result.diagnoses.filter((d: any) => d.severity === "warning")
    const msg = warnings.length > 0
      ? `Configuration looks good with ${warnings.length} warning(s):\n${warnings.map((w: any) => `⚠ [${w.code}] ${w.message}\n  Fix: ${w.fix}`).join("\n")}`
      : `✓ Configuration looks good — no issues detected.`
    return { content: [{ type: "text" as const, text: msg }] }
  }

  const lines = result.diagnoses.map((d: any) => {
    const icon = d.severity === "error" ? "✗" : "⚠"
    const fixLine = d.fix ? `\n  Fix: ${d.fix}` : ""
    return `${icon} [${d.code}] ${d.message}${fixLine}`
  })
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  }
}

async function reportIssueHandler(args: { title?: string; body?: string; labels?: string[] | string }): Promise<ToolResult> {
  const title = args.title
  const body = args.body
  const labels = args.labels

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

// Named theme presets (inlined to avoid runtime dependency on semiotic-themes bundle)
const THEME_PRESET_NAMES = [
  "light", "dark", "high-contrast",
  "pastels", "pastels-dark",
  "bi-tool", "bi-tool-dark",
  "italian", "italian-dark",
  "tufte", "tufte-dark",
  "journalist", "journalist-dark",
  "playful", "playful-dark",
]

async function applyThemeHandler(args: { name?: string }): Promise<ToolResult> {
  const name = args.name

  if (!name) {
    return {
      content: [{ type: "text" as const, text: `Available theme presets:\n${THEME_PRESET_NAMES.join(", ")}\n\nPass { name: "tufte" } to get the CSS custom properties and ThemeProvider usage for that theme.\n\nLight-mode presets: ${THEME_PRESET_NAMES.filter(n => !n.includes("dark")).join(", ")}\nDark-mode presets: ${THEME_PRESET_NAMES.filter(n => n.includes("dark")).join(", ")}` }],
    }
  }

  if (!THEME_PRESET_NAMES.includes(name)) {
    return {
      content: [{ type: "text" as const, text: `Unknown theme "${name}". Available: ${THEME_PRESET_NAMES.join(", ")}` }],
      isError: true,
    }
  }

  const usage = [
    `## Theme: "${name}"`,
    "",
    "### Option 1: ThemeProvider (recommended)",
    "```jsx",
    `import { ThemeProvider } from "semiotic"`,
    `<ThemeProvider theme="${name}">`,
    `  <LineChart ... />`,
    `</ThemeProvider>`,
    "```",
    "",
    "### Option 2: Import the theme object",
    "```jsx",
    `import { ${name.replace(/-./g, c => c[1].toUpperCase()).replace(/^./, c => c.toUpperCase()).replace(/Dark$/, '_DARK').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()} } from "semiotic/themes"`,
    `<ThemeProvider theme={themeObject}>`,
    `  <BarChart ... />`,
    `</ThemeProvider>`,
    "```",
    "",
    "### Option 3: CSS custom properties (no React required)",
    "```jsx",
    `import { themeToCSS } from "semiotic/themes"`,
    `import { ${name.replace(/-./g, c => c[1].toUpperCase()).replace(/^./, c => c.toUpperCase()).replace(/Dark$/, '_DARK').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()} } from "semiotic/themes"`,
    `const css = themeToCSS(themeObject, ".my-charts")`,
    "// Outputs CSS custom properties string for embedding in a stylesheet",
    "```",
    "",
    "### Option 4: Design tokens JSON",
    "```jsx",
    `import { themeToTokens } from "semiotic/themes"`,
    `const tokens = themeToTokens(themeObject)`,
    "// Style Dictionary / DTCG-compatible token format",
    "```",
    "",
    "For accessibility, consider `\"high-contrast\"` which uses `COLOR_BLIND_SAFE_CATEGORICAL` (Wong 2011 palette).",
  ]

  return {
    content: [{ type: "text" as const, text: usage.join("\n") }],
  }
}

// ── Server factory ───────────────────────────────────────────────────────
// Creates a fresh McpServer with all tools registered.
// HTTP mode needs one instance per session (McpServer can only connect to one transport).
// Stdio mode uses a single instance.

function createServer(): McpServer {
  const srv = new McpServer({
    name: "semiotic",
    version: schema.version || "3.0.0",
  })

  srv.tool(
    "getSchema",
    `Return the prop schema for a Semiotic chart component. Pass { component: '<name>' } to get its props, or omit component to list all available components. Components marked [renderable] can be passed to renderChart for static SVG output.`,
    { component: z.string().optional().describe("Component name, e.g. 'LineChart'. Omit to list all.") },
    getSchemaHandler
  )

  srv.tool(
    "suggestChart",
    "Recommend Semiotic chart types for a given data sample. Pass { data: [...] } with 1-5 sample objects. Optionally pass intent to narrow suggestions. Returns ranked recommendations with example props.",
    {
      data: z.array(z.record(z.string(), z.unknown())).min(1).max(5).describe("1-5 sample data objects"),
      intent: z.enum(["comparison", "trend", "distribution", "relationship", "composition", "geographic", "network", "hierarchy"]).optional().describe("Visualization intent to narrow suggestions"),
    },
    suggestChartHandler
  )

  srv.tool(
    "renderChart",
    `Render a Semiotic chart to static SVG or PNG. Returns SVG string (default) or Base64-encoded PNG image. Optionally pass theme CSS custom properties (--semiotic-bg, --semiotic-text, etc.) to style the output. PNG requires the 'sharp' package to be installed. Available components: ${componentNames.join(", ")}.`,
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart', 'BarChart'"),
      props: z.record(z.string(), z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
      theme: z.record(z.string(), z.string()).optional().describe("CSS custom properties for theming, e.g. { '--semiotic-bg': '#1a1a2e', '--semiotic-text': '#ededed' }. Only --semiotic-* variables are applied."),
      format: z.enum(["svg", "png"]).optional().describe("Output format: 'svg' (default) returns SVG markup, 'png' returns a Base64-encoded PNG image. PNG requires the 'sharp' package."),
    },
    renderChartHandler
  )

  srv.tool(
    "diagnoseConfig",
    "Diagnose a Semiotic chart configuration for common problems (empty data, bad dimensions, missing accessors, wrong data shape, color contrast issues, etc). Checks WCAG color contrast ratios and suggests COLOR_BLIND_SAFE_CATEGORICAL for accessibility. Returns a human-readable diagnostic report with actionable fixes.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z.record(z.string(), z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
    },
    diagnoseConfigHandler
  )

  srv.tool(
    "reportIssue",
    "Generate a GitHub issue URL for Semiotic bug reports or feature requests. Returns a URL the user can open to submit. For rendering bugs, include the component name, props summary, and any diagnoseConfig output in the body.",
    {
      title: z.string().describe("Issue title, e.g. 'Bug: BarChart tooltip shows undefined'"),
      body: z.string().optional().describe("Issue body with details, reproduction steps, diagnoseConfig output"),
      labels: z.union([z.array(z.string()), z.string()]).optional().describe("GitHub labels, e.g. ['bug'] or 'bug'"),
    },
    reportIssueHandler
  )

  srv.tool(
    "applyTheme",
    `Get usage instructions for a named Semiotic theme preset. Returns ThemeProvider examples, CSS custom properties, and design token export patterns. Available themes: ${THEME_PRESET_NAMES.join(", ")}.`,
    {
      name: z.string().optional().describe("Theme preset name, e.g. 'tufte', 'pastels-dark', 'bi-tool'. Omit to list all available themes."),
    },
    applyThemeHandler
  )

  return srv
}

// ── Startup ──────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2)
const httpMode = cliArgs.includes("--http")
const portFlagIndex = cliArgs.indexOf("--port")
const parsedPort =
  portFlagIndex !== -1 && cliArgs[portFlagIndex + 1] != null
    ? parseInt(cliArgs[portFlagIndex + 1], 10)
    : NaN
const port = Number.isFinite(parsedPort) ? parsedPort : 3001

async function main() {
  if (httpMode) {
    // HTTP mode — session-based, one server+transport per session
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>()

    const httpServer = http.createServer(async (req, res) => {
      // CORS headers for browser-based inspectors
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id")
      res.setHeader("Access-Control-Expose-Headers", "mcp-session-id")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined

      if (sessionId && sessions.has(sessionId)) {
        // Existing session — route to its transport
        const session = sessions.get(sessionId)!
        await session.transport.handleRequest(req, res)
      } else if (!sessionId) {
        // New session — create server + transport
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => `semiotic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        })
        const srv = createServer()
        await srv.connect(transport)

        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid) sessions.delete(sid)
        }

        await transport.handleRequest(req, res)

        const sid = transport.sessionId
        if (sid) {
          sessions.set(sid, { server: srv, transport })
        }
      } else {
        // Session ID provided but not found — stale session
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Unknown session. Send a request without mcp-session-id to start a new session." }, id: null }))
      }
    })

    httpServer.listen(port, () => {
      console.error(`Semiotic MCP server (HTTP) listening on http://localhost:${port}`)
      console.error("Tools: getSchema, suggestChart, renderChart, diagnoseConfig, reportIssue")
    })
  } else {
    // Default: stdio mode for Claude Desktop, Claude Code, Cursor, etc.
    const srv = createServer()
    const transport = new StdioServerTransport()
    await srv.connect(transport)
  }
}

main().catch((err) => {
  console.error("MCP server error:", err)
  process.exit(1)
})

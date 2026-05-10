/**
 * Semiotic MCP Server
 *
 * Exposes six tools, four resources, and two prompts:
 *   1. renderChart — renders any HOC chart to static SVG
 *   2. diagnoseConfig — anti-pattern detector for chart configurations
 *   3. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
 *   4. getSchema — returns the prop schema for a specific component
 *   5. suggestChart — recommends chart types for a given data shape
 *   6. applyTheme — returns usage guidance for theme presets
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

const {
  componentIndexFromSchema,
  metadataForComponent,
} = require("./componentMetadata.cjs") as {
  componentIndexFromSchema: (schema: any) => {
    version?: string
    totalComponents: number
    renderableComponents: number
    browserOnlyComponents: number
    categories: Record<string, string[]>
    components: Array<{
      name: string
      category: string
      importPath: string
      renderable: boolean
      description?: string
    }>
  }
  metadataForComponent: (entryOrName: string | { name: string; description?: string }) => {
    name: string
    category: string
    importPath: string
    renderable: boolean
    description?: string
  }
}
const {
  formatSuggestionReport,
  suggestCharts,
} = require("./chartSuggestions.cjs") as {
  formatSuggestionReport: (result: SuggestChartResult) => string
  suggestCharts: (args: {
    data?: any[]
    intent?: string
    capabilities?: {
      push?: boolean
      linkedHover?: boolean
      ssr?: boolean
      selection?: boolean
      legend?: boolean
    }
  }) => SuggestChartResult
}
const {
  BEHAVIOR_CONTRACTS,
  behaviorContractsFor,
  dataRequiredForUsageMode,
  formatDoctorBehaviorContracts,
  normalizeUsageMode,
} = require("./behaviorContracts.cjs") as {
  BEHAVIOR_CONTRACTS: Array<Record<string, unknown>>
  dataRequiredForUsageMode: (component: string, usageMode?: string) => boolean
  behaviorContractsFor: (args: { component?: string; props?: Record<string, any> }) => Array<Record<string, unknown>>
  formatDoctorBehaviorContracts: (contracts: Array<Record<string, unknown>>) => string
  normalizeUsageMode: (usageMode?: string) => "static" | "push"
}

// Load schema.json for version info
const schemaPath = path.resolve(__dirname, "../schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))

// Build component name → schema lookup from schema.json
const schemaByComponent: Record<string, any> = {}
for (const tool of schema.tools) {
  schemaByComponent[tool.function.name] = tool.function
}

const allComponentNames = Object.keys(schemaByComponent).sort()
const componentNames = Object.keys(COMPONENT_REGISTRY).sort()
const REPO = "nteract/semiotic"

function aiFilePath(fileName: string): string {
  return path.resolve(__dirname, "..", fileName)
}

function readAIFile(fileName: string): string {
  return fs.readFileSync(aiFilePath(fileName), "utf-8")
}

function componentIndexJSON(): string {
  return JSON.stringify(componentIndexFromSchema(schema), null, 2)
}

function textResource(uri: URL, mimeType: string, text: string) {
  return {
    contents: [{
      uri: uri.href,
      mimeType,
      text,
    }],
  }
}

function promptMessage(text: string) {
  return {
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text,
      },
    }],
  }
}

// ── Tool handlers ────────────────────────────────────────────────────────
// Extracted as named functions so both stdio and HTTP server instances share them.

type SuggestChartResult =
  | { ok: false; error: string }
  | {
      ok: true
      intent?: string
      fieldSummary: string
      fields: Record<string, unknown>
      suggestions: Array<{
        component: string
        confidence: string
        reason: string
        setup?: string[]
        derivedData?: Record<string, unknown>
        props: Record<string, string>
      }>
    }

type ToolResult = {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
  structuredContent?: Record<string, unknown>
}

async function getSchemaHandler(args: { component?: string }): Promise<ToolResult> {
  const component = args.component

  if (!component) {
    const list = allComponentNames.map(name => metadataForComponent(name).renderable ? `${name} [renderable]` : name)
    return {
      content: [{ type: "text" as const, text: `Available components (${allComponentNames.length}):\n${list.join(", ")}\n\nComponents marked [renderable] can be rendered to SVG via renderChart (pass theme parameter for styled output). Others (Realtime*) require a browser environment.\n\nFor full agent context, read MCP resources: semiotic://schema, semiotic://components, semiotic://behavior-contracts, semiotic://system-prompt, semiotic://examples.\n\nAll charts support CSS custom properties for theming (--semiotic-bg, --semiotic-text, --semiotic-grid, etc.) and <ThemeProvider>. Use COLOR_BLIND_SAFE_CATEGORICAL (import from semiotic/themes) for accessible color palettes.\n\nPass { component: '<name>' } to get the prop schema for a specific component.` }],
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

  const renderableNote = metadataForComponent(component).renderable ? "This component can be rendered to SVG via renderChart." : "This component requires a browser environment and cannot be rendered via renderChart."
  const contracts = behaviorContractsFor({ component, props: {} })
  const contractText = contracts.length > 0
    ? `\n\nBehavior contracts:\n${JSON.stringify(contracts, null, 2)}`
    : ""
  return {
    content: [{ type: "text" as const, text: `${renderableNote}\n\n${JSON.stringify(entry, null, 2)}${contractText}` }],
  }
}

async function suggestChartHandler(args: {
  data?: any[]
  intent?: string
  capabilities?: { push?: boolean; linkedHover?: boolean; ssr?: boolean; selection?: boolean; legend?: boolean }
}): Promise<ToolResult> {
  const result = suggestCharts(args)
  const content = [{ type: "text" as const, text: formatSuggestionReport(result) }]
  if (!result.ok) {
    return { content, isError: true, structuredContent: result }
  }
  return { content, structuredContent: result }
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
    if (schemaByComponent[component]) {
      return {
        content: [{ type: "text" as const, text: `Component "${component}" is known but cannot be rendered via renderChart. It requires a browser/live environment. Renderable components: ${componentNames.join(", ")}` }],
        isError: true,
      }
    }

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

function filterUsageModeDiagnoses(component: string, usageMode: "static" | "push", diagnoses: any[]) {
  if (dataRequiredForUsageMode(component, usageMode)) return diagnoses
  return diagnoses.filter((d: any) =>
    d.code !== "VALIDATION" || d.message !== `"data" is required for ${component}.`
  )
}

async function diagnoseConfigHandler(args: { component?: string; props?: Record<string, any>; usageMode?: string }): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}
  const usageMode = normalizeUsageMode(args.usageMode)

  if (!component) {
    return {
      content: [{ type: "text" as const, text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
      isError: true,
    }
  }

  const result = diagnoseConfig(component, props)
  const diagnoses = filterUsageModeDiagnoses(component, usageMode, result.diagnoses)
  const ok = diagnoses.every((d: any) => d.severity === "warning")
  const usageModeNote = usageMode === "push"
    ? "Usage mode: push (data prop may be omitted; use a ref to push data).\n\n"
    : ""

  if (ok) {
    const warnings = diagnoses.filter((d: any) => d.severity === "warning")
    const msg = warnings.length > 0
      ? `Configuration looks good with ${warnings.length} warning(s):\n${warnings.map((w: any) => `⚠ [${w.code}] ${w.message}\n  Fix: ${w.fix}`).join("\n")}`
      : `✓ Configuration looks good — no issues detected.`
    const contracts = formatDoctorBehaviorContracts(behaviorContractsFor({ component, props }))
    return { content: [{ type: "text" as const, text: `${usageModeNote}${contracts ? `${msg}\n\n${contracts}` : msg}` }] }
  }

  const lines = diagnoses.map((d: any) => {
    const icon = d.severity === "error" ? "✗" : "⚠"
    const fixLine = d.fix ? `\n  Fix: ${d.fix}` : ""
    return `${icon} [${d.code}] ${d.message}${fixLine}`
  })
  return {
    content: [{ type: "text" as const, text: [
      usageModeNote.trim(),
      lines.join("\n"),
      formatDoctorBehaviorContracts(behaviorContractsFor({ component, props })),
    ].filter(Boolean).join("\n\n") }],
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

  srv.registerResource(
    "semiotic-schema",
    "semiotic://schema",
    {
      title: "Semiotic Component Schema",
      description: "Machine-readable JSON schema for all Semiotic AI chart components.",
      mimeType: "application/json",
    },
    (uri) => textResource(uri, "application/json", JSON.stringify(schema, null, 2))
  )

  srv.registerResource(
    "semiotic-components",
    "semiotic://components",
    {
      title: "Semiotic Component Index",
      description: "Renderable/browser-only component index with MCP categories.",
      mimeType: "application/json",
    },
    (uri) => textResource(uri, "application/json", componentIndexJSON())
  )

  srv.registerResource(
    "semiotic-behavior-contracts",
    "semiotic://behavior-contracts",
    {
      title: "Semiotic AI Behavior Contracts",
      description: "Agent-visible semantic rules for color precedence, required prop combinations, streaming refs, and renderability.",
      mimeType: "application/json",
    },
    (uri) => textResource(uri, "application/json", JSON.stringify({
      version: schema.version,
      contracts: BEHAVIOR_CONTRACTS,
    }, null, 2))
  )

  srv.registerResource(
    "semiotic-system-prompt",
    "semiotic://system-prompt",
    {
      title: "Semiotic AI System Prompt",
      description: "Compact implementation guidance for AI assistants building with Semiotic.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, "text/markdown", readAIFile("system-prompt.md"))
  )

  srv.registerResource(
    "semiotic-examples",
    "semiotic://examples",
    {
      title: "Semiotic AI Examples",
      description: "Copy-paste examples for common Semiotic chart data shapes.",
      mimeType: "text/markdown",
    },
    (uri) => textResource(uri, "text/markdown", readAIFile("examples.md"))
  )

  srv.registerPrompt(
    "build-semiotic-chart",
    {
      title: "Build a Semiotic chart",
      description: "Workflow for choosing a chart, validating props, and rendering a preview.",
      argsSchema: {
        intent: z.string().optional().describe("Visualization intent, e.g. trend, comparison, distribution, relationship, composition, network, hierarchy."),
        dataDescription: z.string().optional().describe("Brief description of the data fields and sample rows."),
        component: z.string().optional().describe("Optional preferred Semiotic component name."),
      },
    },
    (args) => promptMessage([
      "Build a production-ready Semiotic visualization.",
      "",
      `Intent: ${args.intent || "not specified"}`,
      `Data: ${args.dataDescription || "not specified"}`,
      `Preferred component: ${args.component || "not specified"}`,
      "",
      "Use this MCP workflow:",
      "1. Read semiotic://system-prompt for compact API rules and pitfalls.",
      "2. Read semiotic://behavior-contracts for semantic rules that schema shape alone cannot express.",
      "3. If no component is specified, call suggestChart with 1-5 representative sample rows and the intent.",
      "4. Call getSchema for the selected component before writing JSX or renderChart props.",
      "5. Call diagnoseConfig with usageMode=\"static\" for renderChart/static data, or usageMode=\"push\" for ref-based React code that intentionally omits data.",
      "6. Fix all diagnoseConfig errors before presenting code.",
      "7. If the component is renderable and has static data, call renderChart once to verify it returns SVG.",
      "8. Prefer sub-path imports such as semiotic/xy, semiotic/ordinal, semiotic/network, semiotic/geo, or semiotic/ai depending on the surrounding code.",
      "",
      "Return the final JSX or renderChart call plus any assumptions about fields, accessors, or aggregation.",
    ].join("\n"))
  )

  srv.registerPrompt(
    "debug-semiotic-chart",
    {
      title: "Debug a Semiotic chart",
      description: "Workflow for diagnosing bad props, rendering failures, and chart-quality issues.",
      argsSchema: {
        component: z.string().optional().describe("Semiotic component name, e.g. BarChart."),
        problem: z.string().optional().describe("Observed failure, warning, or visual issue."),
        props: z.string().optional().describe("Relevant chart props as JSON or a short summary."),
      },
    },
    (args) => promptMessage([
      "Debug this Semiotic chart with the MCP server.",
      "",
      `Component: ${args.component || "not specified"}`,
      `Problem: ${args.problem || "not specified"}`,
      `Props: ${args.props || "not provided"}`,
      "",
      "Use this MCP workflow:",
      "1. Call getSchema for the component and compare the provided props against required props and accessor names.",
      "2. Read semiotic://behavior-contracts for semantic rules around colors, required combinations, streaming refs, and renderability.",
      "3. Call diagnoseConfig with usageMode=\"push\" if the code intentionally omits data for a ref-push HOC; otherwise use usageMode=\"static\".",
      "4. Treat diagnoseConfig errors as blockers and warnings as review items.",
      "5. If renderable and static data is available, call renderChart with a minimal reproduction to separate configuration issues from rendering bugs.",
      "6. Check semiotic://examples for a nearby working pattern before inventing new props.",
      "7. If the result looks like a Semiotic bug, call reportIssue with the component, props summary, diagnoseConfig output, and renderChart result.",
      "",
      "Return the smallest safe fix first, then mention any follow-up cleanup or issue-reporting step.",
    ].join("\n"))
  )

  srv.tool(
    "getSchema",
    `Return the prop schema for a Semiotic chart component. Pass { component: '<name>' } to get its props, or omit component to list all available components. Components marked [renderable] can be passed to renderChart for static SVG output.`,
    { component: z.string().optional().describe("Component name, e.g. 'LineChart'. Omit to list all.") },
    getSchemaHandler
  )

  srv.tool(
    "suggestChart",
    "Recommend Semiotic chart types for a given data sample. Pass { data: [...] } with 1-5 sample objects. Optionally pass intent to narrow suggestions, or capabilities to require/forbid features (push API, linked hover, SSR, selection, legend). Returns ranked recommendations with example props; charts that don't satisfy the capability constraints are dropped.",
    {
      data: z.array(z.record(z.string(), z.unknown())).min(1).max(5).describe("1-5 sample data objects"),
      intent: z.enum(["comparison", "trend", "distribution", "relationship", "composition", "geographic", "network", "hierarchy"]).optional().describe("Visualization intent to narrow suggestions"),
      capabilities: z.object({
        push: z.boolean().optional().describe("Require ref-based push API (live streaming via ref.current.push())"),
        linkedHover: z.boolean().optional().describe("Require cross-chart linked hover support"),
        ssr: z.boolean().optional().describe("Require server-side rendering via renderChart()"),
        selection: z.boolean().optional().describe("Require named selection / cross-filter support"),
        legend: z.boolean().optional().describe("Require a top-level legend"),
      }).optional().describe("Capability constraints — set a key to true to require, false to forbid. Unset keys are ignored."),
    },
    suggestChartHandler
  )

  srv.tool(
    "renderChart",
    `Render a Semiotic chart to static SVG or PNG. This is a static snapshot path: props must include data immediately, and ref/push-mode charts cannot be rendered through this tool. Returns SVG string (default) or Base64-encoded PNG image. Optionally pass theme CSS custom properties (--semiotic-bg, --semiotic-text, etc.) to style the output. PNG requires the 'sharp' package to be installed. Available components: ${componentNames.join(", ")}.`,
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
    "Diagnose a Semiotic chart configuration for common problems (empty data, bad dimensions, missing accessors, wrong data shape, color contrast issues, etc). Pass usageMode='push' for ref-based React HOCs that intentionally omit data; omit usageMode or pass 'static' for renderChart/MCP/server configs where data is required. Checks WCAG color contrast ratios and suggests COLOR_BLIND_SAFE_CATEGORICAL for accessibility. Returns a human-readable diagnostic report with actionable fixes.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z.record(z.string(), z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
      usageMode: z.enum(["static", "push", "renderChart", "server"]).optional().describe("Validation mode. Use 'push' for ref-based React HOCs that omit data; use 'static' or omit for renderChart/MCP/static data configs."),
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
      console.error("Tools: getSchema, suggestChart, renderChart, diagnoseConfig, reportIssue, applyTheme")
      console.error("Resources: semiotic://schema, semiotic://components, semiotic://behavior-contracts, semiotic://system-prompt, semiotic://examples")
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

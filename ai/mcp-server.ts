/**
 * Semiotic MCP Server
 *
 * Exposes fifteen tools, five resources, and two prompts:
 *   1. getSchema — returns the prop schema for a specific component
 *   2. suggestChart — legacy sample-row chart recommender
 *   3. suggestCharts — capability-based static chart recommender (audience-aware, incl. receivability)
 *   4. proposeChartVariants — ranks variants/alternatives for a selected chart
 *   5. suggestStreamCharts — realtime chart recommender from a stream schema
 *   6. suggestDashboard — multi-panel dashboard recommender
 *   7. suggestStretchCharts — audience-literacy stretch recommender
 *   8. repairChartConfig — checks a chart choice and proposes alternatives
 *   9. renderChart — renders static HOC charts to SVG/PNG
 *   10. interrogateChart — summarizes chart data for conversational answers
 *   11. groundChart — agent-reader grounding payload (description + intent + structure)
 *   12. diagnoseConfig — anti-pattern detector for chart configurations
 *   13. auditAccessibility — Chartability accessibility audit
 *   14. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
 *   15. applyTheme — returns usage guidance for theme presets
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
import { renderChartWithEvidence } from "semiotic/server"
import {
  diagnoseConfig,
  auditAccessibility,
  formatAccessibilityAudit,
  summarizeData,
  suggestCharts as suggestChartsFromCapabilities,
  repairChartConfig as repairChartConfigFromCapabilities,
  suggestDashboard as suggestDashboardFromCapabilities,
  suggestStreamCharts as suggestStreamChartsFromCapabilities,
  suggestStretchCharts as suggestStretchChartsFromCapabilities,
  buildReaderGrounding,
  countNodes,
  getCapability,
  profileData,
  proposeVariant,
  evaluateVariantProposal,
} from "semiotic/ai"
import type { IntentId, StreamSchema, AudienceProfile, ChartDataProfile, VariantProposal } from "semiotic/ai"

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

  // Render evidence — ground truth about what the chart actually contains
  // (mark counts by type, resolved domains, emptiness, annotation count),
  // computed from the rendered scene graph. When the component has a server
  // render config, the returned SVG is taken from the SAME
  // renderChartWithEvidence call, so the evidence and the SVG are guaranteed
  // to describe one render. Components without a server render config (a
  // handful of MCP-renderable charts) keep the React-SSR SVG from
  // renderHOCToSVG above — which also already ran prop validation — and
  // simply omit the evidence block.
  let evidenceBlock: { type: "text"; text: string } | null = null
  try {
    const { svg: evidenceSvg, evidence } = renderChartWithEvidence(component as never, props)
    svg = evidenceSvg
    evidenceBlock = {
      type: "text" as const,
      text: `Render evidence:\n${JSON.stringify(evidence, null, 2)}`,
    }
  } catch {
    // No server render config for this component — evidence unavailable.
  }

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
        content: [
          { type: "text" as const, text: `data:image/png;base64,${base64}` },
          ...(evidenceBlock ? [evidenceBlock] : []),
        ],
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
    content: [
      { type: "text" as const, text: svg },
      ...(evidenceBlock ? [evidenceBlock] : []),
    ],
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

async function auditAccessibilityHandler(args: { component?: string; props?: Record<string, any>; inChartContainer?: boolean; describe?: boolean; navigable?: boolean }): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}

  if (!component) {
    return {
      content: [{ type: "text" as const, text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
      isError: true,
    }
  }

  const result = auditAccessibility(component, props, { inChartContainer: args.inChartContainer === true, describe: args.describe === true, navigable: args.navigable === true })
  return {
    content: [{ type: "text" as const, text: formatAccessibilityAudit(result) }],
    // Only block on provable critical failures; warnings/manual items are advisory.
    isError: !result.ok,
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

function profileInputFromVariantArgs(args: {
  data?: unknown[]
  props?: Record<string, unknown>
}): { data: Record<string, unknown>[]; rawInput?: unknown } {
  const props = args.props ?? {}
  if (Array.isArray(args.data)) {
    return { data: args.data as Record<string, unknown>[] }
  }
  if (Array.isArray(props.data)) {
    return { data: props.data as Record<string, unknown>[] }
  }
  if (Array.isArray(props.nodes) && (Array.isArray(props.edges) || Array.isArray(props.links))) {
    return {
      data: [],
      rawInput: {
        nodes: props.nodes,
        edges: props.edges ?? props.links,
      },
    }
  }
  if (props.data && typeof props.data === "object" && !Array.isArray(props.data)) {
    return { data: [], rawInput: props.data }
  }
  return { data: [] }
}

function buildVariantProposalProps(
  proposal: VariantProposal,
  profile: ChartDataProfile,
  audience?: AudienceProfile
): Record<string, unknown> {
  if (proposal.buildProps) return proposal.buildProps(profile, audience)
  const capability = getCapability(proposal.baseComponent)
  const variant = proposal.variantKey
    ? capability?.variants?.find((v) => v.key === proposal.variantKey)
    : undefined
  return capability ? capability.buildProps(profile, variant) : {}
}

async function proposeChartVariantsHandler(args: {
  component: string
  props?: Record<string, unknown>
  data?: unknown[]
  intent?: string | string[]
  maxResults?: number
  audience?: AudienceProfile
}): Promise<ToolResult> {
  const { component, intent, maxResults, audience } = args
  const capability = getCapability(component)
  if (!capability) {
    return {
      content: [{ type: "text", text: `No chart capability registered for "${component}". Call suggestCharts first to pick from known capability components.` }],
      isError: true,
    }
  }

  const { data, rawInput } = profileInputFromVariantArgs(args)
  const profile = profileData(data, { rawInput })
  const intentArg = (Array.isArray(intent) ? intent : intent ? [intent] : undefined) as
    | IntentId[]
    | undefined
  const fitReason = capability.fits(profile)
  const proposals = proposeVariant(component, capability, {
    profile,
    audience,
    intent: intentArg,
    existingVariants: capability.variants,
  })

  const ranked = proposals
    .map((proposal) => {
      const score = evaluateVariantProposal(proposal, profile, audience, {
        intent: intentArg,
        baselineComponent: component,
      })
      // `proposal.buildProps` is a function; MCP structuredContent must be
      // JSON-serializable, so strip it (and any future non-serializable
      // fields) here. The executable output lives in the computed `props`.
      const { buildProps: _buildProps, ...proposalMeta } = proposal
      return {
        proposal: proposalMeta,
        score,
        props: buildVariantProposalProps(proposal, profile, audience),
      }
    })
    .sort((a, b) => {
      if (b.score.fit !== a.score.fit) return b.score.fit - a.score.fit
      if (a.score.risk !== b.score.risk) return a.score.risk - b.score.risk
      return b.score.novelty - a.score.novelty
    })
    .slice(0, maxResults ?? 8)

  const lines: string[] = [
    `${ranked.length} variant proposal${ranked.length === 1 ? "" : "s"} for ${component}${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}:`,
    ...(fitReason ? [`Base chart fit warning: ${fitReason}`] : []),
    "",
    ...ranked.map((entry, i) => {
      const label = entry.proposal.label ?? entry.proposal.variantKey ?? entry.proposal.id
      const tags = entry.proposal.tags?.length ? ` [${entry.proposal.tags.join(", ")}]` : ""
      const reasons = entry.score.reasons.length ? `\n   ${entry.score.reasons.join("; ")}` : ""
      return `${i + 1}. ${entry.proposal.baseComponent} / ${label}${tags} (fit ${entry.score.fit.toFixed(1)}/5, novelty ${entry.score.novelty.toFixed(2)}, risk ${entry.score.risk.toFixed(2)})${reasons}`
    }),
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: {
      component,
      profile: {
        rowCount: profile.rowCount,
        primary: profile.primary,
        categoryCount: profile.categoryCount ?? null,
        seriesCount: profile.seriesCount ?? null,
        hasHierarchy: profile.hasHierarchy,
        hasNetwork: profile.hasNetwork,
        hasGeo: profile.hasGeo,
      },
      fitReason,
      proposals: ranked,
    },
  }
}

async function suggestChartsHandler(args: {
  data: unknown[]
  intent?: string | string[]
  maxResults?: number
  allow?: string[]
  deny?: string[]
  audience?: AudienceProfile
}): Promise<ToolResult> {
  const { data, intent, maxResults, allow, deny, audience } = args
  const intentArg = (Array.isArray(intent) ? intent : intent ? [intent] : undefined) as
    | IntentId[]
    | undefined

  const suggestions = suggestChartsFromCapabilities(data as Record<string, unknown>[], {
    intent: intentArg,
    allow,
    deny,
    maxResults: maxResults ?? 8,
    audience,
  })

  const lines: string[] = [
    `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} for ${(data as unknown[]).length} rows${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}:`,
    "",
    ...suggestions.map((s, i) => {
      const variantTag = s.variant ? ` / ${s.variant.label}` : ""
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      const caveats = s.caveats.length ? `\n   caveats: ${s.caveats.join("; ")}` : ""
      return `${i + 1}. ${s.component}${variantTag} (score ${s.score.toFixed(1)}/5, familiarity ${s.rubric.familiarity}, accuracy ${s.rubric.accuracy})${reasons}${caveats}`
    }),
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { suggestions },
  }
}

async function suggestStreamChartsHandler(args: {
  schema: StreamSchema
  intent?: string | string[]
  maxResults?: number
}): Promise<ToolResult> {
  const { schema, intent, maxResults } = args
  const intentArg = (Array.isArray(intent) ? intent : intent ? [intent] : undefined) as
    | IntentId[]
    | undefined

  const suggestions = suggestStreamChartsFromCapabilities(schema, {
    intent: intentArg,
    maxResults: maxResults ?? 8,
  })

  const lines: string[] = [
    `${suggestions.length} stream chart suggestion${suggestions.length === 1 ? "" : "s"}${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}`,
    ...(schema.throughput ? [`throughput: ${schema.throughput}`] : []),
    ...(schema.retention ? [`retention: ${schema.retention}`] : []),
    "",
    ...suggestions.map((s, i) => {
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      const caveats = s.caveats.length ? `\n   caveats: ${s.caveats.join("; ")}` : ""
      return `${i + 1}. ${s.component} (score ${s.score.toFixed(1)}/5)${reasons}${caveats}`
    }),
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { suggestions, schema },
  }
}

async function suggestDashboardHandler(args: {
  data: unknown[]
  intents?: string[]
  maxPanels?: number
  diversifyByFamily?: boolean
  audience?: AudienceProfile
}): Promise<ToolResult> {
  const { data, intents, maxPanels, diversifyByFamily, audience } = args
  const dashboard = suggestDashboardFromCapabilities(data as Record<string, unknown>[], {
    intents: intents as IntentId[] | undefined,
    maxPanels: maxPanels ?? 6,
    diversifyByFamily: diversifyByFamily !== false,
    audience,
  })

  const lines: string[] = []
  lines.push(`Dashboard: ${dashboard.panels.length} panels covering ${dashboard.intentsCovered.join(", ") || "—"}`)
  if (dashboard.intentsMissing.length) {
    lines.push(`Intents this data couldn't fill: ${dashboard.intentsMissing.join(", ")}`)
  }
  lines.push("")
  for (let i = 0; i < dashboard.panels.length; i++) {
    const { intent, suggestion } = dashboard.panels[i]
    const variantTag = suggestion.variant ? ` / ${suggestion.variant.label}` : ""
    lines.push(`${i + 1}. [${intent}] ${suggestion.component}${variantTag} (score ${suggestion.score.toFixed(1)}/5)`)
    if (suggestion.reasons.length) lines.push(`   ${suggestion.reasons.join("; ")}`)
  }
  if (dashboard.stretchPanels.length > 0) {
    lines.push("")
    lines.push(`Stretch picks (audience-unfamiliar but fitting):`)
    for (const stretch of dashboard.stretchPanels) {
      const variantTag = stretch.suggestion.variant ? ` / ${stretch.suggestion.variant.label}` : ""
      lines.push(`  ${stretch.suggestion.component}${variantTag} (familiarity ${stretch.familiarity}) — ${stretch.rationale}`)
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: dashboard as unknown as Record<string, unknown>,
  }
}

async function suggestStretchChartsHandler(args: {
  data: unknown[]
  audience: AudienceProfile
  intent?: string | string[]
  maxResults?: number
}): Promise<ToolResult> {
  const { data, audience, intent, maxResults } = args
  const intentArg = (Array.isArray(intent) ? intent : intent ? [intent] : undefined) as
    | IntentId[]
    | undefined

  const stretches = suggestStretchChartsFromCapabilities(data as Record<string, unknown>[], {
    audience,
    intent: intentArg,
    maxResults: maxResults ?? 5,
  })

  const lines: string[] = [
    `${stretches.length} stretch pick${stretches.length === 1 ? "" : "s"} for "${audience.name ?? "audience"}":`,
    "",
    ...stretches.map((s, i) => {
      const variantTag = s.suggestion.variant ? ` / ${s.suggestion.variant.label}` : ""
      const replacing = s.replacing ? ` (could replace ${s.replacing})` : ""
      return `${i + 1}. ${s.suggestion.component}${variantTag} (familiarity ${s.familiarity}/5)${replacing}\n   ${s.rationale}`
    }),
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { stretches, audience: audience.name ?? null },
  }
}

async function repairChartConfigHandler(args: {
  component: string
  data: unknown[]
  intent?: string | string[]
  maxAlternatives?: number
}): Promise<ToolResult> {
  const { component, data, intent, maxAlternatives } = args
  const intentArg = (Array.isArray(intent) ? intent : intent ? [intent] : undefined) as
    | IntentId[]
    | undefined

  const result = repairChartConfigFromCapabilities(component, data as Record<string, unknown>[], {
    intent: intentArg,
    maxAlternatives: maxAlternatives ?? 3,
  })

  const lines: string[] = []
  if (result.status === "ok") {
    lines.push(`✅ ${component} fits this dataset — no repair needed.`)
  } else if (result.status === "alternative") {
    lines.push(`⚠ ${component} doesn't fit: ${result.reason}`)
    lines.push("")
    lines.push(`Alternatives that fit${intentArg ? ` (ranked by intent: ${intentArg.join(", ")})` : ""}:`)
    for (let i = 0; i < result.alternatives.length; i++) {
      const s = result.alternatives[i]
      const variantTag = s.variant ? ` / ${s.variant.label}` : ""
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      lines.push(`${i + 1}. ${s.component}${variantTag} (score ${s.score.toFixed(1)}/5)${reasons}`)
    }
  } else {
    lines.push(`❓ No capability registered for "${component}". Closest matches:`)
    for (let i = 0; i < result.alternatives.length; i++) {
      const s = result.alternatives[i]
      lines.push(`${i + 1}. ${s.component} (${s.family}, score ${s.score.toFixed(1)}/5)`)
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: result as unknown as Record<string, unknown>,
  }
}

async function interrogateChartHandler(args: {
  component: string
  props: Record<string, unknown>
  query?: string
}): Promise<ToolResult> {
  const { component, props, query } = args
  const data = (props.data as unknown[]) || (props.nodes as unknown[]) || []
  const summary = summarizeData(data as Record<string, unknown>[])

  const content: Array<{ type: "text"; text: string }> = [
    { type: "text", text: `Statistical summary for ${component}:\n${JSON.stringify(summary, null, 2)}` },
  ]

  if (query) {
    content.push({
      type: "text",
      text: `User Question: "${query}"\n\nContextual instructions:\n1. Analyze the statistical summary to answer the question.\n2. Return a natural language response.\n3. Optionally suggest a JSON array of Semiotic annotations to visually highlight the answer on the chart (e.g. { type: "callout", x: "Mar", y: 1500, label: "Peak month" }).\n4. Use the accessor names from the provided props (e.g. xAccessor, yAccessor).`,
    })
  }

  return { content, structuredContent: { summary, component, props } }
}

async function groundChartHandler(args: {
  component?: string
  props?: Record<string, unknown>
}): Promise<ToolResult> {
  const component = args.component
  const props = args.props ?? {}
  if (!component) {
    return {
      content: [{ type: "text" as const, text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }." }],
      isError: true,
    }
  }

  // The registered capability supplies the L4 communicative act; absent one,
  // buildReaderGrounding falls back to the component's family.
  const capability = getCapability(component)
  const grounding = buildReaderGrounding(component, props, { capability })
  const nodeCount = grounding.structure ? countNodes(grounding.structure) : 0

  const lines: string[] = [
    `Reader grounding for ${component} — the payload an agent reads to interpret this chart without seeing it:`,
    "",
    `L1–L3 (description): ${grounding.description.text}`,
    grounding.intent
      ? `L4 (intent · ${grounding.intent.act}): ${grounding.intent.sentence}`
      : "L4 (intent): not resolved (no capability for this component).",
    "",
    `Structure: ${nodeCount} navigable node(s) (chart → axes/series → datum) in structuredContent.structure.`,
    "",
    "Combined text:",
    grounding.text,
  ]

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    structuredContent: grounding as unknown as Record<string, unknown>,
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
      "3. If no component is specified, call suggestCharts with representative rows and the intent.",
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
        // `.strict()` so the MCP surface rejects unknown capability
        // keys at the schema layer rather than silently stripping
        // them — keeps the cjs-level "Unknown capability key(s)"
        // validation from being unreachable from MCP callers.
      }).strict().optional().describe("Capability constraints — set a key to true to require, false to forbid. Unset keys are ignored."),
    },
    suggestChartHandler
  )

  srv.tool(
    "renderChart",
    `Render a Semiotic chart to static SVG or PNG. This is a static snapshot path: props must include data immediately, and ref/push-mode charts cannot be rendered through this tool. Returns SVG string (default) or Base64-encoded PNG image, plus a "Render evidence" JSON block (mark counts by type, resolved axis domains, empty flag, annotation count, accessible name) — read the evidence instead of parsing the SVG to verify the chart actually rendered data marks. Optionally pass theme CSS custom properties (--semiotic-bg, --semiotic-text, etc.) to style the output. PNG requires the 'sharp' package to be installed. Available components: ${componentNames.join(", ")}.`,
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
    "auditAccessibility",
    "Audit a Semiotic chart configuration against the Chartability (POUR-CAF) accessibility framework — Perceivable, Operable, Understandable, Robust, Compromising, Assistive, Flexible. Statically grades the config (no DOM/AT): credits the built-ins every HOC ships (keyboard nav, focus ring, skip link, screen-reader data table, reduced-motion + forced-colors, shareable state), flags author-actionable gaps (missing title/description/summary, low contrast, small text, color-only encoding, undescribed trends, data density), and routes everything that needs real assistive-technology testing to a 'manual' item. Returns a per-principle report with the 14 critical heuristics marked. Pass inChartContainer=true to credit data-download/share affordances. Pair with manual NVDA/JAWS/VoiceOver testing — Chartability is not a pass/fail certification.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z.record(z.string(), z.unknown()).optional().describe("Chart props object, e.g. { data: [...], xAccessor: 'x', title: '...' }."),
      inChartContainer: z.boolean().optional().describe("True if the chart is (or will be) wrapped in a ChartContainer exposing data-download/copy-config actions."),
      describe: z.boolean().optional().describe("True if ChartContainer's describe option (auto-generated L1–L3 description via describeChart) is enabled — passes the 'features described' heuristic."),
      navigable: z.boolean().optional().describe("True if ChartContainer's navigable option (structured navigation tree via buildNavigationTree) is enabled — passes the 'navigable structure' heuristic."),
    },
    auditAccessibilityHandler
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

  srv.tool(
    "interrogateChart",
    "Conversational interrogation of a Semiotic chart. Extract a statistical summary and answer natural language questions about the data, trends, and outliers. Returns a summary and guidance for an AI to generate a textual answer and visual annotations.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z.record(z.string(), z.unknown()).describe("The full chart props including data"),
      query: z.string().optional().describe("A natural language question about the chart data"),
    },
    interrogateChartHandler
  )

  srv.tool(
    "groundChart",
    "Build the agent-reader grounding payload for a Semiotic chart: the layered L1–L3 natural-language description, the L4 communicative-act sentence (what the chart is asking the reader to do — 'this is an alerting chart; the spike warrants a closer look'), and a structured navigation tree (chart → axes/series → datum). This is the documented thing an LLM reads to interpret a chart faithfully without seeing the pixels — the reader-side complement to a capability descriptor. The L4 act is resolved from the chart's registered capability. Returns prose plus the full structured payload (description/intent/structure/text).",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z.record(z.string(), z.unknown()).describe("The full chart props including data"),
    },
    groundChartHandler
  )

  srv.tool(
    "suggestStreamCharts",
    "Recommend realtime/streaming Semiotic charts for a schema (not row data). Pass a schema describing field types plus optional throughput ('low'|'medium'|'high') and retention ('windowed'|'cumulative') hints; the engine ranks realtime charts (RealtimeLineChart, RealtimeHistogram, RealtimeHeatmap, RealtimeWaterfallChart, RealtimeSwarmChart, TemporalHistogram) by their fit. Use when the user is wiring up a live dashboard or monitoring view rather than visualizing a bounded dataset.",
    {
      schema: z
        .object({
          fields: z.array(
            z.object({
              name: z.string(),
              kind: z.enum(["numeric", "categorical", "date", "boolean"]),
              role: z.enum(["x", "y", "value", "category", "series", "size"]).optional(),
            }),
          ),
          throughput: z.enum(["low", "medium", "high"]).optional(),
          retention: z.enum(["windowed", "cumulative"]).optional(),
        })
        .describe("Stream schema — fields plus throughput/retention hints. No row data."),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Ranking intent."),
      maxResults: z.number().int().min(1).max(20).optional(),
    },
    suggestStreamChartsHandler
  )

  srv.tool(
    "suggestDashboard",
    "Generate a dashboard of complementary chart panels for a dataset — each panel answers a distinct analytical intent (trend, rank, distribution, correlation, etc.) and the engine diversifies by chart family by default. Heuristic only; no LLM call. Use when the user asks 'show me this data' or 'build me a dashboard' rather than picking one chart.",
    {
      data: z.array(z.record(z.string(), z.unknown())).describe("Row data — array of objects."),
      intents: z.array(z.string()).optional().describe("Intents to cover. Omit to let the engine pick based on the data shape."),
      maxPanels: z.number().int().min(1).max(12).optional().describe("Maximum panels (default 6)."),
      diversifyByFamily: z.boolean().optional().describe("Prefer not to repeat chart families across panels (default true)."),
    },
    suggestDashboardHandler
  )

  srv.tool(
    "suggestStretchCharts",
    "Recommend literacy-growth chart picks for a dataset given an AudienceProfile. Returns charts the data supports but the audience is unfamiliar with (familiarity ≤ 3, or ≤ 4 at exposureLevel 2), each paired with the familiar chart it could substitute for and a rationale. Use when the consumer wants to gently expose users to less familiar but more analytically appropriate visualizations.",
    {
      data: z.array(z.record(z.string(), z.unknown())).describe("Row data."),
      audience: z
        .object({
          name: z.string().optional(),
          familiarity: z.record(z.string(), z.number()).optional(),
          targets: z
            .record(
              z.string(),
              z.object({
                direction: z.enum(["increase", "decrease"]),
                weight: z.number().int().min(1).max(3).optional(),
                reason: z.string().optional(),
              }),
            )
            .optional(),
          exposureLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
            .describe("Reception channel — see suggestCharts."),
        })
        .describe("Audience profile — familiarity, targets, exposure level, reception modality."),
      intent: z.union([z.string(), z.array(z.string())]).optional(),
      maxResults: z.number().int().min(1).max(20).optional(),
    },
    suggestStretchChartsHandler
  )

  srv.tool(
    "repairChartConfig",
    "Validate that a chart component is a sensible choice for a dataset, and if not, propose alternatives that fit. Use when a user asks for a specific chart and you want to confirm it's appropriate, or when you've drafted a config and want to verify it. Returns either ok (no change needed), alternative (chart doesn't fit; here are ranked replacements with rationale), or unknown (no capability registered).",
    {
      component: z.string().describe("Chart component name to validate, e.g. 'PieChart'"),
      data: z.array(z.record(z.string(), z.unknown())).describe("Row data — array of objects."),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("User intent — informs ranking of alternatives when the chart doesn't fit."),
      maxAlternatives: z.number().int().min(1).max(10).optional().describe("Cap on alternatives returned (default 3)."),
    },
    repairChartConfigHandler
  )

  srv.tool(
    "proposeChartVariants",
    "Propose and score chart variants for a selected Semiotic component. Uses the capability registry plus heuristic variant discovery: registered variants, conservative transforms, and same-intent cross-family alternatives. Returns ranked proposals with fit/novelty/risk scores, rationale, and ready-to-use props. Use after suggestCharts when an agent wants to actively explore variants rather than stop at the first chart recommendation.",
    {
      component: z.string().describe("Base chart component to vary, e.g. 'LineChart', 'BarChart', or 'BoxPlot'."),
      props: z.record(z.string(), z.unknown()).optional().describe("Existing chart props. If props.data is present it is profiled; network/hierarchy/geo object data can be passed here as raw input."),
      data: z.array(z.record(z.string(), z.unknown())).optional().describe("Row data to profile. Overrides props.data when present."),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Ranking intent(s), e.g. trend, distribution, rank, compare-categories, composition-over-time."),
      maxResults: z.number().int().min(1).max(20).optional().describe("Cap on proposals returned (default 8)."),
      audience: z
        .object({
          name: z.string().optional(),
          familiarity: z.record(z.string(), z.number()).optional(),
          targets: z
            .record(
              z.string(),
              z.object({
                direction: z.enum(["increase", "decrease"]),
                weight: z.number().int().min(1).max(3).optional(),
                reason: z.string().optional(),
              }),
            )
            .optional(),
          exposureLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
            .describe("Reception channel — see suggestCharts."),
        })
        .optional()
        .describe("Audience profile — familiarity, adoption targets, exposure level, and reception modality."),
    },
    proposeChartVariantsHandler
  )

  srv.tool(
    "suggestCharts",
    "Recommend Semiotic charts for a dataset using heuristic capability descriptors. Each chart declares which data shapes it serves and which intents (trend, compare-categories, distribution, correlation, part-to-whole, etc.) it answers — the engine returns a ranked list with scores, reasons, caveats, and ready-to-use props. Heuristic only; no LLM call. Use the result as structured context when answering 'what chart should I use?' or generating chart code.",
    {
      data: z.array(z.record(z.string(), z.unknown())).describe("Row data — array of objects."),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Ranking intent. One of: trend, compare-series, compare-categories, rank, part-to-whole, distribution, correlation, flow, hierarchy, geo, outlier-detection, composition-over-time, change-detection. Custom intents accepted."),
      maxResults: z.number().int().min(1).max(40).optional().describe("Cap on suggestions returned (default 8)."),
      allow: z.array(z.string()).optional().describe("Restrict to these component names."),
      deny: z.array(z.string()).optional().describe("Exclude these component names."),
      audience: z
        .object({
          name: z.string().optional(),
          familiarity: z.record(z.string(), z.number()).optional(),
          targets: z
            .record(
              z.string(),
              z.object({
                direction: z.enum(["increase", "decrease"]),
                weight: z.number().int().min(1).max(3).optional(),
                reason: z.string().optional(),
              }),
            )
            .optional(),
          exposureLevel: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
            .describe("Reception channel. A non-visual value down-ranks charts the audience can't receive in that channel (e.g. a many-slice pie for a screen reader) and adds receivability caveats."),
        })
        .optional()
        .describe("Audience profile — familiarity, adoption targets, exposure level, and reception modality."),
    },
    suggestChartsHandler
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
      console.error("Tools: getSchema, suggestChart, suggestCharts, proposeChartVariants, suggestStreamCharts, suggestDashboard, suggestStretchCharts, repairChartConfig, renderChart, interrogateChart, groundChart, diagnoseConfig, auditAccessibility, reportIssue, applyTheme")
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

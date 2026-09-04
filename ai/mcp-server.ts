/**
 * Semiotic MCP Server
 *
 * Exposes twenty-three developer tools, eleven resources (ten fixed and one
 * template), and two prompts:
 *   1. getSchema — returns the prop schema for a specific component
 *   2. suggestChart — sample-row chart recommender
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
 *   14. evaluateChart — unified data, deception, and accessibility evaluation
 *   15. auditMobileVisualization — mobile visualization audit
 *   16. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
 *   17. applyTheme — returns usage guidance for theme presets
 *   18. renderInteractiveChart — ChatGPT Apps widget wrapper around a rendered Semiotic SVG
 *   19. suggestTokenEncoding — semantic token / ISOTYPE encoding recommender
 *   20. auditArtifact — audits an explicit interpretation contract under a named policy
 *   21. recommendRepresentation — considers chart and non-chart outcomes without inventing facts
 *   22. repairArtifact — proposes repairs or fills missing identity fields
 *   23. explainRefusal — explains policy refusals from an explicit contract
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
 * HTTP mode (loopback-only by default):
 *   npx semiotic-mcp --http --port 3001
 *
 * Bind intentionally to a public interface only when needed:
 *   npx semiotic-mcp --http --host 0.0.0.0 --port 3001
 */

import {
  McpServer,
  ResourceTemplate
} from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"
import * as fs from "fs"
import * as path from "path"
import * as http from "http"
import { resolveHTTPListenHost } from "./mcp-server-options"
import { createMcpRequestCancellationSignal } from "./mcp-request-cancellation"
import {
  mcpServerInfoForBuild,
  resolveSemioticBuildInfo,
  type McpToolProfile
} from "./mcp-build-info"
import { createMcpMetadataLogger, resolveMcpLoggingPolicy } from "./mcp-logging"
import {
  createMcpRequestLimiter,
  resolveMcpRequestLimits
} from "./mcp-request-limits"
import {
  formatMcpOperationLimitError,
  inspectMcpOperationInput,
  resolveMcpOperationLimits
} from "./mcp-operation-limits"
import {
  createWidgetDataPreview,
  createWidgetEvidencePreview,
  formatMcpOutputLimitError,
  inspectMcpOutputLimit,
  resolveMcpRenderOutputLimits,
  truncateUtf8
} from "./mcp-render-output-limits"
import { renderHOCToSVG } from "./renderHOCToSVG"
import { applySvgTheme } from "./svg-theme"
import { COMPONENT_REGISTRY } from "./componentRegistry"
import { renderChartWithEvidence } from "semiotic/server"
import { toEvidenceEnvelope, evaluateEvidenceGate } from "semiotic/evidence"
import {
  diagnoseConfig,
  auditAccessibility,
  formatAccessibilityAudit,
  evaluateChart,
  formatEvaluateChart,
  auditMobileVisualization,
  formatMobileVisualizationAudit,
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
  suggestTokenEncoding,
  tokenTaskIntentToCapabilityIntents
} from "semiotic/ai"
import {
  evaluateArtifact as auditArtifactFromContract,
  recommendRepresentation as recommendRepresentationFromContract,
  repairArtifact as repairArtifactFromContract,
  explainArtifactRefusal,
  resolveArtifactPolicy,
  validateArtifactContract,
  createArtifactPacket
} from "semiotic/artifact"
import type {
  IntentId,
  StreamSchema,
  AudienceProfile,
  ChartDataProfile,
  VariantProposal,
  TokenTaskIntent
} from "semiotic/ai"
import type {
  ArtifactContract,
  ArtifactPolicyException
} from "semiotic/artifact"

// tsconfig.mcp.json resolves `semiotic/ai` through the existing dist
// declarations, so this local mirror keeps MCP typechecking build-independent.
// The Zod enum on the tool input remains the runtime validation source.
type McpProfileFieldRole =
  | "identifier"
  | "measure"
  | "dimension"
  | "temporal"
  | "x"
  | "y"
  | "size"
  | "category"
  | "series"
  | "time"
  | "ignore"
type McpProfileFieldRoleHints = Record<
  string,
  McpProfileFieldRole | McpProfileFieldRole[]
>

const MCP_PROFILE_HINT_INPUT = {
  identifiers: z
    .array(z.string())
    .optional()
    .describe(
      "Fields that identify records and must not be used as visual encodings or measures."
    ),
  fieldRoles: z
    .record(
      z.string(),
      z.union([
        z.enum([
          "identifier",
          "measure",
          "dimension",
          "temporal",
          "x",
          "y",
          "size",
          "category",
          "series",
          "time",
          "ignore"
        ]),
        z.array(
          z.enum([
            "identifier",
            "measure",
            "dimension",
            "temporal",
            "x",
            "y",
            "size",
            "category",
            "series",
            "time",
            "ignore"
          ])
        )
      ])
    )
    .optional()
    .describe(
      "Per-field semantic or exact encoding-role hints used before chart ranking."
    )
}
// Sibling .cjs modules (authored as CommonJS, also consumed by the CLI/doctor).
// esModuleInterop maps each module.exports object to the default import.
import componentMetadataModule from "./componentMetadata.cjs"
import chartSuggestionsModule from "./chartSuggestions.cjs"
import behaviorContractsModule from "./behaviorContracts.cjs"

const {
  componentIndexFromSchema,
  metadataForComponent,
  schemaResourceUriForComponent
} = componentMetadataModule as {
  componentIndexFromSchema: (schema: any) => {
    version?: string
    totalComponents: number
    renderableComponents: number
    browserOnlyComponents: number
    requiresLiveDataComponents: number
    categories: Record<string, string[]>
    components: Array<{
      name: string
      category: string
      importPath: string
      schemaResourceUri: string
      renderable: boolean
      requiresLiveData: boolean
      description?: string
    }>
  }
  metadataForComponent: (
    entryOrName: string | { name: string; description?: string }
  ) => {
    name: string
    category: string
    importPath: string
    schemaResourceUri: string
    renderable: boolean
    requiresLiveData: boolean
    description?: string
  }
  schemaResourceUriForComponent: (name: string) => string
}
const { formatSuggestionReport, suggestCharts, VALID_INTENTS } =
  chartSuggestionsModule as {
    formatSuggestionReport: (result: SuggestChartResult) => string
    VALID_INTENTS: string[]
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
  normalizeUsageMode
} = behaviorContractsModule as {
  BEHAVIOR_CONTRACTS: Array<Record<string, unknown>>
  dataRequiredForUsageMode: (component: string, usageMode?: string) => boolean
  behaviorContractsFor: (args: {
    component?: string
    props?: Record<string, any>
  }) => Array<Record<string, unknown>>
  formatDoctorBehaviorContracts: (
    contracts: Array<Record<string, unknown>>
  ) => string
  normalizeUsageMode: (usageMode?: string) => "static" | "push"
}

// Load schema.json for version info
const schemaPath = path.resolve(__dirname, "../schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))
const artifactContractSchemaPath = path.resolve(
  __dirname,
  "../../spec/v0.1/artifact-contract.schema.json"
)
const artifactContractSchemaText = fs.readFileSync(
  artifactContractSchemaPath,
  "utf-8"
)
// The package manifest is the release authority for deployment identity. The
// AI schema is a generated surface artifact and can otherwise lag a package
// version bump, which would make a stable deployment report the wrong release.
const packageManifestPath = path.resolve(__dirname, "../../package.json")
const packageManifest = JSON.parse(
  fs.readFileSync(packageManifestPath, "utf-8")
)
if (typeof packageManifest.version !== "string" || !packageManifest.version) {
  throw new Error("Semiotic package.json must provide a package version")
}
const PACKAGE_VERSION = packageManifest.version

// Build component name → schema lookup from schema.json
const schemaByComponent: Record<string, any> = {}
for (const tool of schema.tools) {
  schemaByComponent[tool.function.name] = tool.function
}

const allComponentNames = Object.keys(schemaByComponent).sort()
const componentNames = Object.keys(COMPONENT_REGISTRY).sort()
const REPO = "nteract/semiotic"
const SEMIOTIC_CHART_WIDGET_URI = "ui://semiotic/chart-widget.html"
const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app"
const DEFAULT_MCP_SUPPORTED_PROTOCOL_VERSION = "2024-11-05"
const DEFAULT_MCP_MAX_RENDER_WORK_MS = 2500
const DEFAULT_MCP_MAX_PNG_CONVERSION_MS = 4000
const DEFAULT_MCP_MAX_INTERACTIVE_SVG_SANITIZE_MS = 3000
// The HTTP transport must never use console directly for request logging:
// user bodies, headers, and Error objects can carry chart data or credentials.
// This boundary serializes only fixed, bounded operational metadata.
const mcpLoggingPolicy = resolveMcpLoggingPolicy()
const mcpLogger = createMcpMetadataLogger(mcpLoggingPolicy)

type McpRenderExecutionLimits = {
  maxRenderWorkMs: number
  maxPngConversionMs: number
  maxInteractiveSanitizeMs: number
}

type RenderContext = {
  signal?: AbortSignal
  limits?: McpRenderExecutionLimits
}

type McpExecutionErrorCode = "MCP_RENDER_CANCELLED" | "MCP_RENDER_TIMEOUT"

function writeJsonRpcError(
  res: http.ServerResponse,
  status: number,
  code: number,
  message: string
): void {
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null
    })
  )
}

function isAuthorizedRequest(
  req: import("http").IncomingMessage,
  token: string,
  scheme: string
): boolean {
  if (!token) return true
  const authorization = req.headers.authorization
  if (typeof authorization !== "string") return false
  const [providedScheme, providedToken] = authorization.split(/\s+/, 2)
  return (
    providedScheme?.toLowerCase() === scheme.toLowerCase() &&
    Boolean(providedToken) &&
    providedToken === token
  )
}

function hasSupportedAccept(acceptHeader: string): boolean {
  if (!acceptHeader) return true
  const lower = acceptHeader.toLowerCase()
  return (
    lower.includes("*/*") ||
    lower.includes("application/json") ||
    lower.includes("text/event-stream")
  )
}

function isSupportedProtocolVersion(
  protocolVersion: string,
  supported: string[]
): boolean {
  if (!protocolVersion || supported.length === 0) return true
  return supported.includes(protocolVersion)
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function resolveMcpRenderExecutionLimits(
  env: Record<string, string | undefined> = process.env
): McpRenderExecutionLimits {
  return {
    maxRenderWorkMs: parsePositiveInteger(
      env.MCP_MAX_RENDER_WORK_MS,
      DEFAULT_MCP_MAX_RENDER_WORK_MS
    ),
    maxPngConversionMs: parsePositiveInteger(
      env.MCP_MAX_PNG_CONVERSION_MS,
      DEFAULT_MCP_MAX_PNG_CONVERSION_MS
    ),
    maxInteractiveSanitizeMs: parsePositiveInteger(
      env.MCP_MAX_INTERACTIVE_SVG_SANITIZE_MS,
      DEFAULT_MCP_MAX_INTERACTIVE_SVG_SANITIZE_MS
    )
  }
}

function makeRenderExecutionError(
  code: McpExecutionErrorCode,
  label: string,
  limitMs: number,
  observedMs?: number
): Error {
  const text =
    code === "MCP_RENDER_TIMEOUT"
      ? `${label} exceeded ${limitMs} ms timeout budget (${observedMs ?? 0} ms). Set ${label === "PNG conversion" ? "MCP_MAX_PNG_CONVERSION_MS" : label.includes("sanitize") ? "MCP_MAX_INTERACTIVE_SVG_SANITIZE_MS" : "MCP_MAX_RENDER_WORK_MS"} to adjust.`
      : `${label} was canceled before completion.`
  const error = new Error(text)
  ;(error as any).code = code
  return error
}

function throwIfRequestCanceled(
  signal?: AbortSignal,
  label = "render work"
): void {
  if (signal?.aborted) {
    throw makeRenderExecutionError("MCP_RENDER_CANCELLED", label, 0)
  }
}

async function runRenderStep<T>(
  label: string,
  limitMs: number,
  signal: AbortSignal | undefined,
  work: () => Promise<T> | T
): Promise<T> {
  throwIfRequestCanceled(signal, label)
  const started = Date.now()
  const result = await Promise.resolve(work())
  if (signal?.aborted)
    throw makeRenderExecutionError("MCP_RENDER_CANCELLED", label, 0)
  const elapsed = Date.now() - started
  if (limitMs > 0 && elapsed > limitMs) {
    throw makeRenderExecutionError(
      "MCP_RENDER_TIMEOUT",
      label,
      limitMs,
      elapsed
    )
  }
  return result
}

function isRenderExecutionError(
  error: unknown
): error is { code: McpExecutionErrorCode; message: string } {
  return (
    !!error &&
    typeof error === "object" &&
    ((error as { code?: unknown }).code === "MCP_RENDER_TIMEOUT" ||
      (error as { code?: unknown }).code === "MCP_RENDER_CANCELLED")
  )
}

function renderExecutionErrorResult(
  message: string,
  code: McpExecutionErrorCode
): ToolResult {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
    structuredContent: { code }
  }
}

function aiFilePath(fileName: string): string {
  return path.resolve(__dirname, "..", fileName)
}

function readAIFile(fileName: string): string {
  return fs.readFileSync(aiFilePath(fileName), "utf-8")
}

function componentIndexJSON(): string {
  return JSON.stringify(componentIndexFromSchema(schema), null, 2)
}

function schemaDiscoveryIndexJSON(): string {
  return JSON.stringify(
    {
      ...componentIndexFromSchema(schema),
      resourceTemplate: "semiotic://schema/{component}",
      fullSchemaUri: "semiotic://schema",
      artifactContractSchemaUri: "semiotic://artifact-contract-schema"
    },
    null,
    2
  )
}

function canonicalComponentName(requested: string): string | undefined {
  const exact = schemaByComponent[requested]
  if (exact) return requested
  const lower = requested.toLowerCase()
  return allComponentNames.find((name) => name.toLowerCase() === lower)
}

function componentSchemaResource(component: string) {
  const entry = schemaByComponent[component]
  return {
    version: schema.version,
    component,
    resourceUri: schemaResourceUriForComponent(component),
    metadata: metadataForComponent(entry),
    schema: entry,
    accessibility: schemaAccessibilityGuidance(entry),
    behaviorContracts: behaviorContractsFor({ component, props: {} })
  }
}

function textResource(uri: URL, mimeType: string, text: string) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType,
        text
      }
    ]
  }
}

function appResource(uri: URL, text: string) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: MCP_APP_MIME_TYPE,
        text,
        _meta: {
          ui: {
            prefersBorder: true,
            csp: {
              connectDomains: [],
              resourceDomains: []
            }
          },
          "openai/widgetDescription":
            "Interactive Semiotic chart preview rendered by the semiotic-mcp server.",
          "openai/widgetPrefersBorder": true,
          "openai/widgetCSP": {
            connect_domains: [],
            resource_domains: []
          }
        }
      }
    ]
  }
}

function promptMessage(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text
        }
      }
    ]
  }
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

const SAFE_SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "line",
  "polyline",
  "polygon",
  "rect",
  "circle",
  "ellipse",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "style",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "filter",
  "marker",
  "use",
  "symbol"
])

const SAFE_SVG_ATTRIBUTES = new Set([
  "alignment-baseline",
  "alignmentadjust",
  "aria-hidden",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "clip-path",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "dominant-baseline",
  "fill",
  "fill-opacity",
  "fill-rule",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "gradientunits",
  "gradienttransform",
  "height",
  "id",
  "marker-height",
  "marker-units",
  "marker-width",
  "marker-end",
  "marker-mid",
  "marker-start",
  "offset",
  "opacity",
  "orientation",
  "pattern-content-units",
  "pattern-transform",
  "pattern-units",
  "preserveaspectratio",
  "r",
  "rx",
  "ry",
  "role",
  "shape-rendering",
  "spreadmethod",
  "startoffset",
  "stroke",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-width",
  "style",
  "text-anchor",
  "transform",
  "viewbox",
  "width",
  "x",
  "x1",
  "x2",
  "xmlns",
  "xmlns:xlink",
  "y",
  "y1",
  "y2",
  "xml:space",
  "class"
])

const SAFE_URL_ATTR_PREFIXES = [
  "http://",
  "https://",
  "#",
  "/",
  "./",
  "../",
  "mailto:",
  "tel:",
  "data:image/"
]

function isSafeUrlValue(value: string): boolean {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return true
  if (/^(javascript|vbscript|file):/i.test(trimmed)) return false
  return SAFE_URL_ATTR_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}

function sanitizeStyleValue(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(
      /url\(\s*["']?\s*([^)"']+)\s*["']?\s*\)/gi,
      (_match, rawUrl: string) => {
        const safeUrl = String(rawUrl || "")
          .trim()
          .toLowerCase()
        if (safeUrl && !isSafeUrlValue(safeUrl)) return "url()"
        return `url(${rawUrl})`
      }
    )
}

function isAllowedSvgAttribute(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.startsWith("on")) return false
  if (lower.startsWith("data-")) return true
  if (lower.startsWith("aria-")) return true
  if (lower.startsWith("xml:")) return true
  if (lower === "xmlns" || lower.startsWith("xmlns:")) return true
  if (SAFE_SVG_ATTRIBUTES.has(lower)) return true
  return /^[a-z][a-z0-9-_:.]*$/.test(lower)
}

function sanitizeSvgAttribute(name: string, value: string): string | null {
  const lower = name.toLowerCase()
  if (!isAllowedSvgAttribute(name)) return null
  if (
    (lower === "href" || lower === "xlink:href" || lower === "src") &&
    !isSafeUrlValue(value)
  ) {
    return null
  }
  if (lower === "style") return sanitizeStyleValue(value)
  return value
}

function sanitizeSvgNode(node: ChildNode, doc: Document): Node | null {
  if (node.nodeType === 3 || node.nodeType === 4) {
    const text = node.textContent ?? ""
    return text ? doc.createTextNode(text) : null
  }
  if (node.nodeType !== 1) return null

  const source = node as Element
  const tag = source.tagName
  if (!SAFE_SVG_ELEMENTS.has(tag)) return null

  const safe = doc.createElementNS(SVG_NAMESPACE, tag)
  const isStyleTag = tag === "style"

  if (!isStyleTag) {
    for (const attribute of Array.from(source.attributes)) {
      const safeValue = sanitizeSvgAttribute(attribute.name, attribute.value)
      if (safeValue == null) continue
      safe.setAttribute(attribute.name, safeValue)
    }
  } else {
    const styleText = sanitizeStyleValue(source.textContent ?? "")
    if (styleText) {
      safe.appendChild(doc.createTextNode(styleText))
    }
    return safe
  }

  for (const child of Array.from(source.childNodes)) {
    const sanitized = sanitizeSvgNode(child, doc)
    if (sanitized) safe.appendChild(sanitized)
  }

  return safe
}

// jsdom is an optional dependency loaded lazily so servers that never render
// interactive widgets don't pay its load cost. Kick the import off eagerly
// (module load, not the first request) and memoize it, so the one-time
// cost of loading it is amortized in the background instead of being
// charged against the first widget render's sanitize-step timeout budget.
let jsdomModulePromise: Promise<typeof import("jsdom")> | null = null
function loadJsdomModule(): Promise<typeof import("jsdom")> {
  if (!jsdomModulePromise) jsdomModulePromise = import("jsdom")
  return jsdomModulePromise
}
void loadJsdomModule().catch(() => {})

async function sanitizeSvgForWidget(svg: string): Promise<string> {
  const trimmed = svg.trim()
  if (!trimmed) return ""
  try {
    const { JSDOM } = await loadJsdomModule()
    const parsed = new JSDOM(trimmed, { contentType: "image/svg+xml" })
    const parsedDocument = parsed.window.document
    const sourceRoot = parsedDocument.documentElement

    if (!sourceRoot || sourceRoot.tagName.toLowerCase() !== "svg") return ""
    if (parsedDocument.getElementsByTagName("parsererror")[0]) return ""

    const cleanDocument = parsedDocument.implementation.createDocument(
      SVG_NAMESPACE,
      null,
      null
    )
    const safeRoot = sanitizeSvgNode(
      sourceRoot,
      cleanDocument
    ) as Element | null
    if (!safeRoot) return ""

    cleanDocument.appendChild(safeRoot)
    return new parsed.window.XMLSerializer().serializeToString(safeRoot)
  } catch {
    return ""
  }
}

function parseRenderEvidence(
  result: ToolResult
): Record<string, unknown> | null {
  const evidenceText = result.content.find(
    (block): block is ToolTextContent =>
      block.type === "text" && block.text.startsWith("Render evidence:\n")
  )?.text
  if (!evidenceText) return null
  try {
    return JSON.parse(evidenceText.replace(/^Render evidence:\n/, ""))
  } catch {
    return null
  }
}

function chartTitleFromProps(
  component: string,
  props: Record<string, unknown>
): string {
  const title =
    typeof props.title === "string" && props.title.trim()
      ? props.title.trim()
      : component
  return truncateUtf8(title, resolveMcpRenderOutputLimits().maxWidgetValueBytes)
}

function chartDatumCount(props: Record<string, unknown>): number | null {
  if (Array.isArray(props.data)) return props.data.length
  if (Array.isArray(props.nodes)) return props.nodes.length
  if (Array.isArray(props.edges)) return props.edges.length
  if (Array.isArray(props.links)) return props.links.length
  return null
}

function renderSemioticChartWidgetHTML(): string {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: light dark;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --bg: Canvas;
      --fg: CanvasText;
      --muted: color-mix(in srgb, CanvasText 62%, Canvas 38%);
      --border: color-mix(in srgb, CanvasText 16%, Canvas 84%);
      --panel: color-mix(in srgb, Canvas 94%, CanvasText 6%);
      --accent: #2f6fed;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--fg); }
    main { display: grid; gap: 10px; padding: 12px; min-height: 100vh; }
    header { display: flex; align-items: start; justify-content: space-between; gap: 10px; }
    h1 { font-size: 16px; line-height: 1.25; margin: 0; font-weight: 650; }
    .summary { margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.35; }
    .toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
    button {
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--fg);
      border-radius: 6px;
      font: inherit;
      font-size: 12px;
      padding: 6px 8px;
      cursor: pointer;
    }
    button[aria-pressed="true"] {
      border-color: var(--accent);
      color: var(--accent);
    }
    label { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
    input[type="range"] { width: 92px; }
    .chart-shell {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      min-height: 260px;
      background: white;
    }
    .chart-shell.fit svg { width: 100%; height: auto; }
    .chart {
      min-width: 360px;
      padding: 10px;
      transform-origin: top left;
    }
    .chart svg { display: block; max-width: none; }
    .empty {
      min-height: 240px;
      display: grid;
      place-items: center;
      color: var(--muted);
      text-align: center;
      padding: 24px;
    }
    .drawer {
      display: none;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: auto;
      max-height: 220px;
    }
    .drawer.open { display: block; }
    pre {
      margin: 0;
      padding: 10px;
      font-size: 12px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: var(--panel); }
    .hover {
      position: fixed;
      pointer-events: none;
      z-index: 10;
      max-width: 280px;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--fg);
      box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
      font-size: 12px;
      display: none;
    }
    @media (max-width: 520px) {
      main { padding: 10px; }
      header { display: grid; }
      .toolbar { justify-content: start; }
      .chart { min-width: 300px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1 id="title">Semiotic chart</h1>
        <div class="summary" id="summary">Waiting for a tool result...</div>
      </div>
      <div class="toolbar" aria-label="Chart controls">
        <button id="fit" type="button" aria-pressed="true">Fit</button>
        <button id="data" type="button" aria-pressed="false">Data</button>
        <button id="evidence" type="button" aria-pressed="false">Evidence</button>
        <label>Zoom <input id="zoom" type="range" min="60" max="180" value="100" /></label>
      </div>
    </header>
    <section id="chartShell" class="chart-shell fit" aria-label="Rendered Semiotic chart">
      <div id="chart" class="chart"><div class="empty">Ask ChatGPT to render a Semiotic chart.</div></div>
    </section>
    <section id="dataDrawer" class="drawer" aria-label="Chart data"></section>
    <section id="evidenceDrawer" class="drawer" aria-label="Render evidence"><pre id="evidenceText">{}</pre></section>
  </main>
  <div id="hover" class="hover" role="status" aria-live="polite"></div>
  <script>
    const state = { output: null, meta: null };
    const titleEl = document.getElementById("title");
    const summaryEl = document.getElementById("summary");
    const chartEl = document.getElementById("chart");
    const chartShell = document.getElementById("chartShell");
    const dataDrawer = document.getElementById("dataDrawer");
    const evidenceDrawer = document.getElementById("evidenceDrawer");
    const evidenceText = document.getElementById("evidenceText");
    const hover = document.getElementById("hover");
    const fitButton = document.getElementById("fit");
    const dataButton = document.getElementById("data");
    const evidenceButton = document.getElementById("evidence");
    const zoom = document.getElementById("zoom");

    function html(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }

    function currentPayload() {
      const openai = window.openai || {};
      const output = state.output || openai.toolOutput || null;
      const meta = state.meta || openai.toolResultMetadata || openai.toolResponseMetadata || openai._meta || null;
      return { output, meta };
    }

    function dataPreview(meta) {
      const preview = meta?.dataPreview;
      return preview && Array.isArray(preview.rows) ? preview : null;
    }

    function renderTable(preview) {
      const rows = preview?.rows || [];
      if (!rows.length) return '<pre>No row data was provided in the widget metadata.</pre>';
      const columns = Array.from(rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set()));
      const totalRows = Number.isFinite(preview?.totalRows) ? preview.totalRows : rows.length;
      const collection = preview?.collection || 'data';
      const notes = [
        'Showing ' + rows.length + ' of ' + totalRows + ' ' + html(collection) + ' rows.',
        preview?.truncated ? 'Preview values or rows were truncated.' : '',
        preview?.redactedFields ? 'Sensitive fields were redacted.' : ''
      ].filter(Boolean).join(' ');
      return '<div class="summary">' + notes + '</div><table><thead><tr>' + columns.map((col) => '<th>' + html(col) + '</th>').join('') +
        '</tr></thead><tbody>' + rows.map((row) => '<tr>' + columns.map((col) => '<td>' + html(row?.[col]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    }

    function render(output, meta) {
      const payload = output || {};
      const hidden = meta || {};
      titleEl.textContent = payload.title || payload.component || "Semiotic chart";
      summaryEl.textContent = payload.summary || "Rendered by semiotic-mcp.";
      const svg = hidden.svg || payload.svg;
      if (svg) {
        chartEl.innerHTML = svg;
      } else {
        chartEl.innerHTML = '<div class="empty">No SVG payload received. The model-visible chart summary is still available above.</div>';
      }
      const preview = dataPreview(hidden);
      dataDrawer.innerHTML = renderTable(preview);
      evidenceText.textContent = JSON.stringify(payload.evidence || hidden.evidence || {}, null, 2);
    }

    function rerenderFromGlobals() {
      const payload = currentPayload();
      render(payload.output, payload.meta);
    }

    fitButton.addEventListener("click", () => {
      const enabled = !chartShell.classList.contains("fit");
      chartShell.classList.toggle("fit", enabled);
      fitButton.setAttribute("aria-pressed", String(enabled));
    });
    dataButton.addEventListener("click", () => {
      const open = !dataDrawer.classList.contains("open");
      dataDrawer.classList.toggle("open", open);
      dataButton.setAttribute("aria-pressed", String(open));
    });
    evidenceButton.addEventListener("click", () => {
      const open = !evidenceDrawer.classList.contains("open");
      evidenceDrawer.classList.toggle("open", open);
      evidenceButton.setAttribute("aria-pressed", String(open));
    });
    zoom.addEventListener("input", () => {
      chartEl.style.transform = 'scale(' + Number(zoom.value) / 100 + ')';
      chartEl.style.width = (10000 / Number(zoom.value)) + '%';
    });
    chartEl.addEventListener("mousemove", (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target === chartEl) {
        hover.style.display = "none";
        return;
      }
      const label = target.getAttribute("aria-label") || target.textContent?.trim() || target.tagName.toLowerCase();
      hover.textContent = label.slice(0, 180);
      hover.style.left = Math.min(event.clientX + 12, window.innerWidth - 300) + "px";
      hover.style.top = Math.min(event.clientY + 12, window.innerHeight - 70) + "px";
      hover.style.display = "block";
    });
    chartEl.addEventListener("mouseleave", () => {
      hover.style.display = "none";
    });
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== "2.0") return;
      if (message.method === "ui/notifications/tool-result") {
        state.output = message.params?.structuredContent || null;
        state.meta = message.params?._meta || null;
        render(state.output, state.meta);
      }
    }, { passive: true });
    window.addEventListener("openai:set_globals", (event) => {
      const globals = event.detail?.globals || {};
      state.output = globals.toolOutput || state.output;
      state.meta = globals.toolResultMetadata || globals.toolResponseMetadata || globals._meta || state.meta;
      rerenderFromGlobals();
    }, { passive: true });
    rerenderFromGlobals();
  </script>
</body>
</html>`.trim()
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

type ToolTextContent = {
  type: "text"
  text: string
}

type ToolImageContent = {
  type: "image"
  data: string
  mimeType: "image/png"
}

type ToolContent = ToolTextContent | ToolImageContent

type ToolResult = {
  content: ToolContent[]
  isError?: boolean
  structuredContent?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

const ARTIFACT_POLICY_IDS = [
  "exploratory",
  "operational-streaming",
  "editorial",
  "public-civic",
  "agent-generated"
] as const

type McpArtifactPolicyId = (typeof ARTIFACT_POLICY_IDS)[number]
type ExplicitArtifactContract = Record<string, any>

type ArtifactValidation = {
  valid: boolean
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
}

const MAX_ARTIFACT_CONTRACT_OUTPUT_BYTES = 64 * 1024

const explicitArtifactContractInput = z
  .object({
    contractVersion: z.string(),
    artifact: z.record(z.string(), z.unknown()),
    purpose: z.record(z.string(), z.unknown()),
    claims: z.array(z.record(z.string(), z.unknown())),
    evidence: z.array(z.record(z.string(), z.unknown()))
  })
  .passthrough()
  .describe(
    "Complete explicit artifact contract. Validate against semiotic://artifact-contract-schema; omitted source, review, and time facts stay omitted or explicitly unknown."
  )

const artifactPolicyIdInput = z
  .enum(ARTIFACT_POLICY_IDS)
  .describe("Explicit built-in policy identifier used for this operation.")

const artifactReferenceTimeInput = z
  .string()
  .max(64)
  .describe(
    "Explicit reference clock for review, freshness, and expiry checks. Use an ISO 8601 timestamp."
  )

const artifactPolicyExceptionInput = z
  .object({
    rule: z.string().min(1).max(120),
    rationale: z.string().min(1).max(1200),
    owner: z.string().min(1).max(240),
    expiresAt: artifactReferenceTimeInput.optional(),
    reviewAt: artifactReferenceTimeInput.optional()
  })
  .strict()
  .describe(
    "Accountable policy exception. It applies only when a supplied expiry or review bound remains in the future at the explicit reference clock."
  )

const artifactPolicyOutput = z.object({
  id: z.string(),
  version: z.string(),
  appliedExceptions: z.array(artifactPolicyExceptionInput).max(20).optional(),
  rejectedExceptions: z.array(artifactPolicyExceptionInput).max(20).optional()
})

const artifactValidationIssueOutput = z.object({
  path: z.string(),
  message: z.string()
})

const artifactValidationOutput = z.object({
  valid: z.boolean(),
  errors: z.array(artifactValidationIssueOutput).max(25),
  warnings: z.array(artifactValidationIssueOutput).max(25)
})

const artifactObligationSummaryOutput = z.object({
  pass: z.number().int().nonnegative(),
  fail: z.number().int().nonnegative(),
  warn: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
  notApplicable: z.number().int().nonnegative()
})

const artifactObligationOutput = z.object({
  id: z.string(),
  relation: z.enum([
    "claim-support",
    "representation-fit",
    "reception",
    "time",
    "challenge-and-correction",
    "accountability",
    "abstention",
    "preservation"
  ]),
  status: z.enum([
    "pass",
    "fail",
    "warn",
    "manual",
    "unknown",
    "not-applicable"
  ]),
  message: z.string(),
  path: z.string().optional(),
  repair: z.string().optional(),
  evidenceIds: z.array(z.string()).max(25).optional()
})

const representationCandidateOutput = z.object({
  id: z.string().max(240),
  kind: z.enum([
    "chart",
    "custom-recipe",
    "table",
    "text",
    "small-multiples",
    "collect-more-data",
    "wait-for-settlement",
    "no-comparison",
    "no-claim",
    "no-action"
  ]),
  label: z.string(),
  component: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  score: z.number().optional(),
  reasons: z.array(z.string()).max(8),
  caveats: z.array(z.string()).max(8).optional()
})

const artifactRepairProposalOutput = z.object({
  id: z.string(),
  category: z.enum(["identity", "configuration", "contract"]).optional(),
  path: z.string().optional(),
  action: z.string(),
  reason: z.string(),
  changesClaim: z.boolean()
})

const artifactRepairLedgerOutput = z.object({
  id: z.string(),
  category: z.enum(["identity", "configuration", "contract"]).optional(),
  path: z.string(),
  action: z.string(),
  reason: z.string(),
  applied: z.boolean(),
  changesClaim: z.boolean(),
  suggestedComponent: z.string().optional(),
  suggestedVariant: z.string().optional()
})

const artifactContractTransferOutput = z.object({
  format: z.string(),
  preservation: z.enum([
    "full-fidelity",
    "claim-evidence-preserved",
    "visual-only",
    "lossy",
    "unknown"
  ]),
  preservedPaths: z.array(z.string()).max(25),
  omittedPaths: z.array(z.string()).max(25),
  warnings: z.array(z.string()).max(25)
})

function artifactPolicyIdentity(policyId: McpArtifactPolicyId) {
  const policy = resolveArtifactPolicy(policyId)
  return { id: policy.id, version: policy.version }
}

function boundedArtifactPolicyException(
  exception: ArtifactPolicyException
): ArtifactPolicyException {
  return {
    rule: truncateUtf8(String(exception.rule), 120),
    rationale: truncateUtf8(String(exception.rationale), 1200),
    owner: truncateUtf8(String(exception.owner), 240),
    ...(typeof exception.expiresAt === "string"
      ? { expiresAt: truncateUtf8(exception.expiresAt, 64) }
      : {}),
    ...(typeof exception.reviewAt === "string"
      ? { reviewAt: truncateUtf8(exception.reviewAt, 64) }
      : {})
  }
}

function boundedArtifactPolicy(policy: {
  id: string
  version: string
  appliedExceptions?: ReadonlyArray<ArtifactPolicyException>
  rejectedExceptions?: ReadonlyArray<ArtifactPolicyException>
}) {
  const applied = policy.appliedExceptions ?? []
  const rejected = policy.rejectedExceptions ?? []
  return {
    id: truncateUtf8(policy.id, 120),
    version: truncateUtf8(policy.version, 64),
    ...(applied.length > 0
      ? {
          appliedExceptions: applied
            .slice(0, 20)
            .map(boundedArtifactPolicyException)
        }
      : {}),
    ...(rejected.length > 0
      ? {
          rejectedExceptions: rejected
            .slice(0, 20)
            .map(boundedArtifactPolicyException)
        }
      : {})
  }
}

function boundedArtifactStrings(
  value: unknown,
  maximum: number,
  maximumBytes = 600
): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maximum)
    .map((item) => truncateUtf8(item, maximumBytes))
}

function boundedArtifactTransfer(transfer: {
  format: string
  preservation:
    | "full-fidelity"
    | "claim-evidence-preserved"
    | "visual-only"
    | "lossy"
    | "unknown"
  preservedPaths: string[]
  omittedPaths: string[]
  warnings: string[]
}) {
  return {
    format: truncateUtf8(transfer.format, 120),
    preservation: transfer.preservation,
    preservedPaths: boundedArtifactStrings(transfer.preservedPaths, 25, 240),
    omittedPaths: boundedArtifactStrings(transfer.omittedPaths, 25, 240),
    warnings: boundedArtifactStrings(transfer.warnings, 25, 600)
  }
}

function boundedArtifactValidation(value: ArtifactValidation) {
  const compact = (issues: ArtifactValidation["errors"]) =>
    issues.slice(0, 25).map(({ path, message }) => ({
      path: truncateUtf8(path, 240),
      message: truncateUtf8(message, 600)
    }))
  return {
    valid: value.valid,
    errors: compact(value.errors),
    warnings: compact(value.warnings)
  }
}

function compactArtifactCandidateProps(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined
  const bulkKeys = new Set([
    "data",
    "nodes",
    "edges",
    "points",
    "areas",
    "lines",
    "flows"
  ])
  const compact: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value).slice(0, 24)) {
    if (bulkKeys.has(key)) continue
    if (typeof item === "string") {
      compact[key] = truncateUtf8(item, 600)
      continue
    }
    let serialized: string | undefined
    try {
      serialized = JSON.stringify(item)
    } catch {
      serialized = undefined
    }
    if (
      serialized !== undefined &&
      Buffer.byteLength(serialized, "utf8") <= 2048
    ) {
      compact[key] = item
    }
  }
  return Object.keys(compact).length > 0 ? compact : undefined
}

function boundedRepresentationCandidate(candidate: any) {
  const props = compactArtifactCandidateProps(candidate?.props)
  return {
    id: truncateUtf8(String(candidate?.id ?? "unknown"), 240),
    kind: candidate?.kind,
    label: truncateUtf8(String(candidate?.label ?? "Unknown outcome"), 240),
    ...(typeof candidate?.component === "string"
      ? { component: truncateUtf8(candidate.component, 120) }
      : {}),
    ...(props ? { props } : {}),
    ...(typeof candidate?.score === "number" ? { score: candidate.score } : {}),
    reasons: boundedArtifactStrings(candidate?.reasons, 8),
    ...(Array.isArray(candidate?.caveats)
      ? { caveats: boundedArtifactStrings(candidate.caveats, 8) }
      : {})
  }
}

function boundedArtifactObligation(obligation: any) {
  return {
    id: truncateUtf8(String(obligation?.id ?? "unknown"), 240),
    relation: obligation?.relation,
    status: obligation?.status,
    message: truncateUtf8(String(obligation?.message ?? ""), 600),
    ...(typeof obligation?.path === "string"
      ? { path: truncateUtf8(obligation.path, 240) }
      : {}),
    ...(typeof obligation?.repair === "string"
      ? { repair: truncateUtf8(obligation.repair, 600) }
      : {}),
    ...(Array.isArray(obligation?.evidenceIds)
      ? { evidenceIds: boundedArtifactStrings(obligation.evidenceIds, 25, 240) }
      : {})
  }
}

function explicitContractError(
  validation: ArtifactValidation,
  policyId: McpArtifactPolicyId
): ToolResult {
  const policy = artifactPolicyIdentity(policyId)
  const contractValidation = boundedArtifactValidation(validation)
  return {
    content: [
      {
        type: "text",
        text: `The explicit artifact contract is invalid under ${policy.id}@${policy.version}. No source, review, or time facts were inferred.`
      }
    ],
    isError: true,
    structuredContent: profileResult({
      status: "invalid-contract",
      policy,
      contractValidation
    })
  }
}

/**
 * A render can turn a compact request into SVG, PNG image output, or Apps
 * result. Never return a partial SVG: an explicit tool error is both safer and
 * more useful to a caller than malformed markup or an opaque transport drop.
 */
function capRenderedToolResult(
  result: ToolResult,
  args: {
    label: string
    maximum: number
    setting: "MCP_MAX_RENDER_OUTPUT_BYTES" | "MCP_MAX_WIDGET_OUTPUT_BYTES"
  }
): ToolResult {
  const limit = inspectMcpOutputLimit(result, args.maximum)
  if (limit.ok) return result

  return {
    content: [
      {
        type: "text" as const,
        text: formatMcpOutputLimitError({
          label: args.label,
          limit,
          setting: args.setting
        })
      }
    ],
    isError: true,
    structuredContent: {
      code: "OUTPUT_LIMIT_EXCEEDED",
      maximumBytes: limit.maximum,
      observedBytes: limit.observed
    }
  }
}

function capRenderChartResult(result: ToolResult): ToolResult {
  const limits = resolveMcpRenderOutputLimits()
  return capRenderedToolResult(result, {
    label: "Rendered chart",
    maximum: limits.maxRenderOutputBytes,
    setting: "MCP_MAX_RENDER_OUTPUT_BYTES"
  })
}

function capInteractiveWidgetResult(result: ToolResult): ToolResult {
  const limits = resolveMcpRenderOutputLimits()
  return capRenderedToolResult(result, {
    label: "Interactive widget",
    maximum: limits.maxWidgetOutputBytes,
    setting: "MCP_MAX_WIDGET_OUTPUT_BYTES"
  })
}

type ToolProfile = McpToolProfile
const SURFACE_VERSION = `${PACKAGE_VERSION}-ai`

function buildInfoForProfile(profile: ToolProfile) {
  return resolveSemioticBuildInfo({
    packageVersion: PACKAGE_VERSION,
    surfaceVersion: SURFACE_VERSION,
    toolProfile: profile
  })
}

function profileResult<T extends Record<string, unknown>>(
  result: T
): T & { surfaceVersion: string } {
  return { ...result, surfaceVersion: SURFACE_VERSION }
}

function schemaAccessibilityGuidance(entry: any) {
  const properties = entry?.parameters?.properties ?? {}
  const directProps = Object.fromEntries(
    ["title", "description", "summary", "accessibleTable"]
      .filter((name) => properties[name])
      .map((name) => [name, properties[name]])
  )
  return {
    directProps,
    chartContainer: {
      component: "ChartContainer",
      requires: ["chartConfig"],
      titleProp: "title",
      subtitleProp: "subtitle",
      describeProp: "describe",
      navigableProp: "navigable",
      description:
        "Use ChartContainer with chartConfig plus describe for a generated L1–L3 description and navigable for a screen-reader navigation tree."
    }
  }
}

function accessibilityRecommendation(
  component: string,
  props: Record<string, unknown>,
  data: Record<string, unknown>[]
) {
  const directProps = schemaAccessibilityGuidance(schemaByComponent[component])
    .directProps as Record<string, unknown>
  const recommendation: Record<string, string> = {}
  const categoryAccessor =
    typeof props.categoryAccessor === "string"
      ? props.categoryAccessor
      : undefined
  const valueAccessor =
    typeof props.valueAccessor === "string" ? props.valueAccessor : undefined

  if (directProps.description && typeof props.description !== "string") {
    recommendation.description =
      categoryAccessor && valueAccessor
        ? `${component} comparing ${valueAccessor} by ${categoryAccessor}.`
        : `${component} chart.`
  }

  if (directProps.summary && typeof props.summary !== "string") {
    const numericRows =
      categoryAccessor && valueAccessor
        ? data
            .map((row) => ({
              category: row[categoryAccessor],
              value: row[valueAccessor]
            }))
            .filter(
              (row): row is { category: unknown; value: number } =>
                typeof row.value === "number" && Number.isFinite(row.value)
            )
        : []
    const highest = numericRows.reduce<
      { category: unknown; value: number } | undefined
    >(
      (current, row) => (!current || row.value > current.value ? row : current),
      undefined
    )
    recommendation.summary = highest
      ? `${String(highest.category)} is highest at ${highest.value}. Use arrow keys to move between chart marks.`
      : "Use arrow keys to move between chart marks."
  }

  return Object.keys(recommendation).length > 0
    ? {
        location: "direct-component-props",
        props: recommendation,
        chartContainer: schemaAccessibilityGuidance(
          schemaByComponent[component]
        ).chartContainer
      }
    : undefined
}

async function getSchemaHandler(args: {
  component?: string
}): Promise<ToolResult> {
  const component = args.component

  const availableComponents = allComponentNames.map((name) => ({
    name,
    schemaResourceUri: schemaResourceUriForComponent(name),
    renderable: metadataForComponent(name).renderable,
    requiresLiveData: metadataForComponent(name).requiresLiveData
  }))

  if (!component) {
    const list = availableComponents.map(({ name, renderable }) =>
      renderable ? `${name} [renderable]` : name
    )

    return {
      content: [
        {
          type: "text" as const,
          text: `Available components (${allComponentNames.length}):\n${list.join(", ")}\n\nComponents marked [renderable] can be rendered to SVG via renderChart (pass theme parameter for styled output). Others (Realtime*) require a browser environment.\n\nFor compact guidance, read semiotic://system-prompt and semiotic://behavior-contracts. Retrieve semiotic://examples only when a nearby working pattern is needed; the complete schema and surface manifest are discovery/debugging resources, not default context.\n\nAll charts support CSS custom properties for theming (--semiotic-bg, --semiotic-text, --semiotic-grid, etc.) and <ThemeProvider>. Use COLOR_BLIND_SAFE_CATEGORICAL (import from semiotic/themes) for accessible color palettes.\n\nPass { component: '<name>' } to get the prop schema for a specific component.`
        }
      ],
      structuredContent: profileResult({
        status: "component-list",
        availableComponents
      })
    }
  }

  const entry = schemaByComponent[component]

  if (!entry) {
    const available = Object.keys(schemaByComponent).sort()

    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown component "${component}". Available: ${available.join(", ")}`
        }
      ],
      structuredContent: profileResult({
        status: "unknown-component",
        component,
        availableComponents
      }),
      isError: true
    }
  }

  const renderable = metadataForComponent(component).renderable
  const requiresLiveData = metadataForComponent(component).requiresLiveData
  const renderableNote = renderable
    ? "This component can be rendered to SVG via renderChart."
    : "This component requires a browser environment and cannot be rendered via renderChart."

  const contracts = behaviorContractsFor({
    component,
    props: {}
  })

  const contractText =
    contracts.length > 0
      ? `\n\nBehavior contracts:\n${JSON.stringify(contracts, null, 2)}`
      : ""

  return {
    content: [
      {
        type: "text" as const,
        text: `${renderableNote}\n\n${JSON.stringify(entry, null, 2)}${contractText}`
      }
    ],
    structuredContent: profileResult({
      status: "component-schema",
      component,
      resourceUri: schemaResourceUriForComponent(component),
      renderable,
      requiresLiveData,
      schema: entry,
      accessibility: schemaAccessibilityGuidance(entry),
      behaviorContracts: contracts
    })
  }
}

// Map the suggestCharts (plural, capability-engine) 13-intent taxonomy onto
// this heuristic engine's 8 intents, so an agent that learned one tool's
// vocabulary isn't hard-rejected by the other. Unmapped custom intents are
// dropped (the tool returns general suggestions, matching the plural tool's
// custom-intent tolerance) rather than erroring.
const SUGGEST_INTENT_ALIASES: Record<string, string> = {
  "compare-series": "comparison",
  "compare-categories": "comparison",
  rank: "comparison",
  "part-to-whole": "composition",
  "composition-over-time": "composition",
  correlation: "relationship",
  flow: "network",
  geo: "geographic",
  "outlier-detection": "distribution",
  "change-detection": "trend"
}

async function suggestChartHandler(args: {
  data?: any[]
  intent?: string
  capabilities?: {
    push?: boolean
    linkedHover?: boolean
    ssr?: boolean
    selection?: boolean
    legend?: boolean
  }
}): Promise<ToolResult> {
  // Translate the broader suggestCharts vocabulary into this engine's space;
  // drop anything neither vocabulary recognizes rather than hard-rejecting it.
  let intent = args.intent
  if (intent && SUGGEST_INTENT_ALIASES[intent])
    intent = SUGGEST_INTENT_ALIASES[intent]
  if (intent && !VALID_INTENTS.includes(intent)) intent = undefined
  const result = suggestCharts({ ...args, intent })
  const content = [
    { type: "text" as const, text: formatSuggestionReport(result) }
  ]
  if (!result.ok) {
    return { content, isError: true, structuredContent: result }
  }
  return { content, structuredContent: result }
}

async function renderChartHandler(
  args: {
    component?: string
    props?: Record<string, any>
    theme?: Record<string, string>
    format?: string
    contract?: Record<string, unknown>
  },
  context: RenderContext = {}
): Promise<ToolResult> {
  const limits = context.limits ?? resolveMcpRenderExecutionLimits()
  const signal = context.signal
  const component = args.component
  const props: Record<string, any> = args.props ?? {}
  const theme = args.theme
  const format = args.format || "svg"

  if (!component) {
    return capRenderChartResult({
      content: [
        {
          type: "text" as const,
          text: `Missing 'component' field. Provide { component: '<name>', props: { ... } }. Available: ${componentNames.join(", ")}`
        }
      ],
      isError: true
    })
  }

  if (!COMPONENT_REGISTRY[component]) {
    if (schemaByComponent[component]) {
      const metadata = metadataForComponent(component)
      const environment = metadata.requiresLiveData
        ? "live-data browser"
        : "browser"
      return capRenderChartResult({
        content: [
          {
            type: "text" as const,
            text: `Component "${component}" is known but cannot be rendered via renderChart. It requires a ${environment} environment. Renderable components: ${componentNames.join(", ")}`
          }
        ],
        isError: true
      })
    }

    return capRenderChartResult({
      content: [
        {
          type: "text" as const,
          text: `Unknown component "${component}". Available: ${componentNames.join(", ")}`
        }
      ],
      isError: true
    })
  }

  let result: ReturnType<typeof renderHOCToSVG>
  try {
    result = await runRenderStep(
      "render work",
      limits.maxRenderWorkMs,
      signal,
      () => renderHOCToSVG(component, props)
    )
  } catch (err) {
    if (isRenderExecutionError(err)) {
      return capRenderChartResult(
        renderExecutionErrorResult(err.message, err.code)
      )
    }
    throw err
  }
  if (result.error) {
    return capRenderChartResult({
      content: [{ type: "text" as const, text: result.error }],
      isError: true
    })
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
  let evidenceBlock: ToolTextContent | null = null
  try {
    const renderWithContractEvidence = renderChartWithEvidence as unknown as (
      component: never,
      props: Record<string, any>,
      options?: { artifactContract?: Record<string, unknown> }
    ) => ReturnType<typeof renderChartWithEvidence>
    const { svg: evidenceSvg, evidence } = await runRenderStep(
      "layout/render evidence",
      limits.maxRenderWorkMs,
      signal,
      () =>
        renderWithContractEvidence(
          component as never,
          props,
          args.contract ? { artifactContract: args.contract } : undefined
        )
    )
    svg = evidenceSvg
    evidenceBlock = {
      type: "text" as const,
      text: `Render evidence:\n${JSON.stringify(evidence, null, 2)}`
    }
  } catch (err) {
    if (isRenderExecutionError(err)) {
      return capRenderChartResult(
        renderExecutionErrorResult(err.message, (err as any).code)
      )
    }
    // No server render config for this component — say so explicitly rather
    // than silently omitting the block, so an agent can distinguish "no
    // evidence is produced for this component" from "evidence was forgotten".
    // The SVG above is still the validated React-SSR render.
    evidenceBlock = {
      type: "text" as const,
      text: `Render evidence: unavailable for ${component} (no server render config). The SVG above is the validated React render; mark-count / domain evidence is only produced for components with a server render path.`
    }
  }

  // Inject theme CSS custom properties into the SVG root element.
  // We add a <style> block inside the SVG rather than wrapping in a <div>,
  // because sharp requires pure SVG input for PNG rasterization.
  if (theme && Object.keys(theme).length > 0) {
    try {
      svg = await runRenderStep(
        "theme application",
        limits.maxRenderWorkMs,
        signal,
        () => applySvgTheme(svg, theme)
      )
    } catch (err) {
      if (isRenderExecutionError(err)) {
        return capRenderChartResult(
          renderExecutionErrorResult(err.message, (err as any).code)
        )
      }
      throw err
    }
  }

  // PNG rasterization via sharp (optional dependency)
  if (format === "png") {
    try {
      const pngBuffer: Buffer = await runRenderStep(
        "PNG conversion",
        limits.maxPngConversionMs,
        signal,
        async () => {
          const sharpMod = await (Function(
            'return import("sharp")'
          )() as Promise<any>)
          const sharpFn = sharpMod.default || sharpMod
          return sharpFn(Buffer.from(svg)).png().toBuffer()
        }
      )
      const base64 = pngBuffer.toString("base64")
      return capRenderChartResult({
        content: [
          { type: "image", data: base64, mimeType: "image/png" },
          ...(evidenceBlock ? [evidenceBlock] : [])
        ]
      })
    } catch (err: unknown) {
      if (isRenderExecutionError(err)) {
        return capRenderChartResult(
          renderExecutionErrorResult((err as any).message, (err as any).code)
        )
      }
      const typedErr = err as { code?: string; message?: string }
      if (
        typedErr.code === "MODULE_NOT_FOUND" ||
        typedErr.code === "ERR_MODULE_NOT_FOUND"
      ) {
        return capRenderChartResult({
          content: [
            {
              type: "text" as const,
              text: `PNG output requires the 'sharp' package. Install it with: npm install sharp\n\nFalling back to SVG output:\n\n${svg}`
            }
          ]
        })
      }
      return capRenderChartResult({
        content: [
          {
            type: "text" as const,
            text: `PNG conversion failed: ${typedErr.message || "unknown error"}\n\nSVG output:\n\n${svg}`
          }
        ],
        isError: true
      })
    }
  }

  return capRenderChartResult({
    content: [
      { type: "text" as const, text: svg },
      ...(evidenceBlock ? [evidenceBlock] : [])
    ]
  })
}

async function renderInteractiveChartHandler(
  args: {
    component?: string
    props?: Record<string, any>
    theme?: Record<string, string>
  },
  context: RenderContext = {}
): Promise<ToolResult> {
  const limits = context.limits ?? resolveMcpRenderExecutionLimits()
  const signal = context.signal
  const component = args.component
  const props: Record<string, any> = args.props ?? {}
  const rendered = await renderChartHandler(
    {
      component,
      props,
      theme: args.theme,
      format: "svg"
    },
    context
  )

  if (rendered.isError) return rendered

  const svgBlock = rendered.content.find(
    (block): block is ToolTextContent =>
      block.type === "text" && block.text.trimStart().startsWith("<")
  )
  let svg: string
  try {
    svg = await runRenderStep(
      "interactive SVG sanitization",
      limits.maxInteractiveSanitizeMs,
      signal,
      () => sanitizeSvgForWidget(svgBlock?.text ?? "")
    )
  } catch (err) {
    if (isRenderExecutionError(err)) {
      return capInteractiveWidgetResult(
        renderExecutionErrorResult(err.message, (err as any).code)
      )
    }
    return capInteractiveWidgetResult({
      content: [
        { type: "text" as const, text: "Interactive SVG sanitization failed." }
      ],
      isError: true
    })
  }
  const outputLimits = resolveMcpRenderOutputLimits()
  const evidence = createWidgetEvidencePreview(
    parseRenderEvidence(rendered),
    outputLimits
  )
  const dataPreview = createWidgetDataPreview(props, outputLimits)
  const title = chartTitleFromProps(component || "Semiotic chart", props)
  const datumCount = chartDatumCount(props)
  const summary = [
    `Rendered ${title} with ${component}.`,
    datumCount == null
      ? "No row count was inferred from props."
      : `${datumCount} input row${datumCount === 1 ? "" : "s"} available in the widget data drawer.`,
    "Use the widget controls to zoom, fit width, inspect data, and inspect render evidence."
  ].join(" ")

  return capInteractiveWidgetResult({
    content: [
      {
        type: "text" as const,
        text: `Rendered ${title} (${component}) as an interactive ChatGPT Apps widget.`
      }
    ],
    structuredContent: {
      component: component ?? "SemioticChart",
      title,
      summary,
      datumCount,
      evidence
    },
    _meta: {
      component: component ?? "SemioticChart",
      title,
      dataPreview,
      svg,
      evidence,
      generatedAt: new Date().toISOString()
    }
  })
}

function filterUsageModeDiagnoses(
  component: string,
  usageMode: "static" | "push",
  diagnoses: any[]
) {
  if (dataRequiredForUsageMode(component, usageMode)) return diagnoses
  return diagnoses.filter(
    (d: any) =>
      d.code !== "VALIDATION" ||
      d.message !== `"data" is required for ${component}.`
  )
}

async function diagnoseConfigHandler(args: {
  component?: string
  props?: Record<string, any>
  usageMode?: string
}): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}
  const usageMode = normalizeUsageMode(args.usageMode)

  if (!component) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }."
        }
      ],
      isError: true
    }
  }

  const result = diagnoseConfig(component, props)
  const diagnoses = filterUsageModeDiagnoses(
    component,
    usageMode,
    result.diagnoses
  )
  const ok = diagnoses.every((d: any) => d.severity === "warning")
  const usageModeNote =
    usageMode === "push"
      ? "Usage mode: push (data prop may be omitted; use a ref to push data).\n\n"
      : ""

  if (ok) {
    const warnings = diagnoses.filter((d: any) => d.severity === "warning")
    const msg =
      warnings.length > 0
        ? `Configuration looks good with ${warnings.length} warning(s):\n${warnings.map((w: any) => `⚠ [${w.code}] ${w.message}\n  Fix: ${w.fix}`).join("\n")}`
        : `✓ Configuration looks good — no issues detected.`
    const contracts = formatDoctorBehaviorContracts(
      behaviorContractsFor({ component, props })
    )
    return {
      content: [
        {
          type: "text" as const,
          text: `${usageModeNote}${contracts ? `${msg}\n\n${contracts}` : msg}`
        }
      ]
    }
  }

  const lines = diagnoses.map((d: any) => {
    const icon = d.severity === "error" ? "✗" : "⚠"
    const fixLine = d.fix ? `\n  Fix: ${d.fix}` : ""
    return `${icon} [${d.code}] ${d.message}${fixLine}`
  })
  return {
    content: [
      {
        type: "text" as const,
        text: [
          usageModeNote.trim(),
          lines.join("\n"),
          formatDoctorBehaviorContracts(
            behaviorContractsFor({ component, props })
          )
        ]
          .filter(Boolean)
          .join("\n\n")
      }
    ],
    isError: true
  }
}

async function auditAccessibilityHandler(args: {
  component?: string
  props?: Record<string, any>
  inChartContainer?: boolean
  describe?: boolean
  navigable?: boolean
}): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}

  if (!component) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }."
        }
      ],
      isError: true
    }
  }

  const result = auditAccessibility(component, props, {
    inChartContainer: args.inChartContainer === true,
    describe: args.describe === true,
    navigable: args.navigable === true
  })
  return {
    content: [
      { type: "text" as const, text: formatAccessibilityAudit(result) }
    ],
    // Only block on provable critical failures; warnings/manual items are advisory.
    isError: !result.ok
  }
}

async function evaluateChartHandler(args: {
  component?: string
  props?: Record<string, any>
  data?: Array<Record<string, unknown>>
  inChartContainer?: boolean
  describe?: boolean
  navigable?: boolean
}): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}

  if (!component) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... }, data?: [...] }."
        }
      ],
      isError: true
    }
  }

  const result = evaluateChart(component, props, args.data, {
    inChartContainer: args.inChartContainer === true,
    describe: args.describe === true,
    navigable: args.navigable === true
  })
  return {
    content: [{ type: "text" as const, text: formatEvaluateChart(result) }],
    structuredContent: result as unknown as Record<string, unknown>,
    isError: !result.ok
  }
}

async function auditMobileVisualizationHandler(args: {
  component?: string
  props?: Record<string, any>
  viewportWidth?: number
  targetSize?: number
  inChartContainer?: boolean
}): Promise<ToolResult> {
  const component = args.component
  const props: Record<string, any> = args.props ?? {}

  if (!component) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }."
        }
      ],
      isError: true
    }
  }

  const result = auditMobileVisualization(component, props, {
    viewportWidth:
      typeof args.viewportWidth === "number" ? args.viewportWidth : undefined,
    targetSize:
      typeof args.targetSize === "number" ? args.targetSize : undefined,
    inChartContainer: args.inChartContainer === true
  })
  return {
    content: [
      { type: "text" as const, text: formatMobileVisualizationAudit(result) }
    ],
    // Block only on high-risk mobile issues; medium/low warnings remain advisory.
    isError: !result.ok
  }
}

async function reportIssueHandler(args: {
  title?: string
  body?: string
  labels?: string[] | string
}): Promise<ToolResult> {
  const title = args.title
  const body = args.body
  const labels = args.labels

  if (!title) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Missing 'title' field. Provide { title: 'Bug: ...', body: '...', labels?: ['bug'] }."
        }
      ],
      isError: true
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
    content: [
      {
        type: "text" as const,
        text: `Open this URL to submit the issue:\n\n${url}`
      }
    ]
  }
}

// Named theme presets → their exported constant name in `semiotic/themes`.
// Inlined (not imported) to avoid a runtime dependency on the themes bundle;
// kept honest by the applyTheme test, which asserts every export name resolves
// against the real module.
const THEME_PRESETS: Record<string, string> = {
  light: "LIGHT_THEME",
  dark: "DARK_THEME",
  "high-contrast": "HIGH_CONTRAST_THEME",
  pastels: "PASTELS_LIGHT",
  "pastels-dark": "PASTELS_DARK",
  "bi-tool": "BI_TOOL_LIGHT",
  "bi-tool-dark": "BI_TOOL_DARK",
  italian: "ITALIAN_LIGHT",
  "italian-dark": "ITALIAN_DARK",
  tufte: "TUFTE_LIGHT",
  "tufte-dark": "TUFTE_DARK",
  journalist: "JOURNALIST_LIGHT",
  "journalist-dark": "JOURNALIST_DARK",
  playful: "PLAYFUL_LIGHT",
  "playful-dark": "PLAYFUL_DARK",
  carbon: "CARBON_LIGHT",
  "carbon-dark": "CARBON_DARK"
}
const THEME_PRESET_NAMES = Object.keys(THEME_PRESETS)

async function applyThemeHandler(args: { name?: string }): Promise<ToolResult> {
  const name = args.name

  if (!name) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Available theme presets:\n${THEME_PRESET_NAMES.join(", ")}\n\nPass { name: "tufte" } to get the CSS custom properties and ThemeProvider usage for that theme.\n\nLight-mode presets: ${THEME_PRESET_NAMES.filter((n) => !n.includes("dark")).join(", ")}\nDark-mode presets: ${THEME_PRESET_NAMES.filter((n) => n.includes("dark")).join(", ")}`
        }
      ]
    }
  }

  if (!THEME_PRESET_NAMES.includes(name)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Unknown theme "${name}". Available: ${THEME_PRESET_NAMES.join(", ")}`
        }
      ],
      isError: true
    }
  }

  // The exported constant for this preset (e.g. "tufte" → TUFTE_LIGHT). Used
  // verbatim in the import + reference so the generated snippets compile.
  const exportName = THEME_PRESETS[name]
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
    `import { ${exportName} } from "semiotic/themes"`,
    `<ThemeProvider theme={${exportName}}>`,
    `  <BarChart ... />`,
    `</ThemeProvider>`,
    "```",
    "",
    "### Option 3: CSS custom properties (no React required)",
    "```jsx",
    `import { themeToCSS, ${exportName} } from "semiotic/themes"`,
    `const css = themeToCSS(${exportName}, ".my-charts")`,
    "// Outputs CSS custom properties string for embedding in a stylesheet",
    "```",
    "",
    "### Option 4: Design tokens JSON",
    "```jsx",
    `import { themeToTokens, ${exportName} } from "semiotic/themes"`,
    `const tokens = themeToTokens(${exportName})`,
    "// Style Dictionary / DTCG-compatible token format",
    "```",
    "",
    'For accessibility, consider `"high-contrast"` which uses `COLOR_BLIND_SAFE_CATEGORICAL` (Wong 2011 palette).'
  ]

  return {
    content: [{ type: "text" as const, text: usage.join("\n") }]
  }
}

function profileInputFromVariantArgs(args: {
  data?: unknown[]
  props?: Record<string, unknown>
}): {
  data: Record<string, unknown>[]
  rawInput?: unknown
} {
  const props = args.props ?? {}
  if (Array.isArray(args.data)) {
    return { data: args.data as Record<string, unknown>[] }
  }
  if (Array.isArray(props.data)) {
    return { data: props.data as Record<string, unknown>[] }
  }
  if (
    Array.isArray(props.nodes) &&
    (Array.isArray(props.edges) || Array.isArray(props.links))
  ) {
    return {
      data: [],
      rawInput: {
        nodes: props.nodes,
        edges: props.edges ?? props.links
      }
    }
  }
  if (
    props.data &&
    typeof props.data === "object" &&
    !Array.isArray(props.data)
  ) {
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

/**
 * Produce the JSON-safe, policy-filtered variant shape used by every MCP
 * proposal surface. Keeping this here prevents improveChart from returning
 * raw build callbacks or bypassing the same fit and identifier safeguards as
 * proposeChartVariants.
 */
function rankVariantProposals(
  component: string,
  profile: ChartDataProfile,
  options: {
    audience?: AudienceProfile
    intent?: IntentId[]
    maxResults?: number
  } = {}
) {
  const capability = getCapability(component)
  if (!capability) return { fitReason: undefined, proposals: [] }
  const proposals = proposeVariant(component, capability, {
    profile,
    audience: options.audience,
    intent: options.intent,
    existingVariants: capability.variants
  })
  const ranked = proposals
    .map((proposal) => {
      const score = evaluateVariantProposal(
        proposal,
        profile,
        options.audience,
        {
          intent: options.intent,
          baselineComponent: component
        }
      )
      const { buildProps: _buildProps, ...proposalMeta } = proposal
      return {
        proposal: proposalMeta,
        score,
        props: buildVariantProposalProps(proposal, profile, options.audience)
      }
    })
    .filter((entry) => !(entry.score as { rejected?: boolean }).rejected)
    .sort((a, b) => {
      if (b.score.fit !== a.score.fit) return b.score.fit - a.score.fit
      if (a.score.risk !== b.score.risk) return a.score.risk - b.score.risk
      return b.score.novelty - a.score.novelty
    })
    .slice(0, options.maxResults ?? 8)
  return { fitReason: capability.fits(profile), proposals: ranked }
}

async function proposeChartVariantsHandler(args: {
  component: string
  props?: Record<string, unknown>
  data?: unknown[]
  intent?: string | string[]
  maxResults?: number
  audience?: AudienceProfile
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const { component, intent, maxResults, audience } = args
  const capability = getCapability(component)
  if (!capability) {
    return {
      content: [
        {
          type: "text",
          text: `No chart capability registered for "${component}". Call suggestCharts first to pick from known capability components.`
        }
      ],
      isError: true
    }
  }

  const { data, rawInput } = profileInputFromVariantArgs(args)
  const profile = profileData(data, {
    rawInput,
    identifiers: args.identifiers,
    fieldRoles: args.fieldRoles
  })
  const intentArg = (
    Array.isArray(intent) ? intent : intent ? [intent] : undefined
  ) as IntentId[] | undefined
  const { fitReason, proposals: ranked } = rankVariantProposals(
    component,
    profile,
    {
      audience,
      intent: intentArg,
      maxResults
    }
  )

  const lines: string[] = [
    `${ranked.length} variant proposal${ranked.length === 1 ? "" : "s"} for ${component}${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}:`,
    ...(fitReason ? [`Base chart fit warning: ${fitReason}`] : []),
    "",
    ...ranked.map((entry, i) => {
      const label =
        entry.proposal.label ?? entry.proposal.variantKey ?? entry.proposal.id
      const tags = entry.proposal.tags?.length
        ? ` [${entry.proposal.tags.join(", ")}]`
        : ""
      const reasons = entry.score.reasons.length
        ? `\n   ${entry.score.reasons.join("; ")}`
        : ""
      return `${i + 1}. ${entry.proposal.baseComponent} / ${label}${tags} (fit ${entry.score.fit.toFixed(1)}/5, novelty ${entry.score.novelty.toFixed(2)}, risk ${entry.score.risk.toFixed(2)})${reasons}`
    })
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
        hasGeo: profile.hasGeo
      },
      fitReason,
      proposals: ranked
    }
  }
}

async function suggestChartsHandler(args: {
  data: unknown[]
  intent?: string | string[]
  maxResults?: number
  allow?: string[]
  deny?: string[]
  audience?: AudienceProfile
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const {
    data,
    intent,
    maxResults,
    allow,
    deny,
    audience,
    identifiers,
    fieldRoles
  } = args
  const intentArg = (
    Array.isArray(intent) ? intent : intent ? [intent] : undefined
  ) as IntentId[] | undefined

  const suggestionOptions = {
    intent: intentArg,
    allow,
    deny,
    maxResults: maxResults ?? 8,
    audience,
    identifiers,
    fieldRoles
  }
  const suggestions = suggestChartsFromCapabilities(
    data as Record<string, unknown>[],
    suggestionOptions
  )

  const lines: string[] = [
    `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} for ${(data as unknown[]).length} rows${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}:`,
    "",
    ...suggestions.map((s, i) => {
      const variantTag = s.variant ? ` / ${s.variant.label}` : ""
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      const caveats = s.caveats.length
        ? `\n   caveats: ${s.caveats.join("; ")}`
        : ""
      return `${i + 1}. ${s.component}${variantTag} (score ${s.score.toFixed(1)}/5, familiarity ${s.rubric.familiarity}, accuracy ${s.rubric.accuracy})${reasons}${caveats}`
    })
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { suggestions }
  }
}

const ALLOWED_TOKEN_TASK_INTENTS: readonly TokenTaskIntent[] = [
  "precise-comparison",
  "frequency-reasoning",
  "probability-estimation",
  "risk-communication",
  "memory",
  "editorial-engagement",
  "public-explanation",
  "support-decision",
  "measure",
  "estimate probability",
  "understand risk",
  "remember",
  "decide"
]

function isTokenTaskIntent(value: string): value is TokenTaskIntent {
  return (ALLOWED_TOKEN_TASK_INTENTS as readonly string[]).includes(value)
}

async function suggestTokenEncodingHandler(args: {
  taskIntent?: string
  dataType?:
    "count" | "measure" | "distribution" | "probability" | "risk" | "category"
  audience?: "expert" | "general-public" | "internal"
  precisionNeed?: "low" | "medium" | "high"
  availableSpace?: "small" | "medium" | "large"
  concreteEntity?: string
}): Promise<ToolResult> {
  if (!args.taskIntent) {
    return {
      content: [
        {
          type: "text",
          text: "Missing 'taskIntent'. Provide a token task such as 'estimate probability', 'understand risk', 'remember', 'measure', or 'decide'."
        }
      ],
      isError: true
    }
  }
  if (!isTokenTaskIntent(args.taskIntent)) {
    return {
      content: [
        {
          type: "text",
          text: `Invalid 'taskIntent': "${args.taskIntent}". Expected one of: ${ALLOWED_TOKEN_TASK_INTENTS.join(", ")}.`
        }
      ],
      isError: true
    }
  }

  const taskIntent = args.taskIntent
  const suggestion = suggestTokenEncoding({
    taskIntent,
    dataType: args.dataType,
    audience: args.audience,
    precisionNeed: args.precisionNeed,
    availableSpace: args.availableSpace,
    concreteEntity: args.concreteEntity
  })
  const capabilityIntents = tokenTaskIntentToCapabilityIntents(taskIntent)
  const warnings = suggestion.warnings.length
    ? `\nWarnings:\n${suggestion.warnings.map((warning) => `- [${warning.code}] ${warning.message}`).join("\n")}`
    : ""
  const encoding = suggestion.tokenEncoding
    ? `\nEncoding:\n${JSON.stringify(suggestion.tokenEncoding, null, 2)}`
    : ""

  return {
    content: [
      {
        type: "text",
        text: [
          `Recommended token encoding: ${suggestion.recommendedEncoding}`,
          `Rationale: ${suggestion.rationale}`,
          `Capability intents: ${capabilityIntents.join(", ")}`,
          encoding.trim(),
          warnings.trim(),
          `Alternatives: ${suggestion.alternatives.join(", ")}`
        ]
          .filter(Boolean)
          .join("\n\n")
      }
    ],
    structuredContent: { suggestion, capabilityIntents }
  }
}

async function suggestStreamChartsHandler(args: {
  schema: StreamSchema
  intent?: string | string[]
  maxResults?: number
}): Promise<ToolResult> {
  const { schema, intent, maxResults } = args
  const intentArg = (
    Array.isArray(intent) ? intent : intent ? [intent] : undefined
  ) as IntentId[] | undefined

  const suggestions = suggestStreamChartsFromCapabilities(schema, {
    intent: intentArg,
    maxResults: maxResults ?? 8
  })

  const lines: string[] = [
    `${suggestions.length} stream chart suggestion${suggestions.length === 1 ? "" : "s"}${intentArg ? ` (intent: ${intentArg.join(", ")})` : ""}`,
    ...(schema.throughput ? [`throughput: ${schema.throughput}`] : []),
    ...(schema.retention ? [`retention: ${schema.retention}`] : []),
    "",
    ...suggestions.map((s, i) => {
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      const caveats = s.caveats.length
        ? `\n   caveats: ${s.caveats.join("; ")}`
        : ""
      return `${i + 1}. ${s.component} (score ${s.score.toFixed(1)}/5)${reasons}${caveats}`
    })
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { suggestions, schema }
  }
}

async function suggestDashboardHandler(args: {
  data: unknown[]
  intents?: string[]
  maxPanels?: number
  diversifyByFamily?: boolean
  audience?: AudienceProfile
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const {
    data,
    intents,
    maxPanels,
    diversifyByFamily,
    audience,
    identifiers,
    fieldRoles
  } = args
  const dashboard = suggestDashboardFromCapabilities(
    data as Record<string, unknown>[],
    {
      intents: intents as IntentId[] | undefined,
      maxPanels: maxPanels ?? 6,
      diversifyByFamily: diversifyByFamily !== false,
      audience,
      identifiers,
      fieldRoles
    }
  )

  const lines: string[] = []
  lines.push(
    `Dashboard: ${dashboard.panels.length} panels covering ${dashboard.intentsCovered.join(", ") || "—"}`
  )
  if (dashboard.intentsMissing.length) {
    lines.push(
      `Intents this data couldn't fill: ${dashboard.intentsMissing.join(", ")}`
    )
  }
  lines.push("")
  for (let i = 0; i < dashboard.panels.length; i++) {
    const { intent, suggestion } = dashboard.panels[i]
    const variantTag = suggestion.variant
      ? ` / ${suggestion.variant.label}`
      : ""
    lines.push(
      `${i + 1}. [${intent}] ${suggestion.component}${variantTag} (score ${suggestion.score.toFixed(1)}/5)`
    )
    if (suggestion.reasons.length)
      lines.push(`   ${suggestion.reasons.join("; ")}`)
  }
  if (dashboard.stretchPanels.length > 0) {
    lines.push("")
    lines.push(`Stretch picks (audience-unfamiliar but fitting):`)
    for (const stretch of dashboard.stretchPanels) {
      const variantTag = stretch.suggestion.variant
        ? ` / ${stretch.suggestion.variant.label}`
        : ""
      lines.push(
        `  ${stretch.suggestion.component}${variantTag} (familiarity ${stretch.familiarity}) — ${stretch.rationale}`
      )
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: dashboard as unknown as Record<string, unknown>
  }
}

async function suggestStretchChartsHandler(args: {
  data: unknown[]
  audience: AudienceProfile
  intent?: string | string[]
  maxResults?: number
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const { data, audience, intent, maxResults, identifiers, fieldRoles } = args
  const intentArg = (
    Array.isArray(intent) ? intent : intent ? [intent] : undefined
  ) as IntentId[] | undefined

  const stretches = suggestStretchChartsFromCapabilities(
    data as Record<string, unknown>[],
    {
      audience,
      intent: intentArg,
      maxResults: maxResults ?? 5,
      identifiers,
      fieldRoles
    }
  )

  const lines: string[] = [
    `${stretches.length} stretch pick${stretches.length === 1 ? "" : "s"} for "${audience.name ?? "audience"}":`,
    "",
    ...stretches.map((s, i) => {
      const variantTag = s.suggestion.variant
        ? ` / ${s.suggestion.variant.label}`
        : ""
      const replacing = s.replacing ? ` (could replace ${s.replacing})` : ""
      return `${i + 1}. ${s.suggestion.component}${variantTag} (familiarity ${s.familiarity}/5)${replacing}\n   ${s.rationale}`
    })
  ]

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { stretches, audience: audience.name ?? null }
  }
}

async function repairChartConfigHandler(args: {
  component: string
  data: unknown[]
  intent?: string | string[]
  maxAlternatives?: number
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const { component, data, intent, maxAlternatives, identifiers, fieldRoles } =
    args
  const intentArg = (
    Array.isArray(intent) ? intent : intent ? [intent] : undefined
  ) as IntentId[] | undefined

  const result = repairChartConfigFromCapabilities(
    component,
    data as Record<string, unknown>[],
    {
      intent: intentArg,
      maxAlternatives: maxAlternatives ?? 3,
      identifiers,
      fieldRoles
    }
  )

  const lines: string[] = []
  if (result.status === "ok") {
    lines.push(`✅ ${component} fits this dataset — no repair needed.`)
  } else if (result.status === "alternative") {
    lines.push(`⚠ ${component} doesn't fit: ${result.reason}`)
    lines.push("")
    lines.push(
      `Alternatives that fit${intentArg ? ` (ranked by intent: ${intentArg.join(", ")})` : ""}:`
    )
    for (let i = 0; i < result.alternatives.length; i++) {
      const s = result.alternatives[i]
      const variantTag = s.variant ? ` / ${s.variant.label}` : ""
      const reasons = s.reasons.length ? ` — ${s.reasons.join("; ")}` : ""
      lines.push(
        `${i + 1}. ${s.component}${variantTag} (score ${s.score.toFixed(1)}/5)${reasons}`
      )
    }
  } else {
    lines.push(
      `❓ No capability registered for "${component}". Closest matches:`
    )
    for (let i = 0; i < result.alternatives.length; i++) {
      const s = result.alternatives[i]
      lines.push(
        `${i + 1}. ${s.component} (${s.family}, score ${s.score.toFixed(1)}/5)`
      )
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: result as unknown as Record<string, unknown>
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
    {
      type: "text",
      text: `Statistical summary for ${component}:\n${JSON.stringify(summary, null, 2)}`
    }
  ]

  if (query) {
    content.push({
      type: "text",
      text: `User Question: "${query}"\n\nContextual instructions:\n1. Analyze the statistical summary to answer the question.\n2. Return a natural language response.\n3. Optionally suggest a JSON array of Semiotic annotations to visually highlight the answer on the chart (e.g. { type: "callout", x: "Mar", y: 1500, label: "Peak month" }).\n4. Use the accessor names from the provided props (e.g. xAccessor, yAccessor).`
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
      content: [
        {
          type: "text" as const,
          text: "Missing 'component' field. Provide { component: 'LineChart', props: { ... } }."
        }
      ],
      isError: true
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
    grounding.text
  ]

  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    structuredContent: grounding as unknown as Record<string, unknown>
  }
}

function compactPublicChartProps(
  props: Record<string, unknown>
): Record<string, unknown> {
  const compact = { ...props }
  delete compact.data
  delete compact.nodes
  delete compact.edges
  return compact
}

function compactPublicSuggestion<T extends { props: Record<string, unknown> }>(
  suggestion: T
): Omit<T, "props"> & { props: Record<string, unknown> } {
  return { ...suggestion, props: compactPublicChartProps(suggestion.props) }
}

async function createChartHandler(
  args: {
    data: Record<string, unknown>[]
    intent?: string | string[]
    audience?: AudienceProfile
    component?: string
    props?: Record<string, unknown>
    theme?: Record<string, string>
    identifiers?: string[]
    fieldRoles?: McpProfileFieldRoleHints
  },
  context: RenderContext = {}
): Promise<ToolResult> {
  const intent = (
    Array.isArray(args.intent)
      ? args.intent
      : args.intent
        ? [args.intent]
        : undefined
  ) as IntentId[] | undefined
  const suggestions = suggestChartsFromCapabilities(args.data, {
    intent,
    audience: args.audience,
    maxResults: 40,
    identifiers: args.identifiers,
    fieldRoles: args.fieldRoles
  })
    .filter(
      (suggestion) => metadataForComponent(suggestion.component).renderable
    )
    .slice(0, 8)
  const selected = args.component
    ? suggestions.find((suggestion) => suggestion.component === args.component)
    : suggestions[0]
  if (!selected) {
    return {
      content: [
        {
          type: "text",
          text: "No renderable Semiotic chart was suggested for this data. Use getChartSchema for code-level guidance."
        }
      ],
      isError: true,
      structuredContent: profileResult({
        status: "no-suggestion",
        suggestions: suggestions.map(compactPublicSuggestion),
        dataRowCount: args.data.length
      })
    }
  }
  // Keep capability-built data shapes (for example hierarchy roots or
  // nodes/edges) and explicit caller overrides. args.data is the profiling
  // input, not necessarily the final component's `data` prop shape.
  const props = { data: args.data, ...selected.props, ...args.props }
  const publicProps = compactPublicChartProps(props)
  const publicSuggestion = compactPublicSuggestion(selected)
  const diagnosis = diagnoseConfig(selected.component, props)
  const blocking = diagnosis.diagnoses.filter(
    (item: any) => item.severity === "error"
  )
  if (blocking.length) {
    return {
      content: [
        {
          type: "text",
          text: `Selected ${selected.component}, but blocking diagnostics require repair before rendering.`
        }
      ],
      isError: true,
      structuredContent: profileResult({
        status: "blocked",
        component: selected.component,
        props: publicProps,
        dataRowCount: args.data.length,
        suggestion: publicSuggestion,
        diagnostics: diagnosis.diagnoses
      })
    }
  }
  const renderedStatic = await renderChartHandler(
    {
      component: selected.component,
      props,
      format: "svg"
    },
    context
  )
  if (renderedStatic.isError) {
    return {
      ...renderedStatic,
      structuredContent: profileResult({
        status: "blocked",
        component: selected.component,
        props: publicProps,
        dataRowCount: args.data.length,
        suggestion: publicSuggestion,
        diagnostics: diagnosis.diagnoses,
        render: renderedStatic.structuredContent ?? null
      })
    }
  }
  const completeRenderEvidence = parseRenderEvidence(renderedStatic)
  const rendered = await renderInteractiveChartHandler(
    { component: selected.component, props, theme: args.theme },
    context
  )
  if (rendered.isError) {
    return {
      ...rendered,
      structuredContent: profileResult({
        status: "blocked",
        component: selected.component,
        props: publicProps,
        dataRowCount: args.data.length,
        suggestion: publicSuggestion,
        diagnostics: diagnosis.diagnoses,
        render: rendered.structuredContent ?? null
      })
    }
  }
  const output = rendered.structuredContent ?? {}
  const chartId = (props as { chartId?: unknown }).chartId
  const evidenceEnvelope = toEvidenceEnvelope(selected.component, props, {
    chartId: typeof chartId === "string" ? chartId : undefined,
    sourceId: "mcp-create-chart",
    ssrEvidence: completeRenderEvidence as never,
    privacyScope: {
      mcpResponse: [
        "public chart config without source rows",
        "render evidence and mark counts"
      ]
    }
  })
  const gate = evaluateEvidenceGate(evidenceEnvelope, {
    requireRenderEvidence: true,
    allowAccessibilityWarnings: true
  })
  // The generic gate treats any non-passing audit as blocking. For MCP
  // proposals, authored title/summary belongs to the host page; only critical
  // data/encoding failures found by the audit block publication.
  gate.ok = !gate.findings.some(
    (finding) => finding.id !== "audit.accessibility-blocking"
  )
  gate.status = gate.ok ? "pass" : "fail"
  gate.findings = gate.findings.filter(
    (finding) => finding.id !== "audit.accessibility-blocking"
  )
  const accessibilityAudit = evidenceEnvelope.audit.accessibility as {
    findings?: Array<{ critical?: boolean; status?: string; id?: string }>
  }
  const criticalAccessibilityOnly = (accessibilityAudit.findings ?? []).filter(
    (finding) => finding.critical === true && finding.status === "fail"
  )
  if (criticalAccessibilityOnly.length > 0) {
    gate.findings.push({
      id: "audit.accessibility-critical",
      severity: "error",
      message: `Accessibility audit contains ${criticalAccessibilityOnly.length} critical failure(s): ${criticalAccessibilityOnly.map((finding) => finding.id).join(", ")}.`
    })
  }
  if (!gate.ok) {
    return {
      content: [
        {
          type: "text",
          text: `Selected ${selected.component}, rendered, but the evidence publication gate blocked it: ${gate.findings.map((finding) => finding.id).join(", ")}.`
        }
      ],
      isError: true,
      structuredContent: profileResult({
        status: "blocked",
        component: selected.component,
        props: publicProps,
        dataRowCount: args.data.length,
        suggestion: publicSuggestion,
        diagnostics: diagnosis.diagnoses,
        render: output,
        evidenceEnvelope,
        evidenceGate: gate
      })
    }
  }
  return {
    ...rendered,
    structuredContent: profileResult({
      status: "render-proven",
      component: selected.component,
      props: publicProps,
      dataRowCount: args.data.length,
      suggestion: publicSuggestion,
      diagnostics: diagnosis.diagnoses,
      render: output,
      evidenceEnvelope,
      evidenceGate: gate
    })
  }
}

async function improveChartHandler(args: {
  component: string
  props: Record<string, unknown>
  data?: Record<string, unknown>[]
  intent?: string | string[]
  identifiers?: string[]
  fieldRoles?: McpProfileFieldRoleHints
}): Promise<ToolResult> {
  const { data, rawInput } = profileInputFromVariantArgs(args)
  const intent = (
    Array.isArray(args.intent)
      ? args.intent
      : args.intent
        ? [args.intent]
        : undefined
  ) as IntentId[] | undefined
  const diagnosis = diagnoseConfig(args.component, args.props)
  const repair = repairChartConfigFromCapabilities(args.component, data, {
    intent,
    identifiers: args.identifiers,
    fieldRoles: args.fieldRoles
  })
  const profile = profileData(data, {
    rawInput,
    identifiers: args.identifiers,
    fieldRoles: args.fieldRoles
  })
  const { proposals: variants } = rankVariantProposals(
    args.component,
    profile,
    { intent }
  )
  const accessibility = accessibilityRecommendation(
    args.component,
    args.props,
    data
  )
  const evidenceProps = Array.isArray(args.data)
    ? { ...args.props, data }
    : args.props
  const evidenceFragment = toEvidenceEnvelope(args.component, evidenceProps, {
    surfaceVersion: "mcp-improve-chart",
    knownGaps: ["Static analysis only; no render evidence was requested."]
  })
  return {
    content: [
      {
        type: "text",
        text: `Improvement analysis for ${args.component}: ${diagnosis.diagnoses.length} diagnosis item(s), repair status ${repair.status}, ${variants.length} variant proposal(s).`
      }
    ],
    structuredContent: profileResult({
      status: repair.status === "ok" ? "reviewed" : "repair-needed",
      component: args.component,
      diagnostics: diagnosis.diagnoses,
      repair,
      variants,
      ...(accessibility ? { accessibilityRecommendation: accessibility } : {}),
      evidenceFragment
    })
  }
}

async function explainChartHandler(args: {
  component: string
  props: Record<string, unknown>
}): Promise<ToolResult> {
  const grounded = await groundChartHandler(args)
  const envelope = toEvidenceEnvelope(args.component, args.props, {
    surfaceVersion: "mcp-explain-chart",
    knownGaps: ["No render or audit evidence requested by explain-only call."]
  })
  return {
    ...grounded,
    structuredContent: grounded.structuredContent
      ? profileResult({
          status: "grounded",
          grounding: grounded.structuredContent,
          evidenceFragment: envelope
        })
      : undefined
  }
}

async function auditChartHandler(args: {
  component: string
  props: Record<string, unknown>
  viewportWidth?: number
}): Promise<ToolResult> {
  const diagnosis = diagnoseConfig(args.component, args.props)
  // Public-profile calls contain a chart configuration, not an implicit
  // ChartContainer. Do not credit optional container-level description or
  // navigation affordances unless the caller declares them through the
  // developer audit tool's explicit options.
  const accessibility = auditAccessibility(args.component, args.props)
  const mobile = auditMobileVisualization(args.component, args.props, {
    viewportWidth: args.viewportWidth
  })
  const envelope = toEvidenceEnvelope(args.component, args.props, {
    surfaceVersion: "mcp-audit-chart",
    audits: {
      design: mobile
    },
    knownGaps: ["Audit-only call does not prove non-empty rendered marks."]
  })
  const gate = evaluateEvidenceGate(envelope, {
    requireRenderEvidence: false,
    requireAccessTable: args.component !== "BigNumber"
  })
  const blocking =
    diagnosis.diagnoses.some((item: any) => item.severity === "error") ||
    !accessibility.ok ||
    !mobile.ok ||
    !gate.ok
  return {
    content: [
      {
        type: "text",
        text: `Audit for ${args.component}: ${blocking ? "blocking findings need attention" : "no blocking findings"}.`
      }
    ],
    isError: blocking,
    structuredContent: profileResult({
      status: blocking ? "findings" : "passed",
      component: args.component,
      diagnostics: diagnosis.diagnoses,
      accessibility,
      mobile,
      evidenceEnvelope: envelope,
      evidenceGate: gate
    })
  }
}

function summarizeArtifactObligations(obligations: any[]) {
  const count = (status: string) =>
    obligations.filter((item) => item?.status === status).length
  return {
    pass: count("pass"),
    fail: count("fail"),
    warn: count("warn"),
    manual: count("manual"),
    unknown: count("unknown"),
    notApplicable: count("not-applicable")
  }
}

function boundedArtifactRepairProposal(proposal: any) {
  return {
    id: truncateUtf8(String(proposal?.id ?? "unknown"), 240),
    ...(proposal?.category === "identity" ||
    proposal?.category === "configuration" ||
    proposal?.category === "contract"
      ? { category: proposal.category }
      : {}),
    ...(typeof proposal?.path === "string"
      ? { path: truncateUtf8(proposal.path, 240) }
      : {}),
    action: truncateUtf8(String(proposal?.action ?? ""), 600),
    reason: truncateUtf8(String(proposal?.reason ?? ""), 600),
    changesClaim: proposal?.changesClaim === true
  }
}

const artifactEvidenceRenderer = renderChartWithEvidence as unknown as (
  component: string,
  props: Record<string, any>
) => ReturnType<typeof renderChartWithEvidence>

async function auditArtifactHandler(args: {
  component: string
  props?: Record<string, any>
  data?: Record<string, unknown>[]
  contract: ExplicitArtifactContract
  policyId: McpArtifactPolicyId
  exceptions?: ArtifactPolicyException[]
  now?: string
}): Promise<ToolResult> {
  const contractValidation = validateArtifactContract(args.contract)
  if (!contractValidation.valid) {
    return explicitContractError(contractValidation, args.policyId)
  }

  const evaluation = auditArtifactFromContract(
    args.component,
    args.props ?? {},
    args.contract as ArtifactContract,
    {
      ...(args.data ? { data: args.data } : {}),
      policy: args.policyId,
      ...(args.exceptions ? { exceptions: args.exceptions } : {}),
      ...(args.now ? { now: args.now } : {}),
      render: artifactEvidenceRenderer
    }
  )
  const obligations = Array.isArray(evaluation.obligations)
    ? evaluation.obligations
    : []
  const alternatives = Array.isArray(evaluation.alternatives)
    ? evaluation.alternatives
    : []
  const repairs = Array.isArray(evaluation.repairs) ? evaluation.repairs : []
  const manualChecks = Array.isArray(evaluation.manualChecks)
    ? evaluation.manualChecks
    : []
  const output = profileResult({
    status: evaluation.status,
    policy: boundedArtifactPolicy(evaluation.policy),
    contractValidation: boundedArtifactValidation(contractValidation),
    obligationSummary: summarizeArtifactObligations(obligations),
    claimSummary: evaluation.claims.summary,
    temporalSummary: evaluation.temporal.summary,
    obligations: obligations.slice(0, 50).map(boundedArtifactObligation),
    ...(evaluation.recommendation?.selected
      ? {
          selectedRepresentation: boundedRepresentationCandidate(
            evaluation.recommendation.selected
          )
        }
      : {}),
    alternatives: alternatives.slice(0, 8).map(boundedRepresentationCandidate),
    repairs: repairs.slice(0, 50).map(boundedArtifactRepairProposal),
    manualChecks: boundedArtifactStrings(manualChecks, 25),
    truncated: {
      obligations: obligations.length > 50,
      alternatives: alternatives.length > 8,
      repairs: repairs.length > 50,
      manualChecks: manualChecks.length > 25
    }
  })
  return {
    content: [
      {
        type: "text",
        text: `Artifact audit: ${evaluation.status} under ${output.policy.id}@${output.policy.version}. Missing source, review, and time facts were not inferred.`
      }
    ],
    structuredContent: output
  }
}

async function recommendRepresentationHandler(args: {
  data?: Record<string, unknown>[]
  contract: ExplicitArtifactContract
  policyId: McpArtifactPolicyId
  exceptions?: ArtifactPolicyException[]
  intent?: string | string[]
  preferredComponent?: string
  maxChartCandidates?: number
  identifiers?: string[]
  now?: string
}): Promise<ToolResult> {
  const contractValidation = validateArtifactContract(args.contract)
  if (!contractValidation.valid) {
    return explicitContractError(contractValidation, args.policyId)
  }
  const recommendation = recommendRepresentationFromContract(
    args.data,
    args.contract as ArtifactContract,
    {
      policy: args.policyId,
      ...(args.exceptions ? { exceptions: args.exceptions } : {}),
      ...(args.intent ? { intent: args.intent } : {}),
      ...(args.preferredComponent
        ? { preferredComponent: args.preferredComponent }
        : {}),
      maxChartCandidates: Math.min(8, args.maxChartCandidates ?? 5),
      ...(args.identifiers ? { identifiers: args.identifiers } : {}),
      ...(args.now ? { now: args.now } : {})
    }
  )
  const alternatives = Array.isArray(recommendation.alternatives)
    ? recommendation.alternatives
    : []
  const rejected = Array.isArray(recommendation.rejected)
    ? recommendation.rejected
    : []
  const output = profileResult({
    status: recommendation.status,
    policy: boundedArtifactPolicy(recommendation.policy),
    contractValidation: boundedArtifactValidation(contractValidation),
    selected: boundedRepresentationCandidate(recommendation.selected),
    alternatives: alternatives.slice(0, 8).map(boundedRepresentationCandidate),
    rejected: rejected.slice(0, 8).map((candidate: any) => ({
      ...boundedRepresentationCandidate(candidate),
      rejectedBecause: truncateUtf8(
        String(candidate?.rejectedBecause ?? ""),
        600
      )
    })),
    reasons: boundedArtifactStrings(recommendation.reasons, 12),
    truncated: {
      alternatives: alternatives.length > 8,
      rejected: rejected.length > 8,
      reasons: (recommendation.reasons?.length ?? 0) > 12
    }
  })
  return {
    content: [
      {
        type: "text",
        text: `Representation outcome: ${recommendation.status}; ${recommendation.selected.label}. Policy: ${output.policy.id}@${output.policy.version}.`
      }
    ],
    structuredContent: output
  }
}

async function repairArtifactHandler(args: {
  component: string
  props?: Record<string, any>
  data?: Record<string, unknown>[]
  contract: ExplicitArtifactContract
  policyId: McpArtifactPolicyId
  exceptions?: ArtifactPolicyException[]
  applySafeIdentityRepairs?: boolean
  now?: string
}): Promise<ToolResult> {
  const contractValidation = validateArtifactContract(args.contract)
  if (!contractValidation.valid) {
    return explicitContractError(contractValidation, args.policyId)
  }
  const repair = repairArtifactFromContract(
    args.component,
    args.props ?? {},
    args.contract as ArtifactContract,
    {
      ...(args.data ? { data: args.data } : {}),
      policy: args.policyId,
      ...(args.exceptions ? { exceptions: args.exceptions } : {}),
      applySafeIdentityRepairs: args.applySafeIdentityRepairs === true,
      ...(args.now ? { now: args.now } : {}),
      render: artifactEvidenceRenderer
    }
  )
  const ledger = Array.isArray(repair.ledger) ? repair.ledger : []
  let packet: ReturnType<typeof createArtifactPacket> | undefined
  let packetError: string | undefined
  try {
    packet = createArtifactPacket(repair.contract, {
      format: "mcp",
      includeEvidenceSamples: false,
      maxEvidenceRecords: 50,
      maxClaims: 50
    })
  } catch (error) {
    packetError = truncateUtf8(
      error instanceof Error ? error.message : String(error),
      600
    )
  }
  const serializedContract = packet ? JSON.stringify(packet.contract) : ""
  const contractFits =
    Boolean(packet) &&
    Buffer.byteLength(serializedContract, "utf8") <=
      MAX_ARTIFACT_CONTRACT_OUTPUT_BYTES
  const transfer = packet
    ? boundedArtifactTransfer(packet.transfer)
    : {
        format: "mcp",
        preservation: "unknown" as const,
        preservedPaths: [],
        omittedPaths: ["$"],
        warnings: [
          truncateUtf8(
            `The repair draft was withheld because it could not form a semantically valid transfer packet${packetError ? `: ${packetError}` : "."}`,
            600
          )
        ]
      }
  const transferTruncated = packet
    ? packet.transfer.preservedPaths.length > 25 ||
      packet.transfer.omittedPaths.length > 25 ||
      packet.transfer.warnings.length > 25
    : false
  const output = profileResult({
    status: repair.status,
    policy: boundedArtifactPolicy(repair.after.policy),
    contractValidation: boundedArtifactValidation(contractValidation),
    ...(contractFits && packet ? { contract: packet.contract } : {}),
    contractTransfer: transfer,
    beforeStatus: repair.before.status,
    afterStatus: repair.after.status,
    ledger: ledger.slice(0, 50).map((entry: any) => ({
      id: truncateUtf8(String(entry?.id ?? "unknown"), 240),
      ...(entry?.category === "identity" ||
      entry?.category === "configuration" ||
      entry?.category === "contract"
        ? { category: entry.category }
        : {}),
      path: truncateUtf8(String(entry?.path ?? "$"), 240),
      action: truncateUtf8(String(entry?.action ?? ""), 600),
      reason: truncateUtf8(String(entry?.reason ?? ""), 600),
      applied: entry?.applied === true,
      changesClaim: entry?.changesClaim === true,
      ...(typeof entry?.suggestedComponent === "string"
        ? { suggestedComponent: truncateUtf8(entry.suggestedComponent, 240) }
        : {}),
      ...(typeof entry?.suggestedVariant === "string"
        ? { suggestedVariant: truncateUtf8(entry.suggestedVariant, 240) }
        : {})
    })),
    truncated: {
      ledger: ledger.length > 50,
      contract: !contractFits,
      transfer: transferTruncated
    }
  })
  return {
    content: [
      {
        type: "text",
        text: `Artifact repair outcome: ${repair.status} under ${output.policy.id}@${output.policy.version}. Only missing identity fields were eligible for automatic application; existing mismatches require an explicit revision and claim reassessment. Configuration alternatives remain proposals, and source, review, and time facts were not created.${packet ? "" : " The repair ledger is available, but the draft contract was withheld because semantic integrity checks blocked packet creation."}`
      }
    ],
    structuredContent: output
  }
}

async function explainRefusalHandler(args: {
  component: string
  props?: Record<string, any>
  data?: Record<string, unknown>[]
  contract: ExplicitArtifactContract
  policyId: McpArtifactPolicyId
  exceptions?: ArtifactPolicyException[]
  now?: string
}): Promise<ToolResult> {
  const contractValidation = validateArtifactContract(args.contract)
  if (!contractValidation.valid) {
    return explicitContractError(contractValidation, args.policyId)
  }
  const evaluation = auditArtifactFromContract(
    args.component,
    args.props ?? {},
    args.contract as ArtifactContract,
    {
      ...(args.data ? { data: args.data } : {}),
      policy: args.policyId,
      ...(args.exceptions ? { exceptions: args.exceptions } : {}),
      ...(args.now ? { now: args.now } : {}),
      render: artifactEvidenceRenderer
    }
  )
  const explanation = explainArtifactRefusal(evaluation)
  const failures = (evaluation.obligations ?? []).filter(
    (item: any) => item?.status === "fail"
  )
  const repairs = Array.isArray(evaluation.repairs) ? evaluation.repairs : []
  const output = profileResult({
    status: evaluation.status === "refuse" ? "refuse" : "not-refused",
    evaluationStatus: evaluation.status,
    policy: boundedArtifactPolicy(evaluation.policy),
    contractValidation: boundedArtifactValidation(contractValidation),
    explanation: truncateUtf8(explanation, 6000),
    failures: failures.slice(0, 20).map(boundedArtifactObligation),
    repairs: repairs.slice(0, 20).map(boundedArtifactRepairProposal),
    truncated: {
      failures: failures.length > 20,
      repairs: repairs.length > 20,
      explanation: Buffer.byteLength(explanation, "utf8") > 6000
    }
  })
  return {
    content: [{ type: "text", text: output.explanation }],
    structuredContent: output
  }
}

// Every Semiotic MCP tool is a pure computation over its arguments — nothing is
// mutated, persisted, or fetched over the network (reportIssue only builds a
// GitHub URL string; it never posts). OpenAI's MCP review requires
// readOnlyHint/openWorldHint/destructiveHint to be set explicitly on every tool.
const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const

// ── Server factory ───────────────────────────────────────────────────────
// Creates a fresh McpServer with all tools registered.
// HTTP mode needs one instance per session (McpServer can only connect to one transport).
// Stdio mode uses a single instance.

type McpServerOptions = {
  signal?: AbortSignal
  limits?: McpRenderExecutionLimits
}

function createServer(
  profile: ToolProfile = "developer",
  options: McpServerOptions = {}
): McpServer {
  const buildInfo = buildInfoForProfile(profile)
  const serverRenderContext: RenderContext = {
    signal: options.signal,
    limits: options.limits ?? resolveMcpRenderExecutionLimits()
  }
  const srv = new McpServer({
    ...mcpServerInfoForBuild(buildInfo),
    description:
      "Deterministic Semiotic chart selection, validation, rendering, and non-visual chart grounding. Use suggestCharts, getSchema, diagnoseConfig, and renderChart in that order for static chart generation."
  })

  srv.registerResource(
    "semiotic-build-info",
    "semiotic://build-info",
    {
      title: "Semiotic Build Information",
      description:
        "Read-only deployment identity for this Semiotic MCP server.",
      mimeType: "application/json"
    },
    (uri) =>
      textResource(uri, "application/json", JSON.stringify(buildInfo, null, 2))
  )

  srv.registerResource(
    "semiotic-schema",
    "semiotic://schema",
    {
      title: "Semiotic Component Schema",
      description:
        "Machine-readable JSON schema for all Semiotic AI chart components.",
      mimeType: "application/json"
    },
    (uri) =>
      textResource(uri, "application/json", JSON.stringify(schema, null, 2))
  )

  srv.registerResource(
    "semiotic-artifact-contract-schema",
    "semiotic://artifact-contract-schema",
    {
      title: "Semiotic Artifact Contract Schema",
      description:
        "Read-only Draft 2020-12 schema for explicit artifact purpose, claims, evidence, time, reception, review, and transfer requirements.",
      mimeType: "application/schema+json"
    },
    (uri) =>
      textResource(uri, "application/schema+json", artifactContractSchemaText)
  )

  srv.registerResource(
    "semiotic-schema-index",
    "semiotic://schema-index",
    {
      title: "Semiotic Schema Discovery Index",
      description:
        "Compact component catalog with one-resource-per-component schema URIs.",
      mimeType: "application/json"
    },
    (uri) => textResource(uri, "application/json", schemaDiscoveryIndexJSON())
  )

  srv.registerResource(
    "semiotic-component-schema",
    new ResourceTemplate("semiotic://schema/{component}", {
      list: undefined,
      complete: {
        component: (value) =>
          allComponentNames.filter((name) =>
            name.toLowerCase().startsWith(value.toLowerCase())
          )
      }
    }),
    {
      title: "Semiotic Component Schema",
      description:
        "One component's prop schema, metadata, accessibility guidance, and behavior contracts.",
      mimeType: "application/json"
    },
    (uri, variables) => {
      const requested = Array.isArray(variables.component)
        ? variables.component[0]
        : variables.component
      const component = canonicalComponentName(String(requested ?? ""))
      if (!component) {
        throw new Error(
          `Unknown Semiotic component schema: ${String(requested ?? "")}`
        )
      }
      return textResource(
        uri,
        "application/json",
        JSON.stringify(componentSchemaResource(component), null, 2)
      )
    }
  )

  srv.registerResource(
    "semiotic-components",
    "semiotic://components",
    {
      title: "Semiotic Component Index",
      description:
        "Renderable/browser-only component index with MCP categories.",
      mimeType: "application/json"
    },
    (uri) => textResource(uri, "application/json", componentIndexJSON())
  )

  srv.registerResource(
    "semiotic-surface-manifest",
    "semiotic://surface-manifest",
    {
      title: "Semiotic AI Surface Manifest",
      description:
        "Generated inventory of schema components, AI exports, MCP renderability, tools, resources, and prompts.",
      mimeType: "application/json"
    },
    (uri) =>
      textResource(uri, "application/json", readAIFile("surface-manifest.json"))
  )

  srv.registerResource(
    "semiotic-behavior-contracts",
    "semiotic://behavior-contracts",
    {
      title: "Semiotic AI Behavior Contracts",
      description:
        "Agent-visible semantic rules for color precedence, required prop combinations, streaming refs, and renderability.",
      mimeType: "application/json"
    },
    (uri) =>
      textResource(
        uri,
        "application/json",
        JSON.stringify(
          {
            version: schema.version,
            contracts: BEHAVIOR_CONTRACTS
          },
          null,
          2
        )
      )
  )

  srv.registerResource(
    "semiotic-system-prompt",
    "semiotic://system-prompt",
    {
      title: "Semiotic AI System Prompt",
      description:
        "Compact implementation guidance for AI assistants building with Semiotic.",
      mimeType: "text/markdown"
    },
    (uri) => textResource(uri, "text/markdown", readAIFile("system-prompt.md"))
  )

  srv.registerResource(
    "semiotic-examples",
    "semiotic://examples",
    {
      title: "Semiotic AI Examples",
      description:
        "On-demand copy-paste examples for common Semiotic chart data shapes.",
      mimeType: "text/markdown"
    },
    (uri) => textResource(uri, "text/markdown", readAIFile("examples.md"))
  )

  srv.registerResource(
    "semiotic-chatgpt-chart-widget",
    SEMIOTIC_CHART_WIDGET_URI,
    {
      title: "Semiotic ChatGPT Chart Widget",
      description:
        "MCP Apps widget template for interactive Semiotic chart previews inside ChatGPT.",
      mimeType: MCP_APP_MIME_TYPE,
      _meta: {
        ui: {
          prefersBorder: true,
          csp: {
            connectDomains: [],
            resourceDomains: []
          }
        },
        "openai/widgetDescription":
          "Interactive Semiotic chart preview rendered by the semiotic-mcp server.",
        "openai/widgetPrefersBorder": true
      }
    },
    (uri) => appResource(uri, renderSemioticChartWidgetHTML())
  )

  srv.registerPrompt(
    "build-semiotic-chart",
    {
      title: "Build a Semiotic chart",
      description:
        "Workflow for choosing a chart, validating props, and rendering a preview.",
      argsSchema: {
        intent: z
          .string()
          .optional()
          .describe(
            "Visualization intent, e.g. trend, comparison, distribution, relationship, composition, network, hierarchy."
          ),
        dataDescription: z
          .string()
          .optional()
          .describe("Brief description of the data fields and sample rows."),
        component: z
          .string()
          .optional()
          .describe("Optional preferred Semiotic component name.")
      }
    },
    (args) =>
      promptMessage(
        [
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
          '5. Call diagnoseConfig with usageMode="static" for renderChart/static data, or usageMode="push" for ref-based React code that intentionally omits data.',
          "6. Fix all diagnoseConfig errors before presenting code.",
          "7. If the component is renderable and has static data, call renderChart and verify its render evidence is non-empty and accessible.",
          "8. Use the chart family's sub-path in production code (for example semiotic/xy); import generation helpers from semiotic/ai or semiotic/ai/core.",
          "",
          "Return the final JSX or renderChart call plus any assumptions about fields, accessors, or aggregation."
        ].join("\n")
      )
  )

  srv.registerPrompt(
    "debug-semiotic-chart",
    {
      title: "Debug a Semiotic chart",
      description:
        "Workflow for diagnosing bad props, rendering failures, and chart-quality issues.",
      argsSchema: {
        component: z
          .string()
          .optional()
          .describe("Semiotic component name, e.g. BarChart."),
        problem: z
          .string()
          .optional()
          .describe("Observed failure, warning, or visual issue."),
        props: z
          .string()
          .optional()
          .describe("Relevant chart props as JSON or a short summary.")
      }
    },
    (args) =>
      promptMessage(
        [
          "Debug this Semiotic chart with the MCP server.",
          "",
          `Component: ${args.component || "not specified"}`,
          `Problem: ${args.problem || "not specified"}`,
          `Props: ${args.props || "not provided"}`,
          "",
          "Use this MCP workflow:",
          "1. Call getSchema for the component and compare the provided props against required props and accessor names.",
          "2. Read semiotic://behavior-contracts for semantic rules around colors, required combinations, streaming refs, and renderability.",
          '3. Call diagnoseConfig with usageMode="push" if the code intentionally omits data for a ref-push HOC; otherwise use usageMode="static".',
          "4. Treat diagnoseConfig errors as blockers and warnings as review items.",
          "5. If renderable and static data is available, call renderChart with a minimal reproduction to separate configuration issues from rendering bugs.",
          "6. If schema and diagnostics are insufficient, check the relevant section of semiotic://examples for a nearby working pattern before inventing props.",
          "7. If the result looks like a Semiotic bug, call reportIssue with the component, props summary, diagnoseConfig output, and renderChart result.",
          "",
          "Return the smallest safe fix first, then mention any follow-up cleanup or issue-reporting step."
        ].join("\n")
      )
  )

  if (profile === "public") {
    srv.registerTool(
      "createChart",
      {
        title: "Create and prove a chart",
        description:
          "Select, validate, diagnose, render, and prove a static-data Semiotic chart. This is the default public workflow.",
        inputSchema: {
          data: z.array(z.record(z.string(), z.unknown())).min(1),
          intent: z.union([z.string(), z.array(z.string())]).optional(),
          audience: z
            .object({
              name: z.string().optional(),
              receptionModality: z
                .enum(["visual", "screen-reader", "sonified", "agent"])
                .optional()
            })
            .passthrough()
            .optional(),
          ...MCP_PROFILE_HINT_INPUT,
          component: z
            .string()
            .optional()
            .describe(
              "Optional chart preference; the fit-ranked result remains authoritative."
            ),
          props: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              "Optional props to merge over the selected chart recipe."
            ),
          theme: z.record(z.string(), z.string()).optional()
        },
        outputSchema: {
          status: z.enum(["render-proven", "blocked", "no-suggestion"]),
          component: z.string().optional(),
          evidenceEnvelope: z.record(z.string(), z.unknown()).optional(),
          evidenceGate: z.record(z.string(), z.unknown()).optional(),
          surfaceVersion: z.string()
        },
        annotations: READ_ONLY_TOOL_ANNOTATIONS,
        _meta: {
          ui: { resourceUri: SEMIOTIC_CHART_WIDGET_URI },
          "openai/outputTemplate": SEMIOTIC_CHART_WIDGET_URI
        }
      },
      (args) => createChartHandler(args, serverRenderContext)
    )
    srv.registerTool(
      "improveChart",
      {
        title: "Improve an existing chart",
        description:
          "Diagnose a chart configuration, assess data fit, and propose repairs or variants.",
        inputSchema: {
          component: z.string(),
          props: z.record(z.string(), z.unknown()),
          data: z.array(z.record(z.string(), z.unknown())).optional(),
          intent: z.union([z.string(), z.array(z.string())]).optional(),
          ...MCP_PROFILE_HINT_INPUT
        },
        outputSchema: {
          status: z.enum(["reviewed", "repair-needed"]),
          component: z.string(),
          diagnostics: z.array(z.unknown()),
          repair: z.record(z.string(), z.unknown()),
          variants: z.array(z.unknown()),
          accessibilityRecommendation: z
            .object({
              location: z.literal("direct-component-props"),
              props: z.record(z.string(), z.string()),
              chartContainer: z.record(z.string(), z.unknown())
            })
            .optional(),
          evidenceFragment: z.record(z.string(), z.unknown()).optional(),
          surfaceVersion: z.string()
        },
        annotations: READ_ONLY_TOOL_ANNOTATIONS
      },
      improveChartHandler
    )
    srv.registerTool(
      "explainChart",
      {
        title: "Explain a chart without pixels",
        description:
          "Return reader grounding: chart description, communicative intent, and navigable data structure.",
        inputSchema: {
          component: z.string(),
          props: z.record(z.string(), z.unknown())
        },
        outputSchema: {
          status: z.literal("grounded"),
          grounding: z.record(z.string(), z.unknown()),
          evidenceFragment: z.record(z.string(), z.unknown()).optional(),
          surfaceVersion: z.string()
        },
        annotations: READ_ONLY_TOOL_ANNOTATIONS
      },
      explainChartHandler
    )
    srv.registerTool(
      "auditChart",
      {
        title: "Audit chart quality and accessibility",
        description:
          "Run design diagnostics plus accessibility and mobile audits, returning prioritized structured findings.",
        inputSchema: {
          component: z.string(),
          props: z.record(z.string(), z.unknown()),
          viewportWidth: z.number().int().min(240).max(1600).optional()
        },
        outputSchema: {
          status: z.enum(["passed", "findings"]),
          component: z.string(),
          evidenceEnvelope: z.record(z.string(), z.unknown()).optional(),
          evidenceGate: z.record(z.string(), z.unknown()).optional(),
          surfaceVersion: z.string()
        },
        annotations: READ_ONLY_TOOL_ANNOTATIONS
      },
      auditChartHandler
    )
    srv.registerTool(
      "getChartSchema",
      {
        title: "Get a chart schema",
        description:
          "Return canonical Semiotic prop-schema guidance for code editing and advanced configuration.",
        inputSchema: {
          component: z.string().optional()
        },
        outputSchema: {
          status: z.enum([
            "component-list",
            "component-schema",
            "unknown-component"
          ]),
          component: z.string().optional(),
          renderable: z.boolean().optional(),
          availableComponents: z
            .array(
              z.object({
                name: z.string(),
                renderable: z.boolean()
              })
            )
            .optional(),
          schema: z.record(z.string(), z.unknown()).optional(),
          accessibility: z
            .object({
              directProps: z.record(z.string(), z.unknown()),
              chartContainer: z.record(z.string(), z.unknown())
            })
            .optional(),
          behaviorContracts: z.array(z.unknown()).optional(),
          surfaceVersion: z.string()
        },
        annotations: READ_ONLY_TOOL_ANNOTATIONS
      },
      getSchemaHandler
    )
    return srv
  }

  srv.registerTool(
    "auditArtifact",
    {
      title: "Audit an explicit artifact contract",
      description:
        "Evaluate a chart and its explicit artifact contract under a named policy. The tool audits only supplied claims, evidence, source identity, review state, and time state; missing facts remain missing or unknown. Results are capped and report truncation explicitly.",
      inputSchema: {
        component: z.string().describe("Semiotic component name."),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Chart props/config. Data may be supplied here or separately."
          ),
        data: z
          .array(z.record(z.string(), z.unknown()))
          .max(10_000)
          .optional()
          .describe("Optional explicit row data overriding props.data."),
        contract: explicitArtifactContractInput,
        policyId: artifactPolicyIdInput,
        exceptions: z.array(artifactPolicyExceptionInput).max(20).optional(),
        now: artifactReferenceTimeInput.optional()
      },
      outputSchema: {
        status: z.enum([
          "acceptable",
          "conditional",
          "refuse",
          "invalid-contract"
        ]),
        policy: artifactPolicyOutput,
        contractValidation: artifactValidationOutput,
        obligationSummary: artifactObligationSummaryOutput.optional(),
        claimSummary: artifactObligationSummaryOutput.optional(),
        temporalSummary: artifactObligationSummaryOutput.optional(),
        obligations: z.array(artifactObligationOutput).max(50).optional(),
        selectedRepresentation: representationCandidateOutput.optional(),
        alternatives: z.array(representationCandidateOutput).max(8).optional(),
        repairs: z.array(artifactRepairProposalOutput).max(50).optional(),
        manualChecks: z.array(z.string()).max(25).optional(),
        truncated: z
          .object({
            obligations: z.boolean(),
            alternatives: z.boolean(),
            repairs: z.boolean(),
            manualChecks: z.boolean()
          })
          .optional(),
        surfaceVersion: z.string()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    auditArtifactHandler
  )

  srv.registerTool(
    "recommendRepresentation",
    {
      title: "Recommend a defensible representation",
      description:
        "Recommend chart and non-chart outcomes from explicit data and an explicit artifact contract. Evidence, source, review, and time facts are never synthesized. The named policy can recommend waiting, collecting data, or making no claim instead of forcing a chart.",
      inputSchema: {
        data: z
          .array(z.record(z.string(), z.unknown()))
          .max(10_000)
          .optional()
          .describe(
            "Explicit row data; omit only when contract evidence is sufficient."
          ),
        contract: explicitArtifactContractInput,
        policyId: artifactPolicyIdInput,
        exceptions: z.array(artifactPolicyExceptionInput).max(20).optional(),
        now: artifactReferenceTimeInput.optional(),
        intent: z.union([z.string(), z.array(z.string()).max(12)]).optional(),
        preferredComponent: z
          .string()
          .max(120)
          .optional()
          .describe("Optional Semiotic component preference."),
        maxChartCandidates: z.number().int().min(1).max(8).optional(),
        identifiers: z.array(z.string()).max(64).optional()
      },
      outputSchema: {
        status: z.enum([
          "recommended",
          "conditional",
          "refuse",
          "invalid-contract"
        ]),
        policy: artifactPolicyOutput,
        contractValidation: artifactValidationOutput,
        selected: representationCandidateOutput.optional(),
        alternatives: z.array(representationCandidateOutput).max(8).optional(),
        rejected: z
          .array(
            representationCandidateOutput.extend({
              rejectedBecause: z.string()
            })
          )
          .max(8)
          .optional(),
        reasons: z.array(z.string()).max(12).optional(),
        truncated: z
          .object({
            alternatives: z.boolean(),
            rejected: z.boolean(),
            reasons: z.boolean()
          })
          .optional(),
        surfaceVersion: z.string()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    recommendRepresentationHandler
  )

  srv.registerTool(
    "repairArtifact",
    {
      title: "Repair an explicit artifact contract",
      description:
        "Propose repairs for a chart and explicit artifact contract. By default this is proposal-only. If enabled, safe application fills missing component and configuration/data identity fields only; existing bindings are never overwritten. Mismatches require an explicit revision and claim reassessment. Source, evidence, review, approval, and time facts are never invented. Returned contracts omit evidence samples, report transfer losses, and are withheld above a 64 KiB UTF-8 cap.",
      inputSchema: {
        component: z.string().describe("Semiotic component name."),
        props: z.record(z.string(), z.unknown()).optional(),
        data: z.array(z.record(z.string(), z.unknown())).max(10_000).optional(),
        contract: explicitArtifactContractInput,
        policyId: artifactPolicyIdInput,
        exceptions: z.array(artifactPolicyExceptionInput).max(20).optional(),
        now: artifactReferenceTimeInput.optional(),
        applySafeIdentityRepairs: z
          .boolean()
          .optional()
          .describe(
            "Fill missing identity fields only; existing mismatches require an explicit revision and claim reassessment. Defaults to false."
          )
      },
      outputSchema: {
        status: z.enum([
          "unchanged",
          "repaired",
          "requires-input",
          "invalid-contract"
        ]),
        policy: artifactPolicyOutput,
        contractValidation: artifactValidationOutput,
        contract: explicitArtifactContractInput.optional(),
        contractTransfer: artifactContractTransferOutput.optional(),
        beforeStatus: z
          .enum(["acceptable", "conditional", "refuse"])
          .optional(),
        afterStatus: z.enum(["acceptable", "conditional", "refuse"]).optional(),
        ledger: z.array(artifactRepairLedgerOutput).max(50).optional(),
        truncated: z
          .object({
            ledger: z.boolean(),
            contract: z.boolean(),
            transfer: z.boolean()
          })
          .optional(),
        surfaceVersion: z.string()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    repairArtifactHandler
  )

  srv.registerTool(
    "explainRefusal",
    {
      title: "Explain an artifact policy refusal",
      description:
        "Evaluate an explicit artifact contract under a named policy and explain why publication or action is refused. Missing evidence, source, review, and time facts stay explicit rather than being guessed.",
      inputSchema: {
        component: z.string().describe("Semiotic component name."),
        props: z.record(z.string(), z.unknown()).optional(),
        data: z.array(z.record(z.string(), z.unknown())).max(10_000).optional(),
        contract: explicitArtifactContractInput,
        policyId: artifactPolicyIdInput,
        exceptions: z.array(artifactPolicyExceptionInput).max(20).optional(),
        now: artifactReferenceTimeInput.optional()
      },
      outputSchema: {
        status: z.enum(["refuse", "not-refused", "invalid-contract"]),
        evaluationStatus: z
          .enum(["acceptable", "conditional", "refuse"])
          .optional(),
        policy: artifactPolicyOutput,
        contractValidation: artifactValidationOutput,
        explanation: z.string().optional(),
        failures: z.array(artifactObligationOutput).max(20).optional(),
        repairs: z.array(artifactRepairProposalOutput).max(20).optional(),
        truncated: z
          .object({
            failures: z.boolean(),
            repairs: z.boolean(),
            explanation: z.boolean()
          })
          .optional(),
        surfaceVersion: z.string()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    explainRefusalHandler
  )

  srv.tool(
    "getSchema",
    `Return the prop schema for a Semiotic chart component. Pass { component: '<name>' } to get its props, or omit component to list all available components. Components marked [renderable] can be passed to renderChart for static SVG output.`,
    {
      component: z
        .string()
        .optional()
        .describe("Component name, e.g. 'LineChart'. Omit to list all.")
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    getSchemaHandler
  )

  srv.tool(
    "suggestChart",
    "Lightweight heuristic chart recommender for a small data sample (1-5 rows) with capability filtering (push API, linked hover, SSR, selection, legend). Returns ranked recommendations with example props. For richer capability-descriptor ranking (scores, reasons, caveats) and the full 13-intent taxonomy, prefer `suggestCharts` (plural).",
    {
      data: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(5)
        .describe("1-5 sample data objects"),
      intent: z
        .string()
        .optional()
        .describe(
          "Visualization intent. Accepts this engine's intents (comparison, trend, distribution, relationship, composition, geographic, network, hierarchy) AND the richer suggestCharts taxonomy (compare-categories, part-to-whole, correlation, flow, geo, rank, …), which is translated automatically; an unrecognized intent is ignored rather than rejected."
        ),
      capabilities: z
        .object({
          push: z
            .boolean()
            .optional()
            .describe(
              "Require ref-based push API (live streaming via ref.current.push())"
            ),
          linkedHover: z
            .boolean()
            .optional()
            .describe("Require cross-chart linked hover support"),
          ssr: z
            .boolean()
            .optional()
            .describe("Require server-side rendering via renderChart()"),
          selection: z
            .boolean()
            .optional()
            .describe("Require named selection / cross-filter support"),
          legend: z.boolean().optional().describe("Require a top-level legend")
          // `.strict()` so the MCP surface rejects unknown capability
          // keys at the schema layer rather than silently stripping
          // them — keeps the cjs-level "Unknown capability key(s)"
          // validation from being unreachable from MCP callers.
        })
        .strict()
        .optional()
        .describe(
          "Capability constraints — set a key to true to require, false to forbid. Unset keys are ignored."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    suggestChartHandler
  )

  srv.tool(
    "renderChart",
    `Render a Semiotic chart to static SVG or PNG. This is a static snapshot path: props must include data immediately, and ref/push-mode charts cannot be rendered through this tool. Returns SVG text by default or an image/png artifact when format='png', plus a "Render evidence" JSON block (mark counts by type, resolved axis domains, empty flag, annotation count, accessible name) — read the evidence instead of parsing the SVG to verify the chart actually rendered data marks. An optional explicit contract is preserved in render evidence together with its transfer status; missing contract facts are not inferred. Optionally pass theme CSS custom properties (--semiotic-bg, --semiotic-text, etc.) to style the output. PNG requires the 'sharp' package to be installed. Available components: ${componentNames.join(", ")}.`,
    {
      component: z
        .string()
        .describe("Chart component name, e.g. 'LineChart', 'BarChart'"),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
      contract: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Optional explicit artifact contract. The render evidence reports whether it was preserved, invalid, or an unsupported version."
        ),
      theme: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "CSS custom properties for theming, e.g. { '--semiotic-bg': '#1a1a2e', '--semiotic-text': '#ededed' }. Only --semiotic-* variables are applied."
        ),
      format: z
        .enum(["svg", "png"])
        .optional()
        .describe(
          "Output format: 'svg' (default) returns SVG markup, 'png' returns image/png artifact data. PNG requires the 'sharp' package."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    (args) => renderChartHandler(args, serverRenderContext)
  )

  srv.registerTool(
    "renderInteractiveChart",
    {
      title: "Render interactive Semiotic chart",
      description: `Render a static-data Semiotic chart as a ChatGPT Apps widget. Use this after suggestCharts/getSchema/diagnoseConfig when the user wants to see an interactive chart inside ChatGPT. The server renders Semiotic to SVG and the widget adds fit, zoom, data, hover, and render-evidence controls. Available components: ${componentNames.join(", ")}.`,
      inputSchema: {
        component: z
          .string()
          .describe(
            "Renderable chart component name, e.g. 'LineChart', 'BarChart', 'GaugeChart'."
          ),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Static Semiotic chart props, including data/accessors where required."
          ),
        theme: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "CSS custom properties such as { '--semiotic-bg': '#fff', '--semiotic-text': '#111' }. Only --semiotic-* variables are applied."
          )
      },
      outputSchema: {
        component: z.string(),
        title: z.string(),
        summary: z.string(),
        datumCount: z.number().nullable(),
        evidence: z.record(z.string(), z.unknown()).nullable()
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: {
        ui: { resourceUri: SEMIOTIC_CHART_WIDGET_URI },
        "openai/outputTemplate": SEMIOTIC_CHART_WIDGET_URI,
        "openai/toolInvocation/invoking": "Rendering Semiotic chart...",
        "openai/toolInvocation/invoked": "Rendered Semiotic chart."
      }
    },
    (args) => renderInteractiveChartHandler(args, serverRenderContext)
  )

  srv.tool(
    "diagnoseConfig",
    "Diagnose a Semiotic chart configuration for common problems (empty data, bad dimensions, missing accessors, wrong data shape, color contrast issues, etc). Pass usageMode='push' for ref-based React HOCs that intentionally omit data; omit usageMode or pass 'static' for renderChart/MCP/server configs where data is required. Checks WCAG color contrast ratios and suggests COLOR_BLIND_SAFE_CATEGORICAL for accessibility. Returns a human-readable diagnostic report with actionable fixes.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Chart props object, e.g. { data: [...], xAccessor: 'x' }."),
      usageMode: z
        .enum(["static", "push", "renderChart", "server"])
        .optional()
        .describe(
          "Validation mode. Use 'push' for ref-based React HOCs that omit data; use 'static' or omit for renderChart/MCP/static data configs."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    diagnoseConfigHandler
  )

  srv.tool(
    "auditAccessibility",
    "Audit a Semiotic chart configuration against the Chartability (POUR-CAF) accessibility framework — Perceivable, Operable, Understandable, Robust, Compromising, Assistive, Flexible. Statically grades the config (no DOM/AT): credits the built-ins every HOC ships (keyboard nav, focus ring, skip link, screen-reader data table, reduced-motion + forced-colors, shareable state), flags author-actionable gaps (missing title/description/summary, low contrast, small text, color-only encoding, undescribed trends, data density), and routes everything that needs real assistive-technology testing to a 'manual' item. Returns a per-principle report with the 14 critical heuristics marked. Pass inChartContainer=true to credit data-download/share affordances. Pair with manual NVDA/JAWS/VoiceOver testing — Chartability is not a pass/fail certification.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Chart props object, e.g. { data: [...], xAccessor: 'x', title: '...' }."
        ),
      inChartContainer: z
        .boolean()
        .optional()
        .describe(
          "True if the chart is (or will be) wrapped in a ChartContainer exposing data-download/copy-config actions."
        ),
      describe: z
        .boolean()
        .optional()
        .describe(
          "True if ChartContainer's describe option (auto-generated L1–L3 description via describeChart) is enabled — passes the 'features described' heuristic."
        ),
      navigable: z
        .boolean()
        .optional()
        .describe(
          "True if ChartContainer's navigable option (structured navigation tree via buildNavigationTree) is enabled — passes the 'navigable structure' heuristic."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    auditAccessibilityHandler
  )

  srv.tool(
    "evaluateChart",
    "Evaluate a Semiotic chart through one deterministic quality pass: numeric data contracts, configuration and representation/deception checks, and static Chartability accessibility heuristics. Returns the independent audit reports plus a severity-ranked findings list and notification feed. Pass data separately when it should override props.data; use inChartContainer, describe, or navigable to describe the intended accessibility wrapper. This is static analysis and does not replace manual assistive-technology testing or render evidence.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'."),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Chart props/config, including accessors and optional data."),
      data: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          "Optional explicit dataset. When supplied, this is used as the effective props.data for evaluation."
        ),
      inChartContainer: z
        .boolean()
        .optional()
        .describe(
          "Whether the chart will be wrapped in ChartContainer or an equivalent control surface."
        ),
      describe: z
        .boolean()
        .optional()
        .describe("Whether ChartContainer's generated description is enabled."),
      navigable: z
        .boolean()
        .optional()
        .describe(
          "Whether ChartContainer's structured navigation tree is enabled."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    evaluateChartHandler
  )

  srv.tool(
    "auditMobileVisualization",
    "Audit a Semiotic chart configuration for mobile visualization risks. Use before generating phone-sized charts or when adapting a desktop chart to mobile. Flags fixed desktop widths, rough mark-density overload, hover-only detail, small touch targets, complex gestures without controls, legend dependence, annotation overload, and missing mobile transformation hints. Static analysis only: still verify rendered charts at phone widths.",
    {
      component: z
        .string()
        .describe(
          "Chart component name, e.g. 'LineChart', 'Scatterplot', or 'BarChart'."
        ),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Chart props/config to audit."),
      viewportWidth: z
        .number()
        .int()
        .min(240)
        .max(1600)
        .optional()
        .describe("Mobile viewport width in CSS pixels. Defaults to 390."),
      targetSize: z
        .number()
        .int()
        .min(24)
        .max(80)
        .optional()
        .describe(
          "Desired comfortable touch target size in CSS pixels. Defaults to 44."
        ),
      inChartContainer: z
        .boolean()
        .optional()
        .describe(
          "Whether the chart is wrapped in ChartContainer or an equivalent summary/control surface."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    auditMobileVisualizationHandler
  )

  srv.tool(
    "reportIssue",
    "Generate a GitHub issue URL for Semiotic bug reports or feature requests. Returns a URL the user can open to submit. For rendering bugs, include the component name, props summary, and any diagnoseConfig output in the body.",
    {
      title: z
        .string()
        .describe("Issue title, e.g. 'Bug: BarChart tooltip shows undefined'"),
      body: z
        .string()
        .optional()
        .describe(
          "Issue body with details, reproduction steps, diagnoseConfig output"
        ),
      labels: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .describe("GitHub labels, e.g. ['bug'] or 'bug'")
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    reportIssueHandler
  )

  srv.tool(
    "applyTheme",
    `Get usage instructions for a named Semiotic theme preset. Returns ThemeProvider examples, CSS custom properties, and design token export patterns. Available themes: ${THEME_PRESET_NAMES.join(", ")}.`,
    {
      name: z
        .string()
        .optional()
        .describe(
          "Theme preset name, e.g. 'tufte', 'pastels-dark', 'bi-tool'. Omit to list all available themes."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    applyThemeHandler
  )

  srv.tool(
    "interrogateChart",
    "Conversational interrogation of a Semiotic chart. Extract a statistical summary and answer natural language questions about the data, trends, and outliers. Returns a summary and guidance for an AI to generate a textual answer and visual annotations.",
    {
      component: z.string().describe("Chart component name, e.g. 'LineChart'"),
      props: z
        .record(z.string(), z.unknown())
        .describe("The full chart props including data"),
      query: z
        .string()
        .optional()
        .describe("A natural language question about the chart data")
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    interrogateChartHandler
  )

  srv.registerTool(
    "groundChart",
    {
      title: "Ground a Semiotic chart for a non-visual reader",
      description:
        "Build the agent-reader grounding payload for a Semiotic chart: the layered L1–L3 natural-language description, the L4 communicative-act sentence (what the chart is asking the reader to do), and a structured navigation tree (chart → axes/series → datum). Use this to interpret a chart faithfully without pixels.",
      inputSchema: {
        component: z
          .string()
          .describe("Chart component name, e.g. 'LineChart'"),
        props: z
          .record(z.string(), z.unknown())
          .describe("The full chart props including data")
      },
      outputSchema: {
        component: z.string(),
        description: z.record(z.string(), z.unknown()),
        intent: z.record(z.string(), z.unknown()).optional(),
        structure: z.record(z.string(), z.unknown()).optional(),
        physics: z.record(z.string(), z.unknown()).optional(),
        text: z.string()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
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
              role: z
                .enum(["x", "y", "value", "category", "series", "size"])
                .optional()
            })
          ),
          throughput: z.enum(["low", "medium", "high"]).optional(),
          retention: z.enum(["windowed", "cumulative"]).optional()
        })
        .describe(
          "Stream schema — fields plus throughput/retention hints. No row data."
        ),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Ranking intent."),
      maxResults: z.number().int().min(1).max(20).optional()
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    suggestStreamChartsHandler
  )

  srv.tool(
    "suggestDashboard",
    "Generate a dashboard of complementary chart panels for a dataset — each panel answers a distinct analytical intent (trend, rank, distribution, correlation, etc.) and the engine diversifies by chart family by default. Heuristic only; no LLM call. Use when the user asks 'show me this data' or 'build me a dashboard' rather than picking one chart.",
    {
      data: z
        .array(z.record(z.string(), z.unknown()))
        .describe("Row data — array of objects."),
      intents: z
        .array(z.string())
        .optional()
        .describe(
          "Intents to cover. Omit to let the engine pick based on the data shape."
        ),
      maxPanels: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("Maximum panels (default 6)."),
      diversifyByFamily: z
        .boolean()
        .optional()
        .describe(
          "Prefer not to repeat chart families across panels (default true)."
        ),
      ...MCP_PROFILE_HINT_INPUT,
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
                reason: z.string().optional()
              })
            )
            .optional(),
          exposureLevel: z
            .union([z.literal(0), z.literal(1), z.literal(2)])
            .optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
        })
        .optional()
        .describe(
          "Audience profile — familiarity, adoption targets, exposure level, and reception modality."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    suggestDashboardHandler
  )

  srv.tool(
    "suggestTokenEncoding",
    "Recommend a semantic token / ISOTYPE encoding for a reader task. Use before drawing repeated dots, icons, glyphs, natural-frequency grids, quantile dotplots, or hybrid bar-token views. Returns the recommended tokenEncoding, warnings, alternatives, and matching suggestCharts capability intents. Accepts canonical token intents (precise-comparison, probability-estimation, risk-communication, memory, support-decision, etc.) and friendly aliases (measure, estimate probability, understand risk, remember, decide).",
    {
      taskIntent: z
        .string()
        .describe(
          "Reader task intent, e.g. 'estimate probability', 'understand risk', 'remember', 'measure', 'decide', or canonical token intents like 'probability-estimation'."
        ),
      dataType: z
        .enum([
          "count",
          "measure",
          "distribution",
          "probability",
          "risk",
          "category"
        ])
        .optional()
        .describe("Data shape or meaning behind the tokenized view."),
      audience: z
        .enum(["expert", "general-public", "internal"])
        .optional()
        .describe("Audience for the recommendation."),
      precisionNeed: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("How much exact magnitude reading matters."),
      availableSpace: z
        .enum(["small", "medium", "large"])
        .optional()
        .describe("Space budget for visible tokens."),
      concreteEntity: z
        .string()
        .optional()
        .describe(
          "Concrete icon/glyph concept, e.g. person, bus, server. Becomes tokenEncoding.icon when useful."
        )
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    suggestTokenEncodingHandler
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
                reason: z.string().optional()
              })
            )
            .optional(),
          exposureLevel: z
            .union([z.literal(0), z.literal(1), z.literal(2)])
            .optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
            .describe("Reception channel — see suggestCharts.")
        })
        .describe(
          "Audience profile — familiarity, targets, exposure level, reception modality."
        ),
      intent: z.union([z.string(), z.array(z.string())]).optional(),
      maxResults: z.number().int().min(1).max(20).optional(),
      ...MCP_PROFILE_HINT_INPUT
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    suggestStretchChartsHandler
  )

  srv.registerTool(
    "repairChartConfig",
    {
      title: "Repair an unsuitable chart choice",
      description:
        "Validate that a chart component is a sensible choice for a dataset, and if not, propose ranked alternatives that fit. Returns a structured status of ok, alternative, or unknown.",
      inputSchema: {
        component: z
          .string()
          .describe("Chart component name to validate, e.g. 'PieChart'"),
        data: z
          .array(z.record(z.string(), z.unknown()))
          .describe("Row data — array of objects."),
        intent: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe(
            "User intent — informs ranking of alternatives when the chart doesn't fit."
          ),
        maxAlternatives: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Cap on alternatives returned (default 3)."),
        ...MCP_PROFILE_HINT_INPUT
      },
      outputSchema: {
        status: z.enum(["ok", "alternative", "unknown"]),
        component: z.string(),
        reason: z.string().optional(),
        alternatives: z.array(z.unknown()).optional(),
        profile: z.record(z.string(), z.unknown()),
        repairs: z.array(z.string()).optional()
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    repairChartConfigHandler
  )

  srv.tool(
    "proposeChartVariants",
    "Propose and score chart variants for a selected Semiotic component. Uses the capability registry plus heuristic variant discovery: registered variants, conservative transforms, and same-intent cross-family alternatives. Returns ranked proposals with fit/novelty/risk scores, rationale, and ready-to-use props. Use after suggestCharts when an agent wants to actively explore variants rather than stop at the first chart recommendation.",
    {
      component: z
        .string()
        .describe(
          "Base chart component to vary, e.g. 'LineChart', 'BarChart', or 'BoxPlot'."
        ),
      props: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Existing chart props. If props.data is present it is profiled; network/hierarchy/geo object data can be passed here as raw input."
        ),
      data: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe("Row data to profile. Overrides props.data when present."),
      intent: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          "Ranking intent(s), e.g. trend, distribution, rank, compare-categories, composition-over-time."
        ),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Cap on proposals returned (default 8)."),
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
                reason: z.string().optional()
              })
            )
            .optional(),
          exposureLevel: z
            .union([z.literal(0), z.literal(1), z.literal(2)])
            .optional(),
          receptionModality: z
            .enum(["visual", "screen-reader", "sonified", "agent"])
            .optional()
            .describe("Reception channel — see suggestCharts.")
        })
        .optional()
        .describe(
          "Audience profile — familiarity, adoption targets, exposure level, and reception modality."
        ),
      ...MCP_PROFILE_HINT_INPUT
    },
    READ_ONLY_TOOL_ANNOTATIONS,
    proposeChartVariantsHandler
  )

  srv.registerTool(
    "suggestCharts",
    {
      title: "Recommend Semiotic charts",
      description:
        "Recommend Semiotic charts for a dataset using heuristic capability descriptors. Returns ranked, structured suggestions with scores, reasons, caveats, and ready-to-use props; no LLM call is made.",
      inputSchema: {
        data: z
          .array(z.record(z.string(), z.unknown()))
          .describe("Row data — array of objects."),
        intent: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe(
            "Ranking intent. One of: trend, compare-series, compare-categories, rank, part-to-whole, distribution, correlation, flow, hierarchy, geo, outlier-detection, composition-over-time, change-detection. Custom intents accepted."
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(40)
          .optional()
          .describe("Cap on suggestions returned (default 8)."),
        allow: z
          .array(z.string())
          .optional()
          .describe("Restrict to these component names."),
        deny: z
          .array(z.string())
          .optional()
          .describe("Exclude these component names."),
        ...MCP_PROFILE_HINT_INPUT,
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
                  reason: z.string().optional()
                })
              )
              .optional(),
            exposureLevel: z
              .union([z.literal(0), z.literal(1), z.literal(2)])
              .optional(),
            receptionModality: z
              .enum(["visual", "screen-reader", "sonified", "agent"])
              .optional()
              .describe(
                "Reception channel. A non-visual value down-ranks charts the audience can't receive in that channel and adds receivability caveats."
              )
          })
          .optional()
          .describe(
            "Audience profile — familiarity, adoption targets, exposure level, and reception modality."
          )
      },
      outputSchema: { suggestions: z.array(z.unknown()) },
      annotations: READ_ONLY_TOOL_ANNOTATIONS
    },
    suggestChartsHandler
  )

  return srv
}

// ── Startup ──────────────────────────────────────────────────────────────
const cliArgs = process.argv.slice(2)
const httpMode = cliArgs.includes("--http")
const profileFlagIndex = cliArgs.indexOf("--profile")
const requestedProfile =
  profileFlagIndex !== -1
    ? cliArgs[profileFlagIndex + 1]
    : process.env.MCP_TOOL_PROFILE
const toolProfile: ToolProfile =
  requestedProfile === "public" ? "public" : "developer"
const portFlagIndex = cliArgs.indexOf("--port")
const parsedPort =
  portFlagIndex !== -1 && cliArgs[portFlagIndex + 1] != null
    ? parseInt(cliArgs[portFlagIndex + 1], 10)
    : NaN
const port = Number.isFinite(parsedPort) ? parsedPort : 3001
const host = resolveHTTPListenHost(cliArgs)

function operationLimitForMcpRequest(
  body: unknown,
  limits: ReturnType<typeof resolveMcpOperationLimits>
) {
  // JSON-RPC permits batches. Each tool call gets its own ceiling; a malformed
  // batch member remains the transport/schema layer's responsibility.
  const requests = Array.isArray(body) ? body : [body]
  for (const candidate of requests) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      continue
    const request = candidate as Record<string, unknown>
    if (request.method !== "tools/call") continue
    if (
      !request.params ||
      typeof request.params !== "object" ||
      Array.isArray(request.params)
    )
      continue
    const params = request.params as Record<string, unknown>
    if (!("arguments" in params)) continue
    const result = inspectMcpOperationInput(params.arguments, limits)
    if (!result.ok) return result
  }
  return null
}

async function main() {
  if (httpMode) {
    // HTTP mode — STATELESS Streamable HTTP: a fresh McpServer + transport per
    // request, no session map. Every Semiotic tool is an independent read-only
    // request/response with no per-session state, so sessions would be pure
    // overhead. Stateless lets Cloud Run autoscale freely (no session affinity
    // or single-instance pin) and removes any session-leak surface. The cost is
    // building a server per request — trivial at this QPS, and we use neither
    // server-initiated SSE streams nor resumability. See deploy/cloud-run/README.md.
    //
    // enableJsonResponse: POSTs return a single application/json body instead of
    // holding an SSE stream open — the right shape for serverless.
    // sessionIdGenerator: undefined selects stateless mode in the SDK.

    // DNS-rebinding defense (CVE-2025-66414): opt-in Host-header allowlist.
    // The SDK's built-in allowedHosts option is deprecated in favor of doing
    // this in the request handler. Set MCP_ALLOWED_HOSTS to your public
    // hostname(s) in production; leave unset for local dev.
    const allowedHosts = (process.env.MCP_ALLOWED_HOSTS || "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
    // Origin allowlist (browser cross-origin defense, opt-in). When set, a
    // request carrying a disallowed `Origin` is rejected and CORS echoes only
    // an allowed origin instead of the `*` wildcard. Leave unset for non-browser
    // MCP clients (which send no Origin) and local dev.
    const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim().toLowerCase())
      .filter(Boolean)
    // Hard request-body ceiling (DoS guard). A read-only tool can still consume
    // unbounded CPU/memory validating or rendering a huge payload, so cap the
    // bytes we accept before handing the body to the MCP transport. Default 4 MB;
    // override with MCP_MAX_BODY_BYTES. A front proxy (Cloud Armor / API Gateway)
    // should enforce rate limits on top of this.
    const parsedMaxBody = parseInt(process.env.MCP_MAX_BODY_BYTES || "", 10)
    const maxBodyBytes =
      Number.isFinite(parsedMaxBody) && parsedMaxBody > 0
        ? parsedMaxBody
        : 4_194_304
    // Operation ceilings complement the byte cap: compact JSON can still
    // induce expensive profiling/layout/render work through many rows, fields,
    // or nested containers. Apply these before constructing an MCP server.
    const operationLimits = resolveMcpOperationLimits()
    const openaiAppsChallengeToken = (
      process.env.OPENAI_APPS_CHALLENGE_TOKEN || ""
    ).trim()
    const renderExecutionLimits = resolveMcpRenderExecutionLimits()
    const requestLimits = resolveMcpRequestLimits()
    const requestLimiter = createMcpRequestLimiter(requestLimits)
    const protocolVersions = (process.env.MCP_SUPPORTED_PROTOCOL_VERSIONS || "")
      .split(",")
      .map((version) => version.trim())
      .filter(Boolean)
    const protocolVersion =
      protocolVersions[0] || DEFAULT_MCP_SUPPORTED_PROTOCOL_VERSION
    const authToken = (process.env.MCP_AUTH_TOKEN || "").trim()
    const authScheme =
      (process.env.MCP_AUTH_SCHEME || "Bearer").trim() || "Bearer"

    // Read the request body into memory with a hard byte cap. Returns the parsed
    // JSON, or a sentinel for an over-limit / malformed body. Reading it here
    // (rather than letting the transport consume the stream) is what lets us
    // enforce the ceiling for both Content-Length and chunked requests.
    type BodyResult =
      | { ok: true; body: unknown; bodyBytes: number }
      | {
          ok: false
          status: 413 | 400
          code: -32600 | -32602
          message: string
          reason:
            | "request_body_too_large"
            | "invalid_json"
            | "operation_limit"
            | "request_stream_error"
        }
    const readJsonBodyWithLimit = (
      req: import("http").IncomingMessage
    ): Promise<BodyResult> =>
      new Promise((resolve) => {
        let size = 0
        let done = false
        const chunks: Buffer[] = []
        const finish = (result: BodyResult) => {
          if (done) return
          done = true
          resolve(result)
        }
        req.on("data", (chunk: Buffer) => {
          if (done) return
          size += chunk.length
          if (size > maxBodyBytes) {
            // Stop accumulating (memory is now bounded), but don't destroy the
            // socket — the caller still needs to write the 413 response. Further
            // inbound chunks are ignored by the `done` guard above.
            finish({
              ok: false,
              status: 413,
              code: -32600,
              message: "Request body too large",
              reason: "request_body_too_large"
            })
            return
          }
          chunks.push(chunk)
        })
        req.on("end", () => {
          if (done) return
          const raw = Buffer.concat(chunks).toString("utf-8")
          if (!raw)
            return finish({ ok: true, body: undefined, bodyBytes: size })
          try {
            const body = JSON.parse(raw)
            const operationLimit = operationLimitForMcpRequest(
              body,
              operationLimits
            )
            if (operationLimit && !operationLimit.ok) {
              finish({
                ok: false,
                status: 413,
                code: -32602,
                message: formatMcpOperationLimitError(operationLimit),
                reason: "operation_limit"
              })
              return
            }
            finish({ ok: true, body, bodyBytes: size })
          } catch {
            finish({
              ok: false,
              status: 400,
              code: -32600,
              message: "Invalid JSON body",
              reason: "invalid_json"
            })
          }
        })
        req.on("error", () =>
          finish({
            ok: false,
            status: 400,
            code: -32600,
            message: "Request stream error",
            reason: "request_stream_error"
          })
        )
      })

    const buildInfo = buildInfoForProfile(toolProfile)
    const healthBody = () =>
      JSON.stringify({
        status: "ok",
        name: "semiotic-mcp",
        version: buildInfo.packageVersion,
        transport: "streamable-http",
        mode: "stateless",
        channel: buildInfo.channel,
        packageVersion: buildInfo.packageVersion,
        surfaceVersion: buildInfo.surfaceVersion,
        ...(buildInfo.commitSha ? { commitSha: buildInfo.commitSha } : {}),
        ...(buildInfo.buildId ? { buildId: buildInfo.buildId } : {}),
        ...(buildInfo.builtAt ? { builtAt: buildInfo.builtAt } : {})
      })
    const writeHealthResponse = (res: import("http").ServerResponse) => {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(healthBody())
    }

    const httpServer = http.createServer(async (req, res) => {
      const requestStartedAt = Date.now()

      // Route extraction deliberately excludes the query string. The logging
      // boundary further reduces it to a fixed route enum before serialization.
      const pathname = (() => {
        try {
          return new URL(req.url || "/", "http://localhost").pathname
        } catch {
          return "/"
        }
      })()

      const origin = String(req.headers.origin || "")
        .trim()
        .toLowerCase()
      // CORS: wildcard when no origin allowlist is configured; otherwise echo
      // only an allowed origin (and Vary on Origin so caches don't cross wires).
      if (allowedOrigins.length > 0) {
        res.setHeader(
          "Access-Control-Allow-Origin",
          allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
        )
        res.setHeader("Vary", "Origin")
      } else {
        res.setHeader("Access-Control-Allow-Origin", "*")
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Last-Event-ID"
      )
      res.setHeader("Access-Control-Expose-Headers", "MCP-Protocol-Version")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      // Origin allowlist (browser cross-origin defense). A request that presents
      // a disallowed Origin is rejected outright. Non-browser MCP clients send
      // no Origin header and are unaffected.
      if (
        allowedOrigins.length > 0 &&
        origin &&
        !allowedOrigins.includes(origin)
      ) {
        mcpLogger.warn("request_rejected", {
          reason: "forbidden_origin",
          method: req.method,
          route: pathname,
          status: 403
        })
        res.writeHead(403, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Forbidden origin" },
            id: null
          })
        )
        return
      }

      res.setHeader("MCP-Protocol-Version", protocolVersion)

      // Host-header allowlist (DNS-rebinding defense). Opt-in via env.
      // req.headers.host usually carries a port (localhost:3001) and may be
      // bracketed for IPv6 ([::1]:3001). Allowlist entries are typically bare
      // hosts, so match against both the raw header and a port-stripped form.
      if (allowedHosts.length > 0) {
        const rawHost = String(req.headers.host || "")
          .trim()
          .toLowerCase()
        const normalizedHost = rawHost.startsWith("[")
          ? rawHost.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
          : rawHost.split(":")[0]
        if (
          !allowedHosts.includes(rawHost) &&
          !allowedHosts.includes(normalizedHost)
        ) {
          mcpLogger.warn("request_rejected", {
            reason: "forbidden_host",
            method: req.method,
            route: pathname,
            status: 403
          })
          res.writeHead(403, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32000, message: "Forbidden host" },
              id: null
            })
          )
          return
        }
      }

      // Dedicated health endpoint for platform probes (Cloud Run, uptime checks).
      if (req.method === "GET" && pathname === "/health") {
        writeHealthResponse(res)
        return
      }

      // ChatGPT Apps domain verification expects the raw challenge token at
      // the origin-root well-known URL. Keep it env-driven so deployments can
      // rotate or remove the token without committing it.
      if (
        req.method === "GET" &&
        pathname === "/.well-known/openai-apps-challenge" &&
        openaiAppsChallengeToken
      ) {
        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        })
        res.end(openaiAppsChallengeToken)
        return
      }

      // MCP lives at / and /mcp only. Everything else (favicon, and notably
      // .well-known/* discovery probes) gets a clean 404. A 404 on
      // /.well-known/oauth-protected-resource is the correct signal that this
      // is an unauthenticated server — a 200 with non-OAuth JSON would confuse
      // a client's auth-discovery flow.
      if (pathname !== "/" && pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Not found" }))
        return
      }

      // Canonical MCP transport endpoint is `/mcp`. The Streamable HTTP spec
      // says a server that does not offer an SSE stream must answer GET with
      // 405 — so `GET /mcp` is 405 (with Allow: POST), not a friendly 200.
      // Root `GET /` stays a human/service information blob, which is outside
      // the MCP transport contract.
      if (req.method === "GET") {
        if (pathname === "/mcp") {
          res.writeHead(405, {
            "Content-Type": "application/json",
            Allow: "POST, OPTIONS"
          })
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message:
                  "Method not allowed (stateless server offers no SSE stream)"
              },
              id: null
            })
          )
          return
        }
        writeHealthResponse(res)
        return
      }

      if (req.method !== "POST") {
        res.writeHead(405, {
          "Content-Type": "application/json",
          Allow: "POST, OPTIONS"
        })
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Method not allowed" },
            id: null
          })
        )
        return
      }

      // Health and other non-MCP GET routes have already returned above, so
      // only a request that can reach the MCP transport receives cancellation
      // wiring or a per-request server/transport instance.
      const requestAbortSignal = createMcpRequestCancellationSignal(req, res)

      if (!hasSupportedAccept(String(req.headers.accept || ""))) {
        mcpLogger.warn("request_rejected", {
          reason: "unsupported_accept",
          method: req.method,
          route: pathname,
          status: 406
        })
        writeJsonRpcError(
          res,
          406,
          -32000,
          "Not Acceptable: this endpoint supports JSON transport only"
        )
        return
      }

      if (
        !isSupportedProtocolVersion(
          String(req.headers["mcp-protocol-version"] || ""),
          protocolVersions
        )
      ) {
        mcpLogger.warn("request_rejected", {
          reason: "unsupported_protocol_version",
          method: req.method,
          route: pathname,
          status: 400,
          // The header's value can be attacker-controlled; presence is enough
          // operationally and keeps it out of the log boundary.
          protocolVersionPresent: Boolean(req.headers["mcp-protocol-version"])
        })
        writeJsonRpcError(res, 400, -32000, "Unsupported MCP protocol version")
        return
      }

      if (authToken && !isAuthorizedRequest(req, authToken, authScheme)) {
        mcpLogger.warn("request_rejected", {
          reason: "unauthorized",
          method: req.method,
          route: pathname,
          status: 401
        })
        res.setHeader("WWW-Authenticate", `${authScheme} realm="semiotic-mcp"`)
        writeJsonRpcError(res, 401, -32000, "Unauthorized")
        return
      }

      const requestSlot = requestLimiter.tryAcquire()
      if (!requestSlot.ok) {
        res.setHeader(
          "Retry-After",
          String(Math.max(1, Math.ceil(requestSlot.retryAfterMs / 1000)))
        )
        mcpLogger.warn("request_rejected", {
          reason:
            requestSlot.code === "MCP_REQUEST_CONCURRENCY"
              ? "request_concurrency"
              : "request_rate",
          method: req.method,
          route: pathname,
          status: 429
        })
        writeJsonRpcError(res, 429, -32000, requestSlot.message)
        return
      }

      try {
        // Enforce the hard body-size ceiling and parse the JSON ourselves, then
        // hand the parsed body to the transport (rather than let it drain the
        // stream unbounded).
        const bodyResult = await readJsonBodyWithLimit(req)
        if (!bodyResult.ok) {
          mcpLogger.warn("request_rejected", {
            reason: bodyResult.reason,
            method: req.method,
            route: pathname,
            status: bodyResult.status
          })
          if (!res.headersSent) {
            res.writeHead(bodyResult.status, {
              "Content-Type": "application/json"
            })
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: bodyResult.code, message: bodyResult.message },
                id: null
              })
            )
          }
          return
        }

        // Stateless: one ephemeral server+transport for this request only. Reusing
        // a stateless transport across requests is a known SDK bug, so we never do.
        const srv = createServer(toolProfile, {
          signal: requestAbortSignal,
          limits: renderExecutionLimits
        })
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        })
        // Tear down exactly once. enableJsonResponse returns a single JSON body,
        // so a normal request is done the moment handleRequest resolves — close
        // in finally rather than waiting on res "close", which may not fire
        // promptly on keep-alive connections and would otherwise leak a
        // connected server+transport per request. The close handler stays for
        // aborted requests that never reach finally; the guard makes the two
        // paths idempotent.
        let torndown = false
        const teardown = () => {
          if (torndown) return
          torndown = true
          Promise.resolve(transport.close()).catch(() => {})
          Promise.resolve(srv.close()).catch(() => {})
        }
        res.on("close", teardown)
        try {
          await srv.connect(transport)
          await transport.handleRequest(req, res, bodyResult.body)
          // Completion metrics are deliberately content-free. They make the
          // hosted policy measurable without recording a tool name, headers,
          // JSON-RPC id, arguments, chart output, or any raw error text.
          mcpLogger.info("request_completed", {
            method: req.method,
            route: pathname,
            status: res.statusCode,
            durationMs: Date.now() - requestStartedAt,
            bodyBytes: bodyResult.bodyBytes
          })
        } catch {
          // Do not serialize an SDK Error here: it can include a rejected
          // JSON-RPC body, headers, or generated chart text. The logging
          // boundary records the fixed category only.
          mcpLogger.error("request_failed", {
            reason: "request_handler_error",
            method: req.method,
            route: pathname,
            status: 500,
            durationMs: Date.now() - requestStartedAt,
            bodyBytes: bodyResult.bodyBytes
          })
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal server error" },
                id: null
              })
            )
          }
        } finally {
          teardown()
        }
      } finally {
        requestSlot.release()
      }
    })

    httpServer.listen(port, host, () => {
      // Including the declared retention here lets deployment smoke/operations
      // compare the process policy to the configured provider log bucket.
      mcpLogger.info("service_started", {
        profile: toolProfile,
        retentionDays: mcpLoggingPolicy.retentionDays
      })
    })
  } else {
    // Default: stdio mode for Claude Desktop, Claude Code, Cursor, etc.
    const srv = createServer(toolProfile)
    const transport = new StdioServerTransport()
    await srv.connect(transport)
  }
}

main().catch(() => {
  // Startup errors can include environment- or dependency-provided text. Keep
  // process output metadata-only for the same reason as request failures.
  mcpLogger.error("service_fatal", { reason: "service_startup_failure" })
  process.exit(1)
})

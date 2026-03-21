#!/usr/bin/env node
/**
 * Semiotic MCP Server
 *
 * Exposes three tools:
 *   1. renderChart — renders any HOC chart to static SVG
 *   2. diagnoseConfig — anti-pattern detector for chart configurations
 *   3. reportIssue — generates a pre-filled GitHub issue URL for bugs/features
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

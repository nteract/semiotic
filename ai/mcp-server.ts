#!/usr/bin/env node
/**
 * Semiotic MCP Server
 *
 * Exposes every HOC chart component as an MCP tool.
 * Accepts component props as tool arguments, renders to static SVG,
 * and returns the SVG string.
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

// Load schema.json for tool definitions
const schemaPath = path.resolve(__dirname, "../schema.json")
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))

interface SchemaToolDef {
  type: string
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, any>
      required?: string[]
    }
  }
}

// Build MCP server
const server = new McpServer({
  name: "semiotic",
  version: schema.version || "3.0.0",
})

// Register each chart component as a tool
for (const toolDef of schema.tools as SchemaToolDef[]) {
  const { name, description, parameters } = toolDef.function

  // Skip realtime charts (ref-based, can't render to static SVG)
  if (name.startsWith("Realtime")) continue

  // Skip components not in registry
  if (!COMPONENT_REGISTRY[name]) continue

  // Register the tool — use raw z.any() style since we have our own validation
  server.tool(
    name,
    description,
    {},
    async (args: Record<string, unknown>) => {
      const result = renderHOCToSVG(name, args as Record<string, any>)

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
}

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error("MCP server error:", err)
  process.exit(1)
})

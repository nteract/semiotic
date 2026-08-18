import { build } from "esbuild"
import { mcpBuildOptions } from "./lib/mcp-build-options.mjs"

const production = process.argv.includes("--production")

await build(
  mcpBuildOptions({
    outfile: "ai/dist/mcp-server.js",
    production,
  }),
)

console.log(`✅ MCP server bundle created${production ? " (minified)" : ""}`)

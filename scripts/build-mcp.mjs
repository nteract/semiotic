import { build } from "esbuild"
import {
  mcpBuildOptions,
  diagnosisBuildOptions
} from "./lib/mcp-build-options.mjs"

const production = process.argv.includes("--production")

await build(
  mcpBuildOptions({
    outfile: "ai/dist/mcp-server.js",
    production
  })
)

await build(
  diagnosisBuildOptions({
    outfile: "ai/dist/diagnose-operation.js",
    production
  })
)

console.log(`✅ MCP server bundle created${production ? " (minified)" : ""}`)

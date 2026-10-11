import bundleFreshness from "./lib/mcp-bundle-freshness.cjs"
import { build } from "esbuild"
import {
  mcpBuildOptions,
  diagnosisBuildOptions
} from "./lib/mcp-build-options.mjs"

const buildSourceFingerprint = bundleFreshness.sourceFingerprint(
  process.cwd(),
  "mcp"
)
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

bundleFreshness.writeBuildFingerprint(
  process.cwd(),
  "mcp",
  buildSourceFingerprint
)

console.log(`✅ MCP server bundle created${production ? " (minified)" : ""}`)

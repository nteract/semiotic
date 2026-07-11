#!/usr/bin/env node
/**
 * Generate the compact, agent-visible inventory of Semiotic's AI surface.
 *
 * The manifest is intentionally derived from the published schema, package
 * exports, and MCP server source. It gives docs, agents, and release checks one
 * stable answer for component and MCP counts without hand-maintained numbers.
 *
 * Usage:
 *   node scripts/generate-ai-surface-manifest.mjs
 *   node scripts/generate-ai-surface-manifest.mjs --check
 */

import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const require = createRequire(import.meta.url)
const { componentIndexFromSchema } = require(path.join(ROOT, "ai/componentMetadata.cjs"))

const files = {
  package: path.join(ROOT, "package.json"),
  schema: path.join(ROOT, "ai/schema.json"),
  semioticAI: path.join(ROOT, "src/components/semiotic-ai.ts"),
  mcpServer: path.join(ROOT, "ai/mcp-server.ts"),
  output: path.join(ROOT, "ai/surface-manifest.json"),
}

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function parseAIChartExports(source) {
  const names = new Set()
  const exportRegex = /export\s+\{([^}]+)\}\s+from\s+"\.\/charts\/(?:xy|ordinal|network|realtime|physics|value)\//g
  for (const match of source.matchAll(exportRegex)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (/^[A-Z]/.test(name)) names.add(name)
    }
  }
  return sorted(names)
}

function parseRegistrationNames(source, method) {
  const names = new Set()
  const regex = new RegExp(`srv\\.${method}\\(\\s*"([^"]+)"`, "g")
  for (const match of source.matchAll(regex)) names.add(match[1])
  return sorted(names)
}

const packageJson = JSON.parse(read(files.package))
const schema = JSON.parse(read(files.schema))
const componentIndex = componentIndexFromSchema(schema)
const aiChartExports = parseAIChartExports(read(files.semioticAI))
const mcpSource = read(files.mcpServer)
const tools = sorted([
  ...parseRegistrationNames(mcpSource, "tool"),
  ...parseRegistrationNames(mcpSource, "registerTool"),
])
const publicTools = ["createChart", "improveChart", "explainChart", "auditChart", "getChartSchema"]

const output = {
  __generated: true,
  __source: [
    "package.json",
    "ai/schema.json",
    "ai/componentMetadata.cjs",
    "src/components/semiotic-ai.ts",
    "ai/mcp-server.ts",
  ],
  version: packageJson.version,
  components: {
    schema: schema.tools.length,
    aiChartExports: aiChartExports.length,
    mcpRenderable: componentIndex.renderableComponents,
    browserOnly: componentIndex.browserOnlyComponents,
    categories: componentIndex.categories,
    aiChartExportNames: aiChartExports,
    geoExcludedFromAIExports: componentIndex.categories.geo,
  },
  mcp: {
    toolCount: tools.length,
    tools,
    publicProfile: {
      toolCount: publicTools.length,
      tools: publicTools,
      activation: "semiotic-mcp --profile public or MCP_TOOL_PROFILE=public",
    },
    resourceCount: parseRegistrationNames(mcpSource, "registerResource").length,
    resources: parseRegistrationNames(mcpSource, "registerResource"),
    promptCount: parseRegistrationNames(mcpSource, "registerPrompt").length,
    prompts: parseRegistrationNames(mcpSource, "registerPrompt"),
  },
}

const rendered = JSON.stringify(output, null, 2) + "\n"
if (process.argv.includes("--check")) {
  if (!fs.existsSync(files.output) || read(files.output) !== rendered) {
    console.error("AI surface manifest is stale. Run: npm run docs:ai-surface")
    process.exit(1)
  }
  console.log("✅ AI surface manifest is current")
} else {
  fs.writeFileSync(files.output, rendered)
  console.log(`✅ wrote ${path.relative(ROOT, files.output)}`)
  console.log(`   ${schema.tools.length} schema components; ${tools.length} MCP tools`)
}

#!/usr/bin/env node
/**
 * Check AI/MCP surface parity.
 *
 * `check:chart-specs` verifies schema/validation/metadata round-trip from the
 * Chart Spec Registry. This script covers the adjacent AI surfaces that the
 * registry does not generate: `semiotic/ai` chart exports, the MCP
 * renderable registry, AI component metadata, and server renderChart
 * configs. The schema↔validation per-name parity check used to live here too
 * but is now redundant — the registry round-trip locks both sides.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")

const files = {
  schema: path.join(ROOT, "ai/schema.json"),
  validation: path.join(ROOT, "src/components/charts/shared/validationMap.ts"),
  semioticAI: path.join(ROOT, "src/components/semiotic-ai.ts"),
  componentRegistry: path.join(ROOT, "ai/componentRegistry.ts"),
  componentMetadata: path.join(ROOT, "ai/componentMetadata.cjs"),
  serverConfigs: path.join(ROOT, "src/components/server/serverChartConfigs.ts"),
  chartsDir: path.join(ROOT, "src/components/charts"),
}

const SERVER_ONLY = new Set([
  "Sparkline",
  // Custom-layout escape hatches are server-renderable HOCs, but they are
  // intentionally absent from the AI/MCP chart-spec registry because their
  // required layout functions are recipe-defined rather than schema-defined.
  "XYCustomChart",
  "OrdinalCustomChart",
  "NetworkCustomChart",
  "GeoCustomChart",
])

const SERVER_CONFIG_EXCLUDED = new Map([
  ["MultiAxisLineChart", "composite dual-axis HOC; renderable through the HOC SSR path, not serverChartConfigs"],
  ["ScatterplotMatrix", "SVG composite with internal brush overlay; renderable through the HOC SSR path"],
  ["MinimapChart", "interactive composite with overview/detail brush; renderable through the HOC SSR path"],
  ["OrbitDiagram", "animated hierarchy HOC; MCP HOC render path is the supported static snapshot"],
  ["DistanceCartogram", "stateful geo HOC; MCP HOC render path is the supported static snapshot"],
  ["TemporalHistogram", "static-data sibling of RealtimeHistogram; renderable through the StreamXYFrame SSR path the HOC already uses"],
])

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function difference(a, b) {
  return sorted([...a].filter(value => !b.has(value)))
}

function parseValidationComponents() {
  const source = read(files.validation)
  const names = new Set()
  for (const match of source.matchAll(/^\s{2}(\w+):\s*\{/gm)) {
    const name = match[1]
    if (/^[A-Z]/.test(name)) names.add(name)
  }
  return names
}

function loadSchemaDocument() {
  return JSON.parse(read(files.schema))
}

function parseSchemaComponents() {
  const schema = loadSchemaDocument()
  return new Set(schema.tools.map(tool => tool.function.name))
}

function parseSemioticAIChartExports() {
  const source = read(files.semioticAI)
  const names = new Set()
  const exportRegex = /export\s+\{([^}]+)\}\s+from\s+"\.\/charts\/(?:xy|ordinal|network|realtime|value)\//g
  for (const match of source.matchAll(exportRegex)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (/^[A-Z]/.test(name)) names.add(name)
    }
  }
  return names
}

function parseComponentRegistry() {
  const source = read(files.componentRegistry)
  const names = new Set()
  for (const match of source.matchAll(/^\s{2}(\w+):\s*\{\s*component:/gm)) {
    names.add(match[1])
  }
  return names
}

function parseServerConfigs() {
  const source = read(files.serverConfigs)
  const names = new Set()
  const registryStart = source.indexOf("export const CHART_CONFIGS")
  const registrySource = registryStart >= 0 ? source.slice(registryStart) : source
  for (const match of registrySource.matchAll(/^\s{2}(\w+):\s/gm)) {
    names.add(match[1])
  }
  return names
}

function discoverChartFiles(category) {
  const dir = path.join(files.chartsDir, category)
  const names = new Set()
  if (!fs.existsSync(dir)) return names
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".tsx")) continue
    if (file.endsWith(".test.tsx")) continue
    names.add(file.replace(/\.tsx$/, ""))
  }
  return names
}

const validation = parseValidationComponents()
const schema = parseSchemaComponents()
const semioticAI = parseSemioticAIChartExports()
const mcpRegistry = parseComponentRegistry()
const serverConfigs = parseServerConfigs()
const geoCharts = discoverChartFiles("geo")
// Value-family HOCs (BigNumber today) ship under `semiotic/value` and
// don't route through the frame-driven `renderChart` server config path.
// `semiotic/ai` does re-export BigNumber for the intelligence demo
// pages, but the chart still skips the MCP-renderable parity check
// because it isn't a `renderChart`-compatible HOC. Mirrors the
// `hoc-ssr-only` capability special-feature documented in chartSpecs.ts.
const valueCharts = discoverChartFiles("value")
const realtimeCharts = new Set([...validation].filter(name => name.startsWith("Realtime")))
const { componentIndexFromSchema } = require(files.componentMetadata)
const componentMetadata = componentIndexFromSchema(loadSchemaDocument())
const metadataComponents = new Set(componentMetadata.components.map(component => component.name))
const metadataRenderable = new Set(
  componentMetadata.components
    .filter(component => component.renderable)
    .map(component => component.name)
)

// Value charts now DO get re-exported from `semiotic/ai` (BigNumber is
// surfaced for the intelligence demo pages), so they're expected in the
// AI exports set. Geo charts stay excluded because they ship under a
// separate subpath and aren't re-exported from `semiotic/ai`.
const expectedAIExports = new Set(
  [...validation].filter(name => !geoCharts.has(name))
)
const expectedMCPRegistry = new Set(
  [...validation].filter(name => !realtimeCharts.has(name) && !valueCharts.has(name))
)
const expectedServerConfigs = new Set(
  [...expectedMCPRegistry].filter(name => !SERVER_CONFIG_EXCLUDED.has(name))
)

const errors = []

function assertNoMissing(label, actual, expected) {
  const missing = difference(expected, actual)
  if (missing.length) errors.push(`${label} missing: ${missing.join(", ")}`)
}

function assertNoUnexpected(label, actual, expected) {
  const unexpected = difference(actual, expected)
  if (unexpected.length) errors.push(`${label} unexpected: ${unexpected.join(", ")}`)
}

// schema↔validation name parity is locked by check:chart-specs (registry
// round-trip). We still load schema below to cross-check MCP registry
// entries, but no longer assert parity here.

assertNoMissing("semiotic/ai chart exports", semioticAI, expectedAIExports)
assertNoUnexpected("semiotic/ai chart exports", semioticAI, expectedAIExports)

assertNoMissing("MCP component registry", mcpRegistry, expectedMCPRegistry)
assertNoUnexpected("MCP component registry", mcpRegistry, expectedMCPRegistry)

assertNoMissing("AI component metadata", metadataComponents, validation)
assertNoUnexpected("AI component metadata", metadataComponents, validation)
assertNoMissing("AI renderable metadata", metadataRenderable, expectedMCPRegistry)
assertNoUnexpected("AI renderable metadata", metadataRenderable, expectedMCPRegistry)

assertNoMissing("serverChartConfigs", serverConfigs, expectedServerConfigs)

const allowedServerConfigs = new Set([...expectedServerConfigs, ...SERVER_ONLY])
assertNoUnexpected("serverChartConfigs", serverConfigs, allowedServerConfigs)

for (const name of mcpRegistry) {
  if (!schema.has(name)) {
    errors.push(`MCP component registry includes ${name}, but schema.json does not`)
  }
  if (!geoCharts.has(name) && !semioticAI.has(name)) {
    errors.push(`MCP component registry includes ${name}, but semiotic/ai does not export it`)
  }
  if (!serverConfigs.has(name) && !SERVER_CONFIG_EXCLUDED.has(name)) {
    errors.push(`MCP component registry includes ${name}, but it has no serverChartConfigs entry or documented exclusion`)
  }
}

if (errors.length) {
  console.error("\nAI/MCP surface parity check FAILED:\n")
  for (const error of errors) console.error(`  x ${error}`)
  console.error("\nUpdate schema, validation, semiotic/ai exports, ai/componentRegistry.ts, or the documented exclusions.")
  process.exit(1)
}

console.log("AI/MCP surface parity check passed")
console.log(`  ${validation.size} validation/schema components`)
console.log(`  ${semioticAI.size} semiotic/ai chart exports (${geoCharts.size} geo chart(s) intentionally excluded)`)
console.log(`  ${mcpRegistry.size} MCP-renderable components (${realtimeCharts.size} realtime + ${valueCharts.size} value chart(s) intentionally excluded)`)
console.log(`  ${metadataComponents.size} shared AI metadata components`)
console.log(`  ${serverConfigs.size} server render configs (+ ${SERVER_CONFIG_EXCLUDED.size} documented HOC-SSR exclusions)`)

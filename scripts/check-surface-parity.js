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
  chartSpecsIndex: path.join(ROOT, "src/components/charts/shared/chartSpecs.ts"),
  chartSpecsDir: path.join(ROOT, "src/components/charts/shared"),
  semioticAI: path.join(ROOT, "src/components/semiotic-ai.ts"),
  builtInRecipePublic: path.join(ROOT, "src/components/ai/builtInChartRecipePublic.ts"),
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
  "PhysicsCustomChart",
])

const AI_EXPORT_ONLY = new Set([
  // Exported for docs/intelligence demos, but not schema-driven or MCP-renderable
  // because callers must provide a layout function.
  "PhysicsCustomChart",
])

// Every non-realtime schema-visible chart now has a renderChart implementation.
// Keep this as an explicit map rather than deleting the escape hatch: a future
// exclusion must carry its public reason here and will be counted by the gate.
const SERVER_CONFIG_EXCLUDED = new Map()

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function difference(a, b) {
  return sorted([...a].filter(value => !b.has(value)))
}

// VALIDATION_MAP is generated from CHART_SPECS. Walk the per-family source
// registry instead of parsing generated runtime data so this parity gate
// reports the canonical chart catalog directly.
function chartSpecFamilyFiles() {
  const indexSource = read(files.chartSpecsIndex)
  const paths = []
  for (const match of indexSource.matchAll(/from\s+"\.\/(chartSpecs\w+)"/g)) {
    paths.push(path.join(files.chartSpecsDir, `${match[1]}.ts`))
  }
  return paths
}

function parseValidationComponents() {
  const names = new Set()
  for (const specFile of chartSpecFamilyFiles()) {
    const source = read(specFile)
    for (const match of source.matchAll(/^\s{2}(\w+):\s*\{/gm)) {
      const name = match[1]
      if (/^[A-Z]/.test(name)) names.add(name)
    }
  }
  return names
}

/**
 * Every chart component that ships from a public entry point.
 *
 * This is the one check that does NOT start from the Chart Spec Registry, and
 * that is the whole point. Every other gate here derives its expectations from
 * the registry, so a chart exported to users but never registered is invisible
 * to all of them — it silently skips schema validation, `suggestCharts`, MCP,
 * server rendering, and the docs-coverage gate. (ChainReactionChart shipped that
 * way.) Walking the filesystem and the entry points instead catches it.
 */
function parsePubliclyExportedCharts() {
  const exported = new Map()
  const entryDir = path.join(ROOT, "src/components")
  const entryFiles = fs
    .readdirSync(entryDir)
    .filter(name => /^semiotic(-[a-z-]+)?\.ts$/.test(name))
    .filter(name => !name.includes("experimental"))
  const entrySources = entryFiles.map(name => [
    name,
    read(path.join(entryDir, name)),
  ])

  const families = fs
    .readdirSync(files.chartsDir)
    .filter(name => name !== "shared")
    .filter(name => fs.statSync(path.join(files.chartsDir, name)).isDirectory())

  for (const family of families) {
    for (const file of fs.readdirSync(path.join(files.chartsDir, family))) {
      // Chart components are PascalCase single-component modules; lowercase
      // siblings are helpers and *.test.* are specs.
      if (!/^[A-Z][A-Za-z0-9]*\.tsx$/.test(file)) continue
      if (file.includes(".test.")) continue
      const name = file.replace(/\.tsx$/, "")
      const needle = `./charts/${family}/${name}"`
      const entries = entrySources
        .filter(([, source]) => source.includes(needle))
        .map(([entry]) => entry)
      if (entries.length) exported.set(name, entries)
    }
  }
  return exported
}

function loadSchemaDocument() {
  return JSON.parse(read(files.schema))
}

function parseSchemaComponents() {
  const schema = loadSchemaDocument()
  return new Set(schema.tools.map(tool => tool.function.name))
}

function parseRecipeComponents() {
  const schema = loadSchemaDocument()
  return new Set(
    schema.tools
      .filter(tool => tool.function["x-semiotic-kind"] === "recipe")
      .map(tool => tool.function.name)
  )
}

function parseSemioticAIChartExports() {
  const source = read(files.semioticAI)
  const names = new Set()
  const exportRegex = /export\s+\{([^}]+)\}\s+from\s+"\.\/charts\/(?:xy|ordinal|network|realtime|physics|value)\//g
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
const recipeComponents = parseRecipeComponents()
const semioticAI = parseSemioticAIChartExports()
const mcpRegistry = parseComponentRegistry()
const serverConfigs = parseServerConfigs()
const geoCharts = discoverChartFiles("geo")
// Value-family HOCs use the native value SVG registry rather than the
// frame-driven CHART_CONFIGS registry, but remain MCP-renderable.
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
  [...validation, ...AI_EXPORT_ONLY].filter(name => !geoCharts.has(name))
)
const expectedMCPRegistry = new Set(
  [...validation, ...recipeComponents].filter(name => !realtimeCharts.has(name))
)
const expectedMetadataComponents = new Set([...validation, ...recipeComponents])
const expectedServerConfigs = new Set(
  [...expectedMCPRegistry].filter(
    name => !SERVER_CONFIG_EXCLUDED.has(name) && !valueCharts.has(name)
  )
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

assertNoMissing("AI component metadata", metadataComponents, expectedMetadataComponents)
assertNoUnexpected("AI component metadata", metadataComponents, expectedMetadataComponents)
assertNoMissing("AI renderable metadata", metadataRenderable, expectedMCPRegistry)
assertNoUnexpected("AI renderable metadata", metadataRenderable, expectedMCPRegistry)

assertNoMissing("serverChartConfigs", serverConfigs, expectedServerConfigs)

const allowedServerConfigs = new Set([
  ...expectedServerConfigs,
  ...SERVER_ONLY,
  ...SERVER_CONFIG_EXCLUDED.keys(),
])
assertNoUnexpected("serverChartConfigs", serverConfigs, allowedServerConfigs)

// Registry-independent sweep: anything users can import must be registered, or
// the registry-derived gates above never see it at all.
const publiclyExported = parsePubliclyExportedCharts()
for (const [name, entries] of publiclyExported) {
  if (validation.has(name) || SERVER_ONLY.has(name)) continue
  errors.push(
    `${name} is exported from ${entries.join(", ")} but has no CHART_SPECS entry, ` +
      `so it skips schema validation, suggestCharts, MCP, and the docs-coverage gate. ` +
      `Add a spec (plus a .capability.ts), or add it to SERVER_ONLY with a reason.`
  )
}

for (const name of mcpRegistry) {
  if (!schema.has(name)) {
    errors.push(`MCP component registry includes ${name}, but schema.json does not`)
  }
  if (!geoCharts.has(name) && !recipeComponents.has(name) && !semioticAI.has(name)) {
    errors.push(`MCP component registry includes ${name}, but semiotic/ai does not export it`)
  }
  if (
    !serverConfigs.has(name) &&
    !SERVER_CONFIG_EXCLUDED.has(name) &&
    !valueCharts.has(name)
  ) {
    errors.push(`MCP component registry includes ${name}, but it has no serverChartConfigs entry or documented exclusion`)
  }
}

if (
  recipeComponents.size > 0 &&
  !`${read(files.semioticAI)}\n${read(files.builtInRecipePublic)}`.includes(
    'export { ChartRecipe } from "./ChartRecipe"'
  )
) {
  errors.push(
    "Schema-visible recipes require the generic ChartRecipe host to be exported from semiotic/ai"
  )
}

if (errors.length) {
  console.error("\nAI/MCP surface parity check FAILED:\n")
  for (const error of errors) console.error(`  x ${error}`)
  console.error("\nUpdate schema, validation, semiotic/ai exports, ai/componentRegistry.ts, or the documented exclusions.")
  process.exit(1)
}

console.log("AI/MCP surface parity check passed")
console.log(`  ${validation.size} chart specs + ${recipeComponents.size} schema-visible recipes`)
console.log(`  ${semioticAI.size} semiotic/ai chart exports (${geoCharts.size} geo chart(s) intentionally excluded)`)
console.log(`  ${mcpRegistry.size} MCP-renderable components (${realtimeCharts.size} realtime chart(s) intentionally excluded; ${valueCharts.size} value chart(s) use native SVG renderers)`)
console.log(`  ${metadataComponents.size} shared AI metadata components`)
console.log(`  ${serverConfigs.size} server render configs (+ ${SERVER_CONFIG_EXCLUDED.size} documented exclusions)`)
console.log(`  ${publiclyExported.size} publicly exported chart components, all registered (${SERVER_ONLY.size} layout-function escape hatches excluded)`)

#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readRegistryKeys } from "./lib/registry-source.cjs"
import { capabilityIndex, parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"
import { renderAccessCapabilitiesModule } from "./lib/accessCapabilities.mjs"
import {
  PUSH_HANDLE_CALLEES,
  readCapabilityWiring,
  capabilitySignals,
  hasLegendControl
} from "./lib/capabilitySourceChecks.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

const SERVER_CONFIGS_PATH = path.join(
  ROOT,
  "src/components/server/serverChartConfigs.ts"
)
const VALUE_RENDERERS_PATH = path.join(
  ROOT,
  "src/components/server/staticValue.tsx"
)
const CHARTS_DIR = path.join(ROOT, "src/components/charts")
const ACCESS_CAPABILITIES_PATH = path.join(
  ROOT,
  "src/components/access/chartAccessCapabilities.generated.ts"
)
const AI_SCHEMA_PATH = path.join(ROOT, "ai/schema.json")

const matrix = parseCapabilityMatrix()
const published = capabilityIndex(matrix)
const specEntries = Object.entries(published).map(([name, entry]) => ({ name, ...entry }))

if (specEntries.length === 0) {
  console.error(
    "✗ check-capabilities: no chart entries parsed from chartSpecs.ts"
  )
  process.exit(1)
}

// ── Index serverChartConfigs CHART_CONFIGS for the SSR gate ────────
const ssrRegistered = readRegistryKeys(SERVER_CONFIGS_PATH, "CHART_CONFIGS")
for (const name of readRegistryKeys(VALUE_RENDERERS_PATH, "VALUE_RENDERERS")) {
  ssrRegistered.add(name)
}

// Configs that legitimately serve server-only renderChart paths rather
// than HOC capability entries. Keep this list tiny; adding here means a
// config intentionally will not surface through the capability matrix.
const SERVER_CONFIG_ONLY = new Map([
  [
    "Sparkline",
    "compact server-rendered line used by renderChart(); not a HOC chartSpecs entry"
  ],
  [
    "XYCustomChart",
    "custom-layout escape hatch; named recipes register capability entries instead"
  ],
  [
    "OrdinalCustomChart",
    "custom-layout escape hatch; named recipes register capability entries instead"
  ],
  [
    "NetworkCustomChart",
    "custom-layout escape hatch; named recipes register capability entries instead"
  ],
  [
    "GeoCustomChart",
    "custom-layout escape hatch; named recipes register capability entries instead"
  ],
  [
    "PhysicsCustomChart",
    "custom-layout escape hatch; named recipes register capability entries instead"
  ]
])

const HOC_DIRS = ["../recipes/atlas", "xy", "ordinal", "network", "geo", "realtime", "physics", "value", "wordcloud"]
const hocSources = new Map()
for (const dir of HOC_DIRS) {
  const fullDir = path.join(CHARTS_DIR, dir)
  if (!fs.existsSync(fullDir)) continue
  for (const file of fs.readdirSync(fullDir)) {
    if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue
    if (file === "index.ts" || file === "index.tsx") continue
    if (!file.endsWith(".tsx")) continue
    const name = file.replace(".tsx", "")
    let source = fs.readFileSync(path.join(fullDir, file), "utf8")
    // Atlas shares a pure prop mapper with static rendering. Follow that
    // direct local import so a real `layout: …` dispatch remains auditable.
    for (const module of readCapabilityWiring(source).modules) {
      if (!/^\.\/\w+ChartProps$/.test(module)) continue
      const mapper = path.join(fullDir, `${module}.ts`)
      if (fs.existsSync(mapper)) source += "\n" + fs.readFileSync(mapper, "utf8")
    }
    hocSources.set(name, source)
  }
}

// ── Run the locks ─────────────────────────────────────────────────
const errors = []

const specNames = new Set(specEntries.map((entry) => entry.name))
const schemaTools = JSON.parse(fs.readFileSync(AI_SCHEMA_PATH, "utf8")).tools.map(tool => tool.function)
const schemaProps = new Map(schemaTools.map(tool => [tool.name, tool.parameters?.properties]))
const recipeNames = new Set(schemaTools.filter(tool => tool["x-semiotic-kind"] === "recipe").map(tool => tool.name))
for (const chart of [...ssrRegistered].sort()) {
  if (
    !specNames.has(chart) &&
    !recipeNames.has(chart) &&
    !SERVER_CONFIG_ONLY.has(chart)
  ) {
    errors.push(
      `✗ ${chart}: registered in serverChartConfigs.ts but absent from chartSpecs.ts. ` +
        `Either add it to chartSpecs with capabilities.supportsSSR=true, or document it in SERVER_CONFIG_ONLY.`
    )
  }
}
for (const chart of SERVER_CONFIG_ONLY.keys()) {
  if (specNames.has(chart)) {
    errors.push(
      `✗ ${chart}: appears in SERVER_CONFIG_ONLY but now exists in chartSpecs.ts. ` +
        `Remove the server-only exception and let the SSR lock cover it.`
    )
  }
  if (!ssrRegistered.has(chart)) {
    errors.push(
      `✗ ${chart}: SERVER_CONFIG_ONLY entry is stale because CHART_CONFIGS no longer registers it.`
    )
  }
}

for (const e of specEntries) {
  const inServerConfigs = ssrRegistered.has(e.name)
  if (e.supportsSSR && !inServerConfigs) {
    errors.push(
      `✗ ${e.name}: capabilities.supportsSSR=true but not in serverChartConfigs.ts CHART_CONFIGS. ` +
        `Either add a server config entry, or set supportsSSR=false with a documented reason.`
    )
  }
  if (!e.supportsSSR && inServerConfigs) {
    errors.push(
      `✗ ${e.name}: registered in serverChartConfigs.ts but capabilities.supportsSSR=false. ` +
        `Either set supportsSSR=true or remove the server config entry.`
    )
  }

  // The bounded temporal wrapper forwards to RealtimeHistogram in the same module.
  const source = hocSources.get(e.name === "TemporalHistogram" ? "RealtimeHistogram" : e.name)
  const syntax = readCapabilityWiring(source)
  const wiring = capabilitySignals(syntax)
  if (e.supportsLegend && !hasLegendControl(schemaProps.get(e.name), syntax)) {
    errors.push(`✗ ${e.name}: supportsLegend=true requires a public legend control or a forwarded frame legend.`)
  }

  if (e.category === "physics") {
    const wiresPhysicsSelection = wiring.physicsSelection
    if (e.supportsSelection !== wiresPhysicsSelection) {
      errors.push(
        `✗ ${e.name}: capabilities.supportsSelection=${e.supportsSelection} but ` +
          `direct usePhysicsSelection wiring=${wiresPhysicsSelection}. ` +
          `Physics HOCs must claim selection exactly when they call the shared physics selection bridge.`
      )
    }
  }

  if (e.supportsPush && !wiring.push) {
    errors.push(
      `✗ ${e.name}: capabilities.supportsPush=true but does not wire a push handle ` +
        `(${PUSH_HANDLE_CALLEES.join(", ")}). ` +
        `Either wire one of those, or set supportsPush=false (and document the exemption in specialFeatures).`
    )
  }

  if (e.supportsLinkedHover && !wiring.linkedHover) {
    errors.push(
      `✗ ${e.name}: capabilities.supportsLinkedHover=true but does not wire selection. ` +
        `Either invoke useChartSelection / useChartSetup / useNetworkChartSetup / usePhysicsSelection, render a custom-chart wrapper, or set ` +
        `supportsLinkedHover=false.`
    )
  }

  if (e.layoutMode === "custom" && !wiring.customLayout) {
    errors.push(
      `✗ ${e.name}: capabilities.layoutMode="custom" but does not reference any customLayout ` +
        `escape hatch. Either wire customNetworkLayout/customXYLayout/customOrdinalLayout, or ` +
        `set layoutMode="plugin".`
    )
  }
}

const CAPABILITIES_JSON_PATH = path.join(ROOT, "ai/capabilities.json")
if (fs.existsSync(CAPABILITIES_JSON_PATH)) {
  const actual = JSON.parse(fs.readFileSync(CAPABILITIES_JSON_PATH, "utf8"))
  const actualCharts = actual?.charts ?? {}
  if (JSON.stringify(actualCharts) !== JSON.stringify(published)) {
    errors.push(
      "ai/capabilities.json drifted from chartSpecs. Regenerate with `npm run docs:capabilities`."
    )
  }
} else {
  errors.push(
    "ai/capabilities.json missing. Generate with `npm run docs:capabilities`."
  )
}

const expectedAccessCapabilities = renderAccessCapabilitiesModule(matrix)
if (!fs.existsSync(ACCESS_CAPABILITIES_PATH)) {
  errors.push(
    "chartAccessCapabilities.generated.ts missing. Generate with `npm run docs:capabilities`."
  )
} else if (
  fs.readFileSync(ACCESS_CAPABILITIES_PATH, "utf8") !==
  expectedAccessCapabilities
) {
  errors.push(
    "chartAccessCapabilities.generated.ts drifted from chartSpecs. Regenerate with `npm run docs:capabilities`."
  )
}

if (errors.length > 0) {
  console.error(
    `✗ Capability claims drifted from runtime behavior (${errors.length} issue(s)):\n`
  )
  for (const e of errors) console.error("  " + e)
  console.error(
    "\nFix: edit chartSpecs.ts capability tags or wire up the missing runtime support."
  )
  process.exit(1)
}

console.log(
  `✓ Capability matrix locked — ${specEntries.length} chart spec(s) match runtime behavior.`
)
console.log(`  ${[...ssrRegistered].length} SSR-registered charts`)
console.log(
  `  ${specEntries.filter((e) => e.supportsPush).length} charts claim push support`
)
console.log(
  `  ${specEntries.filter((e) => e.layoutMode === "custom").length} charts use custom layouts`
)
console.log(`  ai/capabilities.json in sync`)
console.log(`  chartAccessCapabilities.generated.ts in sync`)

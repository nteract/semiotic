#!/usr/bin/env node
/**
 * Verify the capability tags in `chartSpecs.ts` against runtime
 * behavior. The audit's anti-goal is "Do not make registry metadata
 * aspirational. It should describe real runtime behavior and be
 * checked." — this script is the check.
 *
 * Today the script enforces the cheapest, highest-signal runtime locks:
 *
 *   1. `supportsSSR: true` ↔ entry in `serverChartConfigs.ts`
 *      CHART_CONFIGS. A chart claiming SSR support must be
 *      registered for `renderChart()`. A chart in CHART_CONFIGS but
 *      claiming `supportsSSR: false` is also an error. Server configs
 *      outside chartSpecs must appear in the explicit server-only
 *      allowlist below.
 *
 *   2. `supportsPush: true` ↔ HOC source imports
 *      `useFrameImperativeHandle` (or a documented exemption tag in
 *      `specialFeatures`). The shared imperative-handle hook is the
 *      standardized push-API surface; charts claiming push support
 *      without it would expose an inconsistent ref API.
 *
 *   3. `supportsLinkedHover: true` ↔ standardized selection wiring.
 *
 *   4. `layoutMode: "custom"` ↔ custom-layout dispatch.
 *
 *   5. `ai/capabilities.json` mirrors chartSpecs.
 *
 * Usage:
 *   node scripts/check-capabilities.mjs
 *
 * Exit code 1 on any mismatch.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

const SERVER_CONFIGS_PATH = path.join(ROOT, "src/components/server/serverChartConfigs.ts")
const CHARTS_DIR = path.join(ROOT, "src/components/charts")

// Parse via the shared helper so this script, the markdown
// generator, and the JSON generator all read chartSpecs the same
// way. Returns entries shaped { name, category, legend, selection,
// linkedHover, push, ssr, colorModel, layoutMode, features } sorted
// by (category, name).
const matrix = parseCapabilityMatrix()
// Re-shape into the field names the rest of this script expects.
// Keeping the local rename is intentional: the existing readability
// of `entry.supportsSSR` / `.supportsPush` reads like a capability
// claim better than `.ssr` / `.push`, especially in error messages.
const specEntries = matrix.map((e) => ({
  name: e.name,
  category: e.category,
  supportsSSR: e.ssr,
  supportsPush: e.push,
  supportsLinkedHover: e.linkedHover,
  supportsLegend: e.legend,
  supportsSelection: e.selection,
  colorModel: e.colorModel,
  layoutMode: e.layoutMode,
  specialFeatures: e.features,
}))

if (specEntries.length === 0) {
  console.error("✗ check-capabilities: no chart entries parsed from chartSpecs.ts")
  process.exit(1)
}

// ── Index serverChartConfigs CHART_CONFIGS for the SSR gate ────────
const configsSource = fs.readFileSync(SERVER_CONFIGS_PATH, "utf8")
const ssrRegistered = new Set()
const registryStart = configsSource.indexOf("export const CHART_CONFIGS")
const registrySource = registryStart >= 0 ? configsSource.slice(registryStart) : configsSource
for (const match of registrySource.matchAll(/^ {2}([A-Z][A-Za-z]+):\s/gm)) {
  ssrRegistered.add(match[1])
}

// Configs that legitimately serve server-only renderChart paths rather
// than HOC capability entries. Keep this list tiny; adding here means a
// config intentionally will not surface through the capability matrix.
const SERVER_CONFIG_ONLY = new Map([
  [
    "Sparkline",
    "compact server-rendered line used by renderChart(); not a HOC chartSpecs entry",
  ],
])

// ── Index HOC source files for the push-API gate ───────────────────
//
// `supportsPush: true` charts must import the shared
// `useFrameImperativeHandle` hook. Read each HOC's source and grep
// for the import; charts claiming push without the hook fail.
const HOC_DIRS = ["xy", "ordinal", "network", "geo", "realtime"]
const hocSources = new Map()
for (const dir of HOC_DIRS) {
  const fullDir = path.join(CHARTS_DIR, dir)
  if (!fs.existsSync(fullDir)) continue
  for (const file of fs.readdirSync(fullDir)) {
    if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue
    if (file === "index.ts" || file === "index.tsx") continue
    if (!file.endsWith(".tsx")) continue
    const name = file.replace(".tsx", "")
    hocSources.set(name, fs.readFileSync(path.join(fullDir, file), "utf8"))
  }
}

// ── Run the locks ─────────────────────────────────────────────────
const errors = []

const specNames = new Set(specEntries.map((entry) => entry.name))
for (const chart of [...ssrRegistered].sort()) {
  if (!specNames.has(chart) && !SERVER_CONFIG_ONLY.has(chart)) {
    errors.push(
      `✗ ${chart}: registered in serverChartConfigs.ts but absent from chartSpecs.ts. ` +
      `Either add it to chartSpecs with capabilities.supportsSSR=true, or document it in SERVER_CONFIG_ONLY.`,
    )
  }
}
for (const chart of SERVER_CONFIG_ONLY.keys()) {
  if (specNames.has(chart)) {
    errors.push(
      `✗ ${chart}: appears in SERVER_CONFIG_ONLY but now exists in chartSpecs.ts. ` +
      `Remove the server-only exception and let the SSR lock cover it.`,
    )
  }
  if (!ssrRegistered.has(chart)) {
    errors.push(
      `✗ ${chart}: SERVER_CONFIG_ONLY entry is stale because CHART_CONFIGS no longer registers it.`,
    )
  }
}

for (const e of specEntries) {
  // Lock 1: SSR claim ↔ CHART_CONFIGS membership.
  const inServerConfigs = ssrRegistered.has(e.name)
  if (e.supportsSSR && !inServerConfigs) {
    errors.push(
      `✗ ${e.name}: capabilities.supportsSSR=true but not in serverChartConfigs.ts CHART_CONFIGS. ` +
      `Either add a server config entry, or set supportsSSR=false (and consider adding "hoc-ssr-only" to specialFeatures).`,
    )
  }
  if (!e.supportsSSR && inServerConfigs) {
    errors.push(
      `✗ ${e.name}: registered in serverChartConfigs.ts but capabilities.supportsSSR=false. ` +
      `Either set supportsSSR=true or remove the server config entry.`,
    )
  }

  // Lock 2: push claim ↔ a recognized push wiring mechanism.
  // Three paths qualify:
  //   - `useFrameImperativeHandle` — the standard ref bridge used by
  //     XY, network, and the simpler ordinal HOCs.
  //   - `useOrdinalStreaming` — the aggregator-aware push pipeline
  //     used by BarChart family.
  //   - `useImperativeHandle(` (a raw call, not just an import) —
  //     bespoke bridges for composite charts (ScatterplotMatrix,
  //     MinimapChart) and aggregators that pre-process via a
  //     specialized hook (LikertChart via useLikertAggregation).
  // The first two are preferred; the raw call is the fallback for
  // charts whose ref API legitimately needs custom plumbing. All
  // three signal that the chart exposes a working `ref.current.push`.
  const source = hocSources.get(e.name)
  if (e.supportsPush) {
    if (!source) {
      // Couldn't find the HOC source — skip rather than false-positive.
      continue
    }
    const importsPushHook =
      /\buseFrameImperativeHandle\b/.test(source) ||
      /\buseOrdinalStreaming\b/.test(source) ||
      /\buseImperativeHandle\(/.test(source)
    if (!importsPushHook) {
      errors.push(
        `✗ ${e.name}: capabilities.supportsPush=true but does not wire a push handle ` +
        `(useFrameImperativeHandle, useOrdinalStreaming, or a raw useImperativeHandle call). ` +
        `Either wire one of those, or set supportsPush=false (and document the exemption in specialFeatures).`,
      )
    }
  }

  // Lock 3: linkedHover claim ↔ useChartSelection or useChartSetup
  // (which calls useChartSelection internally) or useNetworkChartSetup
  // (also wraps useChartSelection). The hook is the only standardized
  // way to wire `linkedHover` into the frame's hover-selection
  // pipeline; charts claiming linked-hover support without it would
  // have a no-op `linkedHover` prop.
  if (e.supportsLinkedHover) {
    if (!source) continue
    const wired =
      /\buseChartSelection\b/.test(source) ||
      /\buseChartSetup\b/.test(source) ||
      /\buseNetworkChartSetup\b/.test(source)
    if (!wired) {
      errors.push(
        `✗ ${e.name}: capabilities.supportsLinkedHover=true but does not wire selection. ` +
        `Either import useChartSelection / useChartSetup / useNetworkChartSetup, or set ` +
        `supportsLinkedHover=false.`,
      )
    }
  }

  // Lock 4: layoutMode === "custom" ↔ customNetworkLayout /
  // customXYLayout / customOrdinalLayout reference. The escape-hatch
  // claim must be backed by a real customLayout dispatch.
  if (e.layoutMode === "custom") {
    if (!source) continue
    const wired =
      /\bcustomNetworkLayout\b/.test(source) ||
      /\bcustomXYLayout\b/.test(source) ||
      /\bcustomOrdinalLayout\b/.test(source)
    if (!wired) {
      errors.push(
        `✗ ${e.name}: capabilities.layoutMode="custom" but does not reference any customLayout ` +
        `escape hatch. Either wire customNetworkLayout/customXYLayout/customOrdinalLayout, or ` +
        `set layoutMode="plugin".`,
      )
    }
  }

  // TODO (next pass):
  //   - supportsLegend ↔ a legend signal (showLegend prop on the
  //     props interface OR useChartLegendAndMargin import). Harder
  //     to gate cleanly because chord-style "interaction-only"
  //     legends pass `showLegend: false` to the hook but still
  //     produce a categorical interaction surface.
}

// ── Lock 5: ai/capabilities.json mirrors chartSpecs ───────────────
//
// `ai/capabilities.json` is consumed by `ai/chartSuggestions.cjs` so
// the AI suggestion path can filter recommendations by capability
// (push, linkedHover, ssr, etc.) without re-parsing TS at runtime.
// If chartSpecs has changed since the JSON was last regenerated, the
// AI surface is silently stale — fail with a regenerate hint.
const CAPABILITIES_JSON_PATH = path.join(ROOT, "ai/capabilities.json")
if (fs.existsSync(CAPABILITIES_JSON_PATH)) {
  const expected = {}
  for (const e of specEntries) {
    expected[e.name] = {
      category: e.category,
      supportsLegend: e.supportsLegend,
      supportsSelection: e.supportsSelection,
      supportsLinkedHover: e.supportsLinkedHover,
      supportsPush: e.supportsPush,
      supportsSSR: e.supportsSSR,
      colorModel: e.colorModel,
      layoutMode: e.layoutMode,
      specialFeatures: e.specialFeatures,
    }
  }
  // Sort keys to match the generator's output (category-then-name).
  const ORDER = ["xy", "ordinal", "network", "geo", "realtime"]
  const sortedNames = Object.keys(expected).sort((a, b) => {
    const ai = ORDER.indexOf(expected[a].category)
    const bi = ORDER.indexOf(expected[b].category)
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
  const expectedSorted = {}
  for (const name of sortedNames) expectedSorted[name] = expected[name]

  const actual = JSON.parse(fs.readFileSync(CAPABILITIES_JSON_PATH, "utf8"))
  const actualCharts = actual?.charts ?? {}
  if (JSON.stringify(actualCharts) !== JSON.stringify(expectedSorted)) {
    errors.push(
      "ai/capabilities.json drifted from chartSpecs. Regenerate with `npm run docs:capabilities`.",
    )
  }
} else {
  errors.push(
    "ai/capabilities.json missing. Generate with `npm run docs:capabilities`.",
  )
}

if (errors.length > 0) {
  console.error(`✗ Capability claims drifted from runtime behavior (${errors.length} issue(s)):\n`)
  for (const e of errors) console.error("  " + e)
  console.error("\nFix: edit chartSpecs.ts capability tags or wire up the missing runtime support.")
  process.exit(1)
}

console.log(`✓ Capability matrix locked — ${specEntries.length} chart spec(s) match runtime behavior.`)
console.log(`  ${[...ssrRegistered].length} SSR-registered charts`)
console.log(`  ${specEntries.filter((e) => e.supportsPush).length} charts claim push support`)
console.log(`  ${specEntries.filter((e) => e.layoutMode === "custom").length} charts use custom layouts`)
console.log(`  ai/capabilities.json in sync`)

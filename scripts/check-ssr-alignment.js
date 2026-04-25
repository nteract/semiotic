#!/usr/bin/env node
/**
 * Check SSR alignment — verifies that serverChartConfigs.ts covers all HOC
 * chart types, that key props are threaded through, AND that every scene-node
 * type emitted by a canvas scene builder has a matching SVG converter case.
 *
 * The third check is the load-bearing one: client renders via canvas (using
 * scene builders + canvas renderers); server renders via `SceneToSVG.tsx`
 * which converts the same scene-node values to SVG. If a new node type lands
 * on canvas without a corresponding case in `*SceneNodeToSVG`, server renders
 * silently drop those marks. The bar `gradientFill` near-miss in 3.4.2 was
 * exactly this class of bug — caught by the developer who shipped it; the
 * next contributor needs the safety net.
 *
 * Fails CI if:
 * 1. An HOC chart exists but has no SSR config entry
 * 2. An SSR config entry references a chart that doesn't exist as an HOC
 * 3. Checked key props (currently oSort and cornerRadius) are missing from
 *    SSR configs for charts that support them
 * 4. A scene builder emits a `type: "X"` value that no `*SceneNodeToSVG`
 *    converter handles (canvas-only rendering — SSR drops the mark silently)
 * 5. A `*SceneNodeToSVG` converter has a `case "X":` for a node type no
 *    scene builder ever emits (dead SVG branch — usually means the scene
 *    type was renamed/removed and the SVG side wasn't updated)
 *
 * Usage:
 *   node scripts/check-ssr-alignment.js
 *
 * Tests can point the scene parity pass at a temporary SceneToSVG copy via:
 *   SEMIOTIC_SCENE_TO_SVG=/tmp/SceneToSVG.tsx node scripts/check-ssr-alignment.js
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const CHARTS_DIR = path.join(ROOT, "src/components/charts")
const SSR_CONFIGS = path.join(ROOT, "src/components/server/serverChartConfigs.ts")
const VALIDATION_MAP = path.join(ROOT, "src/components/charts/shared/validationMap.ts")

// ── 1. Discover HOC chart names ────────────────────────────────────────

const HOC_DIRS = ["xy", "ordinal", "network", "geo"]
const hocsOnDisk = new Set()

for (const dir of HOC_DIRS) {
  const fullDir = path.join(CHARTS_DIR, dir)
  if (!fs.existsSync(fullDir)) continue
  for (const file of fs.readdirSync(fullDir)) {
    if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue
    if (file === "index.ts" || file === "index.tsx") continue
    if (!file.endsWith(".tsx")) continue
    const name = file.replace(".tsx", "")
    hocsOnDisk.add(name)
  }
}

// ── 2. Extract SSR config chart names ──────────────────────────────────

const ssrSource = fs.readFileSync(SSR_CONFIGS, "utf8")
const ssrNames = new Set()
const configRegex = /^\s+(\w+):\s/gm
let match
while ((match = configRegex.exec(ssrSource))) {
  // Only lines like "  BarChart: barChart," in CHART_CONFIGS
  if (/^[A-Z]/.test(match[1])) {
    ssrNames.add(match[1])
  }
}

// ── 3. Extract validation map chart names ──────────────────────────────

const validationSource = fs.readFileSync(VALIDATION_MAP, "utf8")
const validationNames = new Set()
const valRegex = /^\s+(\w+):\s*\{/gm
while ((match = valRegex.exec(validationSource))) {
  if (/^[A-Z]/.test(match[1])) {
    validationNames.add(match[1])
  }
}

// ── 4. Charts that are intentionally SSR-excluded ──────────────────────

const SSR_EXCLUDED = new Set([
  // Composite/wrapper charts — not standalone renderable
  "ScatterplotMatrix", "MinimapChart", "MultiAxisLineChart", "QuadrantChart",
  // Realtime-only charts — no static representation
  "RealtimeLineChart", "RealtimeHistogram", "RealtimeSwarmChart",
  "RealtimeWaterfallChart", "RealtimeHeatmap",
  // Animated hierarchy — no static representation
  "OrbitDiagram",
  // Geo charts with complex state
  "FlowMap", "DistanceCartogram",
])

// ── 5. Check alignment ────────────────────────────────────────────────

const errors = []

// HOCs missing from SSR
for (const hoc of hocsOnDisk) {
  if (SSR_EXCLUDED.has(hoc)) continue
  if (!ssrNames.has(hoc)) {
    errors.push(`HOC "${hoc}" exists in src/components/charts/ but has no SSR config in serverChartConfigs.ts`)
  }
}

// SSR configs referencing non-existent HOCs
for (const name of ssrNames) {
  if (!hocsOnDisk.has(name) && name !== "Sparkline") {
    // Sparkline is SSR-only, not an HOC
    errors.push(`SSR config "${name}" has no matching HOC in src/components/charts/`)
  }
}

// Validation map missing entries for HOCs
for (const hoc of hocsOnDisk) {
  if (!validationNames.has(hoc)) {
    errors.push(`HOC "${hoc}" missing from validationMap.ts (validateProps won't recognize it)`)
  }
}

// ── 6. Check key prop threading in SSR configs ─────────────────────────

// Props that should be in SSR configs when they exist on the HOC
const PROP_CHECKS = [
  { prop: "oSort", charts: ["BarChart", "StackedBarChart", "GroupedBarChart"], label: "sort/oSort" },
  { prop: "cornerRadius", charts: ["PieChart", "DonutChart"], label: "cornerRadius" },
]

for (const { prop, charts, label } of PROP_CHECKS) {
  for (const chart of charts) {
    if (!ssrNames.has(chart)) continue
    // Find the config block for this chart
    const configBlockRegex = new RegExp(`const \\w+[^}]+${chart}`, "s")
    // Simpler: just check if the prop name appears near the chart name
    const chartIdx = ssrSource.indexOf(`  ${chart}:`)
    if (chartIdx === -1) continue
    // Look backwards to find the config variable
    const beforeChart = ssrSource.slice(Math.max(0, chartIdx - 500), chartIdx)
    const varMatch = beforeChart.match(/const (\w+): ChartConfig[^}]*$/s)
    if (!varMatch) continue
    const varName = varMatch[1]
    // Find the full config block
    const blockStart = ssrSource.indexOf(`const ${varName}:`)
    const blockEnd = ssrSource.indexOf("\n}", blockStart) + 2
    const block = ssrSource.slice(blockStart, blockEnd)
    if (!block.includes(prop) && !block.includes(`rest.${prop.replace("oSort", "sort")}`)) {
      errors.push(`SSR config for "${chart}" is missing "${label}" prop threading`)
    }
  }
}

// ── 7. Scene type ↔ SceneToSVG parity ──────────────────────────────────
//
// The contract: every `type: "X"` discriminant in a frame's scene-node union
// must have a matching `case "X":` branch in the corresponding
// `*SceneNodeToSVG` converter, and vice versa. Drift in either direction is
// a bug — canvas-only types render blank under SSR; SVG-only branches are
// dead code or rename leftovers.
//
// Source of truth: the four scene-node type-union files. Each frame's union
// (e.g. `OrdinalSceneNode = | RectSceneNode | PointSceneNode | …`) names its
// member interfaces; each interface body declares its `type: "X"` literal.
// We parse those, not the scene-builder files, because most builders call
// shared helpers (`buildLineNode`, `buildRectNode` in SceneGraph.ts) where
// the literal lives — the union is the only single point of truth.

const STREAM_DIR = path.join(ROOT, "src/components/stream")
const SCENE_TO_SVG = process.env.SEMIOTIC_SCENE_TO_SVG
  ? path.resolve(process.env.SEMIOTIC_SCENE_TO_SVG)
  : path.join(STREAM_DIR, "SceneToSVG.tsx")

const FRAMES = {
  xy:      { typesFile: "types.ts",        unionName: "SceneNode",        svgFn: "xySceneNodeToSVG" },
  ordinal: { typesFile: "ordinalTypes.ts", unionName: "OrdinalSceneNode", svgFn: "ordinalSceneNodeToSVG" },
  network: { typesFile: "networkTypes.ts", unionName: "NetworkSceneNode", svgFn: "networkSceneNodeToSVG" },
  geo:     { typesFile: "geoTypes.ts",     unionName: "GeoSceneNode",     svgFn: "geoSceneNodeToSVG" },
}

// Type-discriminant strings that legitimately appear on one side only.
// Each entry needs a one-line justification.
const PARITY_EXCEPTIONS = {
  // canvas-only (no SSR equivalent yet) — none currently.
  canvasOnly: new Set([]),
  // SVG-only — case branches that aren't scene-node `type` discriminants.
  svgOnly: new Set([
    // Network edge sub-types live on a separate union (`NetworkSceneEdge`)
    // and are handled by `networkSceneEdgeToSVG`. They appear in the rect/
    // node converter only as imported references, so the parity check
    // shouldn't expect them in `networkSceneNodeToSVG`.
    "bezier", "curved", "ribbon",
    // "top" / "bottom" / "left" / "right" are `roundedEdge` discriminator
    // values inside the rect branch's inner switch, not top-level scene
    // types. The case-label parser can't distinguish nested switches.
    "top", "bottom", "left", "right",
  ]),
}

/** Type-files that hold scene-node interfaces, indexed by unqualified file name. */
const TYPES_FILES = Object.values(FRAMES).map(f => f.typesFile)

/**
 * Build a global map of `interfaceName → type-discriminant string` by
 * scanning every scene-node interface across all four type files. Cross-
 * frame reuse (e.g. ordinal's union references PointSceneNode declared in
 * types.ts) resolves through this map.
 */
function buildInterfaceTypeMap() {
  const map = new Map()
  for (const file of TYPES_FILES) {
    const src = fs.readFileSync(path.join(STREAM_DIR, file), "utf8")
    // Match `export interface NAME { ... type: "X" ... }` non-greedily on
    // the body — the [^}]* prevents bleeding into the next interface.
    const re = /export\s+interface\s+(\w+(?:Node|Edge))\s*\{[^}]*?\btype:\s*"(\w+)"/gs
    let m
    while ((m = re.exec(src))) {
      map.set(m[1], m[2])
    }
  }
  return map
}

/** Parse the named union to a list of member interface names. */
function extractUnionMembers(source, unionName) {
  // `export type NAME = | A | B | ...` or `= A | B`. Match until the next
  // top-level `\n\n` or `\nexport` to avoid running past the union.
  const re = new RegExp(`export\\s+type\\s+${unionName}\\s*=([\\s\\S]*?)(?:\\n\\n|\\nexport)`, "m")
  const m = re.exec(source)
  if (!m) return []
  // Members appear as `| FooNode` or just `FooNode`. Pull everything that
  // looks like a SceneNode/Edge interface name.
  return m[1].match(/\w+(?:Node|Edge)/g) || []
}

/** Extract every `case "X":` literal inside a named function body. */
function extractCaseLabels(source, functionName) {
  const declRe = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\b`, "g")
  const declMatch = declRe.exec(source)
  if (!declMatch) return new Set()
  // Brace-balance walk from the start of the function body.
  let i = source.indexOf("{", declMatch.index)
  if (i < 0) return new Set()
  let depth = 0
  const start = i
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++
    else if (source[i] === "}") {
      depth--
      if (depth === 0) break
    }
  }
  const body = source.slice(start, i + 1)
  const cases = new Set()
  const caseRe = /\bcase\s+"(\w+)":/g
  let cm
  while ((cm = caseRe.exec(body))) cases.add(cm[1])
  return cases
}

console.log("\n[scene parity] checking each frame's canvas ↔ SVG type coverage")

const sceneToSvgSrc = fs.readFileSync(SCENE_TO_SVG, "utf8")
const interfaceToType = buildInterfaceTypeMap()

for (const [frame, { typesFile, unionName, svgFn }] of Object.entries(FRAMES)) {
  const typesPath = path.join(STREAM_DIR, typesFile)
  if (!fs.existsSync(typesPath)) continue
  const typesSrc = fs.readFileSync(typesPath, "utf8")

  const memberNames = extractUnionMembers(typesSrc, unionName)
  const emitted = new Set()
  for (const memberName of memberNames) {
    const t = interfaceToType.get(memberName)
    if (t) emitted.add(t)
    else {
      // Member referenced in the union but no interface body found — could
      // be a re-export or namespace import we can't resolve statically.
      // Surface it as a check-script limitation, not a hard failure.
      console.warn(`  · ${frame}: union member "${memberName}" has no resolvable type discriminant — coverage may be incomplete for this type.`)
    }
  }

  const handled = extractCaseLabels(sceneToSvgSrc, svgFn)

  // Canvas-only drift — emitted by a scene builder, not handled in SVG
  for (const type of emitted) {
    if (PARITY_EXCEPTIONS.canvasOnly.has(type)) continue
    if (!handled.has(type)) {
      errors.push(`Scene type "${type}" is part of the ${frame} ${unionName} union but ${svgFn} has no \`case "${type}":\` branch — SSR will drop these marks. Add a branch in src/components/stream/SceneToSVG.tsx, or list the type in PARITY_EXCEPTIONS.canvasOnly with justification.`)
    }
  }

  // SVG-only drift — handled in SVG, not emitted by any builder
  for (const type of handled) {
    if (PARITY_EXCEPTIONS.svgOnly.has(type)) continue
    if (!emitted.has(type)) {
      errors.push(`${svgFn} has a \`case "${type}":\` branch but no scene-node interface in the ${frame} ${unionName} union declares \`type: "${type}"\` — likely dead code. Remove the case, or list the type in PARITY_EXCEPTIONS.svgOnly with justification.`)
    }
  }

  console.log(`  ${frame}: ${emitted.size} emitted / ${handled.size} handled (${[...emitted].sort().join(", ")})`)
}

// ── 8. Report ──────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error("\nSSR Alignment Check FAILED:\n")
  for (const err of errors) {
    console.error(`  ✗ ${err}`)
  }
  console.error(`\n${errors.length} issue(s) found.`)
  console.error("Fix in src/components/server/serverChartConfigs.ts, validationMap.ts, or src/components/stream/SceneToSVG.tsx.")
  process.exit(1)
} else {
  console.log("\n✅ SSR alignment check passed")
  console.log(`   ${hocsOnDisk.size} HOC charts on disk`)
  console.log(`   ${ssrNames.size} SSR configs (+ ${SSR_EXCLUDED.size} intentionally excluded)`)
  console.log(`   ${validationNames.size} validation map entries`)
}

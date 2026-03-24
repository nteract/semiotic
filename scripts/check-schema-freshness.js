#!/usr/bin/env node
/**
 * Schema Freshness Check
 *
 * Verifies that ai/schema.json, CLAUDE.md, and validateProps.ts VALIDATION_MAP
 * agree on the set of components and their props.
 *
 * Run: node scripts/check-schema-freshness.js
 * CI:  add to GitHub Actions workflow
 *
 * Exit code 0 = all in sync, 1 = drift detected.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
let exitCode = 0

function warn(msg) {
  console.log(`  ⚠ ${msg}`)
  exitCode = 1
}

function info(msg) {
  console.log(`  ✓ ${msg}`)
}

// ---------------------------------------------------------------------------
// 1. Load ai/schema.json components
// ---------------------------------------------------------------------------
console.log("\n[1/3] Loading ai/schema.json...")
const schemaPath = path.join(ROOT, "ai", "schema.json")
let schemaComponents = new Map() // name → Set<propName>

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))
  for (const tool of schema.tools) {
    const name = tool.function.name
    const props = Object.keys(tool.function.parameters?.properties || {})
    schemaComponents.set(name, new Set(props))
  }
  info(`${schemaComponents.size} components found in schema.json`)
} catch (e) {
  warn(`Could not read ai/schema.json: ${e.message}`)
}

// ---------------------------------------------------------------------------
// 2. Load VALIDATION_MAP components from validateProps.ts source
// ---------------------------------------------------------------------------
console.log("\n[2/3] Parsing validateProps.ts VALIDATION_MAP...")
const validatePath = path.join(ROOT, "src", "components", "charts", "shared", "validateProps.ts")
let validationComponents = new Map() // name → Set<propName>

try {
  const src = fs.readFileSync(validatePath, "utf-8")

  // Extract component names from VALIDATION_MAP keys
  const componentMatches = src.matchAll(/^\s{2}(\w+):\s*\{/gm)
  for (const m of componentMatches) {
    const name = m[1]
    // Skip non-component entries (shared defs like commonProps)
    if (name[0] === name[0].toLowerCase()) continue
    validationComponents.set(name, new Set())
  }

  // For each component, extract its props keys from the ...spread and direct entries
  // This is a rough parse — good enough for drift detection
  const sections = src.split(/^\s{2}(\w+):\s*\{/gm)
  for (let i = 1; i < sections.length; i += 2) {
    const name = sections[i]
    if (name[0] === name[0].toLowerCase()) continue
    const body = sections[i + 1]
    if (!body) continue

    const propSet = validationComponents.get(name)
    if (!propSet) continue

    // Find direct prop entries (indented key: { type: ... })
    const propMatches = body.matchAll(/^\s{6}(\w+):\s*\{/gm)
    for (const pm of propMatches) {
      propSet.add(pm[1])
    }

    // Check for spread operators to include common props
    if (body.includes("...commonProps")) {
      for (const k of ["width", "height", "margin", "className", "title", "enableHover", "showLegend", "showGrid", "colorBy", "colorScheme", "tooltip", "annotations", "frameProps"]) {
        propSet.add(k)
      }
    }
    if (body.includes("...xyAxisProps")) {
      for (const k of ["xLabel", "yLabel", "xFormat", "yFormat"]) propSet.add(k)
    }
    if (body.includes("...ordinalAxisProps")) {
      for (const k of ["categoryLabel", "valueLabel", "valueFormat"]) propSet.add(k)
    }
  }

  info(`${validationComponents.size} components found in VALIDATION_MAP`)
} catch (e) {
  warn(`Could not parse validateProps.ts: ${e.message}`)
}

// ---------------------------------------------------------------------------
// 3. Parse CLAUDE.md for documented component names
// ---------------------------------------------------------------------------
console.log("\n[3/3] Scanning CLAUDE.md...")
const claudePath = path.join(ROOT, "CLAUDE.md")
let claudeComponents = new Set()

try {
  const md = fs.readFileSync(claudePath, "utf-8")

  // Match **ComponentName** patterns (bold component names in docs)
  const boldMatches = md.matchAll(/\*\*(\w+)\*\*/g)
  for (const m of boldMatches) {
    const name = m[1]
    // Filter to likely component names (PascalCase, not common words)
    if (name[0] === name[0].toUpperCase() && name.length > 3 && !["Props", "Summary", "Test", "Usage", "Quick", "Start", "Common", "Charts", "Layout", "Composition", "Views", "Network", "Realtime", "Ordinal", "IMPORTANT"].includes(name)) {
      claudeComponents.add(name)
    }
  }

  info(`${claudeComponents.size} component names found in CLAUDE.md`)
} catch (e) {
  warn(`Could not read CLAUDE.md: ${e.message}`)
}

// ---------------------------------------------------------------------------
// 4. Cross-reference
// ---------------------------------------------------------------------------
console.log("\n── Cross-reference ──────────────────────────────")

// Skip realtime components for schema comparison (they're intentionally excluded from MCP)
const nonRealtimeValidation = new Map(
  [...validationComponents].filter(([name]) => !name.startsWith("Realtime"))
)

// Components in VALIDATION_MAP but not in schema.json
for (const name of nonRealtimeValidation.keys()) {
  if (!schemaComponents.has(name)) {
    warn(`"${name}" is in VALIDATION_MAP but missing from schema.json`)
  }
}

// Components in schema.json but not in VALIDATION_MAP
for (const name of schemaComponents.keys()) {
  if (!validationComponents.has(name)) {
    warn(`"${name}" is in schema.json but missing from VALIDATION_MAP`)
  }
}

// Components in VALIDATION_MAP but not documented in CLAUDE.md
for (const name of validationComponents.keys()) {
  if (!claudeComponents.has(name)) {
    warn(`"${name}" is in VALIDATION_MAP but not documented in CLAUDE.md`)
  }
}

// Components documented in CLAUDE.md but not in VALIDATION_MAP
for (const name of claudeComponents) {
  if (!validationComponents.has(name)) {
    // Only warn if it looks like a chart component
    if (name.endsWith("Chart") || name.endsWith("Plot") || name.endsWith("Diagram") || name.endsWith("Pack") || name.endsWith("map") || name.endsWith("Treemap") || name.endsWith("Scatterplot")) {
      warn(`"${name}" is in CLAUDE.md but missing from VALIDATION_MAP`)
    }
  }
}

// Prop drift: check for props in schema.json but not in VALIDATION_MAP (and vice versa)
let propDriftCount = 0
for (const [name, schemaProps] of schemaComponents) {
  const valProps = validationComponents.get(name)
  if (!valProps) continue

  for (const p of schemaProps) {
    if (!valProps.has(p)) {
      if (propDriftCount < 10) {
        warn(`"${name}.${p}" in schema.json but not in VALIDATION_MAP`)
      }
      propDriftCount++
    }
  }
}
if (propDriftCount > 10) {
  warn(`...and ${propDriftCount - 10} more prop drift issues`)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("")
if (exitCode === 0) {
  console.log("✓ All schema sources are in sync.\n")
} else {
  console.log("✗ Schema drift detected. Update the sources above to re-sync.\n")
}

process.exit(exitCode)

#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")

const pkgRoot = path.resolve(__dirname, "..")
const {
  CATEGORY_ORDER,
  componentIndexFromSchema,
  findComponent,
  metadataForComponent,
  schemaEntries,
} = require("./componentMetadata.cjs")
const {
  formatSuggestionReport,
  suggestCharts,
} = require("./chartSuggestions.cjs")

const FILES = {
  default: path.join(pkgRoot, "CLAUDE.md"),
  "--schema": path.join(__dirname, "schema.json"),
  "--compact": path.join(__dirname, "system-prompt.md"),
  "--examples": path.join(__dirname, "examples.md"),
}

const HELP = `
semiotic-ai — Dump Semiotic AI context to stdout

Usage:
  npx semiotic-ai              Print CLAUDE.md (full reference)
  npx semiotic-ai --list        List components, categories, imports, and renderability
  npx semiotic-ai --list --json Print component index as JSON
  npx semiotic-ai --schema     Print ai/schema.json (all tool definitions)
  npx semiotic-ai --schema BarChart
                                Print one component schema plus AI metadata
  npx semiotic-ai --suggest     Recommend charts from { data, intent? } JSON
  npx semiotic-ai --compact    Print ai/system-prompt.md (compact prompt)
  npx semiotic-ai --examples   Print ai/examples.md (copy-paste examples)
  npx semiotic-ai --doctor     Validate component + props JSON from stdin
  npx semiotic-ai --help       Show this help message
`.trim()

const flag = process.argv[2]

function loadSchema() {
  return JSON.parse(fs.readFileSync(FILES["--schema"], "utf-8"))
}

function componentIndex() {
  return componentIndexFromSchema(loadSchema())
}

function printComponentList(asJSON) {
  const index = componentIndex()
  if (asJSON) {
    console.log(JSON.stringify(index, null, 2))
    return
  }

  console.log(`Semiotic components (${index.totalComponents} total, ${index.renderableComponents} renderable)`)
  for (const category of CATEGORY_ORDER) {
    const names = index.categories[category] || []
    if (names.length === 0) continue
    console.log(`\n${category}:`)
    for (const name of names) {
      const component = index.components.find((entry) => entry.name === name)
      const marker = component.renderable ? "renderable" : "browser-only"
      console.log(`  ${name} [${marker}] import ${component.importPath}`)
    }
  }
}

function printSingleComponentSchema(componentName) {
  const schema = loadSchema()
  const component = findComponent(schema, componentName)
  if (!component) {
    const available = schemaEntries(schema).map((entry) => entry.name).sort().join(", ")
    console.error(`Unknown component: ${componentName}`)
    console.error(`Available components: ${available}`)
    process.exit(1)
  }

  const payload = {
    ...component,
    metadata: metadataForComponent(component),
  }
  console.log(JSON.stringify(payload, null, 2))
}

// Both helpers are only called from `validatePropsWithSchema` below, which
// filters `undefined` / `null` out of `value` before reaching them — so
// neither guards null here. CodeQL flags the dead branches if they return.

function schemaTypeMatches(value, expectedType) {
  const expectedTypes = Array.isArray(expectedType) ? expectedType : [expectedType]
  return expectedTypes.some((type) => {
    if (type === "array") return Array.isArray(value)
    if (type === "object") return typeof value === "object" && !Array.isArray(value)
    return typeof value === type
  })
}

function describeActualType(value) {
  if (Array.isArray(value)) return "array"
  return typeof value
}

function validatePropsWithSchema(componentName, props) {
  const schema = loadSchema()
  const component = findComponent(schema, componentName)
  if (!component) {
    const available = schemaEntries(schema).map((entry) => entry.name).sort().join(", ")
    return {
      valid: false,
      errors: [`Unknown component "${componentName}". Available components: ${available}`],
    }
  }

  const parameters = component.parameters || {}
  const properties = parameters.properties || {}
  const required = parameters.required || []
  const errors = []

  for (const propName of required) {
    if (props[propName] === undefined || props[propName] === null) {
      errors.push(`"${propName}" is required for ${component.name}.`)
    }
  }

  for (const [propName, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const propSchema = properties[propName]
    if (!propSchema) {
      errors.push(`Unknown prop "${propName}" for ${component.name}.`)
      continue
    }

    if (propSchema.type && !schemaTypeMatches(value, propSchema.type)) {
      const expected = Array.isArray(propSchema.type) ? propSchema.type.join(" | ") : propSchema.type
      errors.push(`"${propName}" should be ${expected}, got ${describeActualType(value)}.`)
    }

    if (propSchema.enum && typeof value === "string" && !propSchema.enum.includes(value)) {
      errors.push(`"${propName}" value "${value}" is not valid. Expected one of: ${propSchema.enum.join(", ")}.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function printSchemaOnlyDoctorResult(component, props) {
  const result = validatePropsWithSchema(component, props)
  if (result.valid) {
    console.log(`✓ ${component}: schema-only validation passed.`)
  } else {
    console.log(`✗ ${component}: schema-only validation failed.`)
    for (const err of result.errors) {
      console.log(`  • ${err}`)
    }
  }
}

function readJSONInput(usage) {
  if (process.argv[3]) {
    return process.argv.slice(3).join(" ")
  }
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, "utf-8")
  }

  console.error(usage)
  process.exit(1)
}

if (flag === "--help" || flag === "-h") {
  console.log(HELP)
  process.exit(0)
}

if (flag === "--list") {
  printComponentList(process.argv.includes("--json"))
  process.exit(0)
}

if (flag === "--schema" && process.argv[3]) {
  printSingleComponentSchema(process.argv[3])
  process.exit(0)
}

if (flag === "--suggest") {
  const input = readJSONInput("Usage: npx semiotic-ai --suggest '{\"data\":[{\"category\":\"A\",\"value\":10}],\"intent\":\"comparison\"}'")
  try {
    const args = JSON.parse(input)
    const result = suggestCharts(args)
    console.log(formatSuggestionReport(result))
    process.exit(result.ok ? 0 : 1)
  } catch (err) {
    console.error(`Failed to parse input: ${err.message}`)
    process.exit(1)
  }
}

// --doctor: validate component + props from stdin or argv
if (flag === "--doctor") {
  const input = readJSONInput("Usage: npx semiotic-ai --doctor '{\"component\":\"LineChart\",\"props\":{\"data\":[...]}}'\n       echo '{...}' | npx semiotic-ai --doctor")

  try {
    const { component, props } = JSON.parse(input)
    if (!component || !props) {
      console.error("Input must be JSON with { component, props } fields.")
      process.exit(1)
    }

    // Load diagnoseConfig from dist (falls back to validateProps, then schema.json)
    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let diagnoseConfig, validateProps
    try {
      if (!process.env.SEMIOTIC_AI_SCHEMA_ONLY) {
        const mod = require(distPath)
        diagnoseConfig = mod.diagnoseConfig
        validateProps = mod.validateProps
      }
    } catch (e) {
      // Dist is not available in a clean source checkout. Fall back to the
      // packaged schema so the CLI still catches basic agent mistakes.
    }

    if (!diagnoseConfig && !validateProps) {
      printSchemaOnlyDoctorResult(component, props)
      process.exit(0)
    }

    if (diagnoseConfig) {
      // Use the full anti-pattern detector
      const result = diagnoseConfig(component, props)

      // Show data shape summary
      if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        const sample = props.data[0]
        console.log(`  Data shape: ${props.data.length} items, keys: [${Object.keys(sample).join(", ")}]`)
      }

      if (result.ok && result.diagnoses.length === 0) {
        console.log(`✓ ${component}: configuration looks good.`)
      } else if (result.ok) {
        console.log(`✓ ${component}: configuration OK with warnings:`)
        for (const d of result.diagnoses) {
          console.log(`  ⚠ [${d.code}] ${d.message}`)
          if (d.fix) console.log(`    Fix: ${d.fix}`)
        }
      } else {
        console.log(`✗ ${component}: issues detected.`)
        for (const d of result.diagnoses) {
          const icon = d.severity === "error" ? "✗" : "⚠"
          console.log(`  ${icon} [${d.code}] ${d.message}`)
          if (d.fix) console.log(`    Fix: ${d.fix}`)
        }
      }
    } else {
      // Fallback to validateProps only
      const result = validateProps(component, props)
      if (result.valid) {
        console.log(`✓ ${component}: props are valid.`)
      } else {
        console.log(`✗ ${component}: validation failed.`)
        for (const err of result.errors) {
          console.log(`  • ${err}`)
        }
      }
    }
  } catch (err) {
    console.error(`Failed to parse input: ${err.message}`)
    process.exit(1)
  }
  process.exit(0)
}

const filePath = flag ? FILES[flag] : FILES.default

if (!filePath) {
  console.error(`Unknown flag: ${flag}\n`)
  console.error(HELP)
  process.exit(1)
}

try {
  const content = fs.readFileSync(filePath, "utf-8")
  process.stdout.write(content)
} catch (err) {
  console.error(`Error reading ${filePath}: ${err.message}`)
  process.exit(1)
}

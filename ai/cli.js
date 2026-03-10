#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")

const pkgRoot = path.resolve(__dirname, "..")

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
  npx semiotic-ai --schema     Print ai/schema.json (tool definitions)
  npx semiotic-ai --compact    Print ai/system-prompt.md (compact prompt)
  npx semiotic-ai --examples   Print ai/examples.md (copy-paste examples)
  npx semiotic-ai --doctor     Validate component + props JSON from stdin
  npx semiotic-ai --help       Show this help message
`.trim()

const flag = process.argv[2]

if (flag === "--help" || flag === "-h") {
  console.log(HELP)
  process.exit(0)
}

// --doctor: validate component + props from stdin or argv
if (flag === "--doctor") {
  let input = ""
  if (process.argv[3]) {
    // npx semiotic-ai --doctor '{"component":"LineChart","props":{...}}'
    input = process.argv.slice(3).join(" ")
  } else if (!process.stdin.isTTY) {
    // echo '...' | npx semiotic-ai --doctor
    input = fs.readFileSync("/dev/stdin", "utf-8")
  } else {
    console.error("Usage: npx semiotic-ai --doctor '{\"component\":\"LineChart\",\"props\":{\"data\":[...]}}'")
    console.error("       echo '{...}' | npx semiotic-ai --doctor")
    process.exit(1)
  }

  try {
    const { component, props } = JSON.parse(input)
    if (!component || !props) {
      console.error("Input must be JSON with { component, props } fields.")
      process.exit(1)
    }

    // Load diagnoseConfig from dist (falls back to validateProps)
    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let diagnoseConfig, validateProps
    try {
      const mod = require(distPath)
      diagnoseConfig = mod.diagnoseConfig
      validateProps = mod.validateProps
    } catch (e) {
      console.error("Could not load semiotic/ai dist. Run 'npm run dist' first.")
      process.exit(1)
    }

    if (!diagnoseConfig && !validateProps) {
      console.error("diagnoseConfig/validateProps not found in semiotic/ai exports.")
      process.exit(1)
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

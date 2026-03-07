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

    // Load validateProps from dist
    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let validateProps
    try {
      const mod = require(distPath)
      validateProps = mod.validateProps
    } catch (e) {
      console.error("Could not load semiotic/ai dist. Run 'npm run dist' first.")
      process.exit(1)
    }

    if (!validateProps) {
      console.error("validateProps not found in semiotic/ai exports.")
      process.exit(1)
    }

    const result = validateProps(component, props)
    if (result.valid) {
      console.log(`✓ ${component}: props are valid.`)
      // Additional data shape checks
      if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        const sample = props.data[0]
        console.log(`  Data shape: ${props.data.length} items, keys: [${Object.keys(sample).join(", ")}]`)
        if (props.xAccessor && typeof props.xAccessor === "string" && !(props.xAccessor in sample)) {
          console.log(`  ⚠ xAccessor "${props.xAccessor}" not in data keys. Available: ${Object.keys(sample).join(", ")}`)
        }
        if (props.yAccessor && typeof props.yAccessor === "string" && !(props.yAccessor in sample)) {
          console.log(`  ⚠ yAccessor "${props.yAccessor}" not in data keys. Available: ${Object.keys(sample).join(", ")}`)
        }
        if (props.categoryAccessor && typeof props.categoryAccessor === "string" && !(props.categoryAccessor in sample)) {
          console.log(`  ⚠ categoryAccessor "${props.categoryAccessor}" not in data keys. Available: ${Object.keys(sample).join(", ")}`)
        }
        if (props.valueAccessor && typeof props.valueAccessor === "string" && !(props.valueAccessor in sample)) {
          console.log(`  ⚠ valueAccessor "${props.valueAccessor}" not in data keys. Available: ${Object.keys(sample).join(", ")}`)
        }
      }
    } else {
      console.log(`✗ ${component}: validation failed.`)
      for (const err of result.errors) {
        console.log(`  • ${err}`)
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

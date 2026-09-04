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
  schemaEntries
} = require("./componentMetadata.cjs")
const {
  formatSuggestionReport,
  suggestCharts
} = require("./chartSuggestions.cjs")
const {
  behaviorContractsFor,
  dataRequiredForUsageMode,
  formatDoctorBehaviorContracts,
  normalizeUsageMode
} = require("./behaviorContracts.cjs")

const FILES = {
  default: path.join(pkgRoot, "ai", "reference.md"),
  "--schema": path.join(__dirname, "schema.json"),
  "--compact": path.join(__dirname, "system-prompt.md"),
  "--examples": path.join(__dirname, "examples.md"),
  "--skill": path.join(pkgRoot, "agent-skill", "semiotic-charts", "SKILL.md"),
  "--artifact-schema": path.join(
    pkgRoot,
    "spec",
    "v0.1",
    "artifact-contract.schema.json"
  )
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err)
}

const HELP = `
semiotic-ai — Dump Semiotic AI context to stdout

Usage:
  npx semiotic-ai              Print ai/reference.md (full reference)
  npx semiotic-ai --list        List components, categories, imports, and renderability
  npx semiotic-ai --list --json Print component index as JSON
  npx semiotic-ai --schema     Print ai/schema.json (all tool definitions)
  npx semiotic-ai --schema BarChart
                                Print one component schema plus AI metadata
  npx semiotic-ai --suggest     Recommend charts from { data, intent? } JSON
  npx semiotic-ai --compact    Print ai/system-prompt.md (compact prompt)
  npx semiotic-ai --examples   Print ai/examples.md (copy-paste examples)
  npx semiotic-ai --skill      Print the portable Semiotic Agent Skill
  npx semiotic-ai --artifact-schema
                                Print the portable Artifact Contract schema
  npx semiotic-ai --doctor     Validate { component, props, usageMode? } JSON from stdin
                                (exits nonzero on errors; add --json for a machine-readable report)
  npx semiotic-ai --audit-a11y Audit { component, props, inChartContainer?, describe?, navigable? }
  npx semiotic-ai --audit-mobile Audit { component, props, viewportWidth?, targetSize?, inChartContainer? }
                                JSON against Chartability (POUR-CAF) accessibility heuristics
  npx semiotic-ai --evaluate Evaluate { component, props, data?, inChartContainer?, describe?, navigable? }
                                with data, deception, and accessibility checks (add --json for a machine-readable report)
  npx semiotic-ai --audit-artifact
                                Evaluate { component, props, contract, data?, policy?, exceptions?, now? }
  npx semiotic-ai --recommend-representation
                                Choose a chart, table, text, wait, or refusal outcome
  npx semiotic-ai --repair-artifact
                                Propose repairs; add applySafeIdentityRepairs=true to fill missing identity fields only
                                Artifact exit 0 may mean conditional: inspect status before publication
  npx semiotic-ai --explain-refusal
                                Explain why { component, props, contract, data?, policy?, exceptions?, now? } is refused
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

  console.log(
    `Semiotic components (${index.totalComponents} total, ${index.renderableComponents} renderable)`
  )
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
    const available = schemaEntries(schema)
      .map((entry) => entry.name)
      .sort()
      .join(", ")
    console.error(`Unknown component: ${componentName}`)
    console.error(`Available components: ${available}`)
    process.exit(1)
  }

  const payload = {
    ...component,
    metadata: {
      ...metadataForComponent(component),
      usageModes: {
        static: {
          dataRequired: dataRequiredForUsageMode(component.name, "static"),
          note: "Use for renderChart, MCP previews, SSR snapshots, and static JSX examples."
        },
        push: {
          dataRequired: dataRequiredForUsageMode(component.name, "push"),
          note: "Use for ref-based React HOCs. Omit data and push via ref.current when supported."
        }
      }
    },
    behaviorContracts: behaviorContractsFor({
      component: component.name,
      props: {}
    })
  }
  console.log(JSON.stringify(payload, null, 2))
}

// Both helpers are only called from `validatePropsWithSchema` below, which
// filters `undefined` / `null` out of `value` before reaching them — so
// neither guards null here. CodeQL flags the dead branches if they return.

function schemaTypeMatches(value, expectedType) {
  const expectedTypes = Array.isArray(expectedType)
    ? expectedType
    : [expectedType]
  return expectedTypes.some((type) => {
    if (type === "array") return Array.isArray(value)
    if (type === "object")
      return typeof value === "object" && !Array.isArray(value)
    return typeof value === type
  })
}

function describeActualType(value) {
  if (Array.isArray(value)) return "array"
  return typeof value
}

function shouldSkipMissingRequiredProp(componentName, propName, usageMode) {
  return (
    propName === "data" && !dataRequiredForUsageMode(componentName, usageMode)
  )
}

function filterUsageModeErrors(componentName, errors, usageMode) {
  if (dataRequiredForUsageMode(componentName, usageMode)) return errors
  return errors.filter(
    (err) => err !== `"data" is required for ${componentName}.`
  )
}

function validatePropsWithSchema(componentName, props, usageMode = "static") {
  const schema = loadSchema()
  const component = findComponent(schema, componentName)
  if (!component) {
    const available = schemaEntries(schema)
      .map((entry) => entry.name)
      .sort()
      .join(", ")
    return {
      valid: false,
      errors: [
        `Unknown component "${componentName}". Available components: ${available}`
      ]
    }
  }

  const parameters = component.parameters || {}
  const properties = parameters.properties || {}
  const required = parameters.required || []
  const errors = []

  for (const propName of required) {
    if (shouldSkipMissingRequiredProp(component.name, propName, usageMode))
      continue
    if (props[propName] === undefined || props[propName] === null) {
      errors.push(`"${propName}" is required for ${component.name}.`)
    }
  }

  // Array-shape charts that declare a `data` schema prop need it in static
  // usage even when "data" isn't in `required` (those lists hold semantic
  // accessors). Without this, --doctor passed dataless static CandlestickChart /
  // MultiAxisLineChart / QuadrantChart / DifferenceChart / SwimlaneChart /
  // LikertChart configs that render blank. dataRequiredForUsageMode is true for
  // them in static and false in push, mirroring the MCP diagnoseConfig path.
  if (
    "data" in properties &&
    !required.includes("data") &&
    dataRequiredForUsageMode(component.name, usageMode) &&
    (props.data === undefined || props.data === null)
  ) {
    errors.push(`"data" is required for ${component.name}.`)
  }

  for (const [propName, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const propSchema = properties[propName]
    if (!propSchema) {
      errors.push(`Unknown prop "${propName}" for ${component.name}.`)
      continue
    }

    // Prefer the full runtime type surface (`x-semiotic-runtime-types`, e.g.
    // ["string","function"]) over the wire-only `type` ("string"), so a valid
    // function value for a prop like `colorBy`/`onBrush` is still accepted. The
    // wire `type` keyword is standards-valid JSON Schema and never lists
    // "function"; the runtime extension carries it. Falls back to `type` for
    // props with no runtime-only alternatives.
    const effectiveType =
      propSchema["x-semiotic-runtime-types"] || propSchema.type
    if (effectiveType && !schemaTypeMatches(value, effectiveType)) {
      const expected = Array.isArray(effectiveType)
        ? effectiveType.join(" | ")
        : effectiveType
      errors.push(
        `"${propName}" should be ${expected}, got ${describeActualType(value)}.`
      )
    }

    if (
      propSchema.enum &&
      typeof value === "string" &&
      !propSchema.enum.includes(value)
    ) {
      errors.push(
        `"${propName}" value "${value}" is not valid. Expected one of: ${propSchema.enum.join(", ")}.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Returns true when the schema-only validation passed, so the caller can set
// the process exit code (nonzero on failure — this is a CI gate).
function printSchemaOnlyDoctorResult(component, props, usageMode) {
  const result = validatePropsWithSchema(component, props, usageMode)
  if (usageMode === "push") {
    console.log(
      `  Usage mode: push (data prop may be omitted; use a ref to push data)`
    )
  }
  if (result.valid) {
    console.log(`✓ ${component}: schema-only validation passed.`)
  } else {
    console.log(`✗ ${component}: schema-only validation failed.`)
    for (const err of result.errors) {
      console.log(`  • ${err}`)
    }
  }
  printDoctorBehaviorContracts(component, props)
  return result.valid
}

function printDoctorBehaviorContracts(component, props) {
  const formatted = formatDoctorBehaviorContracts(
    behaviorContractsFor({ component, props })
  )
  if (formatted) {
    console.log("")
    console.log(formatted)
  }
}

function readJSONInput(usage) {
  // Skip flag tokens (e.g. `--json`) so `--doctor --json` still reads the JSON
  // from stdin rather than trying to parse the flag as the input.
  const positional = process.argv
    .slice(3)
    .filter((arg) => !arg.startsWith("--"))
  if (positional.length > 0) {
    return positional.join(" ")
  }
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, "utf-8")
  }

  console.error(usage)
  process.exit(1)
}

function loadArtifactRuntime() {
  const distPath = path.join(pkgRoot, "dist", "semiotic-artifact.min.js")
  const serverPath = path.join(pkgRoot, "dist", "server.min.js")
  try {
    if (!process.env.SEMIOTIC_AI_SCHEMA_ONLY) {
      const artifactRuntime = require(distPath)
      try {
        const { renderChartWithEvidence } = require(serverPath)
        return { ...artifactRuntime, renderChartWithEvidence }
      } catch (e) {
        return artifactRuntime
      }
    }
  } catch (e) {
    // The caller-facing error below explains the supported recovery path.
  }
  return null
}

const ARTIFACT_BULK_PROP_KEYS = new Set([
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows"
])

function redactArtifactCliValue(
  value,
  path = "$",
  insideProps = false,
  omittedPaths = []
) {
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      redactArtifactCliValue(
        entry,
        `${path}[${index}]`,
        insideProps,
        omittedPaths
      )
    )
  }
  if (!value || typeof value !== "object") return value

  const output = {}
  for (const [key, nested] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (
      (insideProps && ARTIFACT_BULK_PROP_KEYS.has(key)) ||
      (key === "sample" && path.includes("evidence["))
    ) {
      omittedPaths.push(childPath)
      continue
    }
    output[key] = redactArtifactCliValue(
      nested,
      childPath,
      insideProps || key === "props",
      omittedPaths
    )
  }
  return output
}

function artifactObligationSummary(obligations) {
  const summary = {
    pass: 0,
    fail: 0,
    warn: 0,
    manual: 0,
    unknown: 0,
    notApplicable: 0
  }
  for (const obligation of obligations || []) {
    const key =
      obligation.status === "not-applicable"
        ? "notApplicable"
        : obligation.status
    if (Object.hasOwn(summary, key)) summary[key] += 1
  }
  return summary
}

function compactArtifactEvaluation(evaluation) {
  const openObligations = (evaluation.obligations || []).filter(
    ({ status }) => status !== "pass" && status !== "not-applicable"
  )
  return {
    status: evaluation.status,
    policy: evaluation.policy,
    validation: evaluation.validation,
    obligationSummary: artifactObligationSummary(evaluation.obligations),
    obligations: openObligations.slice(0, 25),
    ...(evaluation.recommendation
      ? {
          recommendation: {
            status: evaluation.recommendation.status,
            selected: evaluation.recommendation.selected,
            reasons: evaluation.recommendation.reasons.slice(0, 12)
          }
        }
      : {}),
    repairs: (evaluation.repairs || []).slice(0, 25),
    manualChecks: (evaluation.manualChecks || []).slice(0, 25)
  }
}

function safeArtifactRepairOutput(runtime, result) {
  const serialized = runtime.serializeArtifactContract(result.contract, {
    excludeEvidenceSamples: true
  })
  const contractBytes = serialized.contract
    ? Buffer.byteLength(JSON.stringify(serialized.contract), "utf8")
    : 0
  const contractWithinLimit = contractBytes <= 32 * 1024
  const prepared = {
    status: result.status,
    component: result.component,
    props: result.props,
    ...(serialized.contract && contractWithinLimit
      ? { contract: serialized.contract }
      : {}),
    contractTransfer: {
      ...serialized.transfer,
      ...(!contractWithinLimit
        ? {
            status: "excluded",
            omittedPaths: [...serialized.transfer.omittedPaths, "$"],
            warnings: [
              ...serialized.transfer.warnings,
              "The repaired contract exceeded the 32 KiB CLI response limit and was excluded."
            ]
          }
        : {})
    },
    before: compactArtifactEvaluation(result.before),
    after: compactArtifactEvaluation(result.after),
    ledger: result.ledger.slice(0, 50)
  }
  const omittedPaths = serialized.transfer.omittedPaths.map(
    (path) => `$.contract${path.startsWith("$.") ? path.slice(1) : `.${path}`}`
  )
  if (!contractWithinLimit) omittedPaths.push("$.contract")
  const output = redactArtifactCliValue(prepared, "$", false, omittedPaths)
  output.outputTransfer = {
    status: omittedPaths.length > 0 ? "excluded" : "preserved",
    omittedPaths: [...new Set(omittedPaths)],
    warnings:
      omittedPaths.length > 0
        ? [
            "Bulk chart rows and bounded evidence samples are excluded from CLI repair output."
          ]
        : []
  }
  return output
}

function writeArtifactJsonAndExit(value, exitCode) {
  fs.writeSync(1, `${JSON.stringify(value, null, 2)}\n`)
  process.exit(exitCode)
}

function readArtifactRequest(flagName) {
  const input = readJSONInput(
    `Usage: npx semiotic-ai ${flagName} '{"component":"LineChart","props":{"data":[...]},"contract":{...}}'`
  )
  const parsed = JSON.parse(input)
  if (!parsed.component || !parsed.props || !parsed.contract) {
    throw new Error("Input must include { component, props, contract }.")
  }
  return parsed
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

if (flag === "--skill") {
  console.log(fs.readFileSync(FILES["--skill"], "utf-8"))
  process.exit(0)
}

if (flag === "--suggest") {
  const input = readJSONInput(
    'Usage: npx semiotic-ai --suggest \'{"data":[{"category":"A","value":10}],"intent":"comparison"}\''
  )
  try {
    const args = JSON.parse(input)
    const result = suggestCharts(args)
    console.log(formatSuggestionReport(result))
    process.exit(result.ok ? 0 : 1)
  } catch (err) {
    console.error(`Failed to parse input: ${errorMessage(err)}`)
    process.exit(1)
  }
}

// --doctor: validate component + props from stdin or argv
if (flag === "--doctor") {
  const input = readJSONInput(
    'Usage: npx semiotic-ai --doctor \'{"component":"LineChart","props":{"data":[...]},"usageMode":"static"}\'\n       echo \'{"component":"LineChart","props":{"xAccessor":"x","yAccessor":"y"},"usageMode":"push"}\' | npx semiotic-ai --doctor'
  )

  // `--json` emits a stable machine-readable report instead of the human text.
  const asJson = process.argv.includes("--json")

  try {
    const { component, props, usageMode: rawUsageMode } = JSON.parse(input)
    if (!component || !props) {
      const msg = "Input must be JSON with { component, props } fields."
      if (asJson)
        console.log(JSON.stringify({ ok: false, error: msg }, null, 2))
      else console.error(msg)
      process.exit(1)
    }
    const usageMode = normalizeUsageMode(rawUsageMode)

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

    // Tracks whether the doctor found any error-level problem. The process
    // MUST exit nonzero when this is false so CI/agents can gate on it.
    let ok

    if (!diagnoseConfig && !validateProps) {
      if (asJson) {
        const result = validatePropsWithSchema(component, props, usageMode)
        ok = result.valid
        console.log(
          JSON.stringify(
            {
              component,
              usageMode,
              mode: "schema-only",
              ok,
              errors: result.errors
            },
            null,
            2
          )
        )
      } else {
        ok = printSchemaOnlyDoctorResult(component, props, usageMode)
      }
    } else if (diagnoseConfig) {
      // Use the full anti-pattern detector
      const result = diagnoseConfig(component, props)
      const diagnoses =
        usageMode === "push"
          ? result.diagnoses.filter(
              (d) =>
                d.code !== "VALIDATION" ||
                !shouldSkipMissingRequiredProp(component, "data", usageMode) ||
                d.message !== `"data" is required for ${component}.`
            )
          : result.diagnoses
      ok = diagnoses.every((d) => d.severity === "warning")

      if (asJson) {
        console.log(
          JSON.stringify(
            { component, usageMode, mode: "diagnose", ok, diagnoses },
            null,
            2
          )
        )
      } else {
        if (usageMode === "push") {
          console.log(
            `  Usage mode: push (data prop may be omitted; use a ref to push data)`
          )
        }

        // Show data shape summary
        if (props.data && Array.isArray(props.data) && props.data.length > 0) {
          const sample = props.data[0]
          console.log(
            `  Data shape: ${props.data.length} items, keys: [${Object.keys(sample).join(", ")}]`
          )
        }

        if (ok && diagnoses.length === 0) {
          console.log(`✓ ${component}: configuration looks good.`)
        } else if (ok) {
          console.log(`✓ ${component}: configuration OK with warnings:`)
          for (const d of diagnoses) {
            console.log(`  ⚠ [${d.code}] ${d.message}`)
            if (d.fix) console.log(`    Fix: ${d.fix}`)
          }
        } else {
          console.log(`✗ ${component}: issues detected.`)
          for (const d of diagnoses) {
            const icon = d.severity === "error" ? "✗" : "⚠"
            console.log(`  ${icon} [${d.code}] ${d.message}`)
            if (d.fix) console.log(`    Fix: ${d.fix}`)
          }
        }
        printDoctorBehaviorContracts(component, props)
      }
    } else {
      // Fallback to validateProps only
      const result = validateProps(component, props)
      const errors = filterUsageModeErrors(component, result.errors, usageMode)
      ok = errors.length === 0
      if (asJson) {
        console.log(
          JSON.stringify(
            { component, usageMode, mode: "validate", ok, errors },
            null,
            2
          )
        )
      } else {
        if (usageMode === "push") {
          console.log(
            `  Usage mode: push (data prop may be omitted; use a ref to push data)`
          )
        }
        if (ok) {
          console.log(`✓ ${component}: props are valid.`)
        } else {
          console.log(`✗ ${component}: validation failed.`)
          for (const err of errors) {
            console.log(`  • ${err}`)
          }
        }
        printDoctorBehaviorContracts(component, props)
      }
    }

    // Exit nonzero when an error-level problem was found (warnings still exit 0).
    process.exit(ok ? 0 : 1)
  } catch (err) {
    const msg = `Failed to parse input: ${errorMessage(err)}`
    if (asJson) console.log(JSON.stringify({ ok: false, error: msg }, null, 2))
    else console.error(msg)
    process.exit(1)
  }
}

// --audit-a11y: grade component + props against Chartability heuristics
if (flag === "--audit-a11y") {
  const input = readJSONInput(
    'Usage: npx semiotic-ai --audit-a11y \'{"component":"LineChart","props":{"data":[...],"xAccessor":"x","yAccessor":"y"}}\'\n       echo \'{"component":"BarChart","props":{...},"inChartContainer":true}\' | npx semiotic-ai --audit-a11y'
  )

  try {
    const { component, props, inChartContainer, describe, navigable } =
      JSON.parse(input)
    if (!component || !props) {
      console.error("Input must be JSON with { component, props } fields.")
      process.exit(1)
    }

    // Load the audit from dist (same strategy as --doctor). It lives in the
    // semiotic/ai bundle; a clean source checkout without a build can't run it.
    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let auditAccessibility, formatAccessibilityAudit
    try {
      if (!process.env.SEMIOTIC_AI_SCHEMA_ONLY) {
        const mod = require(distPath)
        auditAccessibility = mod.auditAccessibility
        formatAccessibilityAudit = mod.formatAccessibilityAudit
      }
    } catch (e) {
      // Dist unavailable.
    }

    if (!auditAccessibility || !formatAccessibilityAudit) {
      console.error(
        "Accessibility audit requires the built library. Run `npm run dist` first, or use the MCP `auditAccessibility` tool."
      )
      process.exit(2)
    }

    const result = auditAccessibility(component, props, {
      inChartContainer: inChartContainer === true,
      describe: describe === true,
      navigable: navigable === true
    })
    console.log(formatAccessibilityAudit(result))
    process.exit(result.ok ? 0 : 1)
  } catch (err) {
    console.error(`Failed to parse input: ${errorMessage(err)}`)
    process.exit(1)
  }
}

// --audit-mobile: grade component + props for mobile visualization risks
if (flag === "--audit-mobile") {
  const input = readJSONInput(
    'Usage: npx semiotic-ai --audit-mobile \'{"component":"LineChart","props":{"data":[...],"xAccessor":"x","yAccessor":"y"},"viewportWidth":390}\'\n       echo \'{"component":"Scatterplot","props":{...},"targetSize":44}\' | npx semiotic-ai --audit-mobile'
  )

  try {
    const { component, props, viewportWidth, targetSize, inChartContainer } =
      JSON.parse(input)
    if (!component || !props) {
      console.error("Input must be JSON with { component, props } fields.")
      process.exit(1)
    }

    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let auditMobileVisualization, formatMobileVisualizationAudit
    try {
      if (!process.env.SEMIOTIC_AI_SCHEMA_ONLY) {
        const mod = require(distPath)
        auditMobileVisualization = mod.auditMobileVisualization
        formatMobileVisualizationAudit = mod.formatMobileVisualizationAudit
      }
    } catch (e) {
      // Dist unavailable.
    }

    if (!auditMobileVisualization || !formatMobileVisualizationAudit) {
      console.error(
        "Mobile visualization audit requires the built library. Run `npm run dist` first, or use the MCP `auditMobileVisualization` tool."
      )
      process.exit(2)
    }

    const result = auditMobileVisualization(component, props, {
      viewportWidth:
        typeof viewportWidth === "number" ? viewportWidth : undefined,
      targetSize: typeof targetSize === "number" ? targetSize : undefined,
      inChartContainer: inChartContainer === true
    })
    console.log(formatMobileVisualizationAudit(result))
    process.exit(result.ok ? 0 : 1)
  } catch (err) {
    console.error(`Failed to parse input: ${errorMessage(err)}`)
    process.exit(1)
  }
}

// --evaluate: run the unified data/deception/accessibility evaluator
if (flag === "--evaluate") {
  const input = readJSONInput(
    'Usage: npx semiotic-ai --evaluate \'{"component":"LineChart","props":{"xAccessor":"x","yAccessor":"y"},"data":[...]}\''
  )
  const asJson = process.argv.includes("--json")

  try {
    const { component, props, data, inChartContainer, describe, navigable } =
      JSON.parse(input)
    if (!component || !props) {
      const msg = "Input must be JSON with { component, props } fields."
      if (asJson)
        console.log(JSON.stringify({ ok: false, error: msg }, null, 2))
      else console.error(msg)
      process.exit(1)
    }

    const distPath = path.join(pkgRoot, "dist", "semiotic-ai.min.js")
    let evaluateChart, formatEvaluateChart
    try {
      if (!process.env.SEMIOTIC_AI_SCHEMA_ONLY) {
        const mod = require(distPath)
        evaluateChart = mod.evaluateChart
        formatEvaluateChart = mod.formatEvaluateChart
      }
    } catch (e) {
      // Dist unavailable.
    }

    if (!evaluateChart || !formatEvaluateChart) {
      const msg =
        "Chart evaluation requires the built library. Run `npm run dist` first, or use the MCP `evaluateChart` tool."
      if (asJson)
        console.log(JSON.stringify({ ok: false, error: msg }, null, 2))
      else console.error(msg)
      process.exit(2)
    }

    const result = evaluateChart(
      component,
      props,
      Array.isArray(data) ? data : undefined,
      {
        inChartContainer: inChartContainer === true,
        describe: describe === true,
        navigable: navigable === true
      }
    )
    if (asJson) console.log(JSON.stringify(result, null, 2))
    else console.log(formatEvaluateChart(result))
    process.exit(result.ok ? 0 : 1)
  } catch (err) {
    const msg = `Failed to parse input: ${errorMessage(err)}`
    if (asJson) console.log(JSON.stringify({ ok: false, error: msg }, null, 2))
    else console.error(msg)
    process.exit(1)
  }
}

if (
  [
    "--audit-artifact",
    "--recommend-representation",
    "--repair-artifact",
    "--explain-refusal"
  ].includes(flag)
) {
  const asJson = process.argv.includes("--json")
  try {
    const request = readArtifactRequest(flag)
    const runtime = loadArtifactRuntime()
    if (!runtime) {
      const message =
        "Artifact evaluation requires the built library. Run `npm run dist` first, or use the equivalent MCP tool."
      if (asJson)
        console.log(JSON.stringify({ ok: false, error: message }, null, 2))
      else console.error(message)
      process.exit(2)
    }
    const validation = runtime.validateArtifactContract(request.contract)
    if (!validation.valid) {
      const message = validation.errors
        .map(
          ({ path: errorPath, message: detail }) => `${errorPath}: ${detail}`
        )
        .join("\n")
      if (asJson) {
        console.log(
          JSON.stringify(
            { ok: false, error: "Invalid artifact contract", validation },
            null,
            2
          )
        )
      } else {
        console.error(`Invalid artifact contract:\n${message}`)
      }
      process.exit(1)
    }
    const options = {
      data: Array.isArray(request.data) ? request.data : undefined,
      policy: request.policy,
      exceptions: Array.isArray(request.exceptions)
        ? request.exceptions
        : undefined,
      now: request.now,
      ...(typeof runtime.renderChartWithEvidence === "function"
        ? { render: runtime.renderChartWithEvidence }
        : {}),
      inChartContainer: request.inChartContainer === true,
      describe: request.describe === true,
      navigable: request.navigable === true
    }
    if (flag === "--recommend-representation") {
      const data =
        options.data ??
        (Array.isArray(request.props.data) ? request.props.data : [])
      const result = runtime.recommendRepresentation(data, request.contract, {
        policy: request.policy,
        exceptions: options.exceptions,
        preferredComponent: request.component,
        intent: request.intent,
        now: request.now
      })
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.status === "refuse" ? 1 : 0)
    }
    if (flag === "--repair-artifact") {
      const result = runtime.repairArtifact(
        request.component,
        request.props,
        request.contract,
        {
          ...options,
          applySafeIdentityRepairs: request.applySafeIdentityRepairs === true
        }
      )
      writeArtifactJsonAndExit(
        safeArtifactRepairOutput(runtime, result),
        result.after.status === "refuse" ? 1 : 0
      )
    }
    const result = runtime.evaluateArtifact(
      request.component,
      request.props,
      request.contract,
      options
    )
    if (flag === "--explain-refusal") {
      const explanation = runtime.explainArtifactRefusal(result)
      if (asJson) {
        console.log(
          JSON.stringify(
            {
              status: result.status === "refuse" ? "refuse" : "not-refused",
              evaluationStatus: result.status,
              policy: result.policy,
              explanation,
              failures: result.obligations
                .filter(({ status }) => status === "fail")
                .slice(0, 20),
              repairs: result.repairs.slice(0, 20)
            },
            null,
            2
          )
        )
      } else {
        console.log(explanation)
      }
    } else if (asJson) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(
        `Artifact status: ${result.status}\n${runtime.formatObligations(result.obligations)}`
      )
    }
    process.exit(result.status === "refuse" ? 1 : 0)
  } catch (err) {
    const message = errorMessage(err)
    if (asJson)
      console.log(JSON.stringify({ ok: false, error: message }, null, 2))
    else console.error(message)
    process.exit(1)
  }
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

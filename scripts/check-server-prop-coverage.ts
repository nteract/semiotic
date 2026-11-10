import { readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"
import ts from "typescript"
import {
  CHART_SPECS,
  composeProps
} from "../src/components/charts/shared/chartSpecs"
import { generateSchemaToolEntry } from "./lib/chart-specs-generators.mjs"
import { loadConsumerContracts } from "./check-consumer-contracts"
import {
  serverPropContracts,
  serverPropExclusions,
  unsupportedServerCharts,
  reviewedFramePaths
} from "../consumer-contracts/server-props"
import {
  reviewServerPropCoverage,
  schemaPropPaths,
  type ServerPropInventory,
  type LegacyServerProps
} from "./lib/server-prop-coverage"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)
const { readRegistryKeys } = require("./lib/registry-source.cjs")
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

export function serverPropInventory(): ServerPropInventory {
  const schema = JSON.parse(read("ai/schema.json"))
  const registry: Set<string> = readRegistryKeys(
    resolve(root, "src/components/server/serverChartConfigs.ts"),
    "CHART_CONFIGS"
  )
  const values: Set<string> = readRegistryKeys(
    resolve(root, "src/components/server/staticValue.tsx"),
    "VALUE_RENDERERS"
  )
  const inventory: ServerPropInventory = {}
  for (const [component, spec] of Object.entries(CHART_SPECS)) {
    const composed = composeProps(spec)
    const expected = generateSchemaToolEntry(spec, composed).function.parameters
    const actual = schema.tools.find(
      (tool: { function: { name: string } }) => tool.function.name === component
    )?.function.parameters
    if (!isDeepStrictEqual(actual, expected))
      throw new Error(
        `${component}: chart spec/schema drift; run check:chart-specs`
      )
    const supported = registry.has(component) || values.has(component)
    if (supported !== spec.capabilities.supportsSSR)
      throw new Error(`${component}: server registry/capability drift`)
    const wirePaths = schemaPropPaths(actual)
    const props: ServerPropInventory[string]["props"] = {}
    for (const [prop, shape] of Object.entries(composed)) {
      props[prop] = {
        runtimeTypes: Array.isArray(shape.type) ? shape.type : [shape.type],
        wire: wirePaths.has(prop)
      }
      for (const nested of schemaPropPaths({
        properties: { [prop]: shape.schema ?? {} }
      })) {
        if (nested !== prop)
          props[nested] = { runtimeTypes: [], wire: wirePaths.has(nested) }
      }
    }
    for (const prop of wirePaths) {
      props[prop] ??= { runtimeTypes: [], wire: true }
    }
    inventory[component] = { supported, props }
  }
  // Only the reviewed children of the open frameProps escape hatch are added.
  // Resolve inherited/aliased members structurally from the real frame types.
  const files = [
    ...new Set(
      Object.values(reviewedFramePaths).map((entry) =>
        resolve(root, entry.file)
      )
    )
  ]
  const program = ts.createProgram(files, {
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX
  })
  const checker = program.getTypeChecker()
  for (const [component, entry] of Object.entries(reviewedFramePaths)) {
    const file = program.getSourceFile(resolve(root, entry.file))!
    const declaration = file.statements.find(
      (node) =>
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name.text === entry.type
    )
    if (!declaration || !inventory[component]?.props.frameProps)
      throw new Error(
        `${component}: missing canonical frameProps type ${entry.type}`
      )
    const type = checker.getTypeAtLocation(declaration)
    for (const prop of entry.props) {
      if (!type.getProperty(prop))
        throw new Error(`${component}.frameProps.${prop}: unknown frame member`)
      inventory[component].props[`frameProps.${prop}`] = {
        runtimeTypes: [],
        wire: false
      }
    }
  }
  return inventory
}

export function checkServerPropCoverage() {
  const assertions: Set<string> = readRegistryKeys(
    resolve(root, "consumer-contracts/server-prop-assertions.tsx"),
    "serverPropAssertions"
  )
  const legacy: LegacyServerProps = JSON.parse(
    read("consumer-contracts/server-props-legacy.json")
  )
  return reviewServerPropCoverage({
    inventory: serverPropInventory(),
    contracts: serverPropContracts,
    exclusions: serverPropExclusions,
    unsupportedCharts: unsupportedServerCharts,
    legacy,
    assertions,
    fixtures: new Set(
      loadConsumerContracts(root).map(({ contract }) => contract.id)
    )
  })
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    const result = checkServerPropCoverage()
    if (process.argv.includes("--json"))
      console.log(JSON.stringify(result, null, 2))
    else {
      console.log(
        "\n[server prop coverage] reviewed behavior / exclusions / legacy unclassified"
      )
      for (const chart of result.charts.filter((chart) => !chart.supported))
        console.log(`  ${chart.component}: unsupported chart — ${chart.reason}`)
      for (const component of [
        ...new Set(result.rows.map((row) => row.component))
      ]) {
        const rows = result.rows.filter((row) => row.component === component)
        const tested = rows.filter(
          (row) => row.status === "server-behavior-tested"
        ).length
        const unclassified = rows.filter(
          (row) => row.status === "unclassified"
        ).length
        console.log(
          `  ${component}: ${tested} / ${rows.length - tested - unclassified} / ${unclassified}`
        )
      }
      console.log(
        "Legacy gaps remain unverified; --json lists every path. Do not expand consumer-contracts/server-props-legacy.json."
      )
      for (const error of result.errors) console.error(`  ${error}`)
    }
    if (result.errors.length) process.exitCode = 1
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}

import { readFileSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import type {
  LoadedContract,
  ConsumerContract,
  PortableConfig
} from "../consumer-contracts/types"

const text = { type: "string", minLength: 1 }
const strings = { type: "array", items: text, uniqueItems: true }
const count = { type: "integer", minimum: 0 }
const dictionary = (value: object) => ({
  type: "object",
  additionalProperties: value
})
const object = (properties: object, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false
})
const domain = {
  type: "array",
  items: { type: "number" },
  minItems: 2,
  maxItems: 2
}
const manifestSchema = object({
  version: { const: 1 },
  contracts: {
    type: "array",
    minItems: 1,
    items: object({
      id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      file: { type: "string", pattern: "^fixtures/[a-z0-9-]+\\.json$" },
      attribution: text,
      useCase: text,
      sources: {
        type: "array",
        minItems: 1,
        items: object({ path: text, reference: text })
      },
      coveredProps: { ...strings, minItems: 1 },
      expected: object(
        {
          evidence: object(
            {
              frameType: { enum: ["xy", "ordinal"] },
              markCountByType: { ...dictionary(count), minProperties: 1 },
              annotationCount: count,
              ariaLabel: text,
              xDomain: domain,
              yDomain: domain,
              legendItems: count
            },
            ["frameType", "markCountByType", "annotationCount", "ariaLabel"]
          ),
          svg: {
            type: "array",
            minItems: 1,
            items: object(
              {
                selector: text,
                count,
                texts: { type: "array", items: { type: "string" } },
                attributes: dictionary(text),
                attributeIncludes: dictionary(text)
              },
              ["selector", "count"]
            )
          },
          startAngle: { type: "number", minimum: 0, exclusiveMaximum: 360 },
          legendBelowLabel: text,
          diagnoses: strings,
          accessibilityFailures: strings,
          knownLimitations: text
        },
        [
          "evidence",
          "svg",
          "diagnoses",
          "accessibilityFailures",
          "knownLimitations"
        ]
      )
    })
  }
})

/** Call before serialization: JSON.stringify silently drops function values. */
export function assertPortable(
  value: unknown,
  path = "config",
  ancestors = new Set<object>()
): void {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return
  if (typeof value === "number" && Number.isFinite(value)) return
  if (typeof value !== "object")
    throw new Error(`${path}: non-JSON ${typeof value} value`)
  if (ancestors.has(value)) throw new Error(`${path}: circular value`)
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${path}: expected a plain JSON object`)
  }
  ancestors.add(value)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!Object.hasOwn(value, i))
        throw new Error(`${path}[${i}]: sparse array`)
    }
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new Error(`${path}: non-JSON symbol key`)
    if (Array.isArray(value)) {
      if (key === "length") continue
      if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) {
        throw new Error(`${path}.${key}: non-JSON array property`)
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!descriptor.enumerable || !("value" in descriptor))
      throw new Error(`${path}.${key}: expected a JSON value property`)
    assertPortable(descriptor.value, `${path}.${key}`, ancestors)
  }
  ancestors.delete(value)
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validateManifest = ajv.compile(manifestSchema)
const validateShape = ajv.compile<PortableConfig>(
  object({ component: text, props: { type: "object" } })
)

export function validatePortableConfig(
  config: unknown,
  schema: unknown,
  label = "config"
): asserts config is PortableConfig {
  assertPortable(config, label)
  if (!validateShape(config))
    throw new Error(`${label}: ${ajv.errorsText(validateShape.errors)}`)
  const typed = config
  const tools = (
    schema as { tools: { function: { name: string; parameters: object } }[] }
  ).tools
  const definition = tools.find(
    (tool) => tool.function.name === typed.component
  )?.function
  if (!definition)
    throw new Error(`${label}: unknown component ${typed.component}`)
  const validateProps = ajv.compile(definition.parameters)
  if (!validateProps(typed.props))
    throw new Error(`${label}.props: ${ajv.errorsText(validateProps.errors)}`)
  if (
    !Array.isArray(typed.props.data) ||
    typed.props.data.length === 0 ||
    typed.props.data.length > 1000
  ) {
    throw new Error(
      `${label}.props.data: corpus requires 1–1000 real data rows`
    )
  }
}

function within(root: string, path: string): string {
  const target = realpathSync(resolve(root, path))
  const rel = relative(realpathSync(root), target)
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    throw new Error(`Path escapes ${root}: ${path}`)
  return target
}

/** Source-only: no renderer, dist import, browser or generated test artifact. */
export function loadConsumerContracts(
  root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
): LoadedContract[] {
  const corpusRoot = resolve(root, "consumer-contracts")
  const manifest = JSON.parse(
    readFileSync(resolve(corpusRoot, "manifest.json"), "utf8")
  )
  if (!validateManifest(manifest))
    throw new Error(
      `consumer-contracts/manifest.json: ${ajv.errorsText(validateManifest.errors)}`
    )
  const schema = JSON.parse(
    readFileSync(resolve(root, "ai/schema.json"), "utf8")
  )
  const ids = new Set<string>()
  const files = new Set<string>()
  return (manifest.contracts as ConsumerContract[]).map((contract) => {
    const label = `consumer-contracts/${contract.file} (${contract.id})`
    if (ids.has(contract.id))
      throw new Error(`Duplicate consumer contract ID: ${contract.id}`)
    if (files.has(contract.file))
      throw new Error(`Duplicate consumer contract file: ${contract.file}`)
    ids.add(contract.id)
    files.add(contract.file)
    for (const source of contract.sources) {
      let contents: string
      try {
        contents = readFileSync(within(root, source.path), "utf8")
      } catch (error) {
        throw new Error(
          `${label}: missing/invalid source ${source.path}: ${String(error)}`
        )
      }
      if (!contents.includes(source.reference))
        throw new Error(
          `${label}: source ${source.path} lacks reference ${source.reference}`
        )
    }
    const config: unknown = JSON.parse(
      readFileSync(within(corpusRoot, contract.file), "utf8")
    )
    validatePortableConfig(config, schema, label)
    for (const path of contract.coveredProps) {
      let value: unknown = config.props
      for (const key of path.split(".")) {
        value =
          value !== null &&
          typeof value === "object" &&
          Object.hasOwn(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined
      }
      if (value === undefined)
        throw new Error(`${label}: covered prop ${path} is absent`)
    }
    for (const rule of contract.expected.svg) {
      if (rule.texts && rule.texts.length !== rule.count)
        throw new Error(`${label}: ${rule.selector} text/count mismatch`)
    }
    return { contract, config }
  })
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    const contracts = loadConsumerContracts(process.argv[2])
    console.log(
      `Consumer contracts: ${contracts.length} portable fixtures, metadata and schemas valid`
    )
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}

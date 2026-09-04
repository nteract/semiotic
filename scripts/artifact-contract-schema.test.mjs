import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const schemaPath = resolve(root, "spec/v0.1/artifact-contract.schema.json")
const schema = JSON.parse(readFileSync(schemaPath, "utf8"))
const Ajv = Ajv2020.default ?? Ajv2020
const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false })
const validate = ajv.compile(schema)

const POLICY_KEYS = [
  "x-semiotic-supplied-by",
  "x-semiotic-derivable",
  "x-semiotic-model-may-propose",
  "x-semiotic-human-review"
]
const SUPPLIERS = new Set(["author", "system", "model-proposal", "import"])
const REVIEW_POLICIES = new Set(["never", "policy-dependent", "required"])

function fixture(name) {
  return JSON.parse(
    readFileSync(resolve(root, `spec/v0.1/examples/${name}`), "utf8")
  )
}

function collectPropertySchemas(node, path = "$", rows = []) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return rows
  if (node.properties && typeof node.properties === "object") {
    assert.equal(
      node.additionalProperties,
      false,
      `${path} is a core object and must reject unknown keys`
    )
    for (const [name, property] of Object.entries(node.properties)) {
      rows.push({ path: `${path}.${name}`, property })
      collectPropertySchemas(property, `${path}.${name}`, rows)
    }
  }
  for (const keyword of ["$defs", "anyOf", "oneOf", "allOf"]) {
    const child = node[keyword]
    if (Array.isArray(child)) {
      child.forEach((entry, index) =>
        collectPropertySchemas(entry, `${path}.${keyword}[${index}]`, rows)
      )
    } else if (child && typeof child === "object") {
      for (const [name, entry] of Object.entries(child)) {
        collectPropertySchemas(entry, `${path}.${keyword}.${name}`, rows)
      }
    }
  }
  collectPropertySchemas(node.items, `${path}.items`, rows)
  return rows
}

test("publishes a valid closed Draft 2020-12 schema", () => {
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema")
  assert.equal(
    schema.$id,
    "https://semiotic.dev/spec/v0.1/artifact-contract.schema.json"
  )
  assert.equal(schema.properties.contractVersion.const, "0.1")
  assert.equal(ajv.validateSchema(schema), true, ajv.errorsText(ajv.errors))
})

test("annotates every domain property with a complete field policy", () => {
  const properties = collectPropertySchemas(schema)
  assert.ok(
    properties.length >= 140,
    `expected broad field coverage, saw ${properties.length}`
  )
  for (const { path, property } of properties) {
    for (const key of POLICY_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(property, key),
        `${path} missing ${key}`
      )
    }
    const suppliedBy = property["x-semiotic-supplied-by"]
    assert.ok(
      Array.isArray(suppliedBy) && suppliedBy.length > 0,
      `${path} has no suppliers`
    )
    for (const supplier of suppliedBy) {
      assert.ok(
        SUPPLIERS.has(supplier),
        `${path} has unknown supplier ${supplier}`
      )
    }
    assert.equal(
      typeof property["x-semiotic-derivable"],
      "boolean",
      `${path} derivable`
    )
    assert.equal(
      typeof property["x-semiotic-model-may-propose"],
      "boolean",
      `${path} model proposal`
    )
    assert.ok(
      REVIEW_POLICIES.has(property["x-semiotic-human-review"]),
      `${path} has an invalid human-review policy`
    )
  }
})

test("validates the full and explicit-unknown fixtures", () => {
  for (const name of [
    "artifact-contract-full.json",
    "artifact-contract-unknown-state.json"
  ]) {
    const value = fixture(name)
    assert.equal(
      validate(value),
      true,
      `${name}: ${ajv.errorsText(validate.errors)}`
    )
  }

  const unknown = fixture("artifact-contract-unknown-state.json")
  assert.deepEqual(
    Object.values(unknown.fieldStatus)
      .map((state) => state.status)
      .sort(),
    ["manual", "not-applicable", "unknown"]
  )
})

test("rejects future versions, invalid states, and undeclared core fields", () => {
  const full = fixture("artifact-contract-full.json")
  assert.equal(validate({ ...full, contractVersion: "0.2" }), false)
  assert.equal(
    validate({
      ...full,
      fieldStatus: { review: { status: "assumed" } }
    }),
    false
  )
  assert.equal(validate({ ...full, accidentalRootField: true }), false)
  assert.equal(
    validate({
      ...full,
      purpose: { ...full.purpose, accidentalPurposeField: true }
    }),
    false
  )
})

test("rejects empty stable identifiers and identifier references", () => {
  const cases = [
    ["artifact id", (value) => (value.artifact.id = "")],
    ["actor kind", (value) => (value.claims[0].authoredBy.kind = "")],
    ["intent id", (value) => (value.purpose.intents[0].id = "")],
    ["claim id", (value) => (value.claims[0].id = "")],
    [
      "claim evidence reference",
      (value) => (value.claims[0].evidenceIds = [""])
    ],
    [
      "superseded claim reference",
      (value) => (value.claims[1].supersedes = [""])
    ],
    ["evidence id", (value) => (value.evidence[0].id = "")],
    [
      "transformation id",
      (value) => (value.evidence[1].transformation.id = "")
    ],
    [
      "transformation evidence reference",
      (value) => (value.evidence[1].transformation.inputEvidenceIds = [""])
    ],
    ["temporal source id", (value) => (value.time.sources[0].id = "")],
    ["challenge id", (value) => (value.contestability.challenges[0].id = "")],
    [
      "challenged claim reference",
      (value) => (value.contestability.challenges[0].claimId = "")
    ],
    ["correction id", (value) => (value.contestability.corrections[0].id = "")],
    [
      "corrected claim reference",
      (value) => (value.contestability.corrections[0].affectedClaimIds = [""])
    ],
    [
      "replacement claim reference",
      (value) =>
        (value.contestability.corrections[0].replacementClaimIds = [""])
    ],
    [
      "alternative view id",
      (value) => (value.contestability.alternativeViews[0].id = "")
    ],
    [
      "exception rule id",
      (value) => (value.contestability.editorialExceptions[0].ruleId = "")
    ],
    ["review id", (value) => (value.accountability.reviews[0].id = "")],
    ["action id", (value) => (value.accountability.actions[0].id = "")],
    [
      "action claim reference",
      (value) => (value.accountability.actions[0].claimIds = [""])
    ],
    [
      "source artifact reference",
      (value) => (value.inheritance.sourceArtifactIds = [""])
    ]
  ]

  for (const [label, mutate] of cases) {
    const value = structuredClone(fixture("artifact-contract-full.json"))
    mutate(value)
    assert.equal(validate(value), false, `${label} should be non-empty`)
  }
})

test("keeps the generated Markdown reference synchronized", () => {
  assert.doesNotThrow(() =>
    execFileSync(
      process.execPath,
      [
        resolve(root, "scripts/generate-artifact-contract-reference.mjs"),
        "--check"
      ],
      { cwd: root, stdio: "pipe" }
    )
  )
})

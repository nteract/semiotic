import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { ARTIFACT_FIELD_POLICIES } from "../src/components/artifact/contract.ts"

const schema = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "spec/v0.1/artifact-contract.schema.json"),
    "utf8"
  )
)
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8")
)

const schemaFields = {
  "artifact.id": schema.$defs.artifactIdentity.properties.id,
  "artifact.createdAt": schema.$defs.artifactIdentity.properties.createdAt,
  "artifact.configFingerprint":
    schema.$defs.artifactIdentity.properties.configFingerprint,
  "artifact.dataFingerprint":
    schema.$defs.artifactIdentity.properties.dataFingerprint,
  "purpose.intents": schema.$defs.purposeContract.properties.intents,
  "purpose.communicativeAct":
    schema.$defs.purposeContract.properties.communicativeAct,
  "purpose.stakes": schema.$defs.purposeContract.properties.stakes,
  claims: schema.properties.claims,
  "claims.status": schema.$defs.claim.properties.status,
  evidence: schema.properties.evidence,
  "evidence.source": schema.$defs.evidenceRef.properties.source,
  "evidence.fingerprint": schema.$defs.evidenceRef.properties.fingerprint,
  time: schema.properties.time,
  "time.completeness": schema.$defs.temporalContext.properties.completeness,
  reception: schema.properties.reception,
  form: schema.properties.form,
  contestability: schema.properties.contestability,
  accountability: schema.properties.accountability,
  inheritance: schema.properties.inheritance
}

function sortedUnique(values) {
  return [...new Set(values)].sort()
}

test("keeps runtime field policies aligned with schema annotations", () => {
  assert.deepEqual(
    Object.keys(ARTIFACT_FIELD_POLICIES).sort(),
    Object.keys(schemaFields).sort()
  )

  for (const [path, runtimePolicy] of Object.entries(ARTIFACT_FIELD_POLICIES)) {
    const field = schemaFields[path]
    assert.ok(field, `${path} must map to a schema field`)
    assert.deepEqual(
      sortedUnique(runtimePolicy.suppliedBy),
      sortedUnique(field["x-semiotic-supplied-by"]),
      `${path} suppliers`
    )
    assert.equal(
      runtimePolicy.derivable,
      field["x-semiotic-derivable"],
      `${path} derivation policy`
    )
    assert.equal(
      runtimePolicy.modelMayPropose,
      field["x-semiotic-model-may-propose"],
      `${path} model-proposal policy`
    )
    assert.equal(
      runtimePolicy.humanReview,
      field["x-semiotic-human-review"],
      `${path} review policy`
    )
  }
})

test("ships generated references and gates contract checks in package lifecycles", () => {
  for (const packagedFile of [
    "ai/artifact-contract-reference.md",
    "ai/artifact-surface-inventory.json"
  ]) {
    assert.ok(packageJson.files.includes(packagedFile), packagedFile)
  }

  for (const lifecycle of [
    "check:preflight",
    "release:check",
    "prepublishOnly"
  ]) {
    assert.match(
      packageJson.scripts[lifecycle],
      /npm run check:artifact-contract/,
      lifecycle
    )
  }
  assert.equal(packageJson.scripts["pretest:coverage"], "npm run dist:prod")
  for (const lifecycle of ["release:check", "prepublishOnly"]) {
    const script = packageJson.scripts[lifecycle]
    const coverageIndex = script.indexOf("npm run test:coverage")
    const cliIndex = script.indexOf("npm run test:artifact-cli:from-dist")
    assert.match(
      script,
      /npm run test:artifact-cli:from-dist/,
      lifecycle
    )
    assert.notEqual(coverageIndex, -1, lifecycle)
    assert.ok(
      coverageIndex < cliIndex,
      `${lifecycle} must build dist before testing the CLI against it`
    )
  }
})

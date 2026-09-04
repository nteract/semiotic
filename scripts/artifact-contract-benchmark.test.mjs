import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020.js"
import benchmarkModule from "./artifact-contract-benchmark.ts"
import { buildArtifactContract } from "../src/components/artifact/contract.ts"
import { serializeArtifactContract } from "../src/components/artifact/serialization.ts"
import { validateArtifactContract } from "../src/components/artifact/validation.ts"

const {
  MUTATION_IDS,
  RELATIONS,
  TRACKS,
  applyMutationSet,
  buildBenchmarkDocsSummary,
  checkBenchmarkBaseline,
  checkBenchmarkOutputs,
  loadBenchmarkFixtures,
  loadMutationFixture,
  runArtifactContractBenchmark,
  serializeBenchmarkDocsSummary,
  serializeBenchmarkReport,
  summarizeRefusalEvaluation,
  validateBenchmarkInputs,
  writeBenchmarkOutputs
} = benchmarkModule

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const schema = JSON.parse(
  readFileSync(resolve(root, "spec/v0.1/artifact-contract.schema.json"), "utf8")
)
const Ajv = Ajv2020.default ?? Ajv2020
const validateSchema = new Ajv({
  strict: false,
  allErrors: true,
  validateFormats: false
}).compile(schema)

test("loads exactly 40 balanced cases and 12 versioned mutations", () => {
  const fixtures = loadBenchmarkFixtures()
  const mutations = loadMutationFixture()

  assert.doesNotThrow(() => validateBenchmarkInputs(fixtures, mutations))
  assert.equal(fixtures.fixtureVersion, "0.2")
  assert.equal(mutations.mutationVersion, "0.1")
  assert.equal(fixtures.cases.length, 40)
  assert.equal(mutations.mutations.length, 12)
  assert.deepEqual(
    mutations.mutations.map(({ id }) => id),
    MUTATION_IDS
  )

  for (const track of TRACKS) {
    assert.equal(
      fixtures.cases.filter((item) => item.track === track).length,
      10,
      `${track} must contain ten cases`
    )
  }
  for (const benchmarkCase of fixtures.cases) {
    assert.ok(benchmarkCase.expected.findingPrefixes.length > 0)
    assert.ok(benchmarkCase.expected.unknownPaths.length > 0)
  }
  for (const [baseId, base] of Object.entries(fixtures.bases)) {
    assert.equal(
      base.controlExpectation?.evaluation,
      "not-refuse",
      `${baseId} must explicitly label its positive-control outcome`
    )
  }
  for (const relation of RELATIONS) {
    assert.ok(
      fixtures.cases.some((item) => item.relations.includes(relation)),
      `${relation} must be represented`
    )
  }
})

test("produces byte-identical deterministic reports", () => {
  const first = runArtifactContractBenchmark()
  const second = runArtifactContractBenchmark()

  assert.deepEqual(second, first)
  assert.equal(
    serializeBenchmarkReport(second),
    serializeBenchmarkReport(first)
  )
  assert.equal(first.summary.cases, 40)
  assert.equal(first.summary.measured, 40)
  assert.equal(first.summary.partial, 0)
  assert.equal(first.summary.notCurrentlyMeasurable, 0)
  assert.equal(
    first.summary.expectedFindings.matched,
    first.summary.expectedFindings.total
  )
  assert.equal(
    first.summary.expectedUnknownPaths.matched,
    first.summary.expectedUnknownPaths.total
  )
  assert.equal(first.trackCoverage.length, 4)
  assert.equal(first.relationCoverage.length, 8)
  assert.equal(first.mutationCoverage.length, 12)
  assert.deepEqual(first.summary.positiveControls, { matched: 4, total: 4 })
  assert.deepEqual(first.summary.refusalEvaluation.confusionMatrix, {
    expectedRefuse: { observedRefuse: 0, observedNotRefuse: 0 },
    expectedNotRefuse: { observedRefuse: 0, observedNotRefuse: 4 }
  })
  assert.deepEqual(first.summary.refusalEvaluation.falseRefusalRate, {
    falseRefusals: 0,
    expectedNotRefuse: 4,
    rate: 0
  })
  assert.equal(first.summary.refusalEvaluation.refusalPrecision, null)
  assert.equal(first.summary.refusalEvaluation.unlabeledMutations, 40)
  assert.deepEqual(first.summary.pairedMutationDetection, {
    detected: 40,
    total: 40,
    rate: 1,
    criterion:
      "Every declared finding prefix appeared only after applying the paired mutation set."
  })
  assert.ok(
    first.positiveControls.every(
      ({ expected, observed, matched }) =>
        expected === "not-refuse" && observed === "not-refuse" && matched
    )
  )
  for (const item of first.cases) {
    assert.match(
      item.fingerprints.base,
      /^sha256-bytes:(?:[0-9a-f]{2}:){31}[0-9a-f]{2}$/
    )
    assert.notEqual(item.fingerprints.mutated, item.fingerprints.base)
  }
})

test("derives a compact public summary without dropping measurement limits", () => {
  const report = runArtifactContractBenchmark()
  const summary = buildBenchmarkDocsSummary(report)

  assert.deepEqual(summary.corpus, {
    cases: 40,
    tracks: 4,
    relations: 8,
    mutations: 12,
    rendererScope: "LineChart static frame"
  })
  assert.deepEqual(summary.measurements.pairedMutationDetection, {
    detected: 40,
    total: 40,
    rate: 1,
    criterion:
      "Every declared finding prefix appeared only after applying the paired mutation set."
  })
  assert.deepEqual(summary.measurements.positiveControls, {
    matched: 4,
    total: 4,
    falseRefusals: 0,
    expectedNotRefuse: 4,
    falseRefusalRate: 0
  })
  assert.equal(summary.measurements.refusalPrecision.value, null)
  assert.match(
    summary.measurements.refusalPrecision.reason,
    /not complete should-refuse labels/
  )
  assert.equal(summary.downloadPath, "/artifact-contract-benchmark.json")
  assert.equal("cases" in summary, false)
  assert.ok(
    serializeBenchmarkDocsSummary(summary).length <
      serializeBenchmarkReport(report).length
  )
})

test("writes and drift-checks every generated benchmark output", () => {
  const directory = mkdtempSync(join(tmpdir(), "artifact-benchmark-"))
  const paths = {
    baseline: join(directory, "baseline.json"),
    publicReport: join(directory, "public-report.json"),
    docsSummary: join(directory, "summary.json")
  }
  const report = runArtifactContractBenchmark()

  try {
    writeBenchmarkOutputs(report, paths)
    assert.doesNotThrow(() => checkBenchmarkOutputs(report, paths))
    assert.deepEqual(
      JSON.parse(readFileSync(paths.publicReport, "utf8")),
      report
    )
    assert.deepEqual(
      JSON.parse(readFileSync(paths.docsSummary, "utf8")),
      buildBenchmarkDocsSummary(report)
    )

    for (const [key, label] of [
      ["baseline", "internal baseline"],
      ["publicReport", "downloadable public report"],
      ["docsSummary", "documentation summary"]
    ]) {
      writeBenchmarkOutputs(report, paths)
      writeFileSync(paths[key], "{}\n")
      assert.throws(
        () => checkBenchmarkOutputs(report, paths),
        new RegExp(`${label} drifted`)
      )
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test("reports labeled false refusals without inventing mutation precision", () => {
  const summary = summarizeRefusalEvaluation(
    [
      {
        baseId: "accepted",
        expected: "not-refuse",
        observed: "not-refuse",
        evaluationStatus: "acceptable",
        matched: true
      },
      {
        baseId: "incorrectly-blocked",
        expected: "not-refuse",
        observed: "refuse",
        evaluationStatus: "refuse",
        matched: false
      }
    ],
    12
  )

  assert.deepEqual(summary.confusionMatrix, {
    expectedRefuse: { observedRefuse: 0, observedNotRefuse: 0 },
    expectedNotRefuse: { observedRefuse: 1, observedNotRefuse: 1 }
  })
  assert.deepEqual(summary.falseRefusalRate, {
    falseRefusals: 1,
    expectedNotRefuse: 2,
    rate: 0.5
  })
  assert.equal(summary.refusalPrecision, null)
  assert.equal(summary.unlabeledMutations, 12)
  assert.match(summary.precisionReason, /not complete should-refuse labels/)
})

test("rejects benchmark bases without explicit positive-control labels", () => {
  const fixtures = structuredClone(loadBenchmarkFixtures())
  const mutations = loadMutationFixture()
  delete fixtures.bases["operational-live"].controlExpectation

  assert.throws(
    () => validateBenchmarkInputs(fixtures, mutations),
    /operational-live must explicitly label its defensible base as not-refuse/
  )
})

test("round-trips every benchmark contract through runtime and JSON Schema validation", () => {
  const fixtures = loadBenchmarkFixtures()

  for (const benchmarkCase of fixtures.cases) {
    const base = fixtures.bases[benchmarkCase.baseId]
    const mutated = applyMutationSet(base, benchmarkCase.mutationIds)
    const contract = buildArtifactContract(
      base.component,
      mutated.config,
      mutated.contract
    )
    const runtimeValidation = validateArtifactContract(contract)
    assert.equal(
      runtimeValidation.valid,
      true,
      `${benchmarkCase.id}: ${runtimeValidation.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join("; ")}`
    )
    assert.equal(
      validateSchema(contract),
      true,
      `${benchmarkCase.id}: ${validateSchema.errors
        ?.map(({ instancePath, message }) => `${instancePath}: ${message}`)
        .join("; ")}`
    )

    const serialized = serializeArtifactContract(contract)
    assert.equal(
      serialized.transfer.status,
      "preserved",
      `${benchmarkCase.id}: ${serialized.transfer.warnings.join("; ")}`
    )
    assert.deepEqual(
      JSON.parse(JSON.stringify(serialized.contract)),
      JSON.parse(JSON.stringify(contract)),
      `${benchmarkCase.id}: contract changed across the JSON round trip`
    )
  }
})

test("applies every mutation without changing its base input", () => {
  const fixtures = loadBenchmarkFixtures()

  for (const mutationId of MUTATION_IDS) {
    const benchmarkCase = fixtures.cases.find((item) =>
      item.mutationIds.includes(mutationId)
    )
    assert.ok(benchmarkCase, `${mutationId} must be exercised by a case`)
    const base = fixtures.bases[benchmarkCase.baseId]
    const before = structuredClone(base)
    const first = applyMutationSet(base, [mutationId])
    const second = applyMutationSet(base, [mutationId])

    assert.deepEqual(base, before, `${mutationId} changed its base input`)
    assert.deepEqual(second, first, `${mutationId} was not deterministic`)
    assert.notDeepEqual(
      first,
      { config: base.config, contract: base.contract },
      `${mutationId} did not change its target`
    )
  }
})

test("keeps every committed benchmark output synchronized", () => {
  assert.doesNotThrow(() => checkBenchmarkBaseline())
  assert.doesNotThrow(() => checkBenchmarkOutputs())
})

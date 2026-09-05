import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const CLI_PATH = resolve(ROOT, "ai/cli.js")
const DIST_PATH = resolve(ROOT, "dist/semiotic-artifact.min.js")
const SAMPLE_SENTINEL = "PRIVATE-EVIDENCE-SAMPLE-VALUE"
const DATA_SENTINEL = "PRIVATE-BULK-PROP-VALUE"

function loadBuiltRuntime() {
  assert.ok(
    existsSync(DIST_PATH),
    "Build the distribution before running the artifact CLI integration test."
  )
  const runtime = require(DIST_PATH)
  for (const name of [
    "buildArtifactContract",
    "evaluateArtifact",
    "recommendRepresentation",
    "repairArtifact",
    "explainArtifactRefusal"
  ]) {
    assert.equal(
      typeof runtime[name],
      "function",
      `built artifact entry must export ${name}`
    )
  }
  return runtime
}

it("refuses input identity mismatches through the CLI and built evidence gate", () => {
  const runtime = loadBuiltRuntime()
  const { renderChartWithEvidence } = require(resolve(ROOT, "dist/server.min.js"))
  const { toEvidenceEnvelope, evaluateEvidenceGate } = require(resolve(ROOT, "dist/semiotic-evidence.min.js"))
  const props = chartProps()
  for (const [key, value] of [
    ["component", "Scatterplot"],
    ["configFingerprint", "sha256:other-config"],
    ["dataFingerprint", "sha256:other-data"]
  ]) {
    const contract = explicitContract(runtime, props)
    contract.artifact[key] = value
    const output = runCli("--audit-artifact", { component: "LineChart", props, contract, policyId: "exploratory" }, { json: true })
    const result = JSON.parse(output.stdout)
    assert.equal(result.status, "refuse", output.stdout)
    const evidence = renderChartWithEvidence("LineChart", props, { artifactContract: contract }).evidence
    const envelope = toEvidenceEnvelope("LineChart", props, { ssrEvidence: evidence })
    assert.equal(evaluateEvidenceGate(envelope).ok, false)
  }
})

function chartProps(data = undefined) {
  return {
    data: data ?? [
      { month: 1, value: 4 },
      { month: 2, value: 7 },
      { month: 3, value: 6 }
    ],
    xAccessor: "month",
    yAccessor: "value",
    title: "Reviewed monthly values",
    description: "Three reviewed monthly observations.",
    summary: "The series rose and then eased.",
    accessibleTable: true
  }
}

function explicitContract(runtime, props = chartProps()) {
  return runtime.buildArtifactContract("LineChart", props, {
    id: "artifact-cli-integration",
    kind: "agent-answer",
    title: "Reviewed monthly values",
    intents: ["trend"],
    purpose: {
      stakes: "informational",
      communicativeAct: "Describe a bounded monthly sequence.",
      allowedUses: ["reviewed explanation"]
    },
    claims: [
      {
        id: "monthly-claim",
        text: "The measured series rose and then eased.",
        kind: "observation",
        status: "supported",
        evidenceIds: ["monthly-source"],
        scope: {
          metric: "monthly records",
          metricType: "count",
          unit: "records"
        },
        asOf: "2026-09-01T12:00:00Z",
        authoredBy: { id: "analyst", kind: "human" }
      }
    ],
    evidence: [
      {
        id: "monthly-source",
        role: "source-data",
        label: "Versioned monthly extract",
        source: {
          uri: "urn:semiotic:test:monthly-source",
          version: "1"
        },
        fingerprint: "sha256:monthly-source-v1",
        dataVersion: "1",
        observedAt: "2026-09-01T12:00:00Z",
        sample: {
          rowCount: 1,
          fields: ["private-value"],
          values: [{ "private-value": SAMPLE_SENTINEL }]
        }
      }
    ],
    time: {
      observedAt: "2026-09-01T12:00:00Z",
      processedAt: "2026-09-01T12:01:00Z",
      publishedAt: "2026-09-01T12:02:00Z",
      snapshotAt: "2026-09-01T12:01:30Z",
      presentation: { state: "historical", label: "Settled monthly extract" },
      freshness: {
        status: "fresh",
        checkedAt: "2026-09-01T12:02:00Z",
        expiresAt: "2026-10-01T12:02:00Z",
        basis: "versioned extract"
      },
      window: {
        start: "2026-06-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled", basis: "versioned extract" },
      revision: { status: "original" },
      snapshot: { id: "monthly-snapshot-v1", format: "other" }
    },
    reception: {
      channels: [
        { channel: "visual", disclosure: "standard" },
        { channel: "screen-reader", disclosure: "detailed" },
        { channel: "agent", disclosure: "standard", rawData: "deny" }
      ],
      audience: "Analysts reviewing generated material",
      description: "A described chart with an accessible table.",
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "Position over time supports the declared sequence."
    },
    contestability: { sourceRequestsAllowed: true, corrections: [] },
    accountability: {
      authors: [{ id: "analyst", kind: "human" }],
      dataSources: ["monthly-source"],
      reviews: [{ id: "editor-review", status: "approved" }]
    },
    inheritance: {
      requiredPaths: ["claims", "evidence", "time"],
      rawDataDefault: "exclude",
      privacy: "restricted",
      preservation: "claim-evidence-preserved"
    }
  })
}

function reviewedGeneratedContract(runtime, props = chartProps()) {
  const contract = explicitContract(runtime, props)
  return {
    ...contract,
    claims: contract.claims.map((claim) => ({
      ...claim,
      authoredBy: { id: "agent-writer", kind: "agent" },
      review: {
        status: "approved",
        reviewer: { id: "human-reviewer", kind: "human" },
        reviewedAt: "2026-09-02T00:00:00Z"
      }
    })),
    accountability: {
      ...contract.accountability,
      generatedBy: "artifact-cli-test-generator"
    }
  }
}

function runCli(flag, request, options = {}) {
  const args = [CLI_PATH, flag]
  if (options.json) args.push("--json")
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    input: request === undefined ? undefined : JSON.stringify(request),
    env: { ...process.env, SEMIOTIC_AI_SCHEMA_ONLY: "" }
  })
  assert.equal(result.signal, null, result.stderr)
  return result
}

function parseJson(result) {
  assert.ok(result.stdout.trim(), "CLI should return JSON on stdout")
  return JSON.parse(result.stdout)
}

function collectOmittedPaths(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOmittedPaths(item, output))
    return output
  }
  if (!value || typeof value !== "object") return output
  for (const [key, item] of Object.entries(value)) {
    if (key === "omittedPaths" && Array.isArray(item)) {
      output.push(...item.filter((path) => typeof path === "string"))
    }
    collectOmittedPaths(item, output)
  }
  return output
}

describe("artifact CLI built-distribution integration", () => {
  it("prints the versioned standalone schema", () => {
    loadBuiltRuntime()
    const result = runCli("--artifact-schema")

    assert.equal(result.status, 0, result.stderr)
    const schema = parseJson(result)
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema")
    assert.equal(
      schema.$id,
      "https://semiotic.dev/spec/v0.1/artifact-contract.schema.json"
    )
    assert.equal(schema.properties.contractVersion.const, "0.1")
  })

  it("audits and recommends from the built artifact runtime", () => {
    const runtime = loadBuiltRuntime()
    const props = chartProps()
    const contract = explicitContract(runtime, props)
    const request = {
      component: "LineChart",
      props,
      data: props.data,
      contract,
      policy: "exploratory",
      now: "2026-09-03T00:00:00Z"
    }

    const audit = runCli("--audit-artifact", request, { json: true })
    assert.equal(audit.status, 0, audit.stderr || audit.stdout)
    const auditPayload = parseJson(audit)
    assert.equal(auditPayload.policy.id, "exploratory")
    assert.equal(auditPayload.validation.artifact.valid, true)
    assert.match(auditPayload.status, /^(acceptable|conditional)$/)
    assert.equal(audit.stdout.includes(SAMPLE_SENTINEL), false)

    const recommendation = runCli("--recommend-representation", request)
    assert.equal(
      recommendation.status,
      0,
      recommendation.stderr || recommendation.stdout
    )
    const recommendationPayload = parseJson(recommendation)
    assert.equal(recommendationPayload.policy.id, "exploratory")
    assert.match(recommendationPayload.status, /^(recommended|conditional)$/)
    assert.ok(recommendationPayload.selected.kind)
    assert.equal(recommendation.stdout.includes(SAMPLE_SENTINEL), false)
  })

  it("forwards the explicit reference clock when recommending", () => {
    const runtime = loadBuiltRuntime()
    const props = chartProps()
    const request = {
      component: "LineChart",
      props,
      data: props.data,
      contract: reviewedGeneratedContract(runtime, props),
      policy: "agent-generated",
      now: "2026-09-03T00:00:00Z"
    }

    const withClock = runCli("--recommend-representation", request)
    assert.equal(withClock.status, 0, withClock.stderr || withClock.stdout)
    assert.notEqual(parseJson(withClock).selected.kind, "no-claim")

    const withoutClock = runCli("--recommend-representation", {
      ...request,
      now: undefined
    })
    assert.equal(withoutClock.status, 1, withoutClock.stderr)
    assert.equal(parseJson(withoutClock).selected.kind, "no-claim")
  })

  it("applies and reports bounded policy exceptions across commands", () => {
    const runtime = loadBuiltRuntime()
    const props = chartProps()
    const contract = reviewedGeneratedContract(runtime, props)
    const now = "2026-09-03T00:00:00Z"
    const renderException = {
      rule: "requireRenderEvidence",
      rationale: "Renderer integration is tracked in this bounded review.",
      owner: "release-review",
      reviewAt: "2026-09-05T00:00:00Z"
    }
    const common = {
      component: "LineChart",
      props,
      data: props.data,
      contract,
      policy: "agent-generated",
      exceptions: [renderException],
      now
    }

    const audit = runCli("--audit-artifact", common, { json: true })
    assert.equal(audit.status, 0, audit.stderr || audit.stdout)
    assert.deepEqual(parseJson(audit).policy.appliedExceptions, [
      renderException
    ])

    const strictPositive = runCli(
      "--audit-artifact",
      { ...common, exceptions: [] },
      { json: true }
    )
    assert.equal(
      strictPositive.status,
      0,
      strictPositive.stderr || strictPositive.stdout
    )
    const strictPayload = parseJson(strictPositive)
    assert.notEqual(strictPayload.status, "refuse")
    assert.equal(strictPayload.render.component, "LineChart")
    assert.ok(
      strictPayload.obligations.some(
        ({ id, status }) =>
          id === "policy.render-evidence-required" && status === "pass"
      )
    )

    const repair = runCli("--repair-artifact", common)
    assert.equal(repair.status, 0, repair.stderr || repair.stdout)
    assert.deepEqual(parseJson(repair).after.policy.appliedExceptions, [
      renderException
    ])

    const explanation = runCli("--explain-refusal", common, { json: true })
    assert.equal(
      explanation.status,
      0,
      explanation.stderr || explanation.stdout
    )
    assert.equal(parseJson(explanation).status, "not-refused")
    assert.deepEqual(parseJson(explanation).policy.appliedExceptions, [
      renderException
    ])

    const reviewException = {
      rule: "requireReviewForModelClaims",
      rationale: "A named reviewer will complete this bounded internal review.",
      owner: "release-review",
      expiresAt: "2026-09-05T00:00:00Z"
    }
    const recommendation = runCli("--recommend-representation", {
      ...common,
      contract: {
        ...contract,
        claims: contract.claims.map((claim) => ({
          ...claim,
          review: undefined
        }))
      },
      exceptions: [reviewException]
    })
    assert.equal(
      recommendation.status,
      0,
      recommendation.stderr || recommendation.stdout
    )
    assert.notEqual(parseJson(recommendation).selected.kind, "no-claim")
    assert.deepEqual(parseJson(recommendation).policy.appliedExceptions, [
      reviewException
    ])

    const expiredException = {
      ...reviewException,
      reviewAt: "2026-09-02T00:00:00Z"
    }
    const expired = runCli(
      "--audit-artifact",
      {
        ...common,
        contract: {
          ...contract,
          claims: contract.claims.map((claim) => ({
            ...claim,
            review: undefined
          }))
        },
        exceptions: [expiredException]
      },
      { json: true }
    )
    assert.equal(expired.status, 1, expired.stderr)
    assert.deepEqual(parseJson(expired).policy.rejectedExceptions, [
      expiredException
    ])
  })

  it("applies identity-only repairs and reports privacy-preserving omissions", () => {
    const runtime = loadBuiltRuntime()
    const privateProps = chartProps([
      { month: 1, value: 4, privateNote: DATA_SENTINEL },
      { month: 2, value: 7, privateNote: DATA_SENTINEL }
    ])
    const complete = explicitContract(runtime, privateProps)
    const contract = {
      ...complete,
      artifact: {
        id: complete.artifact.id,
        kind: complete.artifact.kind,
        title: complete.artifact.title
      }
    }
    const result = runCli("--repair-artifact", {
      component: "LineChart",
      props: privateProps,
      data: privateProps.data,
      contract,
      policy: "exploratory",
      now: "2026-09-03T00:00:00Z",
      applySafeIdentityRepairs: true
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.equal(result.stdout.includes(SAMPLE_SENTINEL), false)
    assert.equal(result.stdout.includes(DATA_SENTINEL), false)
    const payload = parseJson(result)
    assert.match(payload.status, /^(repaired|requires-input)$/)
    assert.equal(payload.contract.artifact.component, "LineChart")
    assert.match(payload.contract.artifact.configFingerprint, /^sha256:/)
    assert.match(payload.contract.artifact.dataFingerprint, /^sha256:/)
    assert.equal(payload.contract.evidence[0].sample, undefined)
    const omittedPaths = collectOmittedPaths(payload)
    assert.ok(
      omittedPaths.some(
        (path) => path.includes("evidence") && path.includes("sample")
      ),
      `missing evidence-sample omission in ${JSON.stringify(omittedPaths)}`
    )
    assert.ok(
      omittedPaths.some(
        (path) => path.includes("props") && path.includes("data")
      ),
      `missing bulk-props omission in ${JSON.stringify(omittedPaths)}`
    )
  })

  it("refuses empty claim ledgers and cannot repair a mismatched data binding", () => {
    const runtime = loadBuiltRuntime()
    const props = chartProps()
    const contract = explicitContract(runtime, props)
    for (const flag of ["--audit-artifact", "--recommend-representation"]) {
      const result = runCli(flag, {
        component: "LineChart", props, data: props.data,
        contract: { ...contract, claims: [] }, policy: "editorial",
        now: "2026-09-03T00:00:00Z"
      }, { json: true })
      assert.equal(result.status, 1, result.stderr || result.stdout)
      assert.equal(parseJson(result).status, "refuse")
    }
    const changed = chartProps([...props.data].reverse())
    const repair = runCli("--repair-artifact", {
      component: "LineChart", props: changed, data: changed.data,
      contract, policy: "exploratory", applySafeIdentityRepairs: true
    })
    assert.equal(repair.status, 1, repair.stderr || repair.stdout)
    const payload = parseJson(repair)
    assert.equal(payload.after.status, "refuse")
    assert.equal(payload.contract.artifact.dataFingerprint, contract.artifact.dataFingerprint)
    assert.ok(payload.ledger.some((entry) => entry.path === "artifact.dataFingerprint" && !entry.applied))
  })

  it("returns nonzero status for audit, recommendation, and explained refusal", () => {
    const runtime = loadBuiltRuntime()
    const props = chartProps()
    const supported = explicitContract(runtime, props)
    const contract = {
      ...supported,
      claims: supported.claims.map((claim) => ({
        ...claim,
        status: "supported",
        evidenceIds: []
      }))
    }
    const request = {
      component: "LineChart",
      props,
      data: props.data,
      contract,
      policy: "agent-generated",
      now: "2026-09-03T00:00:00Z"
    }

    const audit = runCli("--audit-artifact", request, { json: true })
    assert.equal(audit.status, 1, audit.stderr)
    const auditPayload = parseJson(audit)
    assert.equal(auditPayload.status, "refuse")
    assert.ok(
      auditPayload.obligations.some(({ id }) =>
        id.startsWith("claims.unsourced-supported")
      )
    )

    const recommendation = runCli("--recommend-representation", request)
    assert.equal(recommendation.status, 1, recommendation.stderr)
    assert.deepEqual(parseJson(recommendation).selected.kind, "no-claim")

    const explanation = runCli("--explain-refusal", request)
    assert.equal(explanation.status, 1, explanation.stderr)
    assert.match(explanation.stdout, /refused this artifact/i)
    assert.equal(explanation.stdout.includes(SAMPLE_SENTINEL), false)
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  adoptRuleIntoBaseline,
  calculateRuleScore,
  evidenceDigest,
  validateEvidenceCursor,
  validateCustomLintRegistry
} from "../lib/custom-lint-lifecycle.mjs"

const policy = {
  initialScore: 5,
  promotionScore: 10,
  retirementScore: 0,
  minimumPromotionEvidence: 5,
  evidenceWeights: {
    confirmed_bug: 1,
    prevented_regression: 1,
    false_positive: -2,
    unsafe_remediation: -3,
    excessive_noise: -1,
    redundant: -2,
    rule_revision: 0
  }
}

function event(kind, index) {
  return {
    kind,
    date: "2026-08-16",
    reference: `PR-${index}`,
    note: `Reviewable evidence observation number ${index}`
  }
}

function registry(rule) {
  return { schemaVersion: 1, policy, rules: [rule] }
}

function candidate(overrides = {}) {
  return {
    id: "semiotic/example-rule",
    status: "unstable",
    score: 5,
    introducedAt: "2026-08-16",
    implementation: "unused-in-unit-test.mjs",
    tests: ["unused-in-unit-test.test.mjs"],
    rationale: "A sufficiently detailed repository-specific contract.",
    evidence: [],
    ...overrides
  }
}

describe("custom lint lifecycle", () => {
  it("starts candidates at five and weighs false positives more heavily", () => {
    assert.equal(calculateRuleScore(registry(candidate()), candidate()), 5)
    const rule = candidate({ evidence: [event("confirmed_bug", 1), event("false_positive", 2)] })
    assert.equal(calculateRuleScore(registry(rule), rule), 4)
  })

  it("allows combined dispositions under one review reference", () => {
    const bug = event("confirmed_bug", 1)
    const revision = { ...event("rule_revision", 1), note: "The same review also clarified the rule remediation." }
    const rule = candidate({ score: 6, evidence: [bug, revision] })
    assert.deepEqual(validateCustomLintRegistry(registry(rule)), [])
  })

  it("requires distinct positive evidence before official promotion", () => {
    const evidence = Array.from({ length: 5 }, (_, index) => event("confirmed_bug", index + 1))
    const rule = candidate({ status: "official", score: 10, evidence })
    assert.deepEqual(validateCustomLintRegistry(registry(rule), { baselineCounts: {} }), [])
    assert.match(
      validateCustomLintRegistry(registry(rule), { baselineCounts: { [rule.id]: 1 } }).join("\n"),
      /zero grandfathered findings/
    )
  })

  it("demotes an official rule after contrary evidence", () => {
    const evidence = Array.from({ length: 5 }, (_, index) => event("confirmed_bug", index + 1))
    evidence.push(event("false_positive", 6))
    const rule = candidate({ status: "official", score: 8, evidence })
    assert.match(validateCustomLintRegistry(registry(rule)).join("\n"), /official rules must have score 10/)
    rule.status = "unstable"
    assert.deepEqual(validateCustomLintRegistry(registry(rule)), [])
  })

  it("requires retirement when evidence reaches zero", () => {
    const evidence = [event("unsafe_remediation", 1), event("unsafe_remediation", 2)]
    const rule = candidate({ score: 0, evidence })
    assert.match(validateCustomLintRegistry(registry(rule)).join("\n"), /requires retired status/)
    rule.status = "retired"
    assert.deepEqual(validateCustomLintRegistry(registry(rule)), [])
  })

  it("makes evidence append-only after the baseline cursor", () => {
    const first = event("confirmed_bug", 1)
    const rule = candidate({ score: 6, evidence: [first] })
    const cursor = { [rule.id]: { count: 1, digest: evidenceDigest(rule.evidence) } }
    const updated = { ...rule, score: 7, evidence: [first, event("prevented_regression", 2)] }

    assert.deepEqual(validateEvidenceCursor(registry(updated), cursor), [])
    const rewritten = {
      ...updated,
      evidence: [{ ...first, note: "Edited historical evidence note" }, updated.evidence[1]]
    }
    assert.match(
      validateEvidenceCursor(registry(rewritten), cursor).join("\n"),
      /edited or reordered/
    )
    const removed = { ...rule, evidence: [] }
    assert.match(
      validateEvidenceCursor(registry(removed), cursor).join("\n"),
      /evidence was removed/
    )
  })
})

describe("custom lint rule adoption", () => {
  const ruleIdOf = key => key.split(" :: ")[0]
  const existing = candidate({ id: "semiotic/existing-rule" })
  const adopted = candidate({ id: "semiotic/new-rule", evidence: [event("confirmed_bug", 1)], score: 6 })
  const baseline = {
    schemaVersion: 1,
    initialized: true,
    evidenceCursor: { [existing.id]: { count: 0, digest: evidenceDigest([]) } },
    findings: { "semiotic/existing-rule :: a.ts :: m :: x": 1 }
  }
  const twoRules = { schemaVersion: 1, policy, rules: [existing, adopted] }

  it("records the cursor and grandfathers only the adopted rule's findings", () => {
    const result = adoptRuleIntoBaseline({
      registry: twoRules,
      baseline,
      ruleId: adopted.id,
      currentFindings: {
        "semiotic/existing-rule :: a.ts :: m :: x": 1,
        "semiotic/new-rule :: b.ts :: m :: y": 2
      },
      ruleIdOf
    })
    assert.deepEqual(result.errors, [])
    assert.deepEqual(result.baseline.evidenceCursor[adopted.id], { count: 1, digest: evidenceDigest(adopted.evidence) })
    assert.equal(result.baseline.findings["semiotic/new-rule :: b.ts :: m :: y"], 2)
    assert.deepEqual(validateEvidenceCursor(twoRules, result.baseline.evidenceCursor), [])
  })

  it("refuses re-adoption, unknown rules, and drift in other rules", () => {
    const adoptedOnce = { ...baseline, evidenceCursor: { ...baseline.evidenceCursor, [adopted.id]: { count: 1, digest: "x" } } }
    assert.match(adoptRuleIntoBaseline({ registry: twoRules, baseline: adoptedOnce, ruleId: adopted.id, currentFindings: baseline.findings, ruleIdOf }).errors.join("\n"), /already adopted/)
    assert.match(adoptRuleIntoBaseline({ registry: twoRules, baseline, ruleId: "semiotic/missing", currentFindings: baseline.findings, ruleIdOf }).errors.join("\n"), /not in the registry/)
    assert.match(adoptRuleIntoBaseline({ registry: twoRules, baseline, ruleId: adopted.id, currentFindings: {}, ruleIdOf }).errors.join("\n"), /findings differ/)
  })

  it("refuses to grandfather findings for an official rule", () => {
    const official = { ...adopted, status: "official" }
    const result = adoptRuleIntoBaseline({
      registry: { schemaVersion: 1, policy, rules: [existing, official] },
      baseline,
      ruleId: official.id,
      currentFindings: { ...baseline.findings, "semiotic/new-rule :: b.ts :: m :: y": 1 },
      ruleIdOf
    })
    assert.match(result.errors.join("\n"), /official rule cannot adopt/)
  })
})

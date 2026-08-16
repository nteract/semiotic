import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateRuleScore,
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
})

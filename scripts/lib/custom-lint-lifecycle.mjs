import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

export const ACTIVE_STATUSES = new Set(["unstable", "official"])
export const RULE_CHANGE_EVIDENCE = new Set([
  "false_positive",
  "unsafe_remediation",
  "excessive_noise",
  "redundant",
  "rule_revision"
])

export function evidenceDigest(evidence = []) {
  return createHash("sha256").update(JSON.stringify(evidence)).digest("hex").slice(0, 16)
}

/** Ensure historical evidence remains append-only after a baseline is recorded. */
export function validateEvidenceCursor(registry, cursorByRule = {}) {
  const errors = []
  const knownIds = new Set((registry.rules || []).map(rule => rule.id))
  for (const [id, cursor] of Object.entries(cursorByRule)) {
    if (!knownIds.has(id)) errors.push(`evidence cursor contains unknown rule ${id}`)
    if (!Number.isInteger(cursor?.count) || cursor.count < 0 || typeof cursor?.digest !== "string") {
      errors.push(`${id}: evidence cursor must include a non-negative count and digest`)
    }
  }
  for (const rule of registry.rules || []) {
    const cursor = cursorByRule[rule.id]
    if (!cursor) {
      errors.push(`${rule.id}: evidence cursor is missing`)
      continue
    }
    const evidence = rule.evidence || []
    if (!Number.isInteger(cursor.count) || cursor.count < 0 || typeof cursor.digest !== "string") continue
    if (evidence.length < cursor.count) {
      errors.push(`${rule.id}: evidence was removed after the recorded cursor`)
      continue
    }
    if (evidenceDigest(evidence.slice(0, cursor.count)) !== cursor.digest) {
      errors.push(`${rule.id}: evidence before the recorded cursor was edited or reordered`)
    }
  }
  return errors
}

export function calculateRuleScore(registry, rule) {
  const { initialScore, promotionScore, retirementScore, evidenceWeights } = registry.policy
  let score = initialScore
  for (const event of rule.evidence || []) {
    score += evidenceWeights[event.kind] ?? 0
    score = Math.max(retirementScore, Math.min(promotionScore, score))
  }
  return score
}

export function promotionEvidence(rule) {
  const positive = (rule.evidence || []).filter(event =>
    event.kind === "confirmed_bug" || event.kind === "prevented_regression"
  )
  return {
    count: positive.length,
    distinctReferences: new Set(positive.map(event => event.reference)).size
  }
}

export function validateCustomLintRegistry(registry, options = {}) {
  const errors = []
  const repoRoot = options.repoRoot
  const baselineCounts = options.baselineCounts || {}
  if (registry.schemaVersion !== 1) errors.push("registry.schemaVersion must be 1")

  const policy = registry.policy || {}
  if (policy.initialScore !== 5 || policy.promotionScore !== 10 || policy.retirementScore !== 0) {
    errors.push("policy scores must use the bounded 5 -> 10 promotion and 5 -> 0 retirement model")
  }
  if (!Number.isInteger(policy.minimumPromotionEvidence) || policy.minimumPromotionEvidence < 5) {
    errors.push("policy.minimumPromotionEvidence must be at least 5")
  }

  const ids = new Set()
  for (const rule of registry.rules || []) {
    const label = rule.id || "<missing rule id>"
    if (!/^semiotic\/[a-z0-9-]+$/.test(label)) errors.push(`${label}: invalid rule id`)
    if (ids.has(label)) errors.push(`${label}: duplicate rule id`)
    ids.add(label)
    if (!["unstable", "official", "retired"].includes(rule.status)) {
      errors.push(`${label}: status must be unstable, official, or retired`)
    }
    if (typeof rule.rationale !== "string" || rule.rationale.length < 20) {
      errors.push(`${label}: rationale must explain the repository contract`)
    }

    const evidenceKeys = new Set()
    for (const event of rule.evidence || []) {
      if (!Object.hasOwn(policy.evidenceWeights || {}, event.kind)) {
        errors.push(`${label}: unknown evidence kind ${event.kind}`)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || "")) {
        errors.push(`${label}: evidence dates must use YYYY-MM-DD`)
      }
      if (typeof event.reference !== "string" || event.reference.length < 3) {
        errors.push(`${label}: evidence requires a reviewable issue, PR, or commit reference`)
      } else if (evidenceKeys.has(`${event.kind}:${event.reference}`)) {
        errors.push(`${label}: ${event.kind} evidence reference ${event.reference} is duplicated`)
      }
      evidenceKeys.add(`${event.kind}:${event.reference}`)
      if (typeof event.note !== "string" || event.note.length < 20) {
        errors.push(`${label}: evidence notes must explain what was observed`)
      }
    }

    const calculatedScore = calculateRuleScore(registry, rule)
    if (rule.score !== calculatedScore) {
      errors.push(`${label}: score ${rule.score} does not match evidence-derived score ${calculatedScore}`)
    }
    if (rule.status === "retired" && calculatedScore !== policy.retirementScore) {
      errors.push(`${label}: retired rules must have score ${policy.retirementScore}`)
    }
    if (rule.status !== "retired" && calculatedScore === policy.retirementScore) {
      errors.push(`${label}: score ${policy.retirementScore} requires retired status`)
    }
    if (rule.status === "official") {
      const evidence = promotionEvidence(rule)
      if (calculatedScore !== policy.promotionScore) {
        errors.push(`${label}: official rules must have score ${policy.promotionScore}`)
      }
      if (
        evidence.count < policy.minimumPromotionEvidence ||
        evidence.distinctReferences < policy.minimumPromotionEvidence
      ) {
        errors.push(`${label}: promotion requires ${policy.minimumPromotionEvidence} positive events from distinct references`)
      }
      if ((baselineCounts[label] || 0) > 0) {
        errors.push(`${label}: promotion requires zero grandfathered findings`)
      }
    }

    if (ACTIVE_STATUSES.has(rule.status) && repoRoot) {
      if (!rule.implementation || !existsSync(resolve(repoRoot, rule.implementation))) {
        errors.push(`${label}: active rule implementation is missing`)
      }
      if (!Array.isArray(rule.tests) || rule.tests.length === 0) {
        errors.push(`${label}: active rules require focused tests`)
      } else {
        for (const test of rule.tests) {
          if (!existsSync(resolve(repoRoot, test))) errors.push(`${label}: missing rule test ${test}`)
        }
      }
    }
  }

  for (const id of Object.keys(baselineCounts)) {
    if (!ids.has(id)) errors.push(`baseline contains unknown rule ${id}`)
  }
  return errors
}

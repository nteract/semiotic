export const groundingScoringRevision =
  "semiotic-grounding-score-2026-07-27"

const abstentionPattern =
  /\b(cannot determine|can't determine|cannot be determined|can't be determined|could not be determined|cannot infer|can't infer|cannot establish|can't establish|not (?:provided|shown|available)|does not (?:show|provide|identify|indicate|explain|establish|support|state|specify|contain|report)|doesn't (?:show|provide|identify|indicate|explain|establish|support|state|specify|contain|report)|unknown|insufficient (?:data|information|evidence)|no (?:data|value|values|reason|cause|evidence|information) (?:(?:is|are|was|were) )?(?:provided|shown|available|given))\b/i

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function containsAbstention(answer) {
  return abstentionPattern.test(answer)
}

function containsExpectedTerm(answer, alternative) {
  const normalizedAnswer = answer.toLowerCase().replace(/\s+/g, " ")
  const normalizedTerm = alternative.toLowerCase().trim()
  if (/^\d+(?:\.\d+)?$/.test(normalizedTerm)) {
    return new RegExp(
      `(?<![\\d.])${escapeRegExp(normalizedTerm)}(?!\\d|\\.\\d)`
    ).test(normalizedAnswer)
  }
  if (/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(normalizedTerm)) {
    return new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}($|[^a-z0-9])`
    ).test(normalizedAnswer)
  }
  return normalizedAnswer.includes(normalizedTerm)
}

export function scoreGroundingAnswer(
  expected,
  answer,
  submissionProvided
) {
  if (answer == null) {
    return submissionProvided
      ? { status: "missing", passed: false }
      : { status: "pending", passed: null }
  }
  const abstained = containsAbstention(answer)
  if (expected.abstain) {
    return {
      status: "scored",
      passed: abstained,
      abstained,
    }
  }
  const matched = expected.required.map((alternatives) =>
    alternatives.some((term) => containsExpectedTerm(answer, term))
  )
  return {
    status: "scored",
    passed: !abstained && matched.every(Boolean),
    abstained,
    matched,
  }
}

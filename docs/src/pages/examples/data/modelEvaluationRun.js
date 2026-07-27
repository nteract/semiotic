export const MODEL_EVALUATION_RUN = Object.freeze({
  capturedAt: "2026-07-27",
  fixtureRevision: "semiotic-grounding-2026-07-26",
  firstTryRevision: "semiotic-first-try-2026-07-26",
  scoringRevision: "semiotic-grounding-score-2026-07-27",
  requestCount: 516,
  requestsPerModel: 172,
  groundingRequestsPerModel: 150,
  firstTryRequestsPerModel: 22,
  durationMinutes: 17,
  estimatedUsd: 2.27921653,
})

export const MODEL_ORDER = Object.freeze(["Sol", "Terra", "Luna"])

export const CONDITION_ORDER = Object.freeze([
  "png-only",
  "png-plus-grounding",
  "grounding-only",
])

export const CONDITION_LABELS = Object.freeze({
  "png-only": "PNG only",
  "png-plus-grounding": "PNG + grounding",
  "grounding-only": "Grounding only",
})

export const CONDITION_COLORS = Object.freeze({
  "PNG only": "#2f6578",
  "PNG + grounding": "#d5633f",
  "Grounding only": "#9b8f74",
})

export const MODEL_COLORS = Object.freeze({
  Sol: "#d59622",
  Terra: "#3f866c",
  Luna: "#775d9b",
})

export const GROUNDING_METRICS = Object.freeze([
  {
    id: "overall",
    label: "All questions",
    shortLabel: "Overall",
    denominator: 50,
    note: "Twenty answerable questions plus thirty questions the evidence cannot answer.",
    finding:
      "Combined evidence moved Sol from 43 to 45 correct answers. Terra and Luna tied their PNG-only totals.",
  },
  {
    id: "answerable",
    label: "Questions with an answer",
    shortLabel: "Answerable",
    denominator: 20,
    note: "Questions whose labels or values are present in the supplied evidence.",
    finding:
      "The payload did not add a correct answer. Sol and Terra each lost one; Luna was unchanged.",
  },
  {
    id: "unanswerable",
    label: "Questions requiring restraint",
    shortLabel: "Correct abstention",
    denominator: 30,
    note: "Questions about causes, forecasts, provenance, or other facts the evidence does not contain.",
    finding:
      "This is where Sol improved: combined evidence reached 30 of 30 correct abstentions, three more than PNG alone.",
  },
])

export const GROUNDING_SCORES = Object.freeze([
  {
    model: "Sol",
    modelId: "gpt-5.6-sol",
    condition: "png-only",
    overall: 43,
    answerable: 16,
    unanswerable: 27,
  },
  {
    model: "Sol",
    modelId: "gpt-5.6-sol",
    condition: "png-plus-grounding",
    overall: 45,
    answerable: 15,
    unanswerable: 30,
  },
  {
    model: "Sol",
    modelId: "gpt-5.6-sol",
    condition: "grounding-only",
    overall: 42,
    answerable: 12,
    unanswerable: 30,
  },
  {
    model: "Terra",
    modelId: "gpt-5.6-terra",
    condition: "png-only",
    overall: 45,
    answerable: 16,
    unanswerable: 29,
  },
  {
    model: "Terra",
    modelId: "gpt-5.6-terra",
    condition: "png-plus-grounding",
    overall: 45,
    answerable: 15,
    unanswerable: 30,
  },
  {
    model: "Terra",
    modelId: "gpt-5.6-terra",
    condition: "grounding-only",
    overall: 42,
    answerable: 12,
    unanswerable: 30,
  },
  {
    model: "Luna",
    modelId: "gpt-5.6-luna",
    condition: "png-only",
    overall: 44,
    answerable: 15,
    unanswerable: 29,
  },
  {
    model: "Luna",
    modelId: "gpt-5.6-luna",
    condition: "png-plus-grounding",
    overall: 44,
    answerable: 15,
    unanswerable: 29,
  },
  {
    model: "Luna",
    modelId: "gpt-5.6-luna",
    condition: "grounding-only",
    overall: 41,
    answerable: 12,
    unanswerable: 29,
  },
])

export const FIRST_TRY_MODELS = Object.freeze([
  {
    model: "Sol",
    modelId: "gpt-5.6-sol",
    passed: 21,
    attempted: 22,
    estimatedUsd: 1.42168725,
    averageLatencyMs: 1854,
    maxLatencyMs: 6265,
  },
  {
    model: "Terra",
    modelId: "gpt-5.6-terra",
    passed: 17,
    attempted: 22,
    estimatedUsd: 0.63749808,
    averageLatencyMs: 1308,
    maxLatencyMs: 3286,
  },
  {
    model: "Luna",
    modelId: "gpt-5.6-luna",
    passed: 17,
    attempted: 22,
    estimatedUsd: 0.2200312,
    averageLatencyMs: 1208,
    maxLatencyMs: 3895,
  },
])

export const FIRST_TRY_FAILURES = Object.freeze([
  {
    fixtureId: "gauge-static",
    label: "Focal SLA value",
    models: ["Sol", "Luna"],
    lesson:
      "Sol chose the real BigNumber component, but the render oracle could not prove it. Luna chose GaugeChart and rendered no marks.",
    kind: "surface seam",
  },
  {
    fixtureId: "line-push",
    label: "Line, then push",
    models: ["Terra", "Luna"],
    lesson: "Both proposals reached the right chart family but missed a valid push-ready contract.",
    kind: "push contract",
  },
  {
    fixtureId: "scatter-push",
    label: "Scatter, then push",
    models: ["Terra"],
    lesson: "A serial string formatter reached a callback-only render path.",
    kind: "formatter behavior",
  },
  {
    fixtureId: "bubble-static",
    label: "Bubble comparison",
    models: ["Terra"],
    lesson: "The same formatter ambiguity failed a static XY proposal.",
    kind: "formatter behavior",
  },
  {
    fixtureId: "symbol-map-static",
    label: "Incident map",
    models: ["Terra", "Luna"],
    lesson: "The visible marks rendered, but the submitted geo props did not satisfy validation.",
    kind: "geo contract",
  },
  {
    fixtureId: "galton-static",
    label: "Observed values on a board",
    models: ["Luna"],
    lesson: "The physics scene rendered marks while two authored props remained invalid.",
    kind: "physics contract",
  },
  {
    fixtureId: "unit-pile-push",
    label: "Queued work, then push",
    models: ["Terra", "Luna"],
    lesson: "The pile rendered, but its push and physics props accumulated validation failures.",
    kind: "physics + push",
  },
])

export const SCORER_AUDIT_CASES = Object.freeze([
  {
    id: "label-leakage",
    label: "Expected label leakage",
    expected: "Which storage category is largest? Expected: Images.",
    answer:
      "Cannot determine; the chart labels Images, Logs, and Backups but provides no values or visible size differences.",
    before: "pass",
    after: "fail",
    reason: "Repeating “Images” is not an answer when the response explicitly abstains.",
  },
  {
    id: "passive-abstention",
    label: "Passive abstention",
    expected: "How severe were the incidents? Expected: abstain.",
    answer: "Incident severity cannot be determined from the chart. It reports counts only.",
    before: "fail",
    after: "pass",
    reason: "“Cannot be determined” is an explicit evidence limit, even in passive voice.",
  },
  {
    id: "numeric-substring",
    label: "Numeric substring",
    expected: "How many rows? Expected: 4.",
    answer: "The largest payload is 64 and its latency is 142.",
    before: "pass",
    after: "fail",
    reason: "The digit 4 inside 64 or 142 is not the number four.",
  },
])

export function groundingRowsForMetric(metricId) {
  const metric = GROUNDING_METRICS.find((candidate) => candidate.id === metricId)
  if (!metric) throw new Error(`Unknown grounding metric: ${metricId}`)
  return GROUNDING_SCORES.map((row) => ({
    ...row,
    conditionLabel: CONDITION_LABELS[row.condition],
    passed: row[metric.id],
    denominator: metric.denominator,
  }))
}

export function combinedGroundingDeltas(model) {
  const png = GROUNDING_SCORES.find(
    (row) => row.model === model && row.condition === "png-only",
  )
  const combined = GROUNDING_SCORES.find(
    (row) => row.model === model && row.condition === "png-plus-grounding",
  )
  if (!png || !combined) throw new Error(`Missing grounding comparison for ${model}`)
  return Object.freeze({
    model,
    overall: combined.overall - png.overall,
    answerable: combined.answerable - png.answerable,
    unanswerable: combined.unanswerable - png.unanswerable,
  })
}

export function failedFirstTryCount(model) {
  return FIRST_TRY_FAILURES.filter((failure) => failure.models.includes(model)).length
}

import { describe, expect, it } from "vitest"
import {
  CONDITION_ORDER,
  FIRST_TRY_MODELS,
  GROUNDING_SCORES,
  MODEL_EVALUATION_RUN,
  MODEL_ORDER,
  combinedGroundingDeltas,
  failedFirstTryCount,
  groundingRowsForMetric,
} from "./modelEvaluationRun"

describe("model evaluation example data", () => {
  it("keeps the request ledger and condition matrix internally consistent", () => {
    expect(MODEL_EVALUATION_RUN.requestCount).toBe(
      MODEL_EVALUATION_RUN.requestsPerModel * MODEL_ORDER.length,
    )
    expect(MODEL_EVALUATION_RUN.requestsPerModel).toBe(
      MODEL_EVALUATION_RUN.groundingRequestsPerModel +
        MODEL_EVALUATION_RUN.firstTryRequestsPerModel,
    )
    expect(GROUNDING_SCORES).toHaveLength(MODEL_ORDER.length * CONDITION_ORDER.length)
  })

  it("preserves answerable plus unanswerable as the overall score", () => {
    for (const row of GROUNDING_SCORES) {
      expect(row.answerable + row.unanswerable).toBe(row.overall)
    }
    expect(groundingRowsForMetric("answerable").every((row) => row.denominator === 20)).toBe(
      true,
    )
  })

  it("pins the combined-grounding tradeoff rather than only its aggregate", () => {
    expect(combinedGroundingDeltas("Sol")).toEqual({
      model: "Sol",
      overall: 2,
      answerable: -1,
      unanswerable: 3,
    })
    expect(combinedGroundingDeltas("Terra")).toEqual({
      model: "Terra",
      overall: 0,
      answerable: -1,
      unanswerable: 1,
    })
    expect(combinedGroundingDeltas("Luna")).toEqual({
      model: "Luna",
      overall: 0,
      answerable: 0,
      unanswerable: 0,
    })
  })

  it("matches first-try failures to each model's published pass count", () => {
    for (const row of FIRST_TRY_MODELS) {
      expect(failedFirstTryCount(row.model)).toBe(row.attempted - row.passed)
    }
  })
})

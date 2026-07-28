import assert from "node:assert/strict"
import test from "node:test"
import {
  summarizeFirstTryRows,
  summarizeGroundingRows
} from "./lib/ai-eval-report-summary.mjs"

test("targeted first-try summaries exclude omitted model fixtures", () => {
  const rows = [
    {
      kind: "generation",
      mode: "static",
      source: "model-submission",
      firstAttempt: { passed: true },
      postRepair: null
    },
    {
      kind: "generation",
      mode: "push",
      source: "model-submission",
      firstAttempt: { passed: false },
      postRepair: { passed: true }
    },
    {
      kind: "generation",
      mode: "static",
      source: "committed-reference",
      firstAttempt: { passed: false },
      postRepair: null
    },
    {
      kind: "guard",
      mode: "static",
      source: "committed-reference",
      firstAttempt: { passed: true },
      postRepair: null
    }
  ]

  assert.deepEqual(summarizeFirstTryRows(rows, true), {
    generationFixtures: 2,
    availableGenerationFixtures: 3,
    guardFixtures: 1,
    staticFixtures: 1,
    pushFixtures: 1,
    firstAttemptPassed: 1,
    postRepairAttempted: 1,
    postRepairPassed: 1
  })
})

test("targeted grounding summaries count only submitted scored rows", () => {
  const summary = summarizeGroundingRows(
    ["png-only", "grounding-only"],
    [
      {
        condition: "png-only",
        status: "scored",
        passed: true,
        answerable: true
      },
      {
        condition: "png-only",
        status: "missing",
        passed: false,
        answerable: false
      },
      {
        condition: "grounding-only",
        status: "scored",
        passed: true,
        answerable: false
      },
      {
        condition: "grounding-only",
        status: "missing",
        passed: false,
        answerable: true
      }
    ]
  )

  assert.equal(summary.trials, 2)
  assert.equal(summary.availableTrials, 4)
  assert.equal(summary.unscored, 2)
  assert.equal(summary.missingSubmissions, 2)
  assert.deepEqual(summary.conditions["png-only"], {
    trials: 1,
    availableTrials: 2,
    unscored: 1,
    missingSubmissions: 1,
    scored: 1,
    passed: 1,
    accuracy: 1,
    unanswerableTrials: 0
  })
  assert.equal(summary.conditions["grounding-only"].unanswerableTrials, 1)
})

test("grounding trials stay consistent with their conditions before results land", () => {
  const summary = summarizeGroundingRows(
    ["png-only", "grounding-only"],
    [
      {
        condition: "png-only",
        status: "pending",
        passed: null,
        answerable: true
      },
      {
        condition: "grounding-only",
        status: "pending",
        passed: null,
        answerable: false
      }
    ]
  )

  assert.equal(summary.trials, 0)
  assert.equal(
    summary.trials,
    Object.values(summary.conditions).reduce(
      (total, condition) => total + condition.trials,
      0
    )
  )
  assert.equal(summary.availableTrials, 2)
  assert.equal(summary.unscored, 2)
  assert.equal(summary.missingSubmissions, 0)
  assert.equal(summary.conditions["png-only"].unscored, 1)
  assert.equal(summary.conditions["png-only"].missingSubmissions, 0)
  assert.equal(summary.conditions["png-only"].accuracy, null)
})

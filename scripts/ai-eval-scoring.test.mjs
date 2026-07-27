import assert from "node:assert/strict"
import test from "node:test"
import {
  containsAbstention,
  scoreGroundingAnswer,
} from "./ai-eval-scoring.mjs"

test("recognizes explicit evidence limitations as abstentions", () => {
  assert.equal(
    containsAbstention(
      "The chart shows an association but does not establish causation."
    ),
    true
  )
  assert.equal(
    containsAbstention(
      "The chart reports counts only and does not provide incident severity."
    ),
    true
  )
  assert.equal(
    containsAbstention(
      "Incident severity cannot be determined from the chart."
    ),
    true
  )
  assert.equal(
    containsAbstention("Latency is 142 ms at the largest payload."),
    false
  )
})

test("does not credit expected labels inside an answerable abstention", () => {
  assert.deepEqual(
    scoreGroundingAnswer(
      { required: [["images"]] },
      "Cannot determine; Images is one of three labels but no sizes are shown.",
      true
    ),
    {
      status: "scored",
      passed: false,
      abstained: true,
      matched: [true],
    }
  )
})

test("matches numeric expectations at token boundaries", () => {
  assert.equal(
    scoreGroundingAnswer(
      { required: [["4", "four"]] },
      "The largest payload is 64 and latency is 142.",
      true
    ).passed,
    false
  )
  assert.equal(
    scoreGroundingAnswer(
      { required: [["4", "four"]] },
      "There are 4 observations.",
      true
    ).passed,
    true
  )
  assert.equal(
    scoreGroundingAnswer(
      { required: [["18"]] },
      "North has the highest revenue at 18.",
      true
    ).passed,
    true
  )
  assert.equal(
    scoreGroundingAnswer(
      { required: [["18"]] },
      "The value is 1.18.",
      true
    ).passed,
    false
  )
})

test("preserves pending and missing submission states", () => {
  assert.deepEqual(scoreGroundingAnswer({ abstain: true }, null, false), {
    status: "pending",
    passed: null,
  })
  assert.deepEqual(scoreGroundingAnswer({ abstain: true }, null, true), {
    status: "missing",
    passed: false,
  })
})

import assert from "node:assert/strict"
import test from "node:test"
import { scoreFirstTryProposal } from "./summarize-openai-ai-eval-trials.mjs"

const fixture = {
  mode: "static",
  expect: {
    validated: true,
    renderProven: true,
    noErrorDiagnostics: true,
  },
}

test("scoreFirstTryProposal accepts native BigNumber render evidence", () => {
  const result = scoreFirstTryProposal(fixture, {
    component: "BigNumber",
    props: {
      value: 97,
      label: "SLA attainment",
      format: "number",
      suffix: "%",
      description: "Current SLA attainment.",
    },
  })
  assert.equal(result.validated, true)
  assert.equal(result.renderProven, true)
  assert.equal(result.markCount, 1)
  assert.equal(result.passed, true)
})

test("scoreFirstTryProposal rejects GaugeChart thresholds from BigNumber", () => {
  const result = scoreFirstTryProposal(fixture, {
    component: "GaugeChart",
    props: {
      value: 97,
      thresholds: [{ at: 99, level: "warning" }],
    },
  })
  assert.equal(result.validated, false)
  assert.equal(result.renderProven, false)
  assert.equal(result.passed, false)
})

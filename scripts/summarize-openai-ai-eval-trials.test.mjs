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

const pushFixture = {
  mode: "push",
  push: {
    requireOmitData: true,
    rows: [{ week: 4, users: 165 }],
  },
  expect: {
    validated: true,
    renderProven: true,
    noErrorDiagnostics: true,
    pushDataOmitted: true,
  },
}

test("scoreFirstTryProposal requires true push proposals to omit data", () => {
  const baseProposal = {
    component: "LineChart",
    props: {
      xAccessor: "week",
      yAccessor: "users",
      title: "Weekly active users",
    },
  }
  assert.equal(scoreFirstTryProposal(pushFixture, baseProposal).passed, true)
  const result = scoreFirstTryProposal(pushFixture, {
    ...baseProposal,
    props: { ...baseProposal.props, data: [{ week: 1, users: 120 }] },
  })
  assert.equal(result.pushDataOmitted, false)
  assert.equal(result.passed, false)
})

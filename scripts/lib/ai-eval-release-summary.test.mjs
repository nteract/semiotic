import assert from "node:assert/strict"
import test from "node:test"
import {
  sampleVariance,
  summarizeFixtures,
  summarizeGroups
} from "./ai-eval-release-summary.mjs"

const row = (model, trial, fixtureId, passed) => ({
  provider: "p",
  model,
  trial,
  fixtureId,
  passed
})
// Model a: "stable" always passes, "flaky" passes in two of three trials.
// Model b: one fixture that always fails.
const rows = [
  row("a", 1, "stable", true),
  row("a", 2, "stable", true),
  row("a", 3, "stable", true),
  row("a", 1, "flaky", true),
  row("a", 2, "flaky", false),
  row("a", 3, "flaky", true),
  row("b", 1, "stable", false),
  row("b", 2, "stable", false),
  row("b", 3, "stable", false)
]

test("sampleVariance is unbiased and undefined for a single value", () => {
  assert.equal(sampleVariance([1]), null)
  assert.equal(sampleVariance([1, 1, 1]), 0)
  assert.equal(sampleVariance([0, 1]), 0.5)
  assert.ok(Math.abs(sampleVariance([1, 0, 1]) - 1 / 3) < 1e-12)
})

test("fixtures report passes, pass rate, outcome variance, and instability", () => {
  assert.deepEqual(summarizeFixtures(rows, ["provider", "model"]), [
    {
      provider: "p",
      model: "a",
      fixtureId: "stable",
      trials: 3,
      passed: 3,
      passRate: 1,
      variance: 0,
      unstable: false
    },
    {
      provider: "p",
      model: "a",
      fixtureId: "flaky",
      trials: 3,
      passed: 2,
      passRate: 0.6667,
      variance: 0.3333,
      unstable: true
    },
    {
      provider: "p",
      model: "b",
      fixtureId: "stable",
      trials: 3,
      passed: 0,
      passRate: 0,
      variance: 0,
      unstable: false
    }
  ])
})

test("groups report each trial's pass rate and the spread across trials", () => {
  const [a, b] = summarizeGroups(rows, ["provider", "model"])
  assert.deepEqual(a.perTrial, [
    { trial: 1, cases: 2, passed: 2, passRate: 1 },
    { trial: 2, cases: 2, passed: 1, passRate: 0.5 },
    { trial: 3, cases: 2, passed: 2, passRate: 1 }
  ])
  assert.equal(a.trials, 3)
  assert.equal(a.passRate, 0.8333)
  assert.equal(a.minPassRate, 0.5)
  assert.equal(a.maxPassRate, 1)
  assert.equal(a.passRateStdDev, 0.2887)
  assert.equal(a.unstableFixtures, 1)
  assert.deepEqual(
    { passRate: b.passRate, stdDev: b.passRateStdDev, unstable: b.unstableFixtures },
    { passRate: 0, stdDev: 0, unstable: 0 }
  )
})

test("a single trial has a pass rate and no spread", () => {
  const [single] = summarizeGroups([row("a", 1, "stable", true)], ["model"])
  assert.equal(single.passRate, 1)
  assert.equal(single.passRateStdDev, null)
  assert.equal(
    summarizeFixtures([row("a", 1, "stable", true)], ["model"])[0].variance,
    null
  )
})

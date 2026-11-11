/**
 * Aggregation for repeated evaluation trials.
 *
 * A row is one scored outcome: `{ trial, fixtureId, passed, ...dimensions }`.
 * Two views are reported for a set of dimensions (for example provider, model,
 * and context):
 *
 * - `summarizeGroups`: the pass rate of each trial and its spread across
 *   trials, which says how much a headline number moves between runs.
 * - `summarizeFixtures`: for each fixture, how many trials passed and the
 *   variance of that outcome, which says which fixtures are unstable.
 */

const round = (value, places = 4) => Number(value.toFixed(places))

function groupBy(rows, keys) {
  const groups = new Map()
  for (const row of rows) {
    const id = keys.map((key) => String(row[key])).join("\u0000")
    const group = groups.get(id) ?? {
      dimensions: Object.fromEntries(keys.map((key) => [key, row[key]])),
      rows: []
    }
    group.rows.push(row)
    groups.set(id, group)
  }
  return [...groups.values()]
}

/** Unbiased sample variance; null when fewer than two values exist. */
export function sampleVariance(values) {
  if (values.length < 2) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1)
  )
}

/** Per-trial pass rates for each group, with their spread across trials. */
export function summarizeGroups(rows, keys) {
  return groupBy(rows, keys).map(({ dimensions, rows: groupRows }) => {
    const perTrial = groupBy(groupRows, ["trial"])
      .map(({ dimensions: { trial }, rows: trialRows }) => {
        const passed = trialRows.filter((row) => row.passed).length
        return {
          trial,
          cases: trialRows.length,
          passed,
          passRate: round(passed / trialRows.length)
        }
      })
      .sort((left, right) => String(left.trial).localeCompare(String(right.trial)))
    const rates = perTrial.map(({ passRate }) => passRate)
    const variance = sampleVariance(rates)
    const fixtures = summarizeFixtures(groupRows, [])
    return {
      ...dimensions,
      trials: perTrial.length,
      passRate: round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length),
      minPassRate: Math.min(...rates),
      maxPassRate: Math.max(...rates),
      passRateStdDev: variance === null ? null : round(Math.sqrt(variance)),
      unstableFixtures: fixtures.filter(({ unstable }) => unstable).length,
      perTrial
    }
  })
}

/** Passes, pass rate, and outcome variance for each fixture in each group. */
export function summarizeFixtures(rows, keys) {
  return groupBy(rows, [...keys, "fixtureId"]).map(
    ({ dimensions, rows: fixtureRows }) => {
      const outcomes = fixtureRows.map((row) => (row.passed ? 1 : 0))
      const passed = outcomes.reduce((sum, value) => sum + value, 0)
      const variance = sampleVariance(outcomes)
      return {
        ...dimensions,
        trials: outcomes.length,
        passed,
        passRate: round(passed / outcomes.length),
        variance: variance === null ? null : round(variance),
        // Passed in some trials and failed in others.
        unstable: passed > 0 && passed < outcomes.length
      }
    }
  )
}

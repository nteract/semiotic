import { bench, describe } from "vitest"
import { loess } from "../../src/components/charts/shared/loess"
import { rollup } from "../../src/components/data/transforms"

describe("LOESS smoothing", () => {
  const points: [number, number][] = Array.from({ length: 1000 }, (_, i) => {
    const x = (i * 7919) % 1000
    return [x, Math.sin(x / 50) + (i % 7) / 10]
  })
  for (const bandwidth of [0.05, 0.3, 1]) {
    bench(`loess-1000-bandwidth-${bandwidth}`, () => {
      loess(points, bandwidth)
    })
  }
})

describe("Grouped aggregation", () => {
  for (const groupCount of [10, 1000]) {
    const rows = Array.from({ length: 100_000 }, (_, i) => ({
      group: `group-${i % groupCount}`,
      amount: ((i * 7919) % 1000) / 10
    }))
    for (const agg of ["sum", "mean", "min", "count"] as const) {
      bench(`rollup-100k-${groupCount}-groups-${agg}`, () => {
        rollup(rows, { groupBy: "group", value: "amount", agg })
      })
    }
  }
})

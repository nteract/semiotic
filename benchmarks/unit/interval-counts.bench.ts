import { bench, describe } from "vitest"
import { activeCountOverDomain } from "../../src/components/recipes/intervals"

describe("Interval concurrency counts", () => {
  const intervals = Array.from({ length: 10000 }, (_, i) => {
    const start = (i * 7919) % 10000
    return { start, end: start + 1 + (i % 500) }
  })
  for (const sampleCount of [1, 1000, 10000]) {
    bench(`count-10k-intervals-${sampleCount}-samples`, () => {
      activeCountOverDomain(intervals, { domain: [0, sampleCount - 1] })
    })
  }
})

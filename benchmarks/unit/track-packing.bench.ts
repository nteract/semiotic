import { bench, describe } from "vitest"
import { packIntervals } from "../../src/components/recipes/intervals"
import { packSpanLevels } from "../../src/components/recipes/sequenceLayout"

describe("First-fit track packing", () => {
  for (const count of [100, 10000]) {
    for (const overlap of [1, 32, 1000]) {
      const intervals = Array.from({ length: count }, (_, i) => ({
        start: i,
        end: i + overlap
      }))
      const spans = intervals.map(({ start, end }, i) => ({
        id: String(i),
        a: start,
        b: end
      }))
      bench(`intervals-${count}-items-${overlap}-overlap`, () => {
        packIntervals(intervals)
      })
      bench(`spans-${count}-items-${overlap}-overlap`, () => {
        packSpanLevels(spans)
      })
    }
  }
})

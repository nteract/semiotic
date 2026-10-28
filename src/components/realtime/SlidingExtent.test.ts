import { describe, expect, it } from "vitest"
import { SlidingExtent } from "./SlidingExtent"

describe("SlidingExtent", () => {
  it.each([1, 3, 20, 100])(
    "matches rescanned extrema through repeated FIFO eviction (capacity %s)",
    (capacity) => {
      const extent = new SlidingExtent()
      const window: number[] = []
      // Deterministic values cover ascending/descending runs, ties, and invalid rows.
      for (let i = 0; i < 2000; i++) {
        const value =
          i % 17 === 0
            ? NaN
            : i % 19 === 0
              ? Infinity
              : Math.round(Math.sin(i / 5) * 100)
        extent.push(value)
        window.push(value)
        if (window.length > capacity) extent.evictOldest(window.shift()!)
        const finite = window.filter(Number.isFinite)
        expect(extent.extent).toEqual([
          Math.min(...finite),
          Math.max(...finite)
        ])
        expect(extent.dirty).toBe(false)
      }
    }
  )

  it("rebuilds after arbitrary removal, including a non-extreme queued value", () => {
    const extent = new SlidingExtent()
    const data = [1, 2, 3, 4]
    data.forEach((n) => extent.push(n))
    extent.evict(2)
    expect(extent.dirty).toBe(true)
    extent.push(5)
    extent.evictOldest(1)
    expect(extent.dirty).toBe(true)
    extent.recalculate([3, 4, 5])
    expect(extent.extent).toEqual([3, 5])
    extent.evictOldest(3)
    expect(extent.extent).toEqual([4, 5])
    extent.clear()
    expect(extent.extent).toEqual([Infinity, -Infinity])
  })
})

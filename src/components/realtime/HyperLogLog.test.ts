import { describe, it, expect } from "vitest"
import { HyperLogLog } from "./HyperLogLog"

describe("HyperLogLog", () => {
  it.each([
    [4, [0, 1, 43, 992, 11236]],
    [10, [0, 1, 50, 1040, 10414]],
    [16, [0, 1, 50, 1004, 9963]]
  ] as const)(
    "preserves the full-register estimator at precision %i",
    (precision, expected) => {
      const sketch = new HyperLogLog(precision)
      const counts = [sketch.count()]
      for (let i = 0; i < 10_000; i++) {
        sketch.add(`user-${i}`)
        sketch.add(`user-${i}`)
        if ([0, 49, 999, 9999].includes(i)) counts.push(sketch.count())
      }
      expect(counts).toEqual(expected)
    }
  )

  it("keeps overlapping merges, duplicate adds, self-merges and detached clones consistent", () => {
    const whole = new HyperLogLog()
    const left = new HyperLogLog()
    const right = new HyperLogLog()
    for (let i = 0; i < 4000; i++) {
      whole.add(i)
      if (i < 3000) left.add(i)
      if (i >= 1000) right.add(i)
    }
    const snapshot = left.clone()
    const before = snapshot.count()
    left.merge(right)
    left.merge(left)
    expect(left.count()).toBe(whole.count())
    expect(snapshot.count()).toBe(before)
    snapshot.merge(right)
    expect(snapshot.count()).toBe(whole.count())
    const mismatched = new HyperLogLog(4)
    mismatched.add("different precision")
    left.merge(mismatched)
    expect(left.count()).toBe(whole.count())
  })

  it("counts distinct values within a reasonable error", () => {
    const hll = new HyperLogLog()
    for (let i = 0; i < 1000; i++) hll.add(`user-${i}`)
    const estimate = hll.count()
    expect(estimate).toBeGreaterThan(850)
    expect(estimate).toBeLessThan(1150)
  })

  it("merges sketches", () => {
    const a = new HyperLogLog()
    const b = new HyperLogLog()
    for (let i = 0; i < 200; i++) a.add(`a-${i}`)
    for (let i = 0; i < 200; i++) b.add(`b-${i}`)
    a.merge(b)
    expect(a.count()).toBeGreaterThan(280)
    expect(a.count()).toBeLessThan(550)
  })
})

import { describe, it, expect } from "vitest"
import { HyperLogLog } from "./HyperLogLog"

describe("HyperLogLog", () => {
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

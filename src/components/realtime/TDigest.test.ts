import { describe, it, expect } from "vitest"
import { TDigest } from "./TDigest"

describe("TDigest", () => {
  it("interpolates small-sample medians symmetrically", () => {
    const digest = new TDigest()
    digest.push(0)
    digest.push(100)
    expect(digest.quantile(0.5)).toBe(50)
    expect(digest.quantile(0)).toBe(0)
    expect(digest.quantile(1)).toBe(100)
    expect(digest.quantile(NaN)).toBeNaN()
  })

  it("preserves quantiles across clone and merge", () => {
    const left = new TDigest()
    left.push(0)
    const merged = left.clone()
    const right = new TDigest()
    right.push(100)
    merged.merge(right)
    expect(merged.quantile(0.5)).toBe(50)
    expect(left.quantile(0.5)).toBe(0)
    expect(right.quantile(0.5)).toBe(100)
  })
  it("estimates the median of 1..100", () => {
    const digest = new TDigest()
    for (let i = 1; i <= 100; i++) digest.push(i)
    expect(digest.quantile(0.5)).toBeGreaterThan(40)
    expect(digest.quantile(0.5)).toBeLessThan(60)
    expect(digest.quantile(0.95)).toBeGreaterThan(85)
  })

  it("merges independent sketches", () => {
    const a = new TDigest()
    const b = new TDigest()
    for (let i = 1; i <= 50; i++) a.push(i)
    for (let i = 51; i <= 100; i++) b.push(i)
    a.merge(b)
    expect(a.quantile(0.5)).toBeGreaterThan(40)
    expect(a.quantile(0.5)).toBeLessThan(60)
  })
})

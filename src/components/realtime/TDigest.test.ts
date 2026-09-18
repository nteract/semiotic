import { describe, it, expect } from "vitest"
import { TDigest } from "./TDigest"

describe("TDigest", () => {
  it("merges large sketches without an argument limit and supports self-merge", () => {
    const large = new TDigest(100_000)
    for (let i = 0; i < 150_000; i++) large.push(i)
    const target = new TDigest()
    target.push(-1)
    target.merge(large)
    expect(target.count).toBe(150_001)
    expect(target.quantile(0)).toBe(-1)
    expect(target.quantile(1)).toBe(149_999)
    expect(large.count).toBe(150_000)

    const small = new TDigest()
    small.push(0)
    small.push(100)
    small.merge(small)
    expect(small.count).toBe(4)
    expect(small.quantile(0.5)).toBe(50)
  })

  it("keeps repeated readouts stable and invalidates compressed state on push and merge", () => {
    const digest = new TDigest()
    for (let i = 0; i < 10_000; i++) digest.push((i * 7919) % 10_000)
    const quantiles = [0, 0.01, 0.5, 0.95, 0.99, 1]
    const first = quantiles.map((q) => digest.quantile(q))
    for (let i = 0; i < 5; i++)
      expect(quantiles.map((q) => digest.quantile(q))).toEqual(first)
    const clone = digest.clone()
    clone.push(100_000)
    expect(clone.quantile(1)).toBe(100_000)
    expect(quantiles.map((q) => digest.quantile(q))).toEqual(first)
    digest.merge(clone)
    expect(digest.count).toBe(20_001)
    expect(digest.quantile(1)).toBe(100_000)
  })

  it("merges into an empty digest across compression settings without sharing centroids", () => {
    const source = new TDigest(1000)
    for (let i = 0; i < 10_000; i++) source.push((i * 7919) % 10_000)
    const quantiles = [0, 0.01, 0.5, 0.95, 0.99, 1]
    const before = quantiles.map((q) => source.quantile(q))
    const target = new TDigest(20)
    target.merge(source)
    expect(target.count).toBe(source.count)
    for (const q of quantiles) {
      expect(Math.abs(target.quantile(q) - q * 9999)).toBeLessThan(500)
    }
    target.push(100_000)
    expect(target.quantile(1)).toBe(100_000)
    expect(quantiles.map((q) => source.quantile(q))).toEqual(before)
  })

  it("retains tail accuracy for a long stream without queries during ingestion", () => {
    const digest = new TDigest()
    for (let i = 0; i < 50_000; i++) digest.push(i)
    for (const q of [0.01, 0.5, 0.95, 0.99]) {
      expect(Math.abs(digest.quantile(q) - q * 50_000)).toBeLessThan(500)
    }
    expect(digest.count).toBe(50_000)
  })

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

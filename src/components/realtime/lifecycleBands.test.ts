import { describe, expect, it } from "vitest"
import {
  DEFAULT_LIFECYCLE_THRESHOLDS,
  bandFromAge,
  type LifecycleBand,
} from "./lifecycleBands"

const DAY = 24 * 60 * 60 * 1000

describe("bandFromAge", () => {
  it("classifies the default schedule (1×/1.5×/3× TTL)", () => {
    const ttl = 10 * DAY
    expect(bandFromAge(0, ttl)).toBe("fresh")
    expect(bandFromAge(5 * DAY, ttl)).toBe("fresh")
    expect(bandFromAge(12 * DAY, ttl)).toBe("aging")
    expect(bandFromAge(20 * DAY, ttl)).toBe("stale")
    expect(bandFromAge(35 * DAY, ttl)).toBe("expired")
  })

  it("honors custom thresholds", () => {
    const ttl = 10 * DAY
    // With aging at 2×, age=12 days (which would be aging by default)
    // is still fresh.
    expect(bandFromAge(12 * DAY, ttl, { fresh: 2 })).toBe("fresh")
    // Push stale boundary out — age=20 days now lands in aging instead
    // of stale.
    expect(bandFromAge(20 * DAY, ttl, { aging: 3, stale: 5 })).toBe("aging")
  })

  it("treats negative and NaN ages as fresh (parse-failure sentinel)", () => {
    expect(bandFromAge(-100, 1000)).toBe("fresh")
    expect(bandFromAge(NaN, 1000)).toBe("fresh")
  })

  it("classifies +Infinity age as expired (monotonic-in-age contract)", () => {
    // Real "older than any finite TTL multiple" signal — must land in
    // the oldest band, not silently be re-classified as fresh.
    expect(bandFromAge(Infinity, 1000)).toBe("expired")
  })

  it("treats non-positive or non-finite TTLs as fresh (no divide-by-zero)", () => {
    expect(bandFromAge(5000, 0)).toBe("fresh")
    expect(bandFromAge(5000, -1)).toBe("fresh")
    expect(bandFromAge(5000, NaN)).toBe("fresh")
  })

  it("returns the four named bands and only those", () => {
    const ttl = 100
    const seen = new Set<LifecycleBand>()
    for (let age = 0; age <= 500; age += 10) {
      seen.add(bandFromAge(age, ttl))
    }
    expect(seen).toEqual(new Set<LifecycleBand>(["fresh", "aging", "stale", "expired"]))
  })

  it("exposes the default thresholds for downstream introspection", () => {
    expect(DEFAULT_LIFECYCLE_THRESHOLDS).toEqual({ fresh: 1.0, aging: 1.5, stale: 3.0 })
  })

  it("is pure — same inputs always return same band", () => {
    const a = bandFromAge(7 * DAY, 5 * DAY)
    const b = bandFromAge(7 * DAY, 5 * DAY)
    expect(a).toBe(b)
  })
})

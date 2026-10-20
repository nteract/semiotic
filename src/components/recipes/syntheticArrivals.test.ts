import { describe, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { createSyntheticEmitter, syntheticArrivals } from "./syntheticArrivals"
import type { SyntheticSourceSpec } from "./syntheticArrivals"

const sources: SyntheticSourceSpec[] = [
  { id: "p1", interval: 500 },
  { id: "p2", interval: 300, jitter: "watermarks" },
  {
    id: "p3",
    interval: 2000,
    jitter: "watermarks",
    burst: { min: 5, max: 15, gapMs: [1500, 2500], intraMs: 10 }
  }
]

describe("synthetic arrivals", () => {
  it("matches the versioned 10,000-arrival seed-42 fixture", () => {
    const stream = syntheticArrivals(sources, 42)
    const rows = Array.from({ length: 10000 }, () => stream.next().value)
    expect(
      createHash("sha256").update(JSON.stringify(rows)).digest("hex")
    ).toBe("01fa5e5089bc0c38e92d54ac9db1f65e8eeb1d90f3e9778500a01db937f6d27b")
  })
  it("replays 10,000 events exactly and preserves stable tied ordering", () => {
    const first = syntheticArrivals(sources, 42)
    const second = syntheticArrivals(sources, 42)
    let arrival = -Infinity
    for (let i = 0; i < 10000; i++) {
      const a = first.next().value!
      expect(a).toEqual(second.next().value)
      expect(a.arrivalTime).toBeGreaterThanOrEqual(arrival)
      arrival = a.arrivalTime
    }
    const tied = syntheticArrivals([
      { id: "a", interval: 1 },
      { id: "b", interval: 1 }
    ])
    expect(Array.from({ length: 4 }, () => tied.next().value)).toEqual([
      { id: "a-0", source: "a", eventTime: 1, arrivalTime: 1 },
      { id: "b-0", source: "b", eventTime: 1, arrivalTime: 1 },
      { id: "a-1", source: "a", eventTime: 2, arrivalTime: 2 },
      { id: "b-1", source: "b", eventTime: 2, arrivalTime: 2 }
    ])
  })

  it("matches the published long-tail weights over 100,000 arrivals", () => {
    const stream = syntheticArrivals(
      [{ id: "j", interval: 1, jitter: "watermarks" }],
      9
    )
    const counts = [0, 0, 0, 0, 0]
    for (let i = 0; i < 100000; i++) {
      const event = stream.next().value!
      const jitter = event.arrivalTime - event.eventTime
      counts[
        jitter === 0
          ? 0
          : jitter <= 2000
            ? 1
            : jitter <= 5000
              ? 2
              : jitter <= 10000
                ? 3
                : 4
      ]++
    }
    for (const [i, weight] of [0.25, 0.35, 0.2, 0.1, 0.1].entries()) {
      expect(Math.abs(counts[i] / 100000 - weight)).toBeLessThan(0.01)
    }
  })

  it("is independent of tick chunking, freezes paused time, and doubles rate without resetting ids", () => {
    const whole = createSyntheticEmitter(sources, 3)
    const chunked = createSyntheticEmitter(sources, 3)
    const result = Array.from({ length: 600 }, () =>
      chunked.advance(100)
    ).flat()
    const expected = whole.advance(60000)
    expect(result.map((e) => e.id)).toEqual(expected.map((e) => e.id))
    result.forEach((e, i) =>
      expect(e.arrivalTime).toBeCloseTo(expected[i].arrivalTime, 7)
    )
    const emitter = createSyntheticEmitter([{ id: "a", interval: 500 }])
    expect(emitter.advance(60000)).toHaveLength(120)
    expect(emitter.advance(60000, { paused: true })).toEqual([])
    expect(emitter.getTime()).toBe(60000)
    const faster = emitter.advance(60000, { rate: 2 })
    expect(faster).toHaveLength(240)
    expect(faster[0]).toEqual({
      id: "a-120",
      source: "a",
      arrivalTime: 60250,
      eventTime: 60250
    })
  })

  it("suspends inactive sources without an overdue burst on resume", () => {
    const emitter = createSyntheticEmitter([{ id: "a", interval: 100 }])
    emitter.advance(50)
    expect(emitter.advance(10000, { active: { a: false } })).toEqual([])
    expect(emitter.advance(49)).toEqual([])
    expect(emitter.advance(1)).toEqual([
      { id: "a-0", source: "a", eventTime: 10100, arrivalTime: 10100 }
    ])
  })

  it("rejects invalid schedules instead of looping forever", () => {
    expect(() => createSyntheticEmitter([{ id: "a", interval: 0 }])).toThrow()
    expect(() =>
      createSyntheticEmitter([
        { id: "a", burst: { min: 0, max: 2, intraMs: 0 } }
      ])
    ).toThrow()
    expect(() => createSyntheticEmitter([{ id: "a" }, { id: "a" }])).toThrow()
    expect(() => createSyntheticEmitter(sources).advance(Infinity)).toThrow()
  })
})

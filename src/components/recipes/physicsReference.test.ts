import { describe, expect, it } from "vitest"
import {
  comparePhysicsTrace,
  physicsReferenceEnvelope,
  type PhysicsReferenceTrace
} from "./physicsReference"

type Sample = { t: number; load: number }

function run(
  id: string,
  samples: Array<[number, number]>
): PhysicsReferenceTrace {
  return {
    id,
    samples: samples.map(([time, value]) => ({ time, value }))
  }
}

describe("physicsReferenceEnvelope", () => {
  it("aligns irregular step traces to a deterministic clock", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("a", [
          [0, 0],
          [2, 20],
          [4, 40]
        ]),
        run("b", [
          [0, 10],
          [1, 20],
          [4, 50]
        ])
      ],
      sampleAt: [4, 1, 3, 0, 2, 2],
      quantiles: [0, 0.5, 1],
      interpolation: "step"
    })

    expect(envelope.points.map((point) => point.time)).toEqual([0, 1, 2, 3, 4])
    expect(envelope.points.map((point) => point.median)).toEqual([
      5, 10, 20, 20, 45
    ])
    expect(envelope.points[1]).toMatchObject({
      count: 2,
      min: 0,
      max: 20,
      quantiles: { 0: 0, 0.5: 10, 1: 20 }
    })
    expect(envelope.runCount).toBe(2)
  })

  it("linearly interpolates each run before deriving the envelope", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("a", [
          [0, 0],
          [4, 40]
        ]),
        run("b", [
          [0, 10],
          [2, 30],
          [4, 50]
        ])
      ],
      sampleAt: { start: 0, end: 4, step: 1 },
      interpolation: "linear"
    })

    expect(envelope.points.map((point) => point.median)).toEqual([
      5, 15, 25, 35, 45
    ])
    expect(envelope.points.map((point) => point.count)).toEqual([2, 2, 2, 2, 2])
  })

  it("omits values outside authored domains and preserves empty grid rows", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("short", [
          [1, 10],
          [2, 20]
        ]),
        run("later", [
          [2, 30],
          [3, 40]
        ])
      ],
      sampleAt: [0, 1, 2, 3, 4]
    })

    expect(envelope.points.map((point) => point.count)).toEqual([0, 1, 2, 1, 0])
    expect(envelope.points[0]).toMatchObject({
      min: null,
      median: null,
      max: null,
      quantiles: { 0.1: null, 0.5: null, 0.9: null }
    })
  })

  it("supports held values outside the domain when clamp is explicit", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [run("single", [[2, 7]])],
      sampleAt: [0, 1, 2, 3, 4],
      outsideDomain: "clamp"
    })

    expect(envelope.points.map((point) => point.median)).toEqual([
      7, 7, 7, 7, 7
    ])
  })

  it("uses R-7 quantiles and normalizes their ordering", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("d", [[0, 30]]),
        run("b", [[0, 10]]),
        run("a", [[0, 0]]),
        run("c", [[0, 20]])
      ],
      sampleAt: [0],
      quantiles: [0.75, 0.25, 0.5, 0.25]
    })

    expect(envelope.quantiles).toEqual([0.25, 0.5, 0.75])
    expect(envelope.points[0]).toMatchObject({
      median: 15,
      quantiles: { 0.25: 7.5, 0.5: 15, 0.75: 22.5 }
    })
  })

  it("sorts samples, drops invalid values, and lets the last duplicate win", () => {
    const samples = [
      { meta: { t: 2 }, reading: "20" },
      { meta: { t: 0 }, reading: 0 },
      { meta: { t: 2 }, reading: 22 },
      { meta: { t: 1 }, reading: Number.NaN }
    ]
    const before = structuredClone(samples)
    const envelope = physicsReferenceEnvelope({
      runs: [{ id: "nested", samples }],
      sampleAt: [0, 1, 2],
      timeAccessor: "meta.t",
      valueAccessor: "reading",
      interpolation: "linear"
    })

    expect(envelope.points.map((point) => point.median)).toEqual([0, 11, 22])
    expect(samples).toEqual(before)
  })

  it("passes trace identity to function accessors", () => {
    const runs: PhysicsReferenceTrace<Sample>[] = [
      { id: "first", samples: [{ t: 0, load: 2 }] },
      { id: "second", samples: [{ t: 0, load: 3 }] }
    ]
    const envelope = physicsReferenceEnvelope({
      runs,
      sampleAt: [0],
      timeAccessor: (sample) => sample.t,
      valueAccessor: (sample, _index, traceId) =>
        sample.load * (traceId === "second" ? 10 : 1)
    })

    expect(envelope.points[0]).toMatchObject({ min: 2, median: 16, max: 30 })
  })

  it("includes a non-divisible grid endpoint exactly once", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [],
      sampleAt: { start: 0, end: 1, step: 0.3 }
    })
    expect(envelope.points.map((point) => point.time)).toEqual([
      0, 0.3, 0.6, 0.9, 1
    ])
  })

  it("rejects invalid grids and quantiles", () => {
    expect(() =>
      physicsReferenceEnvelope({
        runs: [],
        sampleAt: { start: 2, end: 1, step: 1 }
      })
    ).toThrow(/sampleAt/)
    expect(() =>
      physicsReferenceEnvelope({
        runs: [],
        sampleAt: [0],
        quantiles: [1.1]
      })
    ).toThrow(/quantiles/)
  })
})

describe("comparePhysicsTrace", () => {
  it("reports step-held durations, sample counts, and peak distances", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("low", [
          [0, 4],
          [5, 4]
        ]),
        run("high", [
          [0, 6],
          [5, 6]
        ])
      ],
      sampleAt: [0, 1, 3, 5],
      quantiles: [0, 1],
      interpolation: "step"
    })
    const comparison = comparePhysicsTrace(
      [
        { time: 0, value: 3 },
        { time: 1, value: 5 },
        { time: 3, value: 8 },
        { time: 5, value: 8 }
      ],
      envelope
    )

    expect(comparison.points.map((point) => point.status)).toEqual([
      "below",
      "inside",
      "above",
      "above"
    ])
    expect(comparison).toMatchObject({
      observedSamples: 4,
      belowSamples: 1,
      insideSamples: 1,
      aboveSamples: 2,
      totalDuration: 5,
      observedDuration: 5,
      belowDuration: 1,
      insideDuration: 2,
      aboveDuration: 2,
      peakExcess: 2,
      peakExcessAt: 3,
      peakDeficit: 1,
      peakDeficitAt: 0
    })
  })

  it("integrates exact linear crossings through both band edges", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("low", [
          [0, 4],
          [10, 4]
        ]),
        run("high", [
          [0, 6],
          [10, 6]
        ])
      ],
      sampleAt: [0, 10],
      quantiles: [0, 1],
      interpolation: "linear"
    })
    const comparison = comparePhysicsTrace(
      [
        { time: 0, value: 2 },
        { time: 10, value: 8 }
      ],
      envelope
    )

    expect(comparison.belowDuration).toBeCloseTo(10 / 3)
    expect(comparison.insideDuration).toBeCloseTo(10 / 3)
    expect(comparison.aboveDuration).toBeCloseTo(10 / 3)
    expect(comparison.observedDuration).toBe(10)
    expect(comparison.peakExcess).toBe(2)
    expect(comparison.peakDeficit).toBe(2)
  })

  it("accounts for trace and envelope gaps as unobserved duration", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [
        run("baseline", [
          [0, 5],
          [4, 5]
        ])
      ],
      sampleAt: [0, 1, 2, 3, 4],
      quantiles: [0.5],
      interpolation: "linear"
    })
    const comparison = comparePhysicsTrace(
      [
        { time: 1, value: 5 },
        { time: 3, value: 5 }
      ],
      envelope
    )

    expect(comparison.points.map((point) => point.status)).toEqual([
      "unobserved",
      "inside",
      "inside",
      "inside",
      "unobserved"
    ])
    expect(comparison.totalDuration).toBe(4)
    expect(comparison.observedDuration).toBe(2)
    expect(comparison.unobservedDuration).toBe(2)
  })

  it("supports explicit min/max bands without authored quantiles", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [run("a", [[0, 2]]), run("b", [[0, 8]])],
      sampleAt: [0],
      quantiles: []
    })
    const comparison = comparePhysicsTrace(
      [{ timestamp: 0, queue: 9 }],
      envelope,
      {
        timeAccessor: "timestamp",
        valueAccessor: "queue",
        lower: "min",
        upper: "max"
      }
    )

    expect(comparison.points[0]).toMatchObject({
      value: 9,
      lower: 2,
      upper: 8,
      status: "above"
    })
  })

  it("rejects absent or inverted band selectors", () => {
    const envelope = physicsReferenceEnvelope({
      runs: [run("a", [[0, 2]]), run("b", [[0, 8]])],
      sampleAt: [0],
      quantiles: [0.25, 0.75]
    })
    expect(() =>
      comparePhysicsTrace([{ time: 0, value: 5 }], envelope, {
        lower: 0.1,
        upper: 0.75
      })
    ).toThrow(/could not find quantile/)
    expect(() =>
      comparePhysicsTrace([{ time: 0, value: 5 }], envelope, {
        lower: "max",
        upper: "min"
      })
    ).toThrow(/lower band exceeds/)
  })
})

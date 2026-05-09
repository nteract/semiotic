import { describe, it, expect } from "vitest"
import { massHistoryRows, pickMassQuantiles } from "./tooltipUtils"

describe("massHistoryRows", () => {
  it("returns [] for undefined data", () => {
    expect(massHistoryRows(undefined)).toEqual([])
  })

  it("returns [] when samples is empty", () => {
    expect(massHistoryRows({
      samples: [], peak: 0, topPeak: 0, botPeak: 0, localAttachments: new Map(),
    })).toEqual([])
  })

  it("collapses duplicate (t, total) pairs", () => {
    const rows = massHistoryRows({
      samples: [
        { t: 1, topMass: 2, botMass: 0 },
        { t: 1, topMass: 2, botMass: 0 }, // dup
        { t: 2, topMass: 0, botMass: 3 },
        { t: 2, topMass: 0, botMass: 3 }, // dup
      ],
      peak: 3, topPeak: 2, botPeak: 3, localAttachments: new Map(),
    })
    expect(rows).toEqual([{ t: 1, total: 2 }, { t: 2, total: 3 }])
  })

  it("preserves distinct same-time mass states (synth transfer peaks)", () => {
    const rows = massHistoryRows({
      samples: [
        { t: 1, topMass: 2, botMass: 0 }, // pre-event mass 2
        { t: 1, topMass: 5, botMass: 0 }, // post-event mass 5 — kept
      ],
      peak: 5, topPeak: 5, botPeak: 0, localAttachments: new Map(),
    })
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.total)).toEqual([2, 5])
  })
})

describe("pickMassQuantiles", () => {
  const row = (t: number, total: number) => ({ t, total })

  it("passes through unchanged when input length <= limit", () => {
    const rows = [row(1, 1), row(2, 2), row(3, 3)]
    expect(pickMassQuantiles(rows, 5)).toEqual(rows)
  })

  it("returns a fresh copy when not truncating (no aliasing)", () => {
    const rows = [row(1, 1), row(2, 2)]
    const out = pickMassQuantiles(rows, 5)
    expect(out).not.toBe(rows)
  })

  it("condenses to min/q25/median/q75/max when over limit", () => {
    const rows = [
      row(1, 0), row(2, 5), row(3, 1), row(4, 4),
      row(5, 2), row(6, 3), row(7, 6),
    ]
    const out = pickMassQuantiles(rows, 5)
    // Sorted by mass: 0, 1, 2, 3, 4, 5, 6 → picks at 0, 25%, 50%, 75%, 100%
    // last index = 6 → indices 0, 1, 3, 4, 6 → masses 0, 1, 3, 4, 6
    const masses = out.map(r => r.total)
    expect(masses).toEqual([0, 1, 3, 4, 6].sort((a, b) => {
      const ta = rows.find(r => r.total === a)!.t
      const tb = rows.find(r => r.total === b)!.t
      return ta - tb
    }))
  })

  it("re-sorts picks by time for chronological display", () => {
    // Input ordered so quantile picks are not in time order
    const rows = [
      row(7, 0),  // min
      row(1, 6),  // max — earliest in time
      row(5, 1),
      row(3, 5),
      row(2, 2),
      row(6, 3),
      row(4, 4),
    ]
    const out = pickMassQuantiles(rows, 5)
    // Output must be ascending in t
    for (let i = 1; i < out.length; i++) {
      expect(out[i].t).toBeGreaterThanOrEqual(out[i - 1].t)
    }
  })

  it("attaches min/q25/median/q75/max marks", () => {
    const rows = [
      row(1, 10), row(2, 20), row(3, 30),
      row(4, 40), row(5, 50), row(6, 60),
    ]
    const out = pickMassQuantiles(rows, 5)
    const marks = out.map(r => r.mark!).filter(Boolean)
    expect(marks).toContain("min")
    expect(marks).toContain("max")
    expect(marks.length).toBe(out.length)
  })

  it("dedupes same-time picks for tied/flat series", () => {
    // Constant mass — sorted by mass, the same row may be picked
    // multiple times. Time-dedup should collapse them.
    const rows = [
      row(1, 5), row(2, 5), row(3, 5),
      row(4, 5), row(5, 5), row(6, 5),
    ]
    const out = pickMassQuantiles(rows, 5)
    const ts = out.map(r => r.t)
    expect(new Set(ts).size).toBe(ts.length)
    expect(out.length).toBeLessThanOrEqual(5)
  })

  it("respects a custom limit", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i, i))
    const out = pickMassQuantiles(rows, 3)
    // Limit only governs the >limit gate; truncated output still uses
    // 5 quantile picks (deduped), so just assert truncation triggered.
    expect(out.length).toBeLessThanOrEqual(5)
    expect(out.some(r => r.mark === "min")).toBe(true)
    expect(out.some(r => r.mark === "max")).toBe(true)
  })
})

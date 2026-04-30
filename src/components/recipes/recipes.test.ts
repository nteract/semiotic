import { describe, it, expect } from "vitest"
import { scaleLinear } from "d3-scale"
import { waffleLayout } from "./waffle"
import { calendarLayout } from "./calendar"
import { horizonLayout } from "./horizon"
import type { LayoutContext } from "../stream/customLayout"
import type { RectSceneNode, AreaSceneNode } from "../stream/types"

function makeCtx<C>(config: C, overrides?: Partial<LayoutContext<C>>): LayoutContext<C> {
  const x = scaleLinear().domain([0, 100]).range([0, 400])
  const y = scaleLinear().domain([0, 100]).range([200, 0])
  return {
    data: [],
    scales: { x, y } as unknown as LayoutContext["scales"],
    dimensions: {
      width: 400,
      height: 200,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 400, height: 200 },
    },
    theme: {
      semantic: { primary: "#4e79a7", success: "#2e7d32", danger: "#c62828", surface: "#eee" },
      categorical: ["#4e79a7", "#f28e2c", "#e15759"],
    },
    resolveColor: (group) => {
      // deterministic palette
      const palette = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f"]
      let hash = 0
      for (let i = 0; i < group.length; i++) hash = (hash * 31 + group.charCodeAt(i)) | 0
      return palette[Math.abs(hash) % palette.length]
    },
    config,
    ...overrides,
  }
}

describe("waffleLayout", () => {
  it("emits rows × columns rect nodes when data fully fills the grid", () => {
    const result = waffleLayout(
      makeCtx(
        { rows: 10, columns: 10, categoryAccessor: "cat", valueAccessor: "v" },
        { data: [{ cat: "A", v: 100 }] }
      )
    )
    expect(result.nodes).toHaveLength(100)
    expect(result.nodes!.every((n) => n.type === "rect")).toBe(true)
  })

  it("allocates cells proportionally and totals exactly rows*columns", () => {
    const result = waffleLayout(
      makeCtx(
        { rows: 10, columns: 10, categoryAccessor: "cat", valueAccessor: "v" },
        {
          data: [
            { cat: "A", v: 33 },
            { cat: "B", v: 33 },
            { cat: "C", v: 34 },
          ],
        }
      )
    )
    expect(result.nodes).toHaveLength(100)
    const counts = new Map<string, number>()
    for (const n of result.nodes! as RectSceneNode[]) {
      counts.set(n.group!, (counts.get(n.group!) ?? 0) + 1)
    }
    // Each category should be ~33-34 cells
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(100)
    for (const v of counts.values()) {
      expect(v).toBeGreaterThanOrEqual(33)
      expect(v).toBeLessThanOrEqual(34)
    }
  })

  it("returns empty when data has zero total value", () => {
    const result = waffleLayout(
      makeCtx({ rows: 10, columns: 10, valueAccessor: "v" }, { data: [{ cat: "A", v: 0 }] })
    )
    expect(result.nodes).toEqual([])
  })
})

describe("calendarLayout", () => {
  it("emits one rect per day in 2025 (365 days)", () => {
    const result = calendarLayout(
      makeCtx(
        { dateAccessor: "date", valueAccessor: "v", year: 2025 },
        { data: [{ date: new Date("2025-01-01"), v: 1 }] }
      )
    )
    expect(result.nodes).toHaveLength(365)
  })

  it("renders empty grid when data is empty", () => {
    const result = calendarLayout(
      makeCtx(
        { dateAccessor: "date", valueAccessor: "v", year: 2024 },
        { data: [] }
      )
    )
    // 2024 was a leap year — 366 days
    expect(result.nodes).toHaveLength(366)
  })
})

describe("horizonLayout", () => {
  it("emits 2 * bands area nodes (one per band per side)", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ t: i, v: i % 2 === 0 ? i : -i }))
    const result = horizonLayout(
      makeCtx(
        { xAccessor: "t", yAccessor: "v", bands: 3 },
        { data }
      )
    )
    expect(result.nodes).toHaveLength(6)
    for (const n of result.nodes! as AreaSceneNode[]) {
      expect(n.type).toBe("area")
      expect(n.topPath.length).toBe(10)
    }
  })

  it("band 0 path stays inside the plot rect (no overshoot)", () => {
    // amp = 9, bands = 3 → ampPerBand = 3. A value of 6 in band 0 clamps to
    // ampPerBand=3 (full band), so y = baseline - plot.height (top of plot).
    const data = [{ t: 0, v: 6 }, { t: 1, v: 6 }]
    const result = horizonLayout(
      makeCtx({ xAccessor: "t", yAccessor: "v", bands: 3 }, { data })
    )
    const band0Pos = result.nodes![0] as AreaSceneNode
    // plot.y=0, plot.height=200 → baseline=200, top=0
    for (const [, y] of band0Pos.topPath) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(200)
    }
  })

  it("higher bands only contribute when value exceeds (b * ampPerBand)", () => {
    // Single value of 1.5 with amp=1.5, bands=3, ampPerBand=0.5.
    //   band 0: clamp(1.5, 0, 0.5) = 0.5 → full band
    //   band 1: clamp(1.0, 0, 0.5) = 0.5 → full band
    //   band 2: clamp(0.5, 0, 0.5) = 0.5 → full band
    // All three positive bands should reach the top of the plot.
    const data = [{ t: 0, v: 1.5 }, { t: 1, v: 1.5 }]
    const result = horizonLayout(
      makeCtx({ xAccessor: "t", yAccessor: "v", bands: 3 }, { data })
    )
    // Indices 0, 2, 4 are positive bands (interleaved with negative).
    for (const i of [0, 2, 4]) {
      const band = result.nodes![i] as AreaSceneNode
      expect(band.topPath[0][1]).toBeCloseTo(0, 1) // top of plot
    }
  })
})

import { describe, it, expect } from "vitest"
import { scaleLinear } from "d3-scale"
import { waffleLayout } from "./waffle"
import { calendarLayout } from "./calendar"
import type { LayoutContext } from "../stream/customLayout"
import type { RectSceneNode } from "../stream/types"

function makeCtx<C extends object>(config: C, overrides?: Partial<LayoutContext<C>>): LayoutContext<C> {
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

  it("emits tooltip-facing datum fields on each cell (category, value, user-accessor names)", () => {
    // Regression: the cell datum used to be only `_waffleCategory` /
    // `_waffleIndex`, both underscore-prefixed and therefore filtered
    // out as "internal" by the default tooltip's key scanner. Result:
    // empty tooltips on the docs `features/custom-charts` waffle.
    // Layout now writes user-friendly keys so default tooltips have
    // something to surface, plus the user-accessor names (when string-
    // form) for tooltips that read those.
    const result = waffleLayout(
      makeCtx(
        { rows: 10, columns: 10, categoryAccessor: "region", valueAccessor: "share" },
        { data: [
          { region: "AMER", share: 60 },
          { region: "EMEA", share: 40 },
        ] }
      )
    )
    expect(result.nodes!.length).toBe(100)
    const amer = (result.nodes as RectSceneNode[]).find(n => n.group === "AMER")!
    // Canonical keys for portable tooltips.
    expect(amer.datum!.category).toBe("AMER")
    expect(amer.datum!.value).toBe(60)
    // User-accessor keys for tooltips that look up by configured field name.
    expect(amer.datum!.region).toBe("AMER")
    expect(amer.datum!.share).toBe(60)
    // Per-category cell count surfaced as an explicit "cells" field.
    expect(amer.datum!.cells).toBe(60)
    // The legacy underscore-prefixed fields stay for back-compat.
    expect(amer.datum!._waffleCategory).toBe("AMER")
    expect(typeof amer.datum!._waffleIndex).toBe("number")
  })

  it("falls back to canonical keys when accessors are functions (no string name to mirror)", () => {
    const result = waffleLayout(
      makeCtx(
        {
          rows: 10, columns: 10,
          categoryAccessor: (d: any) => d.cat,
          valueAccessor: (d: any) => d.v,
        },
        { data: [{ cat: "X", v: 100 }] }
      )
    )
    const node = result.nodes![0] as RectSceneNode
    expect(node.datum!.category).toBe("X")
    expect(node.datum!.value).toBe(100)
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


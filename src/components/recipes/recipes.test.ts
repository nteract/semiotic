import { describe, it, expect } from "vitest"
import { scaleLinear } from "d3-scale"
import { waffleLayout } from "./waffle"
import { calendarLayout } from "./calendar"
import type { LayoutContext } from "../stream/customLayout"
import type { RectSceneNode } from "../stream/types"
import type { Datum } from "../charts/shared/datumTypes"

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
      categoryAccessor: (d: Datum) => d.cat,
      valueAccessor: (d: Datum) => d.v,
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
  it("keys local dates and infers their local year", () => {
    const result = calendarLayout(makeCtx(
      { dateAccessor: "date", valueAccessor: "v" },
      { data: [{ date: new Date(2025, 0, 1), v: 3 }, { date: new Date(2025, 2, 1), v: 7 }] },
    ))
    const measured = (result.nodes as RectSceneNode[]).filter((node) => !node.datum!.missing)
    expect(measured.map((node) => [
      (node.datum!.date as Date).getMonth(), (node.datum!.date as Date).getDate(), node.datum!.value,
    ])).toEqual([[0, 1, 3], [2, 1, 7]])
  })

  it("keeps date-only strings on their named day and offers explicit UTC days", () => {
    for (const timeZone of ["local", "utc"] as const) {
      const result = calendarLayout(makeCtx(
        { dateAccessor: "date", valueAccessor: "v", timeZone },
        { data: [{ date: "2025-01-01", v: 3 }, { date: new Date("2025-03-01T12:00:00Z"), v: 7 }] },
      ))
      const dates = (result.nodes as RectSceneNode[]).filter((node) => !node.datum!.missing).map((node) => node.datum!.date as Date)
      expect(dates.map((date) => timeZone === "utc" ? date.getUTCDate() : date.getDate())).toEqual([1, 1])
    }
  })

  it("preserves every local day through leap years and DST", () => {
    const result = calendarLayout(makeCtx({ dateAccessor: "date", valueAccessor: "v", year: 2024 }))
    const dates = (result.nodes as RectSceneNode[]).map((node) => node.datum!.date as Date)
    expect(dates).toHaveLength(366)
    expect(new Set(dates.map((date) => `${date.getMonth()}-${date.getDate()}`)).size).toBe(366)
    expect(dates.every((date) => date.getHours() === 0)).toBe(true)
  })

  it("preserves small calendar years supported by the portable schema", () => {
    for (const timeZone of ["local", "utc"] as const) {
      const result = calendarLayout(makeCtx(
        { dateAccessor: "date", valueAccessor: "v", year: 4, timeZone },
        { data: [{ date: "0004-02-29", v: 7 }] },
      ))
      const nodes = result.nodes as RectSceneNode[]
      expect(nodes).toHaveLength(366)
      const measured = nodes.find((node) => !node.datum!.missing)!
      const date = measured.datum!.date as Date
      expect(timeZone === "utc" ? date.getUTCFullYear() : date.getFullYear()).toBe(4)
      expect(measured.datum!.value).toBe(7)
    }
  })

  it("distinguishes absent days and invalid measurements from actual zero", () => {
    const result = calendarLayout(makeCtx(
      { dateAccessor: "date", valueAccessor: "v", year: 2025 },
      { data: [{ date: "2025-01-01", v: 0 }, { date: "2025-01-02", v: null }] },
    ))
    const [zero, missing] = result.nodes! as RectSceneNode[]
    expect(zero.datum).toMatchObject({ value: 0, missing: false })
    expect(missing.datum).toMatchObject({ value: null, missing: true })
    expect(zero.style.fill).not.toBe(missing.style.fill)
  })

  it("scales colors only from the rendered year and honors missingColor", () => {
    const config = { dateAccessor: "date", valueAccessor: "v", year: 2025, missingColor: "pink" }
    const data = [{ date: "2025-01-01", v: 0 }, { date: "2025-01-02", v: 10 }]
    const render = (rows: Datum[]) => calendarLayout(makeCtx(config, { data: rows })).nodes! as RectSceneNode[]
    const oneYear = render(data)
    const manyYears = render([...data, { date: "2024-03-03", v: 10000 }])
    expect(manyYears.map((node) => node.style.fill)).toEqual(oneYear.map((node) => node.style.fill))
    expect(oneYear[2].style.fill).toBe("pink")
  })

  it("anchors Monday-start weeks with Sunday in the last row", () => {
    const result = calendarLayout(makeCtx({ dateAccessor: "date", valueAccessor: "v", year: 2025, weekStart: 1 as const }))
    const nodes = result.nodes! as RectSceneNode[]
    const monday = nodes.find((node) => (node.datum!.date as Date).getDate() === 6)!
    const sunday = nodes.find((node) => (node.datum!.date as Date).getDate() === 5)!
    expect(monday.y).toBe(0)
    expect(sunday.y).toBeGreaterThan(monday.y)
    expect(monday.x).toBeGreaterThan(sunday.x)
  })

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

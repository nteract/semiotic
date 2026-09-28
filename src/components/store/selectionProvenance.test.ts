import { describe, expect, it } from "vitest"
import {
  attachSelectionCoverage,
  attachSelectionProvenance,
  getSelectionCoverage,
  getSelectionProvenance,
  getSourceRows,
  selectionFieldValues,
} from "./selectionProvenance"
import * as realtimeCore from "../semiotic-realtime-core"
import * as utilsCore from "../semiotic-utils-core"

const rows = [{ time: 2, value: 1 }, { time: 7, value: 3 }]

describe("getSourceRows", () => {
  it("reads rows from an aggregate datum, a categories entry, and a hover wrapping them", () => {
    const entry = attachSelectionProvenance({ category: "North", value: 4 }, rows.slice(0, 1))
    const datum = attachSelectionProvenance({ binStart: 0, binEnd: 10, total: 4, categories: [entry] }, rows)
    const hover = { data: datum, x: 12, y: 30, __semioticHoverData: true as const }

    expect(getSourceRows(datum)).toEqual(rows)
    expect(getSourceRows(entry)).toEqual(rows.slice(0, 1))
    expect(getSourceRows(hover)).toEqual(rows)
  })

  it("returns undefined for plain rows and empty values", () => {
    expect(getSourceRows(rows[0])).toBeUndefined()
    expect(getSourceRows({ data: rows[0], x: 0, y: 0, __semioticHoverData: true })).toBeUndefined()
    expect(getSourceRows(null)).toBeUndefined()
    expect(getSourceRows(undefined)).toBeUndefined()
  })

  it("keeps the rows out of enumeration and serialization", () => {
    const datum = attachSelectionProvenance({ binStart: 0 }, rows)
    expect(Object.keys(datum)).toEqual(["binStart"])
    expect(JSON.stringify(datum)).toBe('{"binStart":0}')
    expect(getSelectionProvenance(datum)).toBe(getSourceRows(datum))
  })

  it("is the same helper from the realtime and utils entries", () => {
    expect(realtimeCore.getSourceRows).toBe(getSourceRows)
    expect(utilsCore.getSourceRows).toBe(getSourceRows)
  })
})

describe("selectionFieldValues", () => {
  it("publishes a datum's own field and falls back to distinct source-row values", () => {
    const bin = attachSelectionProvenance(
      { binStart: 0, category: "North" },
      [{ time: 2, category: "North" }, { time: 7, category: "North" }, { time: 2, category: "North" }]
    )
    expect(selectionFieldValues(bin, ["category", "time", "missing"])).toEqual({
      category: ["North"],
      time: [2, 7],
    })
  })

  it("reads parent-line metadata for coordinates of line-object input", () => {
    const point = { x: 1, parentLine: { series: "A" } }
    expect(selectionFieldValues(point, ["x", "series"])).toEqual({ x: [1], series: ["A"] })
  })
})

describe("selection coverage", () => {
  it("is hidden from enumeration and serialization", () => {
    const coverage = { ranges: { time: [0, 10] as const } }
    const datum = attachSelectionCoverage({ binStart: 0 }, coverage)
    expect(getSelectionCoverage(datum)).toBe(coverage)
    expect(Object.keys(datum)).toEqual(["binStart"])
    expect(JSON.stringify(datum)).toBe('{"binStart":0}')
    expect(getSelectionCoverage({ binStart: 0 })).toBeUndefined()
  })
})

import { describe, expect, it } from "vitest"
import type { Datum } from "../shared/datumTypes"
import {
  applyLineGapStrategy,
  groupLineChartRows,
  groupRowsIntoLines,
  yAccessorForZeroedGaps,
} from "./lineGapStrategy"

describe("groupRowsIntoLines", () => {
  it("keeps prototype-key series and first-seen order", () => {
    const rows = [
      { x: 1, role: "constructor" },
      { x: 2, role: "constructor" },
      { x: 3, role: "toString" },
      { x: 4, role: "10" },
      { x: 5, role: "2" },
      { x: 6, role: "__proto__" },
    ]
    const lines = groupRowsIntoLines(rows, "coordinates", (row) => row.role, (line, key) => {
      line.role = key
    })
    expect(lines.map((line) => line.role)).toEqual(["constructor", "toString", "10", "2", "__proto__"])
    expect(lines[0].coordinates).toHaveLength(2)
    expect(lines[0].coordinates[1].x).toBe(2)
  })
})

describe("groupLineChartRows", () => {
  it("copies a string group field and forecast segment onto the line", () => {
    const rows = [
      { x: 1, y: 1, series: "A", __segment: "forecast" },
      { x: 2, y: 2, series: "A", __segment: "forecast" },
    ]
    const [line] = groupLineChartRows(rows, {
      lineDataAccessor: "coordinates",
      groupAccessor: "series",
      lineBy: "series",
      segmentField: "__segment",
    })
    expect(line.series).toBe("A")
    expect(line.__segment).toBe("forecast")
    expect(line.coordinates).toHaveLength(2)
  })
})

describe("applyLineGapStrategy zero", () => {
  const lineData = [{
    coordinates: [
      { x: 1, metrics: { p95: 1 } },
      { x: 2, metrics: { p95: null } },
      { x: 3, metrics: { p95: 3 } },
    ],
  }]
  const isGap = (d: Datum) => d.metrics.p95 == null

  it("writes a string y field onto a copy", () => {
    const source = [{ coordinates: [{ x: 1, y: 4 }, { x: 2, y: null }] }]
    const gap = source[0].coordinates[1]
    const result = applyLineGapStrategy({
      lineData: source,
      strategy: "zero",
      lineDataAccessor: "coordinates",
      isGap: (d) => d.y == null,
      yField: "y",
      seriesOfLine: () => "",
    })
    expect(result.lines[0].coordinates[0]).toBe(source[0].coordinates[0])
    expect(result.lines[0].coordinates[1]).not.toBe(gap)
    expect(result.lines[0].coordinates[1].y).toBe(0)
    expect(gap.y).toBeNull()
  })

  it("marks function-accessor gaps without copying the row", () => {
    const gap = lineData[0].coordinates[1]
    const result = applyLineGapStrategy({
      lineData,
      strategy: "zero",
      lineDataAccessor: "coordinates",
      isGap,
      seriesOfLine: () => "",
    })
    expect(result.lines[0].coordinates[1]).toBe(gap)
    const readY = yAccessorForZeroedGaps((d: Datum) => d.metrics.p95, isGap)
    expect(typeof readY).toBe("function")
    if (typeof readY !== "function") return
    expect(readY(gap)).toBe(0)
    expect(readY(lineData[0].coordinates[0])).toBe(1)
  })
})

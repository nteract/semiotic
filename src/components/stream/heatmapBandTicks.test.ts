import { describe, expect, it } from "vitest"
import {
  heatmapBandScale,
  invertHeatmapBandValue,
  projectHeatmapBandComputedValue,
  projectHeatmapBandDataValue,
  projectHeatmapBandValue
} from "./heatmapBandTicks"

describe("heatmap band coordinates", () => {
  const columns = heatmapBandScale([10, 20, 30], [0, 300])

  it("projects a data key onto the cell center", () => {
    expect(projectHeatmapBandValue(columns, 20)).toBeCloseTo(150)
    expect(projectHeatmapBandValue(columns, 15)).toBeNull()
    expect(projectHeatmapBandComputedValue(columns, 15)).toBeCloseTo(100)
    expect(projectHeatmapBandComputedValue(columns, "low")).toBeNull()
  })

  it("inverts a brushed cell to the data keys on either side of its center", () => {
    const left = columns.invert(100)
    const right = columns.invert(200)
    expect(left).toBeCloseTo(0.5)
    expect(right).toBeCloseTo(1.5)
    expect(invertHeatmapBandValue(columns, 100)).toBeCloseTo(15)
    expect(invertHeatmapBandValue(columns, 200)).toBeCloseTo(25)
    expect(projectHeatmapBandDataValue(columns, 15)).toBeCloseTo(100)
    expect(projectHeatmapBandDataValue(columns, 25)).toBeCloseTo(200)
  })

  it("inverts date bands to timestamps", () => {
    const first = new Date(Date.UTC(2024, 0, 1))
    const second = new Date(Date.UTC(2024, 0, 3))
    const dates = heatmapBandScale([first, second], [0, 100])
    const mid = dates.invert(50)
    expect(invertHeatmapBandValue(dates, 50)).toBeCloseTo(
      first.getTime() + (mid - 0) * (second.getTime() - first.getTime())
    )
  })

  it("keeps a single key wider than a point", () => {
    const column = heatmapBandScale([10], [0, 300])
    expect(invertHeatmapBandValue(column, 0)).toBeCloseTo(9.5)
    expect(invertHeatmapBandValue(column, 300)).toBeCloseTo(10.5)
    expect(invertHeatmapBandValue(column, 150)).toBeCloseTo(10)
    expect(projectHeatmapBandDataValue(column, 9.5)).toBeCloseTo(0)
    expect(projectHeatmapBandDataValue(column, 10.5)).toBeCloseTo(300)
    const day = new Date(Date.UTC(2024, 0, 1))
    const dateColumn = heatmapBandScale([day], [0, 300])
    expect(invertHeatmapBandValue(dateColumn, 0)).toBeCloseTo(day.getTime() - 0.5)
    expect(invertHeatmapBandValue(dateColumn, 300)).toBeCloseTo(day.getTime() + 0.5)
  })

  it("interpolates descending numeric keys", () => {
    const columns = heatmapBandScale([30, 20, 10], [0, 300])
    expect(projectHeatmapBandDataValue(columns, 25)).toBeCloseTo(columns(0.5))
    expect(projectHeatmapBandDataValue(columns, 25)).toBeCloseTo(columns(0.5))
    expect(projectHeatmapBandDataValue(columns, 5)).toBeCloseTo(columns(2.5))
    expect(projectHeatmapBandDataValue(columns, 35)).toBeCloseTo(columns(-0.5))
  })

  it("returns the cell index for categorical bands", () => {
    const rows = heatmapBandScale(["low", "high"], [200, 0])
    expect(invertHeatmapBandValue(rows, 50)).toBeCloseTo(rows.invert(50))
  })
})

import { describe, expect, it } from "vitest"
import {
  EARTHQUAKES,
  INITIAL_ROTATE,
  MAGNITUDE_BINS,
  filterFacing,
  formatDateTime,
  formatStrongestCaption,
  isEarthquakeDatum,
  isFacingViewer,
  magnitudeBinId,
  summarizeFacing,
  toValidDate,
} from "./earthquakes.js"

describe("earthquakes fixture", () => {
  it("ships a frozen M6+ catalog covering 2021–2025", () => {
    expect(EARTHQUAKES.length).toBeGreaterThan(200)
    expect(EARTHQUAKES.every((event) => event.magnitude >= 6)).toBe(true)
    const years = EARTHQUAKES.map((event) => new Date(event.time).getUTCFullYear())
    expect(Math.min(...years)).toBe(2021)
    expect(Math.max(...years)).toBe(2025)
  })

  it("embeds the South Sandwich M8.1 landmark and a deep hypocenter", () => {
    const landmark = EARTHQUAKES.find((event) => event.id === "us7000f93v")
    expect(landmark).toBeTruthy()
    expect(landmark.magnitude).toBe(8.1)
    expect(landmark.region).toMatch(/South Sandwich/)
    const strongest = EARTHQUAKES.reduce((a, b) => (a.magnitude >= b.magnitude ? a : b))
    expect(strongest.magnitude).toBe(8.1)
    const deepest = EARTHQUAKES.reduce((a, b) => (a.depth >= b.depth ? a : b))
    expect(deepest.depth).toBeGreaterThanOrEqual(600)
  })

  it("filters the front hemisphere from a rotation", () => {
    const facing = filterFacing(EARTHQUAKES, INITIAL_ROTATE)
    expect(facing.length).toBeGreaterThan(50)
    expect(facing.length).toBeLessThan(EARTHQUAKES.length)
    expect(facing.every((event) => isFacingViewer(event, INITIAL_ROTATE))).toBe(true)

    const antipode = [INITIAL_ROTATE[0] + 180, -INITIAL_ROTATE[1], 0]
    const other = filterFacing(EARTHQUAKES, antipode)
    // Facing sets should differ when the globe is flipped.
    expect(other.map((e) => e.id).sort().join(",")).not.toBe(facing.map((e) => e.id).sort().join(","))
  })

  it("summarizes magnitude bins, top regions, and quarterly series", () => {
    const summary = summarizeFacing(filterFacing(EARTHQUAKES, INITIAL_ROTATE))
    expect(summary.count).toBeGreaterThan(0)
    expect(summary.byMagnitude).toHaveLength(MAGNITUDE_BINS.length)
    expect(summary.byMagnitude.reduce((sum, row) => sum + row.count, 0)).toBe(summary.count)
    expect(summary.byRegion.length).toBeGreaterThan(0)
    expect(summary.byRegion.length).toBeLessThanOrEqual(4)
    expect(summary.byQuarter).toHaveLength(20)
    expect(summary.strongest.magnitude).toBeGreaterThanOrEqual(6)
    expect(magnitudeBinId(6.2)).toBe("m6")
    expect(magnitudeBinId(7.8)).toBe("m75")
  })

  it("never throws Invalid time value on bad hover payloads", () => {
    expect(toValidDate(undefined)).toBeNull()
    expect(toValidDate(null)).toBeNull()
    expect(toValidDate(Number.NaN)).toBeNull()
    expect(toValidDate("not-a-date")).toBeNull()
    expect(formatDateTime(undefined)).toBe("—")
    expect(formatDateTime(null)).toBe("—")
    expect(formatDateTime(Number.NaN)).toBe("—")
    expect(formatDateTime("bogus")).toBe("—")
    expect(formatStrongestCaption(null)).toBe("—")
    expect(formatStrongestCaption({ place: "Chile", region: "Chile" })).toMatch(/Chile/)
    expect(isEarthquakeDatum({ magnitude: 6.2, lon: 1, lat: 2 })).toBe(true)
    expect(isEarthquakeDatum({ name: "Germany", properties: {} })).toBe(false)
    // Regression: Date#toISOString throws RangeError("Invalid time value")
    expect(() => formatDateTime(undefined)).not.toThrow()
    expect(() => formatDateTime(new Date("invalid"))).not.toThrow()
  })
})

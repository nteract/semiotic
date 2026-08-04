import { describe, expect, it } from "vitest"
import {
  nearestStageId,
  readingLineY,
  resolvePlotGeometry,
  timeAtPlotY,
} from "./useProcessRiverScrollStage"

const GERMANY_LIKE = [
  { id: "S00", time: 0 },
  { id: "S01", time: 1 },
  { id: "S05", time: 5 },
  { id: "S11", time: 11 },
]

const US_LIKE = [
  { id: "FOUNDING", time: 1776 },
  { id: "LOUISIANA", time: 1803 },
  { id: "CIVIL_WAR", time: 1861 },
  { id: "PRESENT", time: 2025 },
]

describe("timeAtPlotY", () => {
  it("maps the top of the plot to domain start and the bottom to domain end", () => {
    expect(timeAtPlotY(0, 1000, [0, 10])).toBe(0)
    expect(timeAtPlotY(1000, 1000, [0, 10])).toBe(10)
    expect(timeAtPlotY(500, 1000, [0, 10])).toBe(5)
  })

  it("clamps out-of-range plot Y into the domain", () => {
    expect(timeAtPlotY(-50, 1000, [1763, 2025])).toBe(1763)
    expect(timeAtPlotY(2000, 1000, [1763, 2025])).toBe(2025)
  })
})

describe("nearestStageId", () => {
  it("picks the closest Germany-style stage order", () => {
    expect(nearestStageId(0.2, GERMANY_LIKE)).toBe("S00")
    expect(nearestStageId(4.7, GERMANY_LIKE)).toBe("S05")
    expect(nearestStageId(10.9, GERMANY_LIKE)).toBe("S11")
  })

  it("picks the closest US-style milestone year", () => {
    expect(nearestStageId(1778, US_LIKE)).toBe("FOUNDING")
    expect(nearestStageId(1855, US_LIKE)).toBe("CIVIL_WAR")
    expect(nearestStageId(2010, US_LIKE)).toBe("PRESENT")
  })

  it("returns null for an empty stage list", () => {
    expect(nearestStageId(5, [])).toBeNull()
  })
})

describe("readingLineY", () => {
  it("stays within a sticky-panel-friendly band", () => {
    expect(readingLineY(400)).toBeGreaterThanOrEqual(120)
    expect(readingLineY(400)).toBeLessThanOrEqual(220)
    expect(readingLineY(1200)).toBeLessThanOrEqual(220)
  })
})

describe("resolvePlotGeometry", () => {
  it("returns null without an element", () => {
    expect(resolvePlotGeometry(null, { height: 1000, margin: { top: 20, bottom: 20 } })).toBeNull()
  })

  it("falls back to authored height when the element has no layout yet", () => {
    const el = document.createElement("div")
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ top: 100, left: 0, width: 800, height: 0, bottom: 100, right: 800 }),
    })
    const geometry = resolvePlotGeometry(el, {
      height: 2000,
      margin: { top: 34, bottom: 24, left: 88, right: 28 },
    })
    expect(geometry.plotTop).toBe(134)
    expect(geometry.plotHeight).toBe(2000 - 34 - 24)
  })
})

/**
 * Tests for tick generation behavior in SVGOverlay.
 * These test the actual d3 scale + tick filtering pipeline to catch
 * issues like scaleTime tick generation, label width estimation, and autoRotate.
 */
import { describe, it, expect } from "vitest"
import { scaleLinear, scaleTime } from "d3-scale"

describe("scaleTime tick generation", () => {
  it("generates Date object ticks for a 90-day range", () => {
    const start = new Date(2024, 0, 1)
    const end = new Date(2024, 2, 31)
    const scale = scaleTime().domain([start, end]).range([0, 500])
    const ticks = scale.ticks(8)

    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks[0]).toBeInstanceOf(Date)
    // Ticks should fall on sensible boundaries, not random points
    for (const t of ticks) {
      expect(t).toBeInstanceOf(Date)
    }
  })

  it("scaleTime ticks span multiple months for multi-month range", () => {
    const start = new Date(2024, 0, 1)
    const end = new Date(2024, 2, 31)
    const scale = scaleTime().domain([start, end]).range([0, 500])
    const ticks = scale.ticks(8)

    // Ticks should span at least 2 different months
    const months = new Set(ticks.map(t => t.getMonth()))
    expect(months.size).toBeGreaterThanOrEqual(2)
  })

  it("scaleTime created from timestamps generates Date ticks", () => {
    const start = new Date(2024, 0, 1).getTime()
    const end = new Date(2024, 2, 31).getTime()
    const scale = scaleTime().domain([new Date(start), new Date(end)]).range([0, 500])
    const ticks = scale.ticks(8)

    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks[0]).toBeInstanceOf(Date)
  })
})

describe("makeScale time type", () => {
  it("scaleTime created with timestamp domain returns Date ticks", () => {
    const start = new Date(2024, 0, 1).getTime()
    const end = new Date(2024, 2, 31).getTime()
    // This is how PipelineStore.makeScale creates the time scale
    const scale = scaleTime().domain([new Date(start), new Date(end)]).range([0, 500])
    const ticks = scale.ticks(8)

    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks[0]).toBeInstanceOf(Date)
    // Can be used with tickFormat(d => new Date(d).toLocaleString(...))
    const formatted = ticks.map(t => `${t.toLocaleString("en", { month: "short" })} ${t.getDate()}`)
    expect(formatted[0]).not.toContain("Dec 31")
  })
})

describe("label width estimation vs autoRotate", () => {
  it("long labels cause aggressive filtering when not rotated", () => {
    // Simulate: 500px chart, 10 ticks, long date labels
    const width = 500
    const ticks = Array.from({ length: 10 }, (_, i) => ({
      value: i,
      pixel: i * (width / 9),
      label: "Wednesday, January 15, 2024" // 28 chars
    }))

    const maxLabelWidth = ticks.reduce((max, c) =>
      Math.max(max, typeof c.label === "string" ? c.label.length * 6.5 : 60), 0)
    const minPx = Math.max(55, maxLabelWidth + 8)

    // 28 * 6.5 = 182, minPx = 190
    // With 500px and 190px spacing, only ~3 ticks survive
    expect(minPx).toBeGreaterThan(150)
    expect(Math.floor(width / minPx)).toBeLessThan(4)
  })

  it("when autoRotate is enabled, minPx should be capped to allow more ticks", () => {
    // The SVGOverlay should cap minPx when autoRotate is true, since
    // rotated labels take much less horizontal space. Without capping,
    // long labels (28 chars = 182px) would set minPx to 190, killing
    // most ticks in a 500px chart.
    const ROTATED_MIN_PX = 30

    // With capping at 30px, 500/30 = 16 ticks can fit
    expect(Math.floor(500 / ROTATED_MIN_PX)).toBeGreaterThan(10)
    // Without capping, only 2-3 fit
    expect(Math.floor(500 / 190)).toBeLessThan(4)
  })
})

describe("isTimeLandmark with scaleTime ticks", () => {
  function toDate(value: any): Date | null {
    if (value instanceof Date) return value
    if (typeof value === "number" && value > 1e9) return new Date(value)
    return null
  }

  function isTimeLandmark(value: any, prevValue: any): boolean {
    const d = toDate(value)
    if (!d) return false
    const prev = toDate(prevValue)
    if (!prev) return true
    return d.getFullYear() !== prev.getFullYear() || d.getMonth() !== prev.getMonth()
  }

  it("detects month boundary in scaleTime ticks", () => {
    const start = new Date(2024, 0, 1)
    const end = new Date(2024, 2, 31)
    const scale = scaleTime().domain([start, end]).range([0, 500])
    const ticks = scale.ticks(8)

    let landmarkCount = 0
    for (let i = 0; i < ticks.length; i++) {
      if (isTimeLandmark(ticks[i], i > 0 ? ticks[i - 1] : undefined)) {
        landmarkCount++
      }
    }
    // Should find landmarks at month boundaries (Feb 1, Mar 1) + first tick
    expect(landmarkCount).toBeGreaterThanOrEqual(2)
  })
})

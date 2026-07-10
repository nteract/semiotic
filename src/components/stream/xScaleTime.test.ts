/**
 * Integration test: verify that PipelineStore with xScaleType="time"
 * produces Date-instance ticks from scaleTime, NOT scaleLinear number ticks.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"

describe("PipelineStore xScaleType=time integration", () => {
  it("produces Date ticks when xScaleType is time", () => {
    // Create 90 days of data with millisecond timestamps
    const data = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(2024, 0, 1 + i)
      return { date: d.getTime(), value: 100 + Math.sin(i * 0.1) * 40 }
    })

    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "date",
      yAccessor: "value",
      xScaleType: "time",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.05,
    })

    // Ingest bounded data
    store.ingest({ inserts: data, bounded: true })

    // Force scale computation
    const layout = { width: 600, height: 300 }
    // Call computeScene to trigger scale building
    store.computeScene(layout)

    expect(store.scales).not.toBeNull()
    const xScale = store.scales!.x

    // scaleTime.ticks() should return Date objects
    const ticks = xScale.ticks(8)
    expect(ticks.length).toBeGreaterThan(2)

    // ticks must be Date instances, not numbers
    expect(ticks[0]).toBeInstanceOf(Date)

    // Format check: should produce real dates, not "Dec 31"
    const formatted = ticks.map(t => {
      const d = new Date(t)
      return `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`
    })
    // None should say "Dec 31" (that would mean scaleLinear was used)
    const dec31Count = formatted.filter(f => f.includes("Dec 31")).length
    expect(dec31Count).toBe(0)
  })

  it("parses ISO year-month strings for time-scale line charts", () => {
    const data = [
      { month: "2026-01", value: 10 },
      { month: "2026-02", value: 20 },
      { month: "2026-03", value: 15 },
    ]

    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "month",
      yAccessor: "value",
      xScaleType: "time",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.05,
    })

    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 600, height: 300 })

    expect(store.xIsDate).toBe(true)
    expect(store.scales).not.toBeNull()
    const ticks = store.scales!.x.ticks(4)
    expect(ticks[0]).toBeInstanceOf(Date)

    const lineNode = store.scene.find((node) => node.type === "line")
    expect(lineNode?.type).toBe("line")
    if (lineNode?.type === "line") {
      expect(lineNode.path).toHaveLength(3)
      expect(lineNode.path.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true)
    }
  })

  it("produces number ticks (NOT Date) when xScaleType is NOT set", () => {
    const data = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(2024, 0, 1 + i)
      return { date: d.getTime(), value: 100 + Math.sin(i * 0.1) * 40 }
    })

    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "date",
      yAccessor: "value",
      // NO xScaleType — defaults to linear
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0.05,
    })

    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 600, height: 300 })

    expect(store.scales).not.toBeNull()
    const ticks = store.scales!.x.ticks(8)
    expect(ticks.length).toBeGreaterThan(2)

    // Without xScaleType="time", ticks are numbers, NOT Dates
    expect(ticks[0]).not.toBeInstanceOf(Date)
    expect(typeof ticks[0]).toBe("number")
  })
})

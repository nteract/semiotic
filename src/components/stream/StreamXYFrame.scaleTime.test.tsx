/**
 * Integration test: verify PipelineStore + scaleTime produce correct Date ticks.
 * Note: Full StreamXYFrame rendering requires canvas (not available in jsdom),
 * so we test the pipeline directly instead of the rendered component.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"

describe("PipelineStore xScaleType=time produces Date ticks", () => {
  it("creates scaleTime with Date-instance ticks for timestamp data", () => {
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
      extentPadding: 0.05,
    })

    store.ingest({ inserts: data, bounded: true })

    // computeScene triggers scale building
    ;(store as any).computeScene({ width: 600, height: 300 })

    expect(store.scales).not.toBeNull()
    const ticks = store.scales!.x.ticks(8)

    // scaleTime ticks are Date instances
    expect(ticks.length).toBeGreaterThan(2)
    expect(ticks[0]).toBeInstanceOf(Date)

    // Ticks should span Jan–Mar 2024, not Dec 1969
    const months = new Set(ticks.map((t: Date) => t.getMonth()))
    expect(months.size).toBeGreaterThanOrEqual(2) // at least 2 different months

    // No tick should format to "Dec 31" (which would indicate scaleLinear fallback)
    for (const t of ticks) {
      const d = new Date(t)
      const label = `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`
      expect(label).not.toBe("Dec 31")
    }
  })

  it("uses empty-time-fallback domain (not [0,1]) when no data ingested", () => {
    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "date",
      yAccessor: "value",
      xScaleType: "time",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0.05,
    })

    // No data ingested — force scale computation
    ;(store as any).computeScene({ width: 600, height: 300 })

    expect(store.scales).not.toBeNull()
    const domain = store.scales!.x.domain()
    // Should NOT be [0, 1] (which produces Dec 31 1969 ticks)
    // Should be a recent time range
    const d0 = new Date(domain[0])
    expect(d0.getFullYear()).toBeGreaterThanOrEqual(2020)
  })

  it("produces number ticks (not Date) when xScaleType is unset", () => {
    const data = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(2024, 0, 1 + i)
      return { date: d.getTime(), value: 100 + Math.sin(i * 0.1) * 40 }
    })

    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "date",
      yAccessor: "value",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0.05,
    })

    store.ingest({ inserts: data, bounded: true })
    ;(store as any).computeScene({ width: 600, height: 300 })

    const ticks = store.scales!.x.ticks(8)
    expect(ticks[0]).not.toBeInstanceOf(Date)
    expect(typeof ticks[0]).toBe("number")
  })
})

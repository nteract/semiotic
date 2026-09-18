import { describe, it, expect } from "vitest"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { CHART_CONFIGS } from "./serverChartConfigs"
import { WindowAccumulator, statValue } from "../realtime/WindowAccumulator"

const points = Array.from({ length: 12 }, (_, i) => ({
  time: i * 10_000,
  value: i + 1
}))

describe("realtime controlled-data SSR", () => {
  it.each([
    "RealtimeLineChart",
    "RealtimeHistogram",
    "RealtimeHeatmap",
    "RealtimeSwarmChart",
    "RealtimeWaterfallChart"
  ] as const)("%s honors custom accessors and fixed domains", (component) => {
    const { evidence } = renderChartWithEvidence(component, {
      data: points.map((d) => ({ ts: d.time, amount: d.value })),
      timeAccessor: "ts",
      valueAccessor: "amount",
      timeExtent: [0, 200_000],
      valueExtent: [0, 100],
      binSize: 10_000
    })
    expect(evidence.status).toBe("ok")
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(evidence.xDomain).toEqual([0, 200_000])
    expect(evidence.yDomain).toEqual([0, 100])
  })

  it("forwards heatmap aggregation and custom color scales", () => {
    const seen: number[] = []
    const { evidence, svg } = renderChartWithEvidence("RealtimeHeatmap", {
      data: [
        { time: 1, value: 3 },
        { time: 2, value: 4 }
      ],
      heatmapXBins: 1,
      heatmapYBins: 1,
      aggregation: "sum",
      colorScheme: "custom",
      customColorScale: (value: number) => {
        seen.push(value)
        return "#123abc"
      }
    })
    expect(evidence.markCountByType.heatcell).toBe(1)
    expect(seen).toContain(7)
    expect(svg).toContain("#123abc")
  })

  it("renders the aggregate envelope and honors custom aggregate accessors", () => {
    const { evidence } = renderChartWithEvidence("RealtimeLineChart", {
      data: points.map((d) => ({ ts: d.time, amount: d.value })),
      timeAccessor: "ts",
      valueAccessor: "amount",
      aggregate: { size: 30_000, stat: "mean", band: "minmax" }
    })
    expect(evidence.status).toBe("ok")
    expect(evidence.markCountByType).toMatchObject({ line: 1 })
    expect(evidence.markCount).toBeGreaterThan(1)
  })

  it.each([
    "RealtimeLineChart",
    "RealtimeHistogram",
    "RealtimeHeatmap",
    "RealtimeSwarmChart",
    "RealtimeWaterfallChart"
  ] as const)("%s resolves retention aliases consistently", (component) => {
    const mapped = CHART_CONFIGS[component].buildProps(
      points,
      undefined,
      undefined,
      {},
      {
        capacity: 5,
        capacityMode: "sliding"
      }
    )
    expect(mapped.windowSize).toBe(5)
    expect(mapped.windowMode).toBe("sliding")
  })

  it("preserves swarm mark styling", () => {
    const { svg } = renderChartWithEvidence("RealtimeSwarmChart", {
      data: points,
      fill: "#123abc",
      radius: 9,
      opacity: 0.4
    })
    expect(svg).toContain('fill="#123abc"')
    expect(svg).toContain('r="9"')
    expect(svg).toContain('opacity="0.4"')
  })

  it.each([
    "RealtimeSwarmChart",
    "RealtimeHistogram",
    "TemporalHistogram"
  ] as const)(
    "%s keeps explicit category colors and the fallback fill",
    (component) => {
      const { svg, evidence } = renderChartWithEvidence(component, {
        data: [
          { time: 1, value: 3, category: "a" },
          { time: 2, value: 4, category: "b" }
        ],
        categoryAccessor: (d: { category: string }) => d.category,
        colors: { a: "#123abc" },
        fill: "#abcdef",
        binSize: 10
      })
      expect(evidence.markCount).toBe(2)
      expect(svg).toContain('fill="#123abc"')
      expect(svg).toContain('fill="#abcdef"')
    }
  )

  it("keeps realtime series separate in server renders", () => {
    const { evidence } = renderChartWithEvidence("RealtimeLineChart", {
      data: [
        { time: 1, value: 1, series: "a" },
        { time: 2, value: 2, series: "a" },
        { time: 1, value: 3, series: "b" },
        { time: 2, value: 4, series: "b" }
      ],
      seriesAccessor: "series"
    })
    expect(evidence.markCountByType.line).toBe(2)
  })

  it("keeps aggregate series and their envelopes separate", () => {
    const data = [
      { time: 1, value: 10, series: "a" },
      { time: 2, value: 20, series: "a" },
      { time: 1, value: 100, series: "b" },
      { time: 2, value: 200, series: "b" },
      { time: 11, value: 30, series: "a" },
      { time: 11, value: 300, series: "b" }
    ]
    const props = {
      data,
      seriesAccessor: "series",
      aggregate: { size: 10, band: "minmax" }
    }
    const { evidence } = renderChartWithEvidence("RealtimeLineChart", props)
    expect(evidence.markCountByType).toMatchObject({ line: 2, area: 2 })
    expect(evidence.yDomain?.[1]).toBeGreaterThanOrEqual(300)
  })
  it("renders RealtimeLineChart from a bounded data array", () => {
    const svg = renderChart("RealtimeLineChart", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      size: [400, 200]
    })
    expect(svg).toContain("<svg")
    expect(svg).toMatch(/<path|<line|<circle/)
  })

  it("aggregates rows with WindowAccumulator before drawing", () => {
    const aggregate = {
      stat: "mean" as const,
      size: 30_000,
      percentiles: [0.95]
    }
    const svg = renderChart("RealtimeLineChart", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      aggregate,
      size: [400, 200]
    })
    expect(svg).toContain("<svg")

    const acc = new WindowAccumulator({ size: 30_000, percentiles: [0.95] })
    for (const point of points) acc.push(point.time, point.value)
    const means = acc.emit().map((row) => statValue(row, "mean"))
    expect(means.length).toBeGreaterThan(0)
    expect(means.every((value) => Number.isFinite(value))).toBe(true)
  })

  it("renders RealtimeHistogram from controlled data", () => {
    const svg = renderChart("RealtimeHistogram", {
      data: points,
      timeAccessor: "time",
      valueAccessor: "value",
      size: [400, 200]
    })
    expect(svg).toContain("<svg")
  })
})

import { describe, it, expect } from "vitest"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { CHART_CONFIGS } from "./serverChartConfigs"
import { WindowAccumulator, statValue } from "../realtime/WindowAccumulator"

const points = Array.from({ length: 12 }, (_, i) => ({
  time: i * 10_000,
  value: i + 1
}))

describe("realtime controlled-data SSR", () => {
  it.each(["p50", "p95", "distinct"])(
    "renders %s aggregate readouts with data-mark evidence",
    (stat) => {
      const { evidence } = renderChartWithEvidence("RealtimeLineChart", {
        data: [
          { time: 1, value: 10 },
          { time: 2, value: 20 },
          { time: 21, value: 30 },
          { time: 22, value: 30 }
        ],
        extentPadding: 0,
        aggregate: {
          window: "session",
          size: 5,
          stat,
          percentiles: [0.5, 0.95],
          distinct: true
        }
      })
      expect(evidence.status).toBe("ok")
      expect(evidence.markCountByType.line).toBe(1)
      const expected =
        stat === "distinct" ? [1, 2] : stat === "p50" ? [15, 30] : [20, 30]
      expect(evidence.yDomain).toEqual(expected)
    }
  )
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

  it.each([undefined, { size: 10 }])(
    "colours and lists each RealtimeLineChart series (aggregate %o)",
    (aggregate) => {
      const rows = ["cpu", "mem", "disk"].flatMap((series, i) => [
        { time: 1, value: i, series },
        { time: 2, value: i + 1, series }
      ])
      const lineStrokes = (svg: string) =>
        (svg.match(/<path[^>]*fill="none" stroke="([^"]+)"/g) ?? []).map(
          (path) => /stroke="([^"]+)"/.exec(path)?.[1]
        )
      const svg = renderChart("RealtimeLineChart", {
        data: rows,
        seriesAccessor: "series",
        aggregate,
        size: [400, 200]
      })
      const strokes = lineStrokes(svg)
      expect(strokes).toHaveLength(3)
      expect(new Set(strokes).size).toBe(3)
      for (const series of ["cpu", "mem", "disk"]) {
        expect(svg).toContain(`>${series}</text>`)
      }

      const stroked = renderChart("RealtimeLineChart", {
        data: rows,
        seriesAccessor: "series",
        aggregate,
        stroke: "#123456",
        showLegend: false,
        size: [400, 200]
      })
      expect(new Set(lineStrokes(stroked))).toEqual(new Set(["#123456"]))
      expect(stroked).not.toContain(">cpu</text>")
    }
  )

  it("keeps a long right-edge time label inside the SVG", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ time: i, value: i }))
    const svg = renderChart("RealtimeLineChart", {
      data: rows,
      size: [400, 200],
      margin: { right: 10 },
      timeExtent: [0, 50],
      tickFormatTime: (v: number) => `10/24/2026 10:50:${v} AM`
    })
    const labels = [
      ...svg.matchAll(/<text (?:x="([^"]+)" )?y="18"[^>]*>([^<]+)<\/text>/g)
    ]
    const last = labels.at(-1)!
    // Centred at the plot's right edge, half a 0.6em-per-glyph label (12px)
    // would cross the 10px right margin; the label is pulled back by that much.
    const halfWidth = (last[2].length * 7.2) / 2
    expect(Number(last[1])).toBeCloseTo(10 - halfWidth, 1)
  })

  it("stops a right-edge time label before a right-side series legend", () => {
    const rows = ["a", "b", "c"].flatMap((series, s) =>
      Array.from({ length: 5 }, (_, i) => ({ time: i * 10, value: s + i, series }))
    )
    const svg = renderChart("RealtimeLineChart", {
      data: rows,
      seriesAccessor: "series",
      size: [600, 220],
      timeExtent: [0, 40],
      tickFormatTime: (v: number) => `${v} seconds`
    })
    const labels = [
      ...svg.matchAll(/<text (?:x="([^"]+)" )?y="18"[^>]*>([^<]+)<\/text>/g)
    ]
    const last = labels.at(-1)!
    expect(last[2]).toBe("40 seconds")
    // The legend starts 10px (its default distance) past the plot edge, so a
    // centred label may reach at most that far right.
    const halfWidth = (last[2].length * 7.2) / 2
    expect(Number(last[1])).toBeCloseTo(10 - halfWidth, 1)
  })

  it.each(["RealtimeLineChart", "RealtimeSwarmChart", "RealtimeHistogram"] as const)(
    "%s labels epoch-ms numeric time as distinct clock times",
    (component) => {
      const t0 = Date.UTC(2026, 9, 24, 13, 0, 16, 123)
      const rows = Array.from({ length: 300 }, (_, i) => ({
        time: t0 + i * 4,
        value: i % 7
      }))
      const svg = renderChart(component, {
        data: rows,
        windowSize: 300,
        binSize: 100,
        size: [600, 200]
      })
      const labels = [
        ...svg.matchAll(/<text (?:x="[^"]+" )?y="18"[^>]*>([^<]+)<\/text>/g)
      ].map((match) => match[1])
      expect(labels.length).toBeGreaterThan(1)
      expect(new Set(labels).size).toBe(labels.length)
      for (const label of labels) expect(label).toMatch(/^13:00:1\d\.\d{3}$/)
    }
  )

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

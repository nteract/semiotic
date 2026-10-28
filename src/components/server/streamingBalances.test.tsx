import { renderChartWithEvidence } from "./renderToStaticSVG"
import type { Datum } from "../charts/shared/datumTypes"

it.each(["WaterfallChart", "RealtimeWaterfallChart"])(
  "renders %s initial balances with matching geometry and scale evidence",
  (component) => {
    const bars: number[][] = []
    const { svg, evidence } = renderChartWithEvidence(component, {
      data: [
        { time: 0, value: 10 },
        { time: 1, value: -5 },
        { time: 2, value: 20 }
      ],
      xAccessor: "time",
      yAccessor: "value",
      timeAccessor: "time",
      valueAccessor: "value",
      initialValue: 100,
      extentPadding: 0,
      width: 400,
      height: 300,
      title: "Account changes",
      description: "Starting balance 100, ending balance 125.",
      accessibleTable: true,
      frameProps: {
        extentPadding: 0,
        areaStyle: (row: Datum) => {
          bars.push([row.baseline, row.cumEnd])
          return { fill: "#123456" }
        }
      }
    })
    expect(bars).toEqual([
      [100, 110],
      [110, 105],
      [105, 125]
    ])
    expect(evidence.markCountByType.rect).toBe(3)
    expect(evidence.yDomain).toEqual([0, 125])
    expect(svg).toContain("#123456")
    expect(svg).not.toContain("NaN")
  }
)

it("keeps the complete bounded aggregate on the server and automatically enables percentile sketches", () => {
  const result = renderChartWithEvidence("RealtimeLineChart", {
    data: Array.from({ length: 250 }, (_, time) => ({
      time: time * 1000,
      value: time + 1
    })),
    aggregate: { size: 1000, stat: "p95" },
    windowSize: 3,
    width: 500,
    height: 250,
    title: "Latency",
    description: "One percentile per interval.",
    accessibleTable: true
  })
  expect(result.evidence.empty).toBe(false)
  expect(result.evidence.xDomain).toEqual([500, 249500])
  expect(result.svg).not.toContain("NaN")
})

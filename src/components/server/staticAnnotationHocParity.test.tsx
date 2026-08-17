/**
 * HOC-level annotation sugar must reach the static renderer as well as the
 * live Stream frames. These cases deliberately exercise every chart config
 * that synthesizes trend / statistical annotations rather than asking callers
 * to write the lower-level `annotations` array themselves.
 */
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const xyData = [
  { x: 0, y: 2, size: 4 },
  { x: 1, y: 4, size: 7 },
  { x: 2, y: 5, size: 10 },
  { x: 3, y: 8, size: 13 },
  { x: 4, y: 9, size: 16 },
]

const ordinalData = [
  { category: "A", value: 2 },
  { category: "B", value: 4 },
  { category: "C", value: 5 },
  { category: "D", value: 8 },
]

describe("static HOC annotation parity", () => {
  it("preserves regression sugar for every HOC that advertises it", () => {
    const cases = [
      {
        component: "Scatterplot",
        props: { data: xyData, xAccessor: "x", yAccessor: "y" },
        label: "Scatter trend",
      },
      {
        component: "BubbleChart",
        props: { data: xyData, xAccessor: "x", yAccessor: "y", sizeBy: "size" },
        label: "Bubble trend",
      },
      {
        component: "ConnectedScatterplot",
        props: { data: xyData, xAccessor: "x", yAccessor: "y", orderAccessor: "x" },
        label: "Connected trend",
      },
      {
        component: "BarChart",
        props: { data: ordinalData, categoryAccessor: "category", valueAccessor: "value" },
        label: "Bar trend",
      },
      {
        component: "DotPlot",
        props: { data: ordinalData, categoryAccessor: "category", valueAccessor: "value" },
        label: "Dot trend",
      },
    ]

    for (const chart of cases) {
      const { svg, evidence } = renderChartWithEvidence(chart.component, {
        ...chart.props,
        regression: { method: "linear", label: chart.label },
      })
      expect(svg, chart.component).toContain(chart.label)
      expect(evidence.annotationCount, chart.component).toBe(1)
      expect(evidence.unrenderedAnnotationCount, chart.component).toBe(0)
    }
  })

  it("preserves series forecast and anomaly overlays beyond LineChart", () => {
    const cases = [
      {
        component: "Scatterplot",
        props: {
          data: xyData,
          xAccessor: "x",
          yAccessor: "y",
          forecast: { trainEnd: 2, steps: 2, label: "Scatter forecast" },
        },
        label: "Scatter forecast",
      },
      {
        component: "AreaChart",
        props: {
          data: xyData,
          xAccessor: "x",
          yAccessor: "y",
          forecast: { trainEnd: 2, steps: 2, label: "Area forecast" },
        },
        label: "Area forecast",
      },
      {
        component: "ConnectedScatterplot",
        props: {
          data: xyData,
          xAccessor: "x",
          yAccessor: "y",
          anomaly: { threshold: 1, label: "Connected anomalies" },
        },
        label: "Connected anomalies",
      },
    ]

    for (const chart of cases) {
      const { svg, evidence } = renderChartWithEvidence(chart.component, chart.props)
      expect(svg, chart.component).toContain(chart.label)
      expect(evidence.annotationCount, chart.component).toBeGreaterThan(0)
      expect(evidence.unrenderedAnnotationCount, chart.component).toBe(0)
    }
  })
})

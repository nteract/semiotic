import { describe, expect, it } from "vitest"
import { renderChart } from "./renderToStaticSVG"

const distribution = [
  { category: "A", value: 4, group: "one" },
  { category: "A", value: 20, group: "two" },
  { category: "B", value: 8, group: "one" }
]

describe("ordinal styleRules parity (server)", () => {
  it("renders rules for every remaining ordinal chart", () => {
    const styleRules = [{ style: { fill: "#123456", stroke: "#123456" } }]
    const configs: Array<[string, Record<string, unknown>]> = [
      ["SwarmPlot", { data: distribution }],
      ["BoxPlot", { data: distribution }],
      ["Histogram", { data: distribution, bins: 2 }],
      ["ViolinPlot", { data: distribution }],
      ["RidgelinePlot", { data: distribution }],
      ["DotPlot", { data: distribution }],
      ["PieChart", { data: distribution }],
      ["DonutChart", { data: distribution }],
      ["FunnelChart", {
        data: distribution.map((d, index) => ({ ...d, step: `S${index}` })),
        stepAccessor: "step"
      }],
      ["RadarChart", {
        data: distribution.map((d) => ({ ...d, attribute: d.category, series: d.group })),
        categoryAccessor: "attribute",
        seriesAccessor: "series"
      }],
      ["SwimlaneChart", { data: distribution, subcategoryAccessor: "group" }],
      ["LikertChart", {
        data: [{ question: "Q1", level: "Agree", count: 4 }],
        levelAccessor: "level",
        countAccessor: "count",
        levels: ["Disagree", "Agree"]
      }],
      ["GaugeChart", { value: 60 }]
    ]

    for (const [component, config] of configs) {
      const svg = renderChart(component, { ...config, styleRules })
      expect(svg, component).toContain("#123456")
    }
  })

  it("uses displayed statistical, wedge, Likert, and gauge values", () => {
    const box = renderChart("BoxPlot", {
      data: [
        { category: "A", value: 4 },
        { category: "A", value: 20 },
        { category: "A", value: 30 }
      ],
      styleRules: [{ when: { gt: 10 }, style: { fill: "#aa1100" } }]
    })
    const histogram = renderChart("Histogram", {
      data: distribution,
      bins: 1,
      styleRules: [{ when: { gt: 1 }, style: { fill: "#00aa11" } }]
    })
    const pie = renderChart("PieChart", {
      data: [{ category: "debt", value: -20 }],
      styleRules: [{ when: { gt: 10 }, style: { fill: "#0011aa" } }]
    })
    const likert = renderChart("LikertChart", {
      data: [{ question: "Q1", level: "Agree", count: 4 }],
      levelAccessor: "level",
      countAccessor: "count",
      levels: ["Disagree", "Agree"],
      styleRules: [{ when: { gt: 50 }, style: { fill: "#aa00aa" } }]
    })
    const gauge = renderChart("GaugeChart", {
      value: 60,
      stroke: "#abcdef",
      styleRules: [{
        when: (d: Record<string, unknown>) => d._isFill === true,
        style: { fill: "#00aabb", stroke: "#rule" }
      }]
    })

    expect(box).toContain("#aa1100")
    expect(histogram).toContain("#00aa11")
    expect(pie).toContain("#0011aa")
    expect(likert).toContain("#aa00aa")
    expect(gauge).toContain("#00aabb")
    expect(gauge).toContain("#abcdef")
    expect(gauge).not.toContain("#rule")
  })
})

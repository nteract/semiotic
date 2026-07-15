import { describe, it, expect } from "vitest"
import { renderChart } from "./renderToStaticSVG"

const data = [
  { region: "A", value: 4 },
  { region: "B", value: 8 },
  { region: "C", value: 12 },
  { region: "D", value: 18 },
]

describe("renderChart — bar styleRules (server path)", () => {
  it("applies a solid threshold rule fill to matching bars", () => {
    const svg = renderChart("BarChart", {
      data,
      categoryAccessor: "region",
      valueAccessor: "value",
      styleRules: [{ when: { gte: 15 }, style: { fill: "#d7263d" } }],
    })
    expect(svg).toContain("#d7263d") // the over-threshold bar (value 18) is painted with the rule fill
  })

  it("renders a HatchFill rule as an SVG <pattern> referenced by url(#…)", () => {
    const svg = renderChart("BarChart", {
      data,
      categoryAccessor: "region",
      valueAccessor: "value",
      styleRules: [
        { when: { gt: 10 }, style: { fill: { type: "hatch", background: "#ffd166", stroke: "#e0a92a" } } },
      ],
    })
    expect(svg).toContain("<pattern")
    expect(svg).toMatch(/fill="url\(#[^)]*-hatch\)"/)
    expect(svg).toContain("#e0a92a") // hatch line color present in the pattern def
  })

  it("hatches a stacked segment by series via ctx.category", () => {
    const stacked = [
      { period: "t1", tier: "base", v: 8 },
      { period: "t1", tier: "burst", v: 3 },
      { period: "t2", tier: "base", v: 9 },
      { period: "t2", tier: "burst", v: 5 },
    ]
    const svg = renderChart("StackedBarChart", {
      data: stacked,
      categoryAccessor: "period",
      stackBy: "tier",
      valueAccessor: "v",
      styleRules: [
        { when: { field: "tier", eq: "burst" }, style: { fill: { type: "hatch", background: "#ffd166", stroke: "#fff" } } },
      ],
    })
    expect(svg).toContain("<pattern")
  })
})

describe("renderChart — annotation labelBackground (server path)", () => {
  it("draws a semitransparent box backdrop behind a threshold label", () => {
    const svg = renderChart("BarChart", {
      data,
      categoryAccessor: "region",
      valueAccessor: "value",
      annotations: [
        { type: "y-threshold", value: 10, label: "Fast-scaling · 10", color: "#0b6", labelBackground: "box" },
      ],
    })
    expect(svg).toContain("Fast-scaling · 10")
    // A backing rect with fill-opacity marks the box backdrop.
    expect(svg).toMatch(/<rect[^>]*fill-opacity="0\.85"/)
  })

  it("keeps the default halo when labelBackground is unset", () => {
    const svg = renderChart("BarChart", {
      data,
      categoryAccessor: "region",
      valueAccessor: "value",
      annotations: [{ type: "y-threshold", value: 10, label: "Max", color: "#d7263d" }],
    })
    expect(svg).toContain('paint-order="stroke"')
  })
})

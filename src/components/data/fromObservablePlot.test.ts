import { describe, expect, it, vi } from "vitest"
import { fromConfig } from "../export/chartConfig"
import { validateProps } from "../charts/shared/validateProps"
import { fromObservablePlot } from "./fromObservablePlot"
import type { ObservablePlotSpec } from "./fromObservablePlot"

// Silence the adapter's console.warn during the warning-path tests.
vi.spyOn(console, "warn").mockImplementation(() => {})

const ROWS = [
  { date: 1, value: 10, series: "a" },
  { date: 2, value: 20, series: "b" },
]

describe("fromObservablePlot — mark mapping", () => {
  it("translates line + stroke to LineChart with lineBy and curve", () => {
    const config = fromObservablePlot({
      marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value", stroke: "series", curve: "step" } }],
    })
    expect(config.component).toBe("LineChart")
    expect(config.props.xAccessor).toBe("date")
    expect(config.props.yAccessor).toBe("value")
    expect(config.props.lineBy).toBe("series")
    expect(config.props.curve).toBe("step")
    expect(config.props.data).toEqual(ROWS)
  })

  it("translates barY + fill to StackedBarChart", () => {
    const config = fromObservablePlot({
      marks: [{ type: "barY", data: ROWS, options: { x: "series", y: "value", fill: "series" } }],
    })
    expect(config.component).toBe("StackedBarChart")
    expect(config.props.categoryAccessor).toBe("series")
    expect(config.props.valueAccessor).toBe("value")
    expect(config.props.stackBy).toBe("series")
  })

  it("translates barX to a horizontal BarChart", () => {
    const config = fromObservablePlot({
      marks: [{ type: "barX", data: ROWS, options: { x: "value", y: "series" } }],
    })
    expect(config.component).toBe("BarChart")
    expect(config.props.orientation).toBe("horizontal")
    expect(config.props.categoryAccessor).toBe("series")
    expect(config.props.valueAccessor).toBe("value")
  })

  it("translates dot + r field to BubbleChart, dot + numeric r to Scatterplot", () => {
    const bubble = fromObservablePlot({
      marks: [{ type: "dot", data: ROWS, options: { x: "date", y: "value", r: "value", fill: "series" } }],
    })
    expect(bubble.component).toBe("BubbleChart")
    expect(bubble.props.sizeBy).toBe("value")
    expect(bubble.props.colorBy).toBe("series")

    const scatter = fromObservablePlot({
      marks: [{ type: "dot", data: ROWS, options: { x: "date", y: "value", r: 6 } }],
    })
    expect(scatter.component).toBe("Scatterplot")
    expect(scatter.props.pointRadius).toBe(6)
  })

  it("translates areaY + fill to StackedAreaChart", () => {
    const config = fromObservablePlot({
      marks: [{ type: "areaY", data: ROWS, options: { x: "date", y: "value", fill: "series" } }],
    })
    expect(config.component).toBe("StackedAreaChart")
    expect(config.props.areaBy).toBe("series")
  })

  it("translates cell to Heatmap with the fill as value", () => {
    const config = fromObservablePlot({
      marks: [{ type: "cell", data: ROWS, options: { x: "date", y: "series", fill: "value" } }],
    })
    expect(config.component).toBe("Heatmap")
    expect(config.props.valueAccessor).toBe("value")
  })

  it("translates rectY to a Histogram of the binned field", () => {
    const config = fromObservablePlot({
      marks: [{ type: "rectY", data: ROWS, options: { x: "value" } }],
    })
    expect(config.component).toBe("Histogram")
    expect(config.props.valueAccessor).toBe("value")
  })

  it("maps the color scheme", () => {
    const config = fromObservablePlot({
      marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value", stroke: "series" } }],
      color: { scheme: "tableau10" },
    })
    expect(config.props.colorScheme).toBe("category10")
  })

  it("carries a temporal/log scale type onto continuous XY charts", () => {
    const timeChart = fromObservablePlot({
      marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value" } }],
      x: { type: "time" },
    })
    expect(timeChart.props.xScaleType).toBe("time")
    const logChart = fromObservablePlot({
      marks: [{ type: "dot", data: ROWS, options: { x: "date", y: "value" } }],
      y: { type: "log" },
    })
    expect(logChart.props.yScaleType).toBe("log")
    // Not applied to non-continuous components (bars use an ordinal x).
    const bars = fromObservablePlot({
      marks: [{ type: "barY", data: ROWS, options: { x: "series", y: "value" } }],
      x: { type: "time" },
    })
    expect(bars.props.xScaleType).toBeUndefined()
  })

  it("carries width/height/title and axis labels", () => {
    const config = fromObservablePlot({
      width: 500,
      height: 300,
      title: "Trend",
      x: { label: "Date" },
      y: { label: "Value" },
      marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value" } }],
    })
    expect(config.props.width).toBe(500)
    expect(config.props.height).toBe(300)
    expect(config.props.title).toBe("Trend")
    expect(config.props.xLabel).toBe("Date")
    expect(config.props.yLabel).toBe("Value")
  })
})

describe("fromObservablePlot — skips chrome, refuses cleanly (D7)", () => {
  it("skips decorative marks and translates the real one", () => {
    const config = fromObservablePlot({
      marks: [
        { type: "frame" },
        { type: "gridY" },
        { type: "ruleY", options: { y: 0 } },
        { type: "line", data: ROWS, options: { x: "date", y: "value" } },
      ],
    })
    expect(config.component).toBe("LineChart")
    expect(config.warnings ?? []).toEqual([]) // decorative marks aren't "multiple data marks"
  })

  it("warns and translates only the first when there are multiple data marks", () => {
    const config = fromObservablePlot({
      marks: [
        { type: "line", data: ROWS, options: { x: "date", y: "value" } },
        { type: "dot", data: ROWS, options: { x: "date", y: "value" } },
      ],
    })
    expect(config.component).toBe("LineChart")
    expect(config.warnings!.some((w) => /Multiple data marks/.test(w))).toBe(true)
  })

  it("warns on a function accessor instead of silently dropping it", () => {
    const config = fromObservablePlot({
      marks: [{ type: "dot", data: ROWS, options: { x: "date", y: (d: any) => d.value * 2 } }],
    })
    expect(config.warnings!.some((w) => /function accessor/.test(w))).toBe(true)
  })

  it("warns on facets and on an unsupported mark", () => {
    const facet = fromObservablePlot({
      fx: "series",
      marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value" } }],
    })
    expect(facet.warnings!.some((w) => /Faceted/.test(w))).toBe(true)

    const exotic = fromObservablePlot({
      marks: [{ type: "vector", data: ROWS, options: { x: "date", y: "value" } }],
    })
    expect(exotic.component).toBe("Scatterplot")
    expect(exotic.warnings!.some((w) => /no faithful Semiotic equivalent/.test(w))).toBe(true)
  })

  it("warns when a line's x field is categorical (won't position on a continuous scale)", () => {
    const config = fromObservablePlot({
      marks: [
        {
          type: "lineY",
          data: [{ month: "Jan", users: 1 }, { month: "Feb", users: 2 }],
          options: { x: "month", y: "users" },
        },
      ],
    })
    expect(config.component).toBe("LineChart")
    expect(config.warnings!.some((w) => /categorical/.test(w))).toBe(true)
  })

  it("does not warn when a line's x is a date string (a valid time axis) or numeric", () => {
    const dateX = fromObservablePlot({
      marks: [{ type: "line", data: [{ t: "2026-01-01", v: 1 }], options: { x: "t", y: "v" } }],
    })
    expect((dateX.warnings ?? []).some((w) => /categorical/.test(w))).toBe(false)
    const numericX = fromObservablePlot({
      marks: [{ type: "line", data: [{ t: 1, v: 1 }], options: { x: "t", y: "v" } }],
    })
    expect((numericX.warnings ?? []).some((w) => /categorical/.test(w))).toBe(false)
  })

  it("returns an empty Scatterplot with a warning when there is no data mark", () => {
    const config = fromObservablePlot({ marks: [{ type: "frame" }] })
    expect(config.component).toBe("Scatterplot")
    expect(config.warnings!.some((w) => /No translatable data mark/.test(w))).toBe(true)
  })
})

// ── Quality gate: every produced config round-trips and emits only known props ─

describe("fromObservablePlot — config validity (round-trip gate)", () => {
  const specs: Array<{ name: string; spec: ObservablePlotSpec }> = [
    { name: "line", spec: { marks: [{ type: "line", data: ROWS, options: { x: "date", y: "value", stroke: "series", curve: "step" } }], color: { scheme: "tableau10" } } },
    { name: "barY stacked", spec: { marks: [{ type: "barY", data: ROWS, options: { x: "series", y: "value", fill: "series" } }] } },
    { name: "barX", spec: { marks: [{ type: "barX", data: ROWS, options: { x: "value", y: "series" } }] } },
    { name: "bubble", spec: { marks: [{ type: "dot", data: ROWS, options: { x: "date", y: "value", r: "value", fill: "series" } }] } },
    { name: "scatter", spec: { marks: [{ type: "dot", data: ROWS, options: { x: "date", y: "value", r: 6 } }] } },
    { name: "stacked area", spec: { marks: [{ type: "areaY", data: ROWS, options: { x: "date", y: "value", fill: "series" } }] } },
    { name: "heatmap", spec: { marks: [{ type: "cell", data: ROWS, options: { x: "date", y: "series", fill: "value" } }] } },
    { name: "dotplot", spec: { marks: [{ type: "tickY", data: ROWS, options: { x: "series", y: "value" } }] } },
  ]

  for (const { name, spec } of specs) {
    it(`${name}: round-trips through fromConfig and emits only known props`, () => {
      const config = fromObservablePlot(spec)
      // fromConfig validates the component is in the registry and deep-clones props.
      const back = fromConfig(config)
      expect(back.componentName).toBe(config.component)
      // The adapter must never emit a prop the schema doesn't know.
      const result = validateProps(config.component, config.props)
      const unknownPropErrors = result.errors.filter((e) => /Unknown prop/.test(e))
      expect(unknownPropErrors).toEqual([])
    })
  }
})

import { describe, expect, it, vi } from "vitest"
import { fromConfig } from "../export/chartConfig"
import { validateProps } from "../charts/shared/validateProps"
import { fromFlintChart } from "./fromFlintChart"
import type { FlintChartAssemblyInput } from "./fromFlintChart"

vi.spyOn(console, "warn").mockImplementation(() => {})

const SALES = [
  { region: "North", segment: "Consumer", month: "2026-01", sales: 10, profit: 2, margin: 0.2 },
  { region: "North", segment: "Business", month: "2026-01", sales: 15, profit: 5, margin: 0.33 },
  { region: "South", segment: "Consumer", month: "2026-02", sales: 12, profit: 3, margin: 0.25 },
]

function flint(chartType: string, encodings: FlintChartAssemblyInput["chart_spec"]["encodings"], extra: Partial<FlintChartAssemblyInput> = {}): FlintChartAssemblyInput {
  const { chart_spec: chartSpecExtra, ...rest } = extra
  const extraEncodings = chartSpecExtra?.encodings
  return {
    data: { values: SALES },
    chart_spec: {
      ...chartSpecExtra,
      chartType,
      encodings: extraEncodings && Object.keys(extraEncodings).length > 0 ? extraEncodings : encodings,
    },
    ...rest,
  }
}

describe("fromFlintChart - mapping", () => {
  it("translates a Flint Bar Chart request and preserves size/semantic metadata", () => {
    const config = fromFlintChart(flint(
      "Bar Chart",
      {
        x: { field: "region", type: "nominal" },
        y: { field: "sales", type: "quantitative" },
        color: "segment",
      },
      {
        semantic_types: { sales: "Currency", region: "Region" },
        field_display_names: { region: "Region", sales: "Sales" },
        chart_spec: {
          chartType: "Bar Chart",
          encodings: {},
          baseSize: { width: 420, height: 260 },
          canvasSize: { width: 800, height: 500 },
          chartProperties: { cornerRadius: 4 },
        },
      },
    ))

    expect(config.component).toBe("BarChart")
    expect(config.props.categoryAccessor).toBe("region")
    expect(config.props.valueAccessor).toBe("sales")
    expect(config.props.colorBy).toBe("segment")
    expect(config.props.roundedTop).toBe(4)
    expect(config.props.width).toBe(420)
    expect(config.props.height).toBe(260)
    expect(config.props.categoryLabel).toBe("Region")
    expect(config.props.valueLabel).toBe("Sales")
    expect(config.flint.semanticTypes).toEqual({ sales: "Currency", region: "Region" })
    expect(config.flint.baseSize).toEqual({ width: 420, height: 260 })
    expect(config.flint.canvasSize).toEqual({ width: 800, height: 500 })
  })

  it("translates grouped and stacked bars with aggregate count/sum", () => {
    const grouped = fromFlintChart(flint("Grouped Bar Chart", {
      x: { field: "region", type: "nominal" },
      y: { field: "sales", type: "quantitative", aggregate: "sum" },
      group: "segment",
    }))
    expect(grouped.component).toBe("GroupedBarChart")
    expect(grouped.props.groupBy).toBe("segment")
    expect(grouped.props.valueAccessor).toBe("value")
    expect(grouped.props.data).toContainEqual({ region: "North", segment: "Consumer", value: 10 })

    const stacked = fromFlintChart(flint("Stacked Bar Chart", {
      x: "region",
      y: { aggregate: "count" },
      color: "segment",
    }))
    expect(stacked.component).toBe("StackedBarChart")
    expect(stacked.props.stackBy).toBe("segment")
    expect(stacked.props.valueAccessor).toBe("value")
    expect(stacked.props.data).toContainEqual({ region: "North", segment: "Consumer", value: 1 })
  })

  it("translates line and area requests with temporal semantics and chart properties", () => {
    const line = fromFlintChart(flint("Line Chart", {
      x: "month",
      y: "sales",
      color: "segment",
    }, {
      semantic_types: { month: "YearMonth" },
      chart_spec: {
        chartType: "Line Chart",
        encodings: {},
        chartProperties: { interpolate: "step-after", showPoints: true },
      },
    }))
    expect(line.component).toBe("LineChart")
    expect(line.props.xScaleType).toBe("time")
    expect(line.props.lineBy).toBe("segment")
    expect(line.props.curve).toBe("stepAfter")
    expect(line.props.showPoints).toBe(true)

    const area = fromFlintChart(flint("Area Chart", {
      x: "month",
      y: "sales",
      color: "segment",
    }, {
      chart_spec: {
        chartType: "Area Chart",
        encodings: {},
        chartProperties: { stackMode: "normalize", opacity: 0.45 },
      },
    }))
    expect(area.component).toBe("StackedAreaChart")
    expect(area.props.areaBy).toBe("segment")
    expect(area.props.normalize).toBe(true)
    expect(area.props.areaOpacity).toBe(0.45)
  })

  it("translates scatter and bubble requests", () => {
    const scatter = fromFlintChart(flint("Scatter Plot", {
      x: "sales",
      y: "profit",
      color: { field: "segment", scheme: "tableau10" },
      shape: "region",
    }, {
      chart_spec: {
        chartType: "Scatter Plot",
        encodings: {},
        chartProperties: { opacity: 0.6 },
      },
    }))
    expect(scatter.component).toBe("Scatterplot")
    expect(scatter.props.colorBy).toBe("segment")
    expect(scatter.props.symbolBy).toBe("region")
    expect(scatter.props.pointOpacity).toBe(0.6)
    expect(scatter.props.colorScheme).toBe("category10")

    const bubble = fromFlintChart(flint("Scatter Plot", {
      x: "sales",
      y: "profit",
      size: "margin",
      color: "segment",
    }))
    expect(bubble.component).toBe("BubbleChart")
    expect(bubble.props.sizeBy).toBe("margin")
  })

  it("translates heatmap, pie/donut, histogram, and boxplot requests", () => {
    const heatmap = fromFlintChart(flint("Heatmap", {
      x: "month",
      y: "segment",
      color: { field: "margin", scheme: "viridis" },
    }, {
      chart_spec: {
        chartType: "Heatmap",
        encodings: {},
        chartProperties: { showTextLabels: true },
      },
    }))
    expect(heatmap.component).toBe("Heatmap")
    expect(heatmap.props.valueAccessor).toBe("margin")
    expect(heatmap.props.showValues).toBe(true)
    expect(heatmap.props.colorScheme).toBe("viridis")

    const donut = fromFlintChart(flint("Pie Chart", {
      color: "segment",
      size: "sales",
    }, {
      chart_spec: {
        chartType: "Pie Chart",
        encodings: {},
        chartProperties: { innerRadius: 55, cornerRadius: 2 },
      },
    }))
    expect(donut.component).toBe("DonutChart")
    expect(donut.props.categoryAccessor).toBe("segment")
    expect(donut.props.valueAccessor).toBe("sales")
    expect(donut.props.innerRadius).toBe(55)

    const histogram = fromFlintChart(flint("Histogram", {
      x: "sales",
      color: "segment",
    }, {
      chart_spec: {
        chartType: "Histogram",
        encodings: {},
        chartProperties: { binCount: 12 },
      },
    }))
    expect(histogram.component).toBe("Histogram")
    expect(histogram.props.valueAccessor).toBe("sales")
    expect(histogram.props.bins).toBe(12)

    const box = fromFlintChart(flint("Boxplot", {
      x: { field: "segment", type: "nominal" },
      y: { field: "sales", type: "quantitative" },
      color: "region",
    }, {
      chart_spec: {
        chartType: "Boxplot",
        encodings: {},
        chartProperties: { showOutliers: false },
      },
    }))
    expect(box.component).toBe("BoxPlot")
    expect(box.props.categoryAccessor).toBe("segment")
    expect(box.props.valueAccessor).toBe("sales")
    expect(box.props.colorBy).toBe("region")
    expect(box.props.showOutliers).toBe(false)
  })
})

describe("fromFlintChart - warnings and metadata", () => {
  it("preserves URL data refs and warns instead of fetching", () => {
    const config = fromFlintChart({
      data: { url: "local.csv" },
      chart_spec: {
        chartType: "Line Chart",
        encodings: { x: "month", y: "sales" },
      },
    })
    expect(config.flint.dataUrl).toBe("local.csv")
    expect(config.warnings!.some((warning) => /data.url/.test(warning))).toBe(true)
  })

  it("warns on facets, static series arrays, unsupported chart properties, and unknown chart types", () => {
    const config = fromFlintChart(flint("Ridgeline Plot", {
      x: "sales",
      y: ["profit", "margin"],
      column: "region",
    }, {
      chart_spec: {
        chartType: "Ridgeline Plot",
        encodings: {},
        chartProperties: { unsupportedControl: true },
      },
    }))
    expect(config.component).toBe("Scatterplot")
    expect(config.flint.unmappedEncodings).toHaveProperty("column")
    expect(config.warnings!.some((warning) => /Unsupported Flint chartType/.test(warning))).toBe(true)
    expect(config.warnings!.some((warning) => /Static-series array/.test(warning))).toBe(true)
    expect(config.warnings!.some((warning) => /facet channel/.test(warning))).toBe(true)
    expect(config.warnings!.some((warning) => /chartProperties/.test(warning))).toBe(true)
  })

  it("clamps baseSize to a smaller canvasSize ceiling", () => {
    const config = fromFlintChart(flint("Bar Chart", {
      x: "region",
      y: "sales",
    }, {
      chart_spec: {
        chartType: "Bar Chart",
        encodings: {},
        baseSize: { width: 600, height: 400 },
        canvasSize: { width: 320, height: 240 },
      },
    }))
    expect(config.props.width).toBe(320)
    expect(config.props.height).toBe(240)
    expect(config.warnings!.some((warning) => /clamped/.test(warning))).toBe(true)
  })
})

describe("fromFlintChart - config validity", () => {
  const specs: Array<{ name: string; input: FlintChartAssemblyInput }> = [
    { name: "bar", input: flint("Bar Chart", { x: "region", y: "sales" }) },
    { name: "grouped bar", input: flint("Grouped Bar Chart", { x: "region", y: "sales", group: "segment" }) },
    { name: "stacked bar", input: flint("Stacked Bar Chart", { x: "region", y: "sales", color: "segment" }) },
    { name: "line", input: flint("Line Chart", { x: "month", y: "sales", color: "segment" }) },
    { name: "area", input: flint("Area Chart", { x: "month", y: "sales", color: "segment" }) },
    { name: "scatter", input: flint("Scatter Plot", { x: "sales", y: "profit", color: "segment" }) },
    { name: "bubble", input: flint("Scatter Plot", { x: "sales", y: "profit", size: "margin" }) },
    { name: "heatmap", input: flint("Heatmap", { x: "month", y: "segment", color: "margin" }) },
    { name: "pie", input: flint("Pie Chart", { color: "segment", size: "sales" }) },
    { name: "histogram", input: flint("Histogram", { x: "sales" }) },
    { name: "boxplot", input: flint("Boxplot", { x: "segment", y: "sales" }) },
  ]

  for (const { name, input } of specs) {
    it(`${name}: round-trips through fromConfig and emits only known props`, () => {
      const config = fromFlintChart(input)
      const back = fromConfig(config)
      expect(back.componentName).toBe(config.component)
      const result = validateProps(config.component, config.props)
      expect(result.valid, result.errors.join("\n")).toBe(true)
      const unknownPropErrors = result.errors.filter((error) => /Unknown prop/.test(error))
      expect(unknownPropErrors).toEqual([])
    })
  }
})

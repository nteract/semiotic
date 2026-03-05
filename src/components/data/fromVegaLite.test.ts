import { fromVegaLite } from "./fromVegaLite"
import { configToJSX } from "../export/chartConfig"

describe("fromVegaLite", () => {
  // ── Bar Chart ────────────────────────────────────────────────────────

  it("translates bar mark to BarChart", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 28 }, { a: "B", b: 55 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
    })
    expect(config.component).toBe("BarChart")
    expect(config.props.categoryAccessor).toBe("a")
    expect(config.props.valueAccessor).toBe("b")
    expect(config.props.data).toHaveLength(2)
    expect(config.version).toBe("1")
  })

  it("detects horizontal bar orientation", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 28 }] },
      encoding: {
        x: { field: "b", type: "quantitative" },
        y: { field: "a", type: "nominal" },
      },
    })
    expect(config.component).toBe("BarChart")
    expect(config.props.orientation).toBe("horizontal")
    expect(config.props.categoryAccessor).toBe("a")
    expect(config.props.valueAccessor).toBe("b")
  })

  // ── Stacked Bar Chart ────────────────────────────────────────────────

  it("translates bar + color to StackedBarChart", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: {
        values: [
          { cat: "A", group: "X", val: 10 },
          { cat: "A", group: "Y", val: 20 },
          { cat: "B", group: "X", val: 30 },
        ],
      },
      encoding: {
        x: { field: "cat", type: "nominal" },
        y: { field: "val", type: "quantitative" },
        color: { field: "group" },
      },
    })
    expect(config.component).toBe("StackedBarChart")
    expect(config.props.stackBy).toBe("group")
    expect(config.props.colorBy).toBe("group")
  })

  it("uses BarChart when stack is explicitly disabled", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 28, c: "X" }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative", stack: false },
        color: { field: "c" },
      },
    })
    expect(config.component).toBe("BarChart")
  })

  // ── Line Chart ───────────────────────────────────────────────────────

  it("translates line mark to LineChart", () => {
    const config = fromVegaLite({
      mark: "line",
      data: {
        values: [
          { x: 0, y: 1 },
          { x: 1, y: 3 },
          { x: 2, y: 2 },
        ],
      },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("LineChart")
    expect(config.props.xAccessor).toBe("x")
    expect(config.props.yAccessor).toBe("y")
  })

  it("maps line interpolation to curve", () => {
    const config = fromVegaLite({
      mark: { type: "line", interpolate: "monotone-x" },
      data: { values: [{ x: 0, y: 1 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.props.curve).toBe("monotoneX")
  })

  it("maps line mark.point to showPoints", () => {
    const config = fromVegaLite({
      mark: { type: "line", point: true },
      data: { values: [{ x: 0, y: 1 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.props.showPoints).toBe(true)
  })

  it("sets lineBy from color encoding", () => {
    const config = fromVegaLite({
      mark: "line",
      data: { values: [{ x: 0, y: 1, series: "A" }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        color: { field: "series" },
      },
    })
    expect(config.props.lineBy).toBe("series")
    expect(config.props.colorBy).toBe("series")
  })

  // ── Area Chart ───────────────────────────────────────────────────────

  it("translates area mark to AreaChart", () => {
    const config = fromVegaLite({
      mark: "area",
      data: { values: [{ x: 0, y: 5 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("AreaChart")
  })

  it("translates area + color to StackedAreaChart", () => {
    const config = fromVegaLite({
      mark: "area",
      data: { values: [{ x: 0, y: 5, cat: "A" }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        color: { field: "cat" },
      },
    })
    expect(config.component).toBe("StackedAreaChart")
    expect(config.props.areaBy).toBe("cat")
  })

  // ── Scatterplot ──────────────────────────────────────────────────────

  it("translates point mark to Scatterplot", () => {
    const config = fromVegaLite({
      mark: "point",
      data: { values: [{ x: 1, y: 2 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("Scatterplot")
    expect(config.props.xAccessor).toBe("x")
    expect(config.props.yAccessor).toBe("y")
  })

  it("translates circle mark to Scatterplot", () => {
    const config = fromVegaLite({
      mark: "circle",
      data: { values: [{ x: 1, y: 2 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("Scatterplot")
  })

  it("translates square mark to Scatterplot", () => {
    const config = fromVegaLite({
      mark: "square",
      data: { values: [{ x: 1, y: 2 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("Scatterplot")
  })

  // ── Bubble Chart ─────────────────────────────────────────────────────

  it("translates point + size to BubbleChart", () => {
    const config = fromVegaLite({
      mark: "point",
      data: { values: [{ x: 1, y: 2, pop: 100 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        size: { field: "pop" },
      },
    })
    expect(config.component).toBe("BubbleChart")
    expect(config.props.sizeBy).toBe("pop")
  })

  it("maps size scale range to sizeRange", () => {
    const config = fromVegaLite({
      mark: "point",
      data: { values: [{ x: 1, y: 2, pop: 100 }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        size: { field: "pop", scale: { range: [10, 50] } },
      },
    })
    expect(config.props.sizeRange).toEqual([10, 50])
  })

  // ── Heatmap ──────────────────────────────────────────────────────────

  it("translates rect mark to Heatmap", () => {
    const config = fromVegaLite({
      mark: "rect",
      data: {
        values: [
          { row: "A", col: "X", val: 10 },
          { row: "B", col: "Y", val: 20 },
        ],
      },
      encoding: {
        x: { field: "col", type: "nominal" },
        y: { field: "row", type: "nominal" },
        color: { field: "val", type: "quantitative" },
      },
    })
    expect(config.component).toBe("Heatmap")
    expect(config.props.xAccessor).toBe("col")
    expect(config.props.yAccessor).toBe("row")
    expect(config.props.valueAccessor).toBe("val")
    // colorBy should not be set for heatmap (value drives color)
    expect(config.props.colorBy).toBeUndefined()
  })

  // ── Pie Chart ────────────────────────────────────────────────────────

  it("translates arc mark to PieChart", () => {
    const config = fromVegaLite({
      mark: "arc",
      data: { values: [{ cat: "A", val: 30 }, { cat: "B", val: 70 }] },
      encoding: {
        theta: { field: "val", type: "quantitative" },
        color: { field: "cat", type: "nominal" },
      },
    })
    expect(config.component).toBe("PieChart")
    expect(config.props.valueAccessor).toBe("val")
    expect(config.props.categoryAccessor).toBe("cat")
  })

  // ── Donut Chart ──────────────────────────────────────────────────────

  it("translates arc + innerRadius to DonutChart", () => {
    const config = fromVegaLite({
      mark: { type: "arc", innerRadius: 50 },
      data: { values: [{ cat: "A", val: 30 }] },
      encoding: {
        theta: { field: "val", type: "quantitative" },
        color: { field: "cat", type: "nominal" },
      },
    })
    expect(config.component).toBe("DonutChart")
    expect(config.props.innerRadius).toBe(50)
  })

  // ── Dot Plot ─────────────────────────────────────────────────────────

  it("translates tick mark to DotPlot", () => {
    const config = fromVegaLite({
      mark: "tick",
      data: { values: [{ team: "A", wins: 10 }] },
      encoding: {
        x: { field: "team", type: "nominal" },
        y: { field: "wins", type: "quantitative" },
      },
    })
    expect(config.component).toBe("DotPlot")
    expect(config.props.categoryAccessor).toBe("team")
    expect(config.props.valueAccessor).toBe("wins")
  })

  // ── Histogram (bin) ──────────────────────────────────────────────────

  it("translates bin encoding to Histogram", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ val: 1 }, { val: 2 }, { val: 3 }] },
      encoding: {
        x: { field: "val", type: "quantitative", bin: true },
        y: { aggregate: "count", type: "quantitative" },
      },
    })
    expect(config.component).toBe("Histogram")
    expect(config.props.valueAccessor).toBe("val")
  })

  it("passes maxbins as bins prop", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ val: 1 }] },
      encoding: {
        x: { field: "val", type: "quantitative", bin: { maxbins: 20 } },
        y: { aggregate: "count", type: "quantitative" },
      },
    })
    expect(config.props.bins).toBe(20)
  })

  // ── Layout & metadata ────────────────────────────────────────────────

  it("passes through width, height, and title", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 1 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
      width: 800,
      height: 500,
      title: "My Chart",
    })
    expect(config.props.width).toBe(800)
    expect(config.props.height).toBe(500)
    expect(config.props.title).toBe("My Chart")
  })

  it("extracts title from object format", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 1 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
      title: { text: "Object Title" },
    })
    expect(config.props.title).toBe("Object Title")
  })

  // ── Axis titles ──────────────────────────────────────────────────────

  it("maps axis titles to labels", () => {
    const config = fromVegaLite({
      mark: "point",
      data: { values: [{ x: 1, y: 2 }] },
      encoding: {
        x: { field: "x", type: "quantitative", axis: { title: "X Axis" } },
        y: { field: "y", type: "quantitative", axis: { title: "Y Axis" } },
      },
    })
    expect(config.props.xLabel).toBe("X Axis")
    expect(config.props.yLabel).toBe("Y Axis")
  })

  // ── Color scheme mapping ─────────────────────────────────────────────

  it("maps Vega-Lite color scheme", () => {
    const config = fromVegaLite({
      mark: "point",
      data: { values: [{ x: 1, y: 2, c: "A" }] },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        color: { field: "c", scale: { scheme: "dark2" } },
      },
    })
    expect(config.props.colorScheme).toBe("dark2")
  })

  // ── Aggregation ──────────────────────────────────────────────────────

  it("pre-aggregates data with y.aggregate", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: {
        values: [
          { cat: "A", val: 10 },
          { cat: "A", val: 20 },
          { cat: "B", val: 30 },
        ],
      },
      encoding: {
        x: { field: "cat", type: "nominal" },
        y: { field: "val", type: "quantitative", aggregate: "sum" },
      },
    })
    expect(config.component).toBe("BarChart")
    expect(config.props.valueAccessor).toBe("value")
    expect(config.props.data).toHaveLength(2)
    const aRow = config.props.data.find((d: any) => d.cat === "A")
    expect(aRow.value).toBe(30) // 10 + 20
  })

  it("handles count aggregate", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: {
        values: [
          { cat: "A", val: 10 },
          { cat: "A", val: 20 },
          { cat: "B", val: 30 },
        ],
      },
      encoding: {
        x: { field: "cat", type: "nominal" },
        y: { aggregate: "count", type: "quantitative" },
      },
    })
    expect(config.props.data).toHaveLength(2)
  })

  // ── Warnings ─────────────────────────────────────────────────────────

  it("warns on data.url", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { url: "https://example.com/data.json" },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
    })
    expect(config.warnings).toBeDefined()
    expect(config.warnings!.some((w) => w.includes("data.url"))).toBe(true)
  })

  it("warns on transforms", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 1 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
      transform: [{ filter: "datum.b > 0" }],
    })
    expect(config.warnings).toBeDefined()
    expect(config.warnings!.some((w) => w.includes("transforms"))).toBe(true)
  })

  it("warns on unsupported mark type", () => {
    const config = fromVegaLite({
      mark: "geoshape",
      data: { values: [] },
      encoding: {},
    })
    expect(config.warnings).toBeDefined()
    expect(config.warnings!.some((w) => w.includes("geoshape"))).toBe(true)
    expect(config.component).toBe("Scatterplot") // fallback
  })

  // ── configToJSX round-trip ───────────────────────────────────────────

  it("produces valid JSX via configToJSX", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ a: "A", b: 28 }, { a: "B", b: 55 }] },
      encoding: {
        x: { field: "a", type: "nominal" },
        y: { field: "b", type: "quantitative" },
      },
    })
    const jsx = configToJSX(config)
    expect(jsx).toContain("<BarChart")
    expect(jsx).toContain('categoryAccessor="a"')
    expect(jsx).toContain('valueAccessor="b"')
    expect(jsx).toContain("/>")
  })

  // ── No data ──────────────────────────────────────────────────────────

  it("works without data", () => {
    const config = fromVegaLite({
      mark: "line",
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
      },
    })
    expect(config.component).toBe("LineChart")
    expect(config.props.data).toBeUndefined()
  })
})

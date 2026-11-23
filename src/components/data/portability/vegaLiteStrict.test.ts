import { encodingLossExamples, translucentBubbles } from "../../../__tests__/fixtures/vegaLiteEncodingLoss"
import { describe, expect, it, vi } from "vitest"
import { fromVegaLite, fromVegaLiteResult } from "../fromVegaLite"
import type { VegaLiteSpec } from "../fromVegaLite"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { validatePortableAnnotation } from "./spec"
import { toVegaLite, toVegaLiteResult } from "./vegaLite"

const base: VegaLiteSpec = {
  mark: "line",
  data: { values: [{ date: "2024-02-29", value: 10, group: "A" }] },
  encoding: {
    x: { field: "date", type: "temporal" },
    y: { field: "value", type: "quantitative" }
  }
}

const importSpec = (value: unknown, lossy = false) =>
  fromVegaLiteResult(value as unknown as VegaLiteSpec, {
    mode: lossy ? "lossy" : "strict"
  })

const config = (component: string, props: Record<string, unknown>) => ({
  component,
  props,
  version: "1",
  createdAt: "2024-01-01T00:00:00Z"
})

describe("strict Vega-Lite boundaries", () => {
  it("round trips BubbleChart opacity through its public prop", () => {
    const imported = importSpec(translucentBubbles)
    expect(imported.status).toBe("success")
    expect(imported.config).toMatchObject({ component: "BubbleChart", props: { bubbleOpacity: 0.25 } })
    const chart = imported.config!
    const rendered = renderChartWithEvidence(chart.component, chart.props)
    expect(rendered.svg).toMatch(/(?:fill-)?opacity="0\.25"/)
    const exported = toVegaLiteResult(chart)
    expect(exported.status).toBe("success")
    expect(exported.spec?.encoding?.opacity).toEqual({ value: 0.25 })
  })

  it.each(encodingLossExamples)("reports $path on a $spec.mark before rendering", ({ spec, path }) => {
    const strict = importSpec(spec)
    expect(strict.status).toBe("refused")
    expect(strict.diagnostics).toContainEqual(expect.objectContaining({ path, severity: "error" }))
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path }))
  })

  it.each(["bar", "area"])("discloses normalization without a grouping field for %s", mark => {
    const spec = { ...base, mark, encoding: { ...base.encoding, y: { ...base.encoding!.y, stack: "normalize" } } }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/y/stack" }))
  })

  it.each(["x", "y"])("preserves the bar stack on the quantitative %s axis", axis => {
    const other = axis === "x" ? "y" : "x"
    const rows = [{ cat: "A", v: 1, group: "a" }, { cat: "A", v: 2, group: "b" }]
    const spec = (stack: string | boolean | null) => ({ mark: "bar", data: { values: rows }, encoding: {
      [other]: { field: "cat", type: "nominal" }, [axis]: { field: "v", type: "quantitative", stack },
      color: { field: "group", type: "nominal" }
    } })
    for (const stack of [false, null]) {
      expect(importSpec(spec(stack)).status).toBe("refused")
      expect(importSpec(spec(stack), true).lossReport).toContainEqual(expect.objectContaining({ path: `/encoding/${axis}/stack` }))
    }
    for (const stack of ["zero", "normalize"]) {
      const chart = importSpec(spec(stack)).config!
      expect(chart.component).toBe("StackedBarChart")
      expect(toVegaLiteResult(chart).spec?.encoding?.[axis]).toMatchObject({ stack, aggregate: "sum" })
    }
  })

  it("round-trips explicitly quantitative bar values without coercing category identifiers", () => {
    const chart = config("BarChart", { data: [
      { team: "001", orders: "007" }, { team: "001", orders: "03" }, { team: "1", orders: 4 }
    ], categoryAccessor: "team", valueAccessor: "orders" })
    const exported = toVegaLiteResult(chart)
    expect(exported.status).toBe("success")
    const result = importSpec(exported.spec)
    expect(result.status).toBe("success")
    const props = result.config!.props
    expect(props.data.map((row: Record<string, unknown>) => [row[props.categoryAccessor], row[props.valueAccessor]]))
      .toEqual([["001", 10], ["1", 4]])
  })

  it("reports repeated unaggregated bars that would become a single chart mark", () => {
    const spec = { mark: "bar", data: { values: [{ cat: "A", v: 1 }, { cat: "A", v: 2 }] },
      encoding: { x: { field: "cat", type: "nominal" }, y: { field: "v", type: "quantitative" } } }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/y" }))
    expect(importSpec({ ...spec, encoding: { ...spec.encoding, y: { ...spec.encoding.y, aggregate: "sum" } } }).status).toBe("success")
  })

  it.each([{ filled: true }, "transparent"])("reports point-overlay settings outside the supported boolean form (%j)", point => {
    const spec = { ...base, mark: { type: "line", point } }
    expect(importSpec(spec).status).toBe("refused")
    const result = importSpec(spec, true)
    expect(result.lossReport).toContainEqual(expect.objectContaining({ path: "/mark/point" }))
    if (typeof point === "object") expect(result.config?.props.showPoints).toBe(true)
  })

  it.each(["x", "y"])("discloses a discarded histogram measure with bins on %s", binned => {
    const other = binned === "x" ? "y" : "x"
    const spec = { ...base, mark: "bar", encoding: {
      [binned]: { field: "score", type: "quantitative", bin: true },
      [other]: { field: "amount", type: "quantitative" }
    } }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path: `/encoding/${other}` }))
  })

  it("keeps the histogram value axis horizontal and reports rotated y bins", () => {
    const bin = { field: "value", type: "quantitative", bin: true }
    const count = { aggregate: "count", type: "quantitative" }
    const input = (encoding: object) => ({ ...base, mark: "bar", encoding })
    expect(importSpec(input({ x: bin, y: count })).status).toBe("success")
    const vertical = input({ x: count, y: bin })
    expect(importSpec(vertical).status).toBe("refused")
    expect(importSpec(vertical, true).lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/y/bin" }))
  })

  it.each([
    ["square", {}, "/mark"],
    ["point", { size: { field: "group", type: "nominal" } }, "/encoding/size/type"],
    ["circle", { size: { field: "group", type: "ordinal" } }, "/encoding/size/type"],
    ["circle", { size: { field: "value", type: "quantitative", scale: { range: [16, 256] } } }, "/encoding/size/scale/range"]
  ] as const)("discloses a symbol shape or discrete size the chart cannot render (%s)", (mark, extra, path) => {
    const spec = { ...base, mark, encoding: { ...base.encoding, ...extra } }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path }))
  })

  it("preserves temporal and log positions in a lossy square conversion", () => {
    const result = importSpec({ ...base, mark: "square", encoding: {
      ...base.encoding, y: { ...base.encoding!.y, scale: { type: "log" } }
    } }, true)
    expect(result.config?.props).toMatchObject({ xScaleType: "time", yScaleType: "log" })
    const back = toVegaLiteResult(result.config!)
    expect(back.spec?.encoding?.x.type).toBe("temporal")
    expect(back.spec?.encoding?.y.scale?.type).toBe("log")
  })

  it("refuses implicit horizontal stacking for aggregated x values in a colored area", () => {
    const spec = { ...base, mark: "area", encoding: {
      x: { field: "amount", type: "quantitative", aggregate: "sum" },
      y: { field: "step", type: "quantitative" }, color: { field: "group", type: "nominal" }
    } }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/x/stack" }))
  })

  it.each(["x", "y"])("discloses lost normalization for grouped histograms binned on %s", binned => {
    const count = binned === "x" ? "y" : "x"
    const spec = { mark: "bar", data: { values: [{ score: 5, group: "A" }] }, encoding: {
      [binned]: { field: "score", type: "quantitative", bin: true },
      [count]: { aggregate: "count", type: "quantitative", stack: "normalize" },
      color: { field: "group", type: "nominal" }
    } }
    const diagnostic = expect.objectContaining({ path: `/encoding/${count}/stack` })
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec).diagnostics).toContainEqual(diagnostic)
    expect(importSpec(spec, true).lossReport).toContainEqual(diagnostic)
  })

  it.each([
    ["arc", { theta: { field: "value", type: "quantitative" }, color: { field: "group", type: "nominal" }, x: { field: "x", type: "quantitative" }, y: { field: "y", type: "quantitative" } }, ["/encoding/x", "/encoding/y"]],
    ["area", { x: { field: "value", type: "quantitative", stack: "normalize" }, y: { field: "y", type: "quantitative" }, color: { field: "group", type: "nominal" } }, ["/encoding/x/stack"]]
  ] as const)("discloses untranslated positions or stacking on %s", (mark, encoding, paths) => {
    const spec = { mark, encoding, data: { values: [{ x: 1, y: 2, value: 3, group: "A" }] } }
    expect(importSpec(spec).status).toBe("refused")
    for (const path of paths) expect(importSpec(spec, true).lossReport).toContainEqual(expect.objectContaining({ path }))
  })

  it("refuses nested field paths and renders the flattened samples", () => {
    const values = [{ x: 4, y: 7 }, { x: 5, y: 9 }]
    const point = (x: string, y: string, rows: unknown[]) => ({
      mark: "point", data: { values: rows }, encoding: { x: { field: x, type: "quantitative" }, y: { field: y, type: "quantitative" } }
    })
    const nested = point("metrics.x", "metrics.y", values.map(metrics => ({ metrics })))
    expect(importSpec(nested).status).toBe("refused")
    const approximate = importSpec(nested, true)
    for (const path of ["/encoding/x/field", "/encoding/y/field"]) {
      expect(approximate.lossReport).toContainEqual(expect.objectContaining({ path }))
    }
    const flat = importSpec(point("x", "y", values)).config!
    expect(renderChartWithEvidence(flat.component, flat.props).evidence.markCount).toBe(2)
  })

  it.each([null, false])("preserves explicitly unstacked colored area series (%s) across import and export", stack => {
    const spec = {
      ...base, mark: "area",
      encoding: { ...base.encoding, y: { ...base.encoding!.y, stack }, color: { field: "group", type: "nominal" } }
    }
    const imported = importSpec(spec)
    expect(imported.config).toMatchObject({ component: "AreaChart", props: { areaBy: "group", colorBy: "group" } })
    const exported = toVegaLiteResult(imported.config!)
    expect(exported.spec?.encoding).toMatchObject({ y: { stack: null }, color: { field: "group" } })
    expect(importSpec(exported.spec).config?.component).toBe("AreaChart")
  })

  it.each([
    null,
    42,
    [],
    { ...base, encoding: null },
    { ...base, encoding: { x: null } },
    { ...base, data: { values: "bad" } },
    { ...base, data: { values: [null, 1] } },
    { ...base, transform: { filter: "datum.value > 0" } },
    { ...base, params: [null] },
    { ...base, layer: [null] }
  ])("refuses malformed input without throwing: %j", (value) => {
    for (const lossy of [false, true]) {
      const result = importSpec(value, lossy)
      expect(result.status).toBe("refused")
      expect(result.config).toBeUndefined()
      expect(result.diagnostics.length).toBeGreaterThan(0)
    }
    expect(() => fromVegaLite(value as unknown as VegaLiteSpec)).not.toThrow()
  })

  it.each([
    ["/encoding/x/sort", { x: { ...base.encoding!.x, sort: "-y" } }],
    ["/encoding/x/timeUnit", { x: { ...base.encoding!.x, timeUnit: "month" } }],
    [
      "/encoding/x/scale/reverse",
      { x: { ...base.encoding!.x, scale: { reverse: true } } }
    ],
    [
      "/encoding/x/scale/zero",
      { x: { ...base.encoding!.x, scale: { zero: false } } }
    ],
    ["/encoding/y/stack", { y: { ...base.encoding!.y, stack: "center" } }],
    ["/encoding/row", { row: { field: "group", type: "nominal" } }],
    ["/encoding/detail", { detail: { field: "group" } }],
    ["/encoding/x2", { x2: { field: "end" } }],
    ["/encoding/tooltip", { tooltip: { field: "value" } }],
    [
      "/encoding/color/scale/scheme",
      { color: { field: "group", scale: { scheme: "constructor" } } }
    ]
  ])("declares unsupported semantics at %s", (path, encoding) => {
    const input = {
      ...base,
      encoding: { ...base.encoding, ...(encoding as object) }
    }
    const strict = importSpec(input)
    expect(strict.status).toBe("refused")
    expect(strict.diagnostics).toContainEqual(
      expect.objectContaining({ path, severity: "error" })
    )
    const lossy = importSpec(input, true)
    expect(lossy.status).toBe("lossy")
    expect(lossy.lossReport).toContainEqual(expect.objectContaining({ path }))
    expect(lossy.diagnostics.every((d) => d.severity === "warning")).toBe(true)
  })

  it.each([
    ["2024-02-29t00:00:00z", true],
    ["2024-02-30T00:00:00Z", false],
    ["2023-02-29T00:00:00Z", false],
    ["2024-02-29T23:59:59-05:30", true],
    ["2024-02-29T24:00:00Z", false]
  ])(
    "validates real calendar dates for portable provenance: %s",
    (createdAt, valid) => {
      expect(
        validatePortableAnnotation({ provenance: { createdAt } }).valid
      ).toBe(valid)
    }
  )

  it("reports mark options and title subtitles", () => {
    const result = importSpec({
      ...base,
      title: { text: "Trend", subtitle: "Dropped" },
      mark: { type: "line", strokeDash: [2, 4] }
    })
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/title/subtitle" }),
        expect.objectContaining({ path: "/mark/strokeDash" })
      ])
    )
  })

  it.each(["line", "area", "point", "circle"])(
    "preserves temporal x and log y for %s",
    (mark) => {
      const input = {
        ...base,
        mark,
        encoding: {
          ...base.encoding,
          y: { ...base.encoding!.y, scale: { type: "log" } }
        }
      }
      const result = importSpec(input)
      expect(result.status).toBe("success")
      expect(result.config?.props).toMatchObject({
        xScaleType: "time",
        yScaleType: "log"
      })
      const back = toVegaLiteResult(result.config!)
      expect(back.status).toBe("success")
      expect(back.spec?.encoding?.x.type).toBe("temporal")
      expect(back.spec?.encoding?.y.scale?.type).toBe("log")
    }
  )

  it("refuses temporal y because the public XY API only supports time on x", () => {
    expect(
      importSpec({
        ...base,
        encoding: { ...base.encoding, y: { field: "date", type: "temporal" } }
      }).status
    ).toBe("refused")
  })

  it("supports theta aggregation without inventing or dropping values", () => {
    const result = importSpec({
      mark: "arc",
      data: {
        values: [
          { g: "A", v: 2 },
          { g: "A", v: 3 }
        ]
      },
      encoding: {
        color: { field: "g", type: "nominal" },
        theta: { field: "v", aggregate: "sum", type: "quantitative" }
      }
    })
    expect(result.status).toBe("success")
    expect(result.config?.props.data).toHaveLength(1)
    expect(
      result.config?.props.data[0][result.config.props.valueAccessor]
    ).toBe(5)
  })

  it("does not print Result diagnostics and supports reproducible timestamps", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const options = {
      mode: "lossy" as const,
      createdAt: "2024-01-01T00:00:00Z"
    }
    try {
      const input = { ...base, mark: "unsupported" }
      expect(fromVegaLiteResult(input, options)).toEqual(
        fromVegaLiteResult(input, options)
      )
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})

describe("strict Vega-Lite export", () => {
  it("discloses an explicit bubble radius range on export to symbol areas", () => {
    const chart = config("BubbleChart", { xAccessor: "x", yAccessor: "y", sizeBy: "v", sizeRange: [2, 8] })
    expect(toVegaLiteResult(chart).status).toBe("refused")
    expect(toVegaLiteResult(chart, { allowLossy: true }).lossReport).toContainEqual(expect.objectContaining({ path: "/props/sizeRange" }))
  })

  it.each(["BarChart", "DotPlot"])(
    "reports unexported category colors and palettes for %s",
    (component) => {
      const input = config(component, {
        data: [{ c: "A", v: 1 }, { c: "B", v: 2 }],
        categoryAccessor: "c",
        valueAccessor: "v",
        colorBy: "c",
        colorScheme: ["red", "blue"]
      })
      const strict = toVegaLiteResult(input)
      expect(strict.status).toBe("refused")
      expect(strict.spec).toBeUndefined()
      expect(toVegaLite(input)).toBeUndefined()
      const lossy = toVegaLiteResult(input, { allowLossy: true })
      expect(lossy.status).toBe("lossy")
      expect(lossy.spec?.encoding?.color).toBeUndefined()
      for (const key of ["colorBy", "colorScheme"]) {
        expect(strict.diagnostics).toContainEqual(
          expect.objectContaining({ path: `/props/${key}`, severity: "error" })
        )
        expect(lossy.lossReport).toContainEqual(
          expect.objectContaining({ path: `/props/${key}` })
        )
      }
    }
  )

  it.each<[string, Record<string, unknown>]>([
    ["BarChart", { categoryAccessor: "c", valueAccessor: "v" }],
    ["DotPlot", { categoryAccessor: "c", valueAccessor: "v" }],
    ["LineChart", { xAccessor: "x", yAccessor: "y" }],
    ["AreaChart", { xAccessor: "x", yAccessor: "y" }],
    ["Scatterplot", { xAccessor: "x", yAccessor: "y" }],
    ["BubbleChart", { xAccessor: "x", yAccessor: "y", sizeBy: "v" }],
    ["Histogram", { valueAccessor: "v" }]
  ])("reports a palette without an exported color channel for %s", (component, props) => {
    const input = config(component, { ...props, colorScheme: "category10" })
    expect(toVegaLiteResult(input).status).toBe("refused")
    const lossy = toVegaLiteResult(input, { allowLossy: true })
    expect(lossy.status).toBe("lossy")
    expect(lossy.spec?.encoding?.color).toBeUndefined()
    expect(lossy.lossReport).toEqual([
      expect.objectContaining({ path: "/props/colorScheme" })
    ])
  })

  it.each<[string, Record<string, unknown>, string]>([
    ["StackedBarChart", { categoryAccessor: "c", valueAccessor: "v", stackBy: "g" }, "g"],
    ["StackedAreaChart", { xAccessor: "x", yAccessor: "y", areaBy: "g" }, "g"],
    ["PieChart", { categoryAccessor: "c", valueAccessor: "v" }, "c"],
    ["DonutChart", { categoryAccessor: "c", valueAccessor: "v", innerRadius: 30 }, "c"],
    ["Histogram", { valueAccessor: "v", categoryAccessor: "c" }, "c"],
    ["LineChart", { xAccessor: "x", yAccessor: "y", lineBy: "g" }, "g"],
    ["Scatterplot", { xAccessor: "x", yAccessor: "y" }, "g"],
    ["BubbleChart", { xAccessor: "x", yAccessor: "y", sizeBy: "v" }, "g"],
    ["Heatmap", { xAccessor: "x", yAccessor: "y", valueAccessor: "g" }, "g"]
  ])("preserves matching color fields and palettes for %s", (component, props, field) => {
    const result = toVegaLiteResult(config(component, {
      ...props,
      colorBy: field,
      colorScheme: ["red", "blue"]
    }))
    expect(result.status).toBe("success")
    expect(result.lossReport).toEqual([])
    expect(result.spec?.encoding?.color).toEqual({
      field,
      type: component === "Heatmap" ? "quantitative" : "nominal",
      scale: { range: ["red", "blue"] }
    })
  })

  it.each(["horizontal", "vertical"])("keeps individual %s grouped bars", orientation => {
    const data = [{ c: "A", g: "G", v: 2 }, { c: "A", g: "G", v: 3 }]
    const result = toVegaLiteResult(config("GroupedBarChart", {
      orientation, categoryAccessor: "c", valueAccessor: "v", groupBy: "g", data
    }), { allowLossy: true })
    expect(result.lossReport).toContainEqual(expect.objectContaining({ code: "GROUPED_BAR_APPROXIMATION" }))
    expect(result.spec?.data?.values).toEqual(data)
    expect(result.spec?.encoding?.[orientation === "horizontal" ? "x" : "y"]).toEqual({ field: "v", type: "quantitative" })
  })

  it("preserves grouped colors while reporting the grouped layout approximation", () => {
    const result = toVegaLiteResult(config("GroupedBarChart", {
      categoryAccessor: "c",
      valueAccessor: "v",
      groupBy: "g",
      colorBy: "g",
      colorScheme: ["red", "blue"]
    }), { allowLossy: true })
    expect(result.status).toBe("lossy")
    expect(result.lossReport).toEqual([
      expect.objectContaining({ code: "GROUPED_BAR_APPROXIMATION", path: "/props/groupBy" })
    ])
    expect(result.spec?.encoding?.color).toEqual({
      field: "g",
      type: "nominal",
      scale: { range: ["red", "blue"] }
    })
  })

  it.each([
    [
      "BarChart",
      {
        categoryAccessor: "c",
        valueAccessor: "v",
        colorBy: "g",
        sort: "ascending"
      },
      "colorBy"
    ],
    [
      "LineChart",
      { xAccessor: "x", yAccessor: "y", lineBy: "g", colorBy: "c" },
      "colorBy"
    ],
    [
      "Scatterplot",
      {
        xAccessor: "x",
        yAccessor: "y",
        annotations: [{ type: "x-threshold", value: 2 }]
      },
      "annotations"
    ],
    ["DonutChart", { categoryAccessor: "c", valueAccessor: "v" }, "innerRadius"]
  ])(
    "requires an explicit lossy opt-in for dropped %s props",
    (component, props, key) => {
      const input = config(component, props)
      expect(toVegaLiteResult(input).status).toBe("refused")
      const result = toVegaLiteResult(input, { allowLossy: true })
      expect(result.status).toBe("lossy")
      expect(result.lossReport).toContainEqual(
        expect.objectContaining({ path: `/props/${key}` })
      )
    }
  )

  it.each(["StackedBarChart", "StackedAreaChart"])(
    "preserves normalized %s stacks and array palettes",
    (component) => {
      const props =
        component === "StackedBarChart"
          ? { categoryAccessor: "c", valueAccessor: "v", stackBy: "g" }
          : { xAccessor: "x", yAccessor: "y", areaBy: "g" }
      const result = toVegaLiteResult(
        config(component, {
          ...props,
          normalize: true,
          colorScheme: ["#f00", "#0f0"]
        })
      )
      expect(result.status).toBe("success")
      expect(result.spec?.encoding?.y.stack).toBe("normalize")
      expect(result.spec?.encoding?.color.scale).toEqual({
        range: ["#f00", "#0f0"]
      })
      const back = fromVegaLiteResult(result.spec!)
      expect(back.status).toBe("success")
      expect(back.config?.props).toMatchObject({
        normalize: true,
        colorScheme: ["#f00", "#0f0"]
      })
    }
  )

  it.each(["metrics.x", "metrics[0]", "metrics\\.x"])("reports literal field names that Vega-Lite parses as paths: %s", field => {
    const input = config("LineChart", { xAccessor: field, yAccessor: "y" })
    expect(toVegaLiteResult(input).status).toBe("refused")
    const lossy = toVegaLiteResult(input, { allowLossy: true })
    expect(lossy.status).toBe("lossy")
    expect(lossy.lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/x/field" }))
  })

  it("preserves area opacity without requiring a curve", () => {
    const result = toVegaLiteResult(
      config("AreaChart", { xAccessor: "x", yAccessor: "y", areaOpacity: 0.25 })
    )
    expect(result.spec?.mark).toEqual({ type: "area", opacity: 0.25 })
  })

  it.each([null, 42, { component: "BarChart", props: null }, { component: "BarChart", props: { data: "bad" } }])("refuses malformed outbound config %j", value => {
    expect(toVegaLiteResult(value as unknown as Parameters<typeof toVegaLiteResult>[0]).status).toBe("refused")
  })

  it("validates malformed recovered IDID base layers before translating", () => {
    const spec = { usermeta: { idid: { specVersion: "0.1" } }, layer: [{ ...base, encoding: { x: null } }] }
    expect(importSpec(spec).status).toBe("refused")
    expect(importSpec(spec, true).status).toBe("refused")
    expect(() => fromVegaLite(spec as unknown as VegaLiteSpec)).not.toThrow()
  })

  it("refuses sparse rows and layers and never emits prototype curve functions", () => {
    expect(importSpec({ ...base, data: { values: new Array(1) } }).status).toBe("refused")
    expect(importSpec({ ...base, layer: new Array(1) }).status).toBe("refused")
    const result = toVegaLiteResult(config("LineChart", { xAccessor: "x", yAccessor: "y", curve: "constructor" }), { allowLossy: true })
    expect(result.status).toBe("lossy")
    expect(result.spec?.mark).toEqual({ type: "line" })
    expect(toVegaLiteResult(config("LineChart", { xAccessor: "x", yAccessor: "y", data: new Array(1) })).status).toBe("refused")
  })

  it("does not resolve prototype names as component registries", () => {
    expect(toVegaLiteResult(config("constructor", {})).status).toBe("refused")
  })
})

describe("exact palette boundaries", () => {
  it.each(["accent", "dark2", "paired", "pastel1", "pastel2", "set1", "set2", "category20", "tableau10"])("reports a palette that the legacy mapping cannot preserve: %s", scheme => {
    const result = fromVegaLiteResult({ ...base, encoding: { ...base.encoding, color: { field: "group", type: "nominal", scale: { scheme } } } })
    expect(result.status).toBe("refused")
    expect(result.lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/color/scale/scheme" }))
  })

  it.each([[1, 2], ["#fff", 1], [], new Array(1)].map(range => ({ range })))("refuses non-color palette ranges: $range", ({ range }) => {
    const result = fromVegaLiteResult({ ...base, encoding: { ...base.encoding, color: { field: "group", scale: { range } } } })
    expect(result.status).toBe("refused")
    expect(result.lossReport).toContainEqual(expect.objectContaining({ path: "/encoding/color/scale/range" }))
  })

  it.each(["accent", "constructor", { A: "red" }, [1, 2]].map(colorScheme => ({ colorScheme })))("reports invalid or unsupported outbound palettes: $colorScheme", ({ colorScheme }) => {
    const input = { component: "LineChart", version: "1", createdAt: "2024-01-01T00:00:00Z", props: { xAccessor: "x", yAccessor: "y", lineBy: "group", colorScheme } }
    expect(toVegaLiteResult(input).status).toBe("refused")
    const lossy = toVegaLiteResult(input, { allowLossy: true })
    expect(lossy.status).toBe("lossy")
    expect(lossy.spec?.encoding?.color.scale).toBeUndefined()
  })

  it.each(["category10", "set3"])("preserves supported exact palettes: %s", scheme => {
    const result = fromVegaLiteResult({ ...base, encoding: { ...base.encoding, color: { field: "group", scale: { scheme } } } })
    expect(result.status).toBe("success")
    expect(result.config?.props.colorScheme).toBe(scheme)
  })
})

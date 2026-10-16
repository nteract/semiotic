import { describe, expect, it, vi } from "vitest"
import { fromVegaLite, fromVegaLiteResult } from "../fromVegaLite"
import type { VegaLiteSpec } from "../fromVegaLite"
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

describe("strict Vega-Lite boundaries", () => {
  it.each([
    null,
    42,
    [],
    { ...base, encoding: null },
    { ...base, encoding: { x: null } },
    { ...base, data: { values: "bad" } },
    { ...base, data: { values: [null, 1] } },
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

  it.each(["line", "area", "point", "circle", "square"])(
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
  const config = (component: string, props: Record<string, unknown>) => ({
    component,
    props,
    version: "1",
    createdAt: "2024-01-01T00:00:00Z"
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

import { afterEach, describe, expect, it, vi } from "vitest"
import { bin, fromVegaLite, rollup } from "semiotic/data"
import {
  unstable_fromFlintChart as fromFlintChart,
  unstable_fromVegaLiteResult as fromVegaLiteResult,
  unstable_toVegaLite as toVegaLite
} from "semiotic/experimental"
import type { FlintChartAssemblyInput } from "./fromFlintChart"

afterEach(() => vi.restoreAllMocks())

describe("aggregation semantics (#1382)", () => {
  it("keeps group types, missing keys, and first-seen order", () => {
    const groups = [2, "2", null, undefined, "null", "undefined", false]
    const rows = groups.map((group) => ({ group, amount: 3 }))
    expect(rollup(rows, { groupBy: "group", value: "amount" })).toEqual(
      groups.map((group) => ({ group, value: 3 }))
    )
  })

  it.each([
    ["sum", 6],
    ["mean", 3],
    ["min", 2],
    ["max", 4],
    ["count", 13]
  ] as const)(
    "excludes missing and nonnumeric measures from %s",
    (agg, expected) => {
      const invalid = [
        null,
        undefined,
        "",
        " ",
        "n/a",
        NaN,
        Infinity,
        -Infinity,
        true,
        [],
        {}
      ]
      const rows = [...invalid, 2, "4"].map((amount) => ({
        group: "A",
        amount
      }))
      expect(rollup(rows, { groupBy: "group", value: "amount", agg })).toEqual([
        { group: "A", value: expected }
      ])
      expect(
        rollup(rows.slice(0, invalid.length), {
          groupBy: "group",
          value: "amount",
          agg
        })
      ).toEqual([
        { group: "A", value: agg === "count" ? invalid.length : null }
      ])
    }
  )

  it("groups tuples without delimiter collisions and coalesces equal Dates", () => {
    const date = new Date(0)
    const rows = [
      { at: date, series: "a|b", amount: 1 },
      { at: new Date(0), series: "a|b", amount: 2 },
      { at: 0, series: "a|b", amount: 4 },
      { at: "a|b", series: "c", amount: 8 },
      { at: "a", series: "b|c", amount: 16 }
    ]
    const result = rollup(rows, { groupBy: ["at", "series"], value: "amount" })
    expect(result).toEqual([
      { at: date, series: "a|b", value: 3 },
      { at: 0, series: "a|b", value: 4 },
      { at: "a|b", series: "c", value: 8 },
      { at: "a", series: "b|c", value: 16 }
    ])
    expect(result[0].at).toBe(date)
  })

  it("requires a distinct output field when value is a group dimension", () => {
    const rows = [
      { value: "A", n: 3 },
      { value: "A", n: 4 }
    ]
    expect(() => rollup(rows, { groupBy: "value", value: "n" })).toThrow(
      /outputField/
    )
    expect(
      rollup(rows, { groupBy: "value", value: "n", outputField: "total" })
    ).toEqual([{ value: "A", total: 7 }])
  })

  it("keeps bin's existing missing-value exclusion", () => {
    expect(
      bin(
        [null, "", " ", 3, 4].map((v) => ({ v })),
        { field: "v", bins: 1 }
      )
    ).toEqual([{ category: "3-4", value: 2, x0: 3, x1: 4 }])
  })

  it("handles global, empty, and large aggregates without mutating rows", () => {
    const row = Object.freeze({ n: 2 })
    expect(
      rollup(Array(200_000).fill(row), { groupBy: [], value: "n" })
    ).toEqual([{ value: 400_000 }])
    expect(rollup([], { groupBy: [], value: "n" })).toEqual([])
    expect(row).toEqual({ n: 2 })
  })

  it("rejects malformed rows and options explicitly", () => {
    expect(() => rollup([null] as never, { groupBy: "g", value: "n" })).toThrow(
      /row 0/
    )
    expect(() => rollup([], { groupBy: [null] as never, value: "n" })).toThrow(
      /groupBy/
    )
    expect(() =>
      rollup([], { groupBy: "g", value: "n", agg: "constructor" as never })
    ).toThrow(/aggregate/)
    expect(() =>
      rollup([], { groupBy: "g", value: "n", outputField: "" })
    ).toThrow(/outputField/)
  })

  it("preserves prototype-shaped fields and object group identities", () => {
    const key = { id: 1 }
    const rows = [
      Object.fromEntries([
        ["__proto__", key],
        ["n", 2]
      ]),
      Object.fromEntries([
        ["__proto__", key],
        ["n", 3]
      ]),
      Object.fromEntries([
        ["__proto__", { id: 1 }],
        ["n", 4]
      ])
    ]
    const output = rollup(rows, {
      groupBy: "__proto__",
      value: "n",
      outputField: "constructor"
    })
    expect(output).toHaveLength(2)
    expect(output[0].__proto__).toBe(key)
    expect(output[0].constructor).toBe(5)
    expect(Object.getPrototypeOf(output[0])).toBe(Object.prototype)
  })

  it("preserves all nonaggregated bubble channels and computes multiple measures", () => {
    const config = fromVegaLite({
      mark: "point",
      data: {
        values: [
          { g: "A", n: 2, size: 5 },
          { g: "A", n: 6, size: 5 }
        ]
      },
      encoding: {
        x: { field: "n", aggregate: "min", type: "quantitative" },
        y: { field: "n", aggregate: "max", type: "quantitative" },
        color: { field: "g", type: "nominal" },
        size: { field: "size", type: "quantitative" }
      }
    })
    expect(config.props.data).toEqual([
      { g: "A", size: 5, value: 2, value_1: 6 }
    ])
    expect(config.props.xAccessor).toBe("value")
    expect(config.props.yAccessor).toBe("value_1")
    expect(config.props.sizeBy).toBe("size")
  })

  it("aggregates heatmap color and pie theta over their original dimensions", () => {
    const rows = [
      { x: "A", y: "B", n: 2 },
      { x: "A", y: "B", n: 6 }
    ]
    const heatmap = fromVegaLite({
      mark: "rect",
      data: { values: rows },
      encoding: {
        x: { field: "x" },
        y: { field: "y" },
        color: { field: "n", aggregate: "average" }
      }
    })
    expect(heatmap.props.valueAccessor).toBe("value")
    expect(heatmap.props.data).toEqual([{ x: "A", y: "B", value: 4 }])
    const pie = fromVegaLite({
      mark: "arc",
      data: { values: rows },
      encoding: {
        color: { field: "x" },
        theta: { field: "n", aggregate: "sum" }
      }
    })
    expect(pie.props.valueAccessor).toBe("value")
    expect(pie.props.data).toEqual([{ x: "A", value: 8 }])
  })

  it.each(["sum", "mean", "count"])(
    "keeps each Vega-Lite series when applying %s",
    (aggregate) => {
      const config = fromVegaLite({
        mark: "bar",
        data: {
          values: [
            { c: "A", g: "x", n: 2 },
            { c: "A", g: "y", n: 4 },
            { c: "A", g: "x", n: null }
          ]
        },
        encoding: {
          x: { field: "c", type: "nominal" },
          y: {
            ...(aggregate === "count" ? {} : { field: "n" }),
            type: "quantitative",
            aggregate
          },
          color: { field: "g", type: "nominal" }
        }
      })
      expect(config.component).toBe("StackedBarChart")
      expect(config.props.stackBy).toBe("g")
      expect(config.props.valueAccessor).toBe("value")
      expect(config.props.data).toEqual([
        { c: "A", g: "x", value: 2 },
        { c: "A", g: "y", value: aggregate === "count" ? 1 : 4 }
      ])
    }
  )

  it.each(["line", "area"])(
    "keeps numeric positions and series in aggregated %s charts",
    (mark) => {
      const config = fromVegaLite({
        mark,
        data: {
          values: [
            { x: 2, g: "a", n: null },
            { x: 2, g: "a", n: 4 },
            { x: 2, g: "b", n: 8 }
          ]
        },
        encoding: {
          x: { field: "x", type: "quantitative" },
          y: { field: "n", type: "quantitative", aggregate: "mean" },
          color: { field: "g", type: "nominal" }
        }
      })
      expect(config.props.data).toEqual([
        { x: 2, g: "a", value: 4 },
        { x: 2, g: "b", value: 8 }
      ])
      expect(config.props[mark === "line" ? "lineBy" : "areaBy"]).toBe("g")
    }
  )

  it("keeps horizontal category and color fields named value and value_1", () => {
    const config = fromVegaLite({
      mark: "bar",
      data: { values: [{ value: "A", value_1: "s", n: 2 }] },
      encoding: {
        y: { field: "value", type: "nominal" },
        x: { field: "n", type: "quantitative", aggregate: "sum" },
        color: { field: "value_1", type: "nominal" }
      }
    })
    expect(config.props.orientation).toBe("horizontal")
    expect(config.props.categoryAccessor).toBe("value")
    expect(config.props.valueAccessor).toBe("value_2")
    expect(config.props.data).toEqual([
      { value: "A", value_1: "s", value_2: 2 }
    ])
  })

  it("counts source rows for histograms instead of pre-counting distinct values", () => {
    const rows = [{ x: 1 }, { x: 1 }, { x: 2 }]
    const config = fromVegaLite({
      mark: "bar",
      data: { values: rows },
      encoding: {
        x: { field: "x", type: "quantitative", bin: true },
        y: { aggregate: "count", type: "quantitative" }
      }
    })
    expect(config.props.data).toEqual(rows)
  })

  it.each([{ values: [] }, { values: [1, 1, 1, 1, 2, 9] }])(
    "round-trips histogram source observations $values (#1385)",
    ({ values }) => {
      const data = values.map((amount) => ({ amount }))
      const spec = toVegaLite({
        component: "Histogram",
        version: "1",
        createdAt: "2026-01-01T00:00:00.000Z",
        props: { data, valueAccessor: "amount", bins: 2 }
      })
      expect(spec).toBeDefined()
      const imported = fromVegaLiteResult(spec!)
      expect(imported.status).toBe("success")
      expect(imported.config?.props).toMatchObject({
        data,
        valueAccessor: "amount",
        bins: 2
      })
    }
  )

  it("refuses binned sums and reports their loss only in lossy mode (#1385)", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const spec = {
      mark: "bar",
      data: { values: [{ x: 1, n: 9 }] },
      encoding: {
        x: { field: "x", bin: true },
        y: { field: "n", aggregate: "sum" }
      }
    }
    expect(fromVegaLiteResult(spec).status).toBe("refused")
    const lossy = fromVegaLiteResult(spec, { mode: "lossy" })
    expect(lossy.status).toBe("lossy")
    expect(lossy.lossReport).toContainEqual(
      expect.objectContaining({
        code: "UNSUPPORTED_AGGREGATE",
        path: "/encoding/y/aggregate"
      })
    )
    expect(lossy.config?.props.data).toEqual(spec.data.values)
  })

  it("retains histogram category grouping on round-trip", () => {
    const data = [
      { amount: 1, group: "A" },
      { amount: 1, group: "B" }
    ]
    const spec = toVegaLite({
      component: "Histogram",
      version: "1",
      createdAt: "2026-01-01T00:00:00.000Z",
      props: {
        data,
        valueAccessor: "amount",
        categoryAccessor: "group",
        bins: 2
      }
    })
    expect(spec).toBeDefined()
    expect(fromVegaLite(spec!).props).toMatchObject({
      data,
      categoryAccessor: "group"
    })
  })

  it("refuses malformed aggregation rows and missing fields with structured diagnostics", () => {
    const malformed = fromVegaLiteResult({
      mark: "line",
      data: { values: [null] as never },
      encoding: { y: { aggregate: "count" } }
    })
    expect(malformed.status).toBe("refused")
    expect(malformed.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_AGGREGATE_DATA" })
    )
    const missing = fromVegaLiteResult({
      mark: "line",
      data: { values: [] },
      encoding: { y: { aggregate: "sum" } }
    })
    expect(missing.status).toBe("refused")
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_AGGREGATE" })
    )
  })

  it.each(["median", "constructor"])(
    "reports unsupported Vega-Lite aggregate %s without inventing a value accessor",
    (aggregate) => {
      vi.spyOn(console, "warn").mockImplementation(() => {})
      const spec = {
        mark: "bar",
        data: { values: [{ c: "A", n: 2 }] },
        encoding: {
          x: { field: "c", type: "nominal" as const },
          y: { field: "n", aggregate }
        }
      }
      const config = fromVegaLite(spec)
      expect(config.props.valueAccessor).toBe("n")
      expect(config.warnings?.join(" ")).toMatch(/aggregate/)
      const result = fromVegaLiteResult(spec)
      expect(result.status).toBe("refused")
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
          code: "UNSUPPORTED_AGGREGATE",
          path: "/encoding/y/aggregate"
        })
      )
    }
  )

  it.each(["sum", "mean", "average", "min", "max", "count"] as const)(
    "shares missing and group semantics with Flint %s",
    (aggregate) => {
      const config = fromFlintChart({
        data: {
          values: [
            { c: 2, value: "a", n: null },
            { c: 2, value: "a", n: 4 },
            { c: "2", value: "b", n: "n/a" }
          ]
        },
        chart_spec: {
          chartType: "stackedBar",
          encodings: {
            x: { field: "c", type: "nominal" },
            y: { field: "n", aggregate },
            color: { field: "value" }
          }
        }
      })
      expect(config.props.valueAccessor).toBe("value_1")
      expect(config.props.stackBy).toBe("value")
      expect(config.props.data).toEqual([
        { c: 2, value: "a", value_1: aggregate === "count" ? 2 : 4 },
        { c: "2", value: "b", value_1: aggregate === "count" ? 1 : null }
      ])
    }
  )

  it("keeps Flint heatmap cells, pie categories, and bubble sizes when aggregating", () => {
    const values = [
      { x: 2, value: "A", n: null, size: 8 },
      { x: 2, value: "A", n: 4, size: 8 }
    ]
    const heatmap = fromFlintChart({
      data: { values },
      chart_spec: {
        chartType: "heatmap",
        encodings: {
          x: { field: "x" },
          y: { field: "value" },
          color: { field: "n", aggregate: "mean" }
        }
      }
    })
    expect(heatmap.props.valueAccessor).toBe("value_1")
    expect(heatmap.props.data).toEqual([{ x: 2, value: "A", value_1: 4 }])
    const pie = fromFlintChart({
      data: { values },
      chart_spec: {
        chartType: "pie",
        encodings: {
          color: { field: "value" },
          theta: { field: "n", aggregate: "sum" }
        }
      }
    })
    expect(pie.props.valueAccessor).toBe("value_1")
    expect(pie.props.data).toEqual([{ value: "A", value_1: 4 }])
    const bubble = fromFlintChart({
      data: { values },
      chart_spec: {
        chartType: "scatter",
        encodings: {
          x: { field: "x" },
          y: { field: "n", aggregate: "mean" },
          color: { field: "value" },
          size: { field: "size" }
        }
      }
    })
    expect(bubble.props.yAccessor).toBe("value_1")
    expect(bubble.props.data).toEqual([
      { x: 2, value: "A", size: 8, value_1: 4 }
    ])
  })

  it("reports and retains unsupported Flint aggregates", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const encoding = { field: "n", aggregate: "median" }
    const config = fromFlintChart({
      data: { values: [{ c: "A", n: 2 }] },
      chart_spec: {
        chartType: "bar",
        encodings: { x: { field: "c" }, y: encoding }
      }
    } as FlintChartAssemblyInput)
    expect(config.warnings?.join(" ")).toMatch(/aggregate.*median/)
    expect(config.flint.unmappedEncodings?.y).toEqual(encoding)
    expect(config.props.valueAccessor).toBe("n")
  })
})

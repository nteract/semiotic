import { describe, expect, it } from "vitest"
import { fromFlintChart } from "./fromFlintChart"
import { summarizeData } from "./DataSummarizer"
import { profileNumericFields } from "./numericFieldProfiler"
import { groupBy, pivot } from "./transforms"

const rows = [
  JSON.parse('{"__proto__":2,"constructor":3,"group":"A"}'),
  JSON.parse('{"__proto__":4,"constructor":5,"group":"A"}')
]

describe("own-key-safe data boundaries", () => {
  it("retains prototype-named summary and numeric profile fields", () => {
    const summary = summarizeData(rows).fields
    expect(Object.keys(summary)).toContain("__proto__")
    expect(Object.getPrototypeOf(summary)).toBe(Object.prototype)
    expect(summary.__proto__).toMatchObject({
      type: "numeric",
      min: 2,
      max: 4,
      mean: 3
    })
    const profiles = profileNumericFields(rows)
    expect(Object.keys(profiles)).toContain("__proto__")
    expect(Object.getPrototypeOf(profiles)).toBe(Object.prototype)
    expect(profiles.__proto__).toMatchObject({
      field: "__proto__",
      min: 2,
      max: 4,
      finiteCount: 2
    })
  })

  it("ignores inherited values when profiling ragged rows", () => {
    const data = [...rows, Object.create({ constructor: 100 })]
    expect(summarizeData(data).fields.constructor).toMatchObject({
      mean: 4,
      missingCount: 1
    })
    expect(profileNumericFields(data).constructor).toMatchObject({
      finiteCount: 2,
      missingCount: 1
    })
  })

  it("preserves projected own keys and skips inherited properties", () => {
    const grouped = groupBy(rows, {
      key: "group",
      fields: ["__proto__", "constructor", "toString"]
    })
    expect(grouped[0].coordinates).toEqual(
      rows.map((row) =>
        Object.fromEntries([
          ["__proto__", row.__proto__],
          ["constructor", row.constructor]
        ])
      )
    )
    for (const row of grouped[0].coordinates) {
      expect(Object.getPrototypeOf(row)).toBe(Object.prototype)
      expect(Object.hasOwn(row, "__proto__")).toBe(true)
      expect(Object.hasOwn(row, "toString")).toBe(false)
    }
  })

  it("preserves prototype-named non-pivot columns", () => {
    const result = pivot(rows, { columns: ["constructor"] })
    expect(result[0]).toMatchObject({
      name: "constructor",
      value: 3
    })
    expect(Object.getPrototypeOf(result[0])).toBe(Object.prototype)
    expect(Object.hasOwn(result[0], "__proto__")).toBe(true)
    expect(result[0]["__proto__"]).toBe(2)
  })

  it("does not inject an encoding through a __proto__ channel", () => {
    const config = fromFlintChart({
      data: { values: [{ b: 1, y: 2 }] },
      chart_spec: {
        chartType: "scatter",
        encodings: JSON.parse(
          '{"__proto__":{"x":{"field":"b"}},"y":{"field":"y"}}'
        )
      }
    })
    expect(config.props.xAccessor).not.toBe("b")
  })
})

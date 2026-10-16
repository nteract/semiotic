import { describe, expect, it } from "vitest"
import { validateProps } from "./validateProps"
import { diagnoseConfig } from "./diagnoseConfig"
import {
  validateArrayData,
  validateObjectData,
  validateNetworkData
} from "./validateChartData"

const bar = {
  data: [{ category: "A", value: 1 }],
  categoryAccessor: "category",
  valueAccessor: "value"
}

describe("public validation boundaries", () => {
  it.each(Object.getOwnPropertyNames(Object.prototype))(
    "rejects inherited component %s",
    (component) => {
      expect(validateProps(component, {}).errors[0]).toContain(
        "Unknown component"
      )
      expect(diagnoseConfig(component, {}).diagnoses[0].message).toContain(
        "Unknown component"
      )
    }
  )

  it.each([NaN, Infinity, -Infinity, 0, -10])(
    "rejects invalid dimensions %s",
    (value) => {
      expect(
        validateProps("BarChart", { ...bar, width: value, height: value }).valid
      ).toBe(false)
      expect(
        diagnoseConfig("BarChart", {
          ...bar,
          width: value,
          height: value
        }).diagnoses.map(({ code }) => code)
      ).toEqual(expect.arrayContaining(["BAD_WIDTH", "BAD_HEIGHT"]))
    }
  )

  it.each(["constructor", "toString", "__proto__"])(
    "requires an own %s accessor field",
    (accessor) => {
      expect(
        validateProps("BarChart", { ...bar, categoryAccessor: accessor }).valid
      ).toBe(false)
      expect(
        diagnoseConfig("BarChart", {
          ...bar,
          categoryAccessor: accessor
        }).diagnoses.map(({ code }) => code)
      ).toContain("ACCESSOR_MISSING")
      expect(
        validateProps("BarChart", {
          ...bar,
          data: [{ [accessor]: "A", value: 1 }],
          categoryAccessor: accessor
        }).valid
      ).toBe(true)
    }
  )

  it("examines multiple record samples and allows legitimate row gaps", () => {
    const data = [null, { category: "A" }, { value: 1 }]
    expect(
      validateArrayData({
        componentName: "BarChart",
        data,
        accessors: { categoryAccessor: "category", valueAccessor: "value" }
      })
    ).toBeNull()
    expect(
      diagnoseConfig("LineChart", {
        data: [null, { x: 1, y: 2 }]
      }).diagnoses.map(({ code }) => code)
    ).toContain("DATA_GAPS")
    const sparse = new Array(5)
    sparse[1] = { category: "A", value: 1 }
    expect(validateProps("BarChart", { ...bar, data: sparse }).valid).toBe(true)
  })

  it.each(
    [
      [null, null],
      new Array(3),
      [1, "two", false],
      [[], new Date(), new Map()]
    ].map((data) => ({ data }))
  )("rejects arrays without record rows", ({ data }) => {
    expect(validateProps("BarChart", { ...bar, data }).valid).toBe(false)
    expect(
      validateNetworkData({
        componentName: "ForceDirectedGraph",
        nodes: data,
        edges: [{ source: "a", target: "b" }],
        nodesRequired: true
      })
    ).not.toBeNull()
  })

  it.each([1, "root", true, new Date(), new Map(), new Set()])(
    "rejects non-record hierarchy roots %s",
    (data) => {
      expect(
        validateObjectData({ componentName: "TreeDiagram", data })
      ).not.toBeNull()
    }
  )

  it("does not suggest one-letter substring fields as unrelated date accessors", () => {
    expect(
      validateArrayData({
        componentName: "LineChart",
        data: [{ a: 1 }],
        accessors: { xAccessor: "date" }
      })
    ).not.toContain('Try xAccessor="a"')
  })

  it.each([null, undefined, false, 3, "props", []])(
    "diagnoses malformed prop payloads %s without throwing",
    (props) => {
      expect(diagnoseConfig("LineChart", props as never).ok).toBe(false)
      expect(diagnoseConfig("XYCustomChart", props as never).ok).toBe(false)
    }
  )
})

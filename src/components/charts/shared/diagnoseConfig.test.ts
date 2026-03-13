import { describe, it, expect } from "vitest"
import { diagnoseConfig } from "./diagnoseConfig"

describe("diagnoseConfig", () => {
  it("returns ok for a valid configuration", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
    })
    expect(result.ok).toBe(true)
    expect(result.diagnoses).toHaveLength(0)
  })

  it("detects empty data array", () => {
    const result = diagnoseConfig("LineChart", {
      data: [],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("EMPTY_DATA")
    expect(result.ok).toBe(false)
  })

  it("detects bad width", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      width: 0,
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("BAD_WIDTH")
  })

  it("detects accessor field not in data", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ name: "A", count: 10 }],
      categoryAccessor: "category",
      valueAccessor: "count",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("ACCESSOR_MISSING")
    // Should mention available fields
    const msg = result.diagnoses.find(d => d.code === "ACCESSOR_MISSING")!.message
    expect(msg).toContain("name")
    expect(msg).toContain("count")
  })

  it("detects hierarchy data as flat array", () => {
    const result = diagnoseConfig("Treemap", {
      data: [{ name: "A", value: 10 }],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("HIERARCHY_FLAT_ARRAY")
  })

  it("detects margin overflow", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      width: 200,
      margin: { left: 100, right: 120, top: 10, bottom: 10 },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("MARGIN_OVERFLOW_H")
  })

  it("warns about linkedHover without selection", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      linkedHover: { name: "hl", fields: ["region"] },
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("LINKED_HOVER_NO_SELECTION")
    // This is a warning, not error — ok should still be true if no errors
    const warnings = result.diagnoses.filter(d => d.severity === "warning")
    expect(warnings.length).toBeGreaterThan(0)
  })

  it("includes validation errors from validateProps", () => {
    const result = diagnoseConfig("FakeComponent", { data: [] })
    expect(result.ok).toBe(false)
    expect(result.diagnoses[0].code).toBe("VALIDATION")
    expect(result.diagnoses[0].message).toContain("Unknown component")
  })

  it("warns about non-zero baseline in bar charts", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 50 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      rExtent: [10, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("NON_ZERO_BASELINE")
    const diag = result.diagnoses.find(d => d.code === "NON_ZERO_BASELINE")!
    expect(diag.severity).toBe("warning")
  })

  it("does not warn about non-zero baseline for LineChart", () => {
    const result = diagnoseConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      rExtent: [10, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("NON_ZERO_BASELINE")
  })

  it("does not warn when baseline is zero", () => {
    const result = diagnoseConfig("BarChart", {
      data: [{ category: "A", value: 50 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      rExtent: [0, 100],
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("NON_ZERO_BASELINE")
  })

  it("warns about data gaps in LineChart", () => {
    const result = diagnoseConfig("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      xAccessor: "x",
      yAccessor: "y",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).toContain("DATA_GAPS")
    const diag = result.diagnoses.find(d => d.code === "DATA_GAPS")!
    expect(diag.severity).toBe("warning")
  })

  it("does not warn about data gaps when gapStrategy is set", () => {
    const result = diagnoseConfig("LineChart", {
      data: [
        { x: 1, y: 10 },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      xAccessor: "x",
      yAccessor: "y",
      gapStrategy: "break",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("DATA_GAPS")
  })

  it("does not warn about data gaps in BarChart", () => {
    const result = diagnoseConfig("BarChart", {
      data: [
        { category: "A", value: 10 },
        { category: "B", value: null },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
    })
    const codes = result.diagnoses.map(d => d.code)
    expect(codes).not.toContain("DATA_GAPS")
  })
})

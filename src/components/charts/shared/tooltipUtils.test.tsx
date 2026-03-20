import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import * as React from "react"
import {
  formatVal,
  accessorName,
  resolveValue,
  buildDefaultTooltip,
  buildOrdinalTooltip,
} from "./tooltipUtils"

// ── formatVal ────────────────────────────────────────────────────────────

describe("formatVal", () => {
  it("returns en-dash for null", () => {
    expect(formatVal(null)).toBe("\u2013")
  })

  it("returns en-dash for undefined", () => {
    expect(formatVal(undefined)).toBe("\u2013")
  })

  it("does not add commas for numbers <= 9999", () => {
    expect(formatVal(42)).toBe("42")
    expect(formatVal(9999)).toBe("9999")
    expect(formatVal(0)).toBe("0")
    expect(formatVal(-500)).toBe("-500")
  })

  it("adds locale formatting for numbers > 9999", () => {
    const result = formatVal(10000)
    // Locale-dependent, but should contain some separator or at least not be plain "10000"
    // In most locales this is "10,000" — check it differs from plain string
    expect(result).toBe((10000).toLocaleString())
  })

  it("adds locale formatting for large negative numbers", () => {
    const result = formatVal(-50000)
    expect(result).toBe((-50000).toLocaleString())
  })

  it("handles Date objects", () => {
    const d = new Date("2024-06-15")
    expect(formatVal(d)).toBe(d.toLocaleDateString())
  })

  it("converts strings as-is", () => {
    expect(formatVal("hello")).toBe("hello")
  })

  it("converts booleans via String()", () => {
    expect(formatVal(true)).toBe("true")
  })
})

// ── accessorName ─────────────────────────────────────────────────────────

describe("accessorName", () => {
  it("returns the string when accessor is a string", () => {
    expect(accessorName("revenue")).toBe("revenue")
  })

  it('returns "value" when accessor is a function', () => {
    expect(accessorName((d: any) => d.x)).toBe("value")
  })
})

// ── resolveValue ─────────────────────────────────────────────────────────

describe("resolveValue", () => {
  it("reads a field by string accessor", () => {
    expect(resolveValue({ score: 99 }, "score")).toBe(99)
  })

  it("calls a function accessor with the datum", () => {
    expect(resolveValue({ a: 1, b: 2 }, (d: any) => d.a + d.b)).toBe(3)
  })

  it("returns undefined for missing string key", () => {
    expect(resolveValue({ x: 1 }, "y")).toBeUndefined()
  })
})

// ── buildDefaultTooltip ──────────────────────────────────────────────────

describe("buildDefaultTooltip", () => {
  it("returns a function", () => {
    const fn = buildDefaultTooltip([])
    expect(typeof fn).toBe("function")
  })

  it("returns null when hover.data is falsy", () => {
    const fn = buildDefaultTooltip([{ label: "X", accessor: "x" }])
    const result = fn({ data: null } as any)
    expect(result).toBeNull()
  })

  it("renders body fields with labels and formatted values", () => {
    const fn = buildDefaultTooltip([
      { label: "Score", accessor: "score" },
      { label: "Name", accessor: "name" },
    ])
    const node = fn({ data: { score: 42, name: "Alice" } } as any)
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("Score:")
    expect(container.textContent).toContain("42")
    expect(container.textContent).toContain("Name:")
    expect(container.textContent).toContain("Alice")
  })

  it("renders a bold title when a field has role=title", () => {
    const fn = buildDefaultTooltip([
      { label: "Name", accessor: "name", role: "title" },
      { label: "Val", accessor: "val" },
    ])
    const node = fn({ data: { name: "Group A", val: 100 } } as any)
    const { container } = render(<>{node}</>)
    const bold = container.querySelector("div[style*='bold']")
    expect(bold).not.toBeNull()
    expect(bold!.textContent).toBe("Group A")
  })

  it("title field is excluded from the body fields", () => {
    const fn = buildDefaultTooltip([
      { label: "Category", accessor: "cat", role: "title" },
      { label: "Value", accessor: "val" },
    ])
    const node = fn({ data: { cat: "X", val: 7 } } as any)
    const { container } = render(<>{node}</>)
    // "Category:" should NOT appear as a label (it's the title, not a body row)
    expect(container.textContent).not.toContain("Category:")
  })

  it("uses function accessors", () => {
    const fn = buildDefaultTooltip([
      { label: "Computed", accessor: (d: any) => d.a + d.b },
    ])
    const node = fn({ data: { a: 3, b: 4 } } as any)
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("7")
  })

  it("renders the semiotic-tooltip class", () => {
    const fn = buildDefaultTooltip([{ label: "X", accessor: "x" }])
    const node = fn({ data: { x: 1 } } as any)
    const { container } = render(<>{node}</>)
    expect(container.querySelector(".semiotic-tooltip")).not.toBeNull()
  })
})

// ── buildOrdinalTooltip ──────────────────────────────────────────────────

describe("buildOrdinalTooltip", () => {
  it("returns a function", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
    })
    expect(typeof fn).toBe("function")
  })

  it("renders category as bold and value below", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
    })
    const node = fn({ data: { cat: "Apples", val: 120 } })
    const { container } = render(<>{node}</>)
    const bold = container.querySelector("div[style*='bold']")
    expect(bold).not.toBeNull()
    expect(bold!.textContent).toBe("Apples")
    expect(container.textContent).toContain("120")
  })

  it("unwraps d.data for ordinal data", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
    })
    // Ordinal frames wrap data in d.data
    const node = fn({ data: { cat: "Oranges", val: 55 } })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("Oranges")
    expect(container.textContent).toContain("55")
  })

  it("unwraps pieData (d.data is an array)", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
      pieData: true,
    })
    // PieChart wraps data as d.data = [actualDatum]
    const node = fn({ data: [{ cat: "Slice", val: 30 }] })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("Slice")
    expect(container.textContent).toContain("30")
  })

  it("falls back to d itself when d.data is missing", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
    })
    const node = fn({ cat: "Direct", val: 77 })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("Direct")
    expect(container.textContent).toContain("77")
  })

  it("renders group field when groupAccessor is provided", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
      groupAccessor: "region",
      groupLabel: "Region",
    })
    const node = fn({ data: { cat: "Q1", val: 200, region: "North" } })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("Region")
    expect(container.textContent).toContain("North")
  })

  it("does not render group row when group value is null", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
      groupAccessor: "region",
    })
    const node = fn({ data: { cat: "Q1", val: 200, region: null } })
    const { container } = render(<>{node}</>)
    // "region:" should not appear because group is null
    expect(container.textContent).not.toContain("region")
  })

  it("uses function accessors for category and value", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: (d: any) => d.name.toUpperCase(),
      valueAccessor: (d: any) => d.amount * 2,
    })
    const node = fn({ data: { name: "test", amount: 5 } })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("TEST")
    expect(container.textContent).toContain("10")
  })

  it("renders the semiotic-tooltip class", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
    })
    const node = fn({ data: { cat: "X", val: 1 } })
    const { container } = render(<>{node}</>)
    expect(container.querySelector(".semiotic-tooltip")).not.toBeNull()
  })
})

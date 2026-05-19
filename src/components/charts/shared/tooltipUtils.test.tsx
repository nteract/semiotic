import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import * as React from "react"
import {
  formatVal,
  accessorName,
  resolveValue,
  buildDefaultTooltip,
  buildOrdinalTooltip,
  bandTooltipFields,
} from "./tooltipUtils"
import type { Datum } from "./datumTypes"

type DefaultHover = Parameters<ReturnType<typeof buildDefaultTooltip>>[0]
const hover = (data: Datum | null): DefaultHover => ({ data, x: 0, y: 0 })

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
    expect(accessorName((d: Datum) => d.x)).toBe("value")
  })
})

// ── resolveValue ─────────────────────────────────────────────────────────

describe("resolveValue", () => {
  it("reads a field by string accessor", () => {
    expect(resolveValue({ score: 99 }, "score")).toBe(99)
  })

  it("calls a function accessor with the datum", () => {
    expect(resolveValue({ a: 1, b: 2 }, (d: Datum) => d.a + d.b)).toBe(3)
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
    const result = fn(hover(null))
    expect(result).toBeNull()
  })

  it("renders body fields with labels and formatted values", () => {
    const fn = buildDefaultTooltip([
      { label: "Score", accessor: "score" },
      { label: "Name", accessor: "name" },
    ])
    const node = fn(hover({ score: 42, name: "Alice" }))
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
    const node = fn(hover({ name: "Group A", val: 100 }))
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
    const node = fn(hover({ cat: "X", val: 7 }))
    const { container } = render(<>{node}</>)
    // "Category:" should NOT appear as a label (it's the title, not a body row)
    expect(container.textContent).not.toContain("Category:")
  })

  it("uses function accessors", () => {
    const fn = buildDefaultTooltip([
      { label: "Computed", accessor: (d: Datum) => d.a + d.b },
    ])
    const node = fn(hover({ a: 3, b: 4 }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("7")
  })

  it("renders the semiotic-tooltip class", () => {
    const fn = buildDefaultTooltip([{ label: "X", accessor: "x" }])
    const node = fn(hover({ x: 1 }))
    const { container } = render(<>{node}</>)
    expect(container.querySelector(".semiotic-tooltip")).not.toBeNull()
  })
})

// ── bandTooltipFields ────────────────────────────────────────────────────

describe("bandTooltipFields", () => {
  it("returns an empty list when band is not configured", () => {
    expect(bandTooltipFields(undefined)).toEqual([])
    expect(bandTooltipFields(null)).toEqual([])
  })

  it("emits one row pair per band — string accessors become labels", () => {
    const fields = bandTooltipFields({ y0Accessor: "min", y1Accessor: "max" })
    expect(fields).toHaveLength(2)
    expect(fields[0].label).toBe("min")
    expect(fields[1].label).toBe("max")
  })

  it("falls back to 'low'/'high' for function accessors", () => {
    const fields = bandTooltipFields({
      y0Accessor: (d: any) => d.lo,
      y1Accessor: (d: any) => d.hi,
    })
    expect(fields[0].label).toBe("low")
    expect(fields[1].label).toBe("high")
  })

  it("emits one row pair per BandConfig in an array", () => {
    const fields = bandTooltipFields([
      { y0Accessor: "p10", y1Accessor: "p90" },
      { y0Accessor: "p25", y1Accessor: "p75" },
    ])
    expect(fields).toHaveLength(4)
    expect(fields.map(f => f.label)).toEqual(["p10", "p90", "p25", "p75"])
  })

  it("reads from datum.bands[i] when rendered through the default tooltip", () => {
    const fields = bandTooltipFields({ y0Accessor: "min", y1Accessor: "max" })
    const fn = buildDefaultTooltip(fields)
    const enrichedDatum = {
      band: { y0: 5, y1: 15 },
      bands: [{ y0: 5, y1: 15 }],
    }
    const node = fn(hover(enrichedDatum))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("min:")
    expect(container.textContent).toContain("5")
    expect(container.textContent).toContain("max:")
    expect(container.textContent).toContain("15")
  })

  it("multi-band tooltips render values from each band entry", () => {
    const fields = bandTooltipFields([
      { y0Accessor: "p10", y1Accessor: "p90" },
      { y0Accessor: "p25", y1Accessor: "p75" },
    ])
    const fn = buildDefaultTooltip(fields)
    const enrichedDatum = {
      band: { y0: 10, y1: 90 },
      bands: [
        { y0: 10, y1: 90 },
        { y0: 25, y1: 75 },
      ],
    }
    const node = fn(hover(enrichedDatum))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("p10")
    expect(container.textContent).toContain("10")
    expect(container.textContent).toContain("p25")
    expect(container.textContent).toContain("25")
    expect(container.textContent).toContain("p90")
    expect(container.textContent).toContain("90")
    expect(container.textContent).toContain("p75")
    expect(container.textContent).toContain("75")
  })

  it("applies the provided value format to band rows", () => {
    const fields = bandTooltipFields(
      { y0Accessor: "min", y1Accessor: "max" },
      (v: any) => `$${v}`
    )
    const fn = buildDefaultTooltip(fields)
    const node = fn(hover({ bands: [{ y0: 100, y1: 200 }] }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("$100")
    expect(container.textContent).toContain("$200")
  })

  it("first-band rows fall back to datum.band when bands[0] is missing", () => {
    const fields = bandTooltipFields({ y0Accessor: "min", y1Accessor: "max" })
    const fn = buildDefaultTooltip(fields)
    // Older enrichment path or a tooltip that only saw `band`
    const node = fn(hover({ band: { y0: 5, y1: 15 } }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("5")
    expect(container.textContent).toContain("15")
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
      categoryAccessor: (d: Datum) => d.name.toUpperCase(),
      valueAccessor: (d: Datum) => d.amount * 2,
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

  // Regression: `valueFormat` set on the chart must reach the default
  // tooltip — users report "axis shows $450k but tooltip shows 450000".
  it("applies valueFormat to the value display", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
      valueFormat: (v: any) => `$${(v / 1000).toFixed(0)}k`,
    })
    const node = fn({ data: { cat: "Product A", val: 450000 } })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("$450k")
    expect(container.textContent).not.toContain("450000")
  })

  it("falls back to formatVal if valueFormat throws", () => {
    const fn = buildOrdinalTooltip({
      categoryAccessor: "cat",
      valueAccessor: "val",
      valueFormat: () => { throw new Error("boom") },
    })
    const node = fn({ data: { cat: "X", val: 42 } })
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("42")
    // Category still renders — a misbehaving formatter doesn't break the tooltip.
    expect(container.textContent).toContain("X")
  })
})

// ── Format cascade (per-field formatter on buildDefaultTooltip) ──────────

describe("buildDefaultTooltip format cascade", () => {
  it("applies per-field format to body values (x/y roles)", () => {
    const fn = buildDefaultTooltip([
      {
        label: "Month",
        accessor: "month",
        role: "x",
        format: (v: any) => `M${v}`,
      },
      {
        label: "Revenue",
        accessor: "revenue",
        role: "y",
        format: (v: any) => `$${v.toLocaleString()}`,
      },
    ])
    const node = fn(hover({ month: 3, revenue: 22000 }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("M3")
    expect(container.textContent).toContain("$22,000")
  })

  it("applies format to the title field", () => {
    const fn = buildDefaultTooltip([
      {
        label: "Name",
        accessor: "name",
        role: "title",
        format: (v: any) => String(v).toUpperCase(),
      },
    ])
    const node = fn(hover({ name: "alice" }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("ALICE")
  })

  it("falls back to formatVal if a field format throws", () => {
    const fn = buildDefaultTooltip([
      {
        label: "Bad",
        accessor: "v",
        format: () => { throw new Error("nope") },
      },
    ])
    const node = fn(hover({ v: 7 }))
    const { container } = render(<>{node}</>)
    expect(container.textContent).toContain("7")
  })

  it("accepts a formatter returning ReactNode (for parity with xFormat/yFormat)", () => {
    const fn = buildDefaultTooltip([
      {
        label: "Val",
        accessor: "v",
        format: (v: any) => <strong data-testid="rn">{v}×</strong>,
      },
    ])
    const node = fn(hover({ v: 5 }))
    const { container } = render(<>{node}</>)
    expect(container.querySelector("[data-testid='rn']")).not.toBeNull()
    expect(container.textContent).toContain("5×")
  })
})

import { render } from "@testing-library/react"
import { Tooltip, MultiLineTooltip, MultiPointTooltip, normalizeTooltip } from "./Tooltip"
import { buildDefaultTooltip } from "../charts/shared/tooltipUtils"
import type { Datum } from "../charts/shared/datumTypes"
import type { ReactElement, ReactNode } from "react"

type TooltipRenderer =
  | ReturnType<typeof Tooltip>
  | ReturnType<typeof MultiLineTooltip>
  | ReturnType<typeof MultiPointTooltip>
  | ReturnType<typeof buildDefaultTooltip>

type NullableTooltipFn<TFn extends TooltipRenderer> = (
  datum: Parameters<TFn>[0] | null | undefined
) => ReturnType<TFn>

type TooltipElement = ReactElement<{ children?: ReactNode }>

describe("Tooltip", () => {
  const sampleData = { x: 1, y: 5, category: "A", size: 10 }

  it("renders title value when title is provided", () => {
    const tooltipFn = Tooltip({ title: "category" })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    expect(container.textContent).toContain("A")
  })

  it("renders field values when fields are provided without title", () => {
    const tooltipFn = Tooltip({ fields: ["x", "y"] })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    // Without title, Tooltip shows the first field's value
    expect(container.textContent).toContain("1")
  })

  it("renders both title AND fields when both are provided", () => {
    const tooltipFn = Tooltip({ title: "category", fields: ["x", "y"] })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    // Should show the category title
    expect(container.textContent).toContain("A")
    // Should ALSO show the field values
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("5")
  })

  it("renders field labels when title and fields are both provided", () => {
    const tooltipFn = Tooltip({
      title: "category",
      fields: [
        { key: "x", label: "X Value" },
        { key: "y", label: "Y Value" }
      ]
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    expect(container.textContent).toContain("A")
    expect(container.textContent).toContain("X Value")
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("Y Value")
    expect(container.textContent).toContain("5")
  })

  it("applies custom format to field values", () => {
    const tooltipFn = Tooltip({
      title: "category",
      fields: [
        { key: "y", label: "Price", format: (v) => `$${v}` }
      ]
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    expect(container.textContent).toContain("A")
    expect(container.textContent).toContain("$5")
  })

  it("falls back to common fields when no title or fields specified", () => {
    const tooltipFn = Tooltip({})
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    // Should find "y" as a common field
    expect(container.textContent).toContain("5")
  })

  it("returns null for null/undefined data", () => {
    const tooltipFn = Tooltip({ title: "category" })
    const nullableTooltipFn = tooltipFn as NullableTooltipFn<typeof tooltipFn>
    expect(nullableTooltipFn(null)).toBeNull()
    expect(nullableTooltipFn(undefined)).toBeNull()
  })

  it("applies custom style", () => {
    const tooltipFn = Tooltip({
      title: "category",
      style: { background: "red" }
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    const tooltip = container.querySelector(".semiotic-tooltip") as HTMLElement
    expect(tooltip.style.background).toBe("red")
  })

  it("applies custom className", () => {
    const tooltipFn = Tooltip({
      title: "category",
      className: "my-tooltip"
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    const tooltip = container.querySelector(".my-tooltip")
    expect(tooltip).toBeTruthy()
  })
})

describe("MultiLineTooltip", () => {
  const sampleData = { x: 1, y: 5, category: "A", size: 10 }

  it("renders title and fields", () => {
    const tooltipFn = MultiLineTooltip({
      title: "category",
      fields: ["x", "y"]
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    expect(container.textContent).toContain("A")
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("5")
  })

  it("renders fields with labels", () => {
    const tooltipFn = MultiLineTooltip({
      fields: [
        { key: "x", label: "X Coord" },
        { key: "y", label: "Y Coord" }
      ],
      showLabels: true
    })
    const { container } = render(<>{tooltipFn(sampleData)}</>)

    expect(container.textContent).toContain("X Coord")
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("Y Coord")
    expect(container.textContent).toContain("5")
  })

  it("returns null for null/undefined data", () => {
    const tooltipFn = MultiLineTooltip({ fields: ["x"] })
    const nullableTooltipFn = tooltipFn as NullableTooltipFn<typeof tooltipFn>
    expect(nullableTooltipFn(null)).toBeNull()
    expect(nullableTooltipFn(undefined)).toBeNull()
  })
})

describe("Tooltip with piece hover data", () => {
  // pieceHoverAnnotation passes { ...piece, ...piece.data } — fields at top level
  const pieceHoverData = { category: "Product A", value: 45, subcategory: "Sales" }

  it("renders category and value from piece hover data", () => {
    const tooltipFn = Tooltip({ title: "category", fields: ["value"] })
    const { container } = render(<>{tooltipFn(pieceHoverData)}</>)

    expect(container.textContent).toContain("Product A")
    expect(container.textContent).toContain("45")
  })

  it("renders subcategory from piece hover data", () => {
    const tooltipFn = Tooltip({ title: "subcategory", fields: ["category", "value"] })
    const { container } = render(<>{tooltipFn(pieceHoverData)}</>)

    expect(container.textContent).toContain("Sales")
    expect(container.textContent).toContain("Product A")
    expect(container.textContent).toContain("45")
  })
})

describe("MultiLineTooltip with piece hover data", () => {
  const pieceHoverData = { category: "Q1", subcategory: "Sales", value: 45 }

  it("renders all fields from piece hover data", () => {
    const tooltipFn = MultiLineTooltip({
      title: "subcategory",
      fields: ["category", "value"]
    })
    const { container } = render(<>{tooltipFn(pieceHoverData)}</>)

    expect(container.textContent).toContain("Sales")
    expect(container.textContent).toContain("Q1")
    expect(container.textContent).toContain("45")
  })
})

describe("normalizeTooltip", () => {
  it("returns undefined for boolean true so the chart-specific default tooltip wins via the caller's `||` fallback", () => {
    // Previously this returned a generic `Tooltip()` helper that
    // dumped raw datum keys ("o"/"h"/"l"/"c" for candlestick, etc.).
    // Now `tooltip={true}` defers to the HOC's `defaultTooltipContent`
    // — the one with proper field labels — by returning undefined and
    // letting `buildTooltipProps`'s `|| defaultTooltipContent` chain
    // resolve.
    expect(normalizeTooltip(true)).toBeUndefined()
  })

  it("returns false for boolean false", () => {
    expect(normalizeTooltip(false)).toBe(false)
  })

  it("wraps user tooltip functions with standard chrome", () => {
    const fn = (d: Datum) => <div>{d.name}</div>
    const result = normalizeTooltip(fn)
    expect(typeof result).toBe("function")
    // Should NOT be the same identity — it's wrapped for styling
    expect(result).not.toBe(fn)
  })

  it("unwraps HoverData for user tooltip functions", () => {
    const fn = (d: Datum) => d.task
    const wrapped = normalizeTooltip(fn) as (d: Datum) => TooltipElement | null
    // Simulate HoverData wrapper from StreamNetworkFrame (has type + data)
    const hoverData = { type: "node", data: { task: "Fix bug" }, x: 10, y: 20 }
    const rendered = wrapped(hoverData)
    expect(rendered).not.toBeNull()
    // The string "Fix bug" should be inside the tooltip chrome div
    expect(rendered?.props.children).toBe("Fix bug")
  })

  it("unwraps explicitly marked HoverData so the user fn receives the raw datum", () => {
    const fn = (d: Datum) => d.fieldName
    const wrapped = normalizeTooltip(fn) as (d: Datum) => TooltipElement | null
    const hoverData = {
      data: { fieldName: "hello" },
      x: 10,
      y: 20,
      __semioticHoverData: true,
    }
    const rendered = wrapped(hoverData)
    expect(rendered).not.toBeNull()
    expect(rendered?.props.children).toBe("hello")
  })

  it("does not unwrap raw user data that happens to have x, y, and data fields", () => {
    const fn = (d: Datum) => d.fieldName
    const wrapped = normalizeTooltip(fn) as (d: Datum) => TooltipElement | null
    const rawDatum = {
      x: 10,
      y: 20,
      data: { fieldName: "nested value" },
      fieldName: "top-level value",
    }
    const rendered = wrapped(rawDatum)
    expect(rendered).not.toBeNull()
    expect(rendered?.props.children).toBe("top-level value")
  })

  it("does not unwrap raw user data with a primitive data field and category", () => {
    const fn = (d: Datum) => d.label
    const wrapped = normalizeTooltip(fn) as (d: Datum) => TooltipElement | null
    const rawDatum = {
      x: 10,
      y: 20,
      data: "raw payload",
      category: "A",
      label: "visible label",
    }
    const rendered = wrapped(rawDatum)
    expect(rendered).not.toBeNull()
    expect(rendered?.props.children).toBe("visible label")
  })

  it("returns false for undefined", () => {
    expect(normalizeTooltip(undefined)).toBe(false)
  })
})

describe("buildDefaultTooltip with title role", () => {
  it("renders title field as bold header", () => {
    const fn = buildDefaultTooltip([
      { label: "product", accessor: "product", role: "title" },
      { label: "share", accessor: "share", role: "x" },
      { label: "growth", accessor: "growth", role: "y" },
    ])
    const hoverData = { data: { product: "TurboEncabulator", share: 0.75, growth: 0.82 }, x: 0, y: 0 }
    const { container } = render(<>{fn(hoverData)}</>)

    // Title should be bold
    const boldEl = container.querySelector("div[style*='bold']")
    expect(boldEl).toBeTruthy()
    expect(boldEl!.textContent).toBe("TurboEncabulator")

    // Body fields should be present
    expect(container.textContent).toContain("share")
    expect(container.textContent).toContain("0.75")
    expect(container.textContent).toContain("growth")
    expect(container.textContent).toContain("0.82")
  })

  it("renders without title when no title role", () => {
    const fn = buildDefaultTooltip([
      { label: "x", accessor: "x", role: "x" },
      { label: "y", accessor: "y", role: "y" },
    ])
    const hoverData = { data: { x: 1, y: 2 }, x: 0, y: 0 }
    const { container } = render(<>{fn(hoverData)}</>)

    expect(container.textContent).toContain("x")
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("y")
    expect(container.textContent).toContain("2")
  })
})

// ── MultiPointTooltip ─────────────────────────────────────────────────

describe("MultiPointTooltip", () => {
  it("renders all series with group names and values", () => {
    const fn = MultiPointTooltip()
    const data = {
      xValue: 42,
      value: 100,
      allSeries: [
        { group: "Revenue", value: 100, color: "red" },
        { group: "Cost", value: 60, color: "blue" },
        { group: "Profit", value: 40, color: "green" },
      ],
    }
    const { container } = render(<>{fn(data)}</>)

    // All series names rendered
    expect(container.textContent).toContain("Revenue")
    expect(container.textContent).toContain("Cost")
    expect(container.textContent).toContain("Profit")
    // X value header (data-space value from xValue)
    expect(container.textContent).toContain("42")
  })

  it("renders color swatches as colored spans", () => {
    const fn = MultiPointTooltip()
    const data = {
      time: 1,
      allSeries: [
        { group: "A", value: 10, color: "#ff0000" },
        { group: "B", value: 20, color: "#0000ff" },
      ],
    }
    const { container } = render(<>{fn(data)}</>)
    const swatches = container.querySelectorAll("span[style*='border-radius']")
    expect(swatches.length).toBe(2)
  })

  it("falls back to single-datum display when allSeries is missing", () => {
    const fn = MultiPointTooltip()
    // After the v2 backward-compat strip, MultiPointTooltip reads
    // data-space values off `hover.data` only — the
    // pixel-coordinate aliases on the hover root are gone.
    const hoverData = { data: { value: 42 } }
    const { container } = render(<>{fn(hoverData)}</>)
    expect(container.textContent).toContain("42")
  })

  it("normalizeTooltip returns a generic tooltip function for 'multi' (HOC handles it before normalizeTooltip)", () => {
    // "multi" is intercepted at the HOC level; if it reaches normalizeTooltip it falls through to generic
    const result = normalizeTooltip("multi")
    expect(typeof result).toBe("function")
  })

  it("normalizes bucket-array HoverData to the first datum for custom tooltips", () => {
    let received: Datum | undefined
    const fn = normalizeTooltip((d) => {
      received = d
      return "ok"
    })

    render(<>{typeof fn === "function" ? fn({
      __semioticHoverData: true,
      data: [{ category: "A", value: 1 }, { category: "B", value: 2 }],
      x: 0,
      y: 0,
    }) : null}</>)

    expect(received).toEqual({ category: "A", value: 1 })
  })
})

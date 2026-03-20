import React from "react"
import { render } from "@testing-library/react"
import { Tooltip, MultiLineTooltip, normalizeTooltip } from "./Tooltip"
import { buildDefaultTooltip } from "../charts/shared/tooltipUtils"

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
    expect(tooltipFn(null as any)).toBeNull()
    expect(tooltipFn(undefined as any)).toBeNull()
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
    expect(tooltipFn(null as any)).toBeNull()
    expect(tooltipFn(undefined as any)).toBeNull()
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
  it("returns a default tooltip function for boolean true", () => {
    const result = normalizeTooltip(true)
    expect(typeof result).toBe("function")
  })

  it("returns false for boolean false", () => {
    expect(normalizeTooltip(false)).toBe(false)
  })

  it("wraps user tooltip functions with standard chrome", () => {
    const fn = (d: any) => <div>{d.name}</div>
    const result = normalizeTooltip(fn)
    expect(typeof result).toBe("function")
    // Should NOT be the same identity — it's wrapped for styling
    expect(result).not.toBe(fn)
  })

  it("unwraps HoverData for user tooltip functions", () => {
    const fn = (d: any) => d.task
    const wrapped = normalizeTooltip(fn) as Function
    // Simulate HoverData wrapper from StreamNetworkFrame (has type + data)
    const hoverData = { type: "node", data: { task: "Fix bug" }, x: 10, y: 20 }
    const rendered = wrapped(hoverData) as any
    expect(rendered).not.toBeNull()
    // The string "Fix bug" should be inside the tooltip chrome div
    expect(rendered.props.children).toBe("Fix bug")
  })

  it("does not unwrap user data that happens to have a .data property", () => {
    const fn = (d: any) => d.data?.nested
    const wrapped = normalizeTooltip(fn) as Function
    // User datum has .data but no .type — should NOT be unwrapped
    const datum = { data: { nested: "hello" }, x: 10, y: 20 }
    const rendered = wrapped(datum) as any
    expect(rendered).not.toBeNull()
    expect(rendered.props.children).toBe("hello")
  })

  it("returns false for undefined", () => {
    expect(normalizeTooltip(undefined as any)).toBe(false)
  })
})

describe("buildDefaultTooltip with title role", () => {
  it("renders title field as bold header", () => {
    const fn = buildDefaultTooltip([
      { label: "product", accessor: "product", role: "title" },
      { label: "share", accessor: "share", role: "x" },
      { label: "growth", accessor: "growth", role: "y" },
    ])
    const hoverData = { data: { product: "TurboEncabulator", share: 0.75, growth: 0.82 } }
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
    const hoverData = { data: { x: 1, y: 2 } }
    const { container } = render(<>{fn(hoverData)}</>)

    expect(container.textContent).toContain("x")
    expect(container.textContent).toContain("1")
    expect(container.textContent).toContain("y")
    expect(container.textContent).toContain("2")
  })
})

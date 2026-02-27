import React from "react"
import { render } from "@testing-library/react"
import { Tooltip, MultiLineTooltip, normalizeTooltip } from "./Tooltip"

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
    expect(tooltipFn(null)).toBeNull()
    expect(tooltipFn(undefined)).toBeNull()
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
    expect(tooltipFn(null)).toBeNull()
    expect(tooltipFn(undefined)).toBeNull()
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
  it("returns true for boolean true", () => {
    expect(normalizeTooltip(true)).toBe(true)
  })

  it("returns false for boolean false", () => {
    expect(normalizeTooltip(false)).toBe(false)
  })

  it("returns the function for tooltip functions", () => {
    const fn = (d: any) => <div>{d.name}</div>
    expect(normalizeTooltip(fn)).toBe(fn)
  })

  it("returns false for undefined", () => {
    expect(normalizeTooltip(undefined as any)).toBe(false)
  })
})

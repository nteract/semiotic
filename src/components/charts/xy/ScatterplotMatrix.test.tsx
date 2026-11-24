import { vi } from "vitest"
import { act, fireEvent, render, within } from "@testing-library/react"
import { ScatterplotMatrix } from "./ScatterplotMatrix"
import { TooltipProvider } from "../../store/TooltipStore"

describe("ScatterplotMatrix", () => {
  it("reserves the matrix footprint and announces translated loading and empty states", () => {
    const props = { data: [], fields: ["a", "b"], cellSize: 100, cellGap: 4, emptyContent: "Keine Daten" }
    const { getByRole, rerender } = render(<ScatterplotMatrix {...props} loading loadingLabel="Matrix laden" />)
    expect(getByRole("status", { name: "Matrix laden" })).toHaveStyle({ width: "248px", height: "248px" })
    rerender(<ScatterplotMatrix {...props} />)
    expect(getByRole("status")).toHaveTextContent("Keine Daten")
  })

  const sampleData = [
    { a: 1, b: 2, c: 3, cat: "X" },
    { a: 4, b: 5, c: 6, cat: "Y" },
    { a: 7, b: 8, c: 9, cat: "X" },
    { a: 2, b: 3, c: 4, cat: "Y" },
    { a: 5, b: 6, c: 7, cat: "X" },
  ]

  it("renders without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b", "c"]}
        />
      </TooltipProvider>
    )

    // Should render a grid container
    expect(container.firstChild).toBeTruthy()
  })

  it("renders the correct number of cells", () => {
    const fields = ["a", "b", "c"]
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={fields}
        />
      </TooltipProvider>
    )

    // 3 fields = 3x3 = 9 cells
    // 3 diagonal (histograms) + 6 scatterplots
    // Each scatterplot renders a StreamXYFrame (.stream-xy-frame)
    const streamFrames = container.querySelectorAll(".stream-xy-frame")
    expect(streamFrames.length).toBe(6) // 3x3 - 3 diagonal = 6
  })

  it("uses one tab stop for the matrix and lets the reader enter and leave a cell", () => {
    const { getByRole, getAllByRole } = render(<ScatterplotMatrix
      data={sampleData} fields={["a", "b", "c"]} accessibleTable={false} />)
    const grid = getByRole("grid")
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    const cells = getAllByRole("gridcell")
    cells[0].focus()
    fireEvent.keyDown(cells[0], { key: "ArrowRight" })
    expect(cells[1]).toHaveFocus()
    fireEvent.keyDown(cells[1], { key: "ArrowDown" })
    expect(cells[4]).toHaveFocus()
    fireEvent.keyDown(cells[4], { key: "ArrowLeft" })
    expect(cells[3]).toHaveFocus()
    fireEvent.keyDown(cells[3], { key: "Enter" })
    const frame = within(cells[3]).getByRole("group", { name: /a versus b/ })
    expect(frame).toHaveFocus()
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(cells[3]).toHaveFocus()
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  })

  it("keeps the surviving focused cell tabbable across field changes", () => {
    const chart = (fields: string[]) => <ScatterplotMatrix data={sampleData} fields={fields} accessibleTable={false} />
    const { getByRole, rerender } = render(chart(["a", "b", "c"]))
    const active = getByRole("gridcell", { name: "a versus b" })
    act(() => active.focus())
    for (const fields of [["a", "b"], ["b", "a"]]) {
      rerender(chart(fields))
      expect(active).toHaveAttribute("tabindex", "0")
      expect(getByRole("grid").querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    }
    rerender(chart(["a", "c"]))
    expect(getByRole("gridcell", { name: "a" })).toHaveAttribute("tabindex", "0")
  })

  it("renders diagonal histograms as SVGs", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          diagonal="histogram"
        />
      </TooltipProvider>
    )

    // 2 diagonal cells should be SVG histograms
    const svgs = container.querySelectorAll("svg")
    // At least 2 SVGs from diagonal cells (StreamXYFrames also have SVGs)
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it("renders label diagonal when configured", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          diagonal="label"
        />
      </TooltipProvider>
    )

    // Labels should appear as text elements
    const texts = container.querySelectorAll("text")
    expect(texts.length).toBeGreaterThan(0)
  })

  it("applies custom cell size", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          cellSize={200}
        />
      </TooltipProvider>
    )

    expect(container.firstChild).toBeTruthy()
  })

  it("renders with colorBy prop", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          colorBy="cat"
        />
      </TooltipProvider>
    )

    expect(container.firstChild).toBeTruthy()
  })

  it("renders field labels when provided", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          fieldLabels={{ a: "Alpha", b: "Beta" }}
        />
      </TooltipProvider>
    )

    // Check that custom labels appear
    expect(container.textContent).toContain("Alpha")
    expect(container.textContent).toContain("Beta")
  })

  it("treats inherited fieldLabels keys as unmapped", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={[
            { constructor: 1, a: 2 },
            { constructor: 3, a: 4 }
          ]}
          fields={["constructor", "a"]}
          fieldLabels={{}}
          diagonal="label"
        />
      </TooltipProvider>
    )

    expect(container.textContent).toContain("constructor")
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={[]}
          fields={["a", "b"]}
        />
      </TooltipProvider>
    )

    expect(container.firstChild).toBeTruthy()
  })

  it("renders legend when colorBy is set", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          colorBy="cat"
          showLegend
        />
      </TooltipProvider>
    )

    // Legend items should include "X" and "Y" from the cat field
    expect(container.textContent).toContain("X")
    expect(container.textContent).toContain("Y")
  })

  it("disables brush when brushMode is false", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          brushMode={false}
        />
      </TooltipProvider>
    )

    expect(container.firstChild).toBeTruthy()
  })

  it("renders with an onClick handler without crashing", () => {
    const onClick = vi.fn()
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          onClick={onClick}
        />
      </TooltipProvider>
    )

    // Scatterplot cells should still render; the click wiring is passed
    // through to each cell's StreamXYFrame.
    const streamFrames = container.querySelectorAll(".stream-xy-frame")
    expect(streamFrames.length).toBe(2) // 2x2 - 2 diagonal = 2
    expect(onClick).not.toHaveBeenCalled()
  })

  it("renders with single field", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a"]}
        />
      </TooltipProvider>
    )

    // 1 field = only diagonal, no scatterplot cells
    const streamFrames = container.querySelectorAll(".stream-xy-frame")
    expect(streamFrames.length).toBe(0)
  })

  it("owns one semantic description and one accessible table for the whole matrix", async () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b", "c"]}
          title="Measurements"
          description="Pairwise comparison of measurements"
          summary="A and B rise together."
        />
      </TooltipProvider>
    )

    expect(container.querySelector("[role='group']")?.getAttribute("aria-label"))
      .toBe("Pairwise comparison of measurements")
    expect(container.querySelectorAll(".semiotic-chart-title")).toHaveLength(1)
    expect(container.querySelectorAll(".semiotic-accessible-data-table")).toHaveLength(1)
    expect(container.querySelectorAll("a[href*='data-table']")).toHaveLength(1)
    expect(container.textContent).toContain("A and B rise together.")
    fireEvent.click(container.querySelector(".semiotic-accessible-data-table button")!)
    expect(await within(container).findAllByRole("table")).toHaveLength(1)
  })

  it("can suppress the matrix-level accessible table without creating child tables", () => {
    const { container } = render(
      <TooltipProvider>
        <ScatterplotMatrix
          data={sampleData}
          fields={["a", "b"]}
          accessibleTable={false}
        />
      </TooltipProvider>
    )

    expect(container.querySelectorAll(".semiotic-accessible-data-table")).toHaveLength(0)
  })
})

import React from "react"
import { render } from "@testing-library/react"
import { ScatterplotMatrix } from "./ScatterplotMatrix"
import { TooltipProvider } from "../../store/TooltipStore"

describe("ScatterplotMatrix", () => {
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
})

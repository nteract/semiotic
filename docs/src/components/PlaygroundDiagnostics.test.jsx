import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PlaygroundDiagnostics from "./PlaygroundDiagnostics"

describe("PlaygroundDiagnostics", () => {
  it("shows a compact success contract for safe data", () => {
    render(
      <PlaygroundDiagnostics
        componentName="LineChart"
        chartProps={{
          data: [{ x: 1, y: 2 }, { x: 2, y: 4 }],
          xAccessor: "x",
          yAccessor: "y",
        }}
      />,
    )
    expect(screen.getByText("Data safe · 2 numeric fields checked")).toBeTruthy()
    fireEvent.click(screen.getByText("Data safe · 2 numeric fields checked"))
    expect(screen.getByText(/x: x · scale domain/)).toBeTruthy()
    expect(screen.getByText(/y: y · scale domain/)).toBeTruthy()
  })

  it("expands actionable errors and fixes", () => {
    render(
      <PlaygroundDiagnostics
        componentName="BubbleChart"
        chartProps={{
          data: [{ x: 1, y: 2, size: -4 }, { x: 2, y: 3, size: 5 }],
          xAccessor: "x",
          yAccessor: "y",
          sizeBy: "size",
        }}
      />,
    )
    expect(screen.getByText("1 error · 0 warnings")).toBeTruthy()
    fireEvent.click(screen.getByText("1 error · 0 warnings"))
    expect(screen.getByText("NEGATIVE_SIZE")).toBeTruthy()
    expect(screen.getByText(/Fix: Use a non-negative measure/)).toBeTruthy()
  })

  it("stays out of the way for charts without a numeric contract", () => {
    const { container } = render(
      <PlaygroundDiagnostics
        componentName="ForceDirectedGraph"
        chartProps={{ edges: [{ source: "A", target: "B" }] }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("surfaces an explicitly empty data source even before fields resolve", () => {
    render(
      <PlaygroundDiagnostics
        componentName="LineChart"
        chartProps={{ data: [], xAccessor: "x", yAccessor: "y" }}
      />,
    )
    expect(screen.getByText("1 error · 0 warnings")).toBeTruthy()
    fireEvent.click(screen.getByText("1 error · 0 warnings"))
    expect(screen.getByText("EMPTY_DATA")).toBeTruthy()
  })
})

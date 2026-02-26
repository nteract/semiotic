import React from "react"
import { render } from "@testing-library/react"
import { StackedBarChart } from "./StackedBarChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("StackedBarChart", () => {
  const sampleData = [
    { category: "Q1", product: "A", value: 100 },
    { category: "Q1", product: "B", value: 150 },
    { category: "Q2", product: "A", value: 120 },
    { category: "Q2", product: "B", value: 180 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={[]} stackBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("warns when stackBy is missing", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy={undefined as any} />
      </TooltipProvider>
    )

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("stackBy prop is required"))
    consoleSpy.mockRestore()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          categoryLabel="Quarter"
          valueLabel="Sales"
        />
      </TooltipProvider>
    )

    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports normalized (100%) mode", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" normalize={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" colorBy="product" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart
          data={sampleData}
          stackBy="product"
          frameProps={{
            pieceHoverAnnotation: true
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedBarChart data={sampleData} stackBy="product" enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })
})

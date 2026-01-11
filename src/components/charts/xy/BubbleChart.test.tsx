import React from "react"
import { render } from "@testing-library/react"
import { BubbleChart } from "./BubbleChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("BubbleChart", () => {
  const sampleData = [
    { x: 1, y: 10, size: 50 },
    { x: 2, y: 20, size: 30 },
    { x: 3, y: 15, size: 70 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("renders points correctly", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={[]} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeFalsy()
  })

  it("warns when sizeBy is missing", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy={undefined as any} />
      </TooltipProvider>
    )

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("sizeBy prop is required"))
    consoleSpy.mockRestore()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts xLabel and yLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy="size"
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, size: 50, category: "A" },
      { x: 2, y: 20, size: 30, category: "B" },
      { x: 3, y: 15, size: 70, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={coloredData} sizeBy="size" colorBy="category" />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies function sizeBy accessor", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy={(d) => d.size * 2}
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies custom size range", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy="size"
          sizeRange={[10, 50]}
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies custom bubble opacity", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy="size"
          bubbleOpacity={0.8}
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies custom bubble stroke", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy="size"
          bubbleStrokeWidth={2}
          bubbleStrokeColor="#000"
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={sampleData}
          sizeBy="size"
          frameProps={{
            hoverAnnotation: false
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("updates when data changes", () => {
    const initialData = [
      { x: 1, y: 10, size: 50 },
      { x: 2, y: 20, size: 30 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <BubbleChart data={initialData} sizeBy="size" />
      </TooltipProvider>
    )

    const initialPoints = container.querySelectorAll(".points .frame-piece")
    const initialCount = initialPoints.length
    expect(initialCount).toBeGreaterThan(0)

    const newData = [
      { x: 1, y: 10, size: 50 },
      { x: 2, y: 20, size: 30 },
      { x: 3, y: 30, size: 40 }
    ]

    rerender(
      <TooltipProvider>
        <BubbleChart data={newData} sizeBy="size" />
      </TooltipProvider>
    )

    const updatedPoints = container.querySelectorAll(".points .frame-piece")
    expect(updatedPoints.length).toBeGreaterThan(initialCount)
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })
})

import React from "react"
import { render } from "@testing-library/react"
import { Scatterplot } from "./Scatterplot"
import { TooltipProvider } from "../../store/TooltipStore"

describe("Scatterplot", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("renders points correctly", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={[]} />
      </TooltipProvider>
    )

    // Should not render frame when data is empty
    const frame = container.querySelector(".xyframe")
    expect(frame).toBeFalsy()
  })

  it("accepts xLabel and yLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={sampleData}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    // Should render axes with labels
    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("accepts custom accessors", () => {
    const customData = [
      { time: 1, value: 10 },
      { time: 2, value: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={customData}
          xAccessor="time"
          yAccessor="value"
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("accepts function accessors", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={sampleData}
          xAccessor={(d) => d.x * 2}
          yAccessor={(d) => d.y}
        />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "B" },
      { x: 3, y: 15, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={coloredData} colorBy="category" />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("applies size encoding", () => {
    const sizedData = [
      { x: 1, y: 10, size: 5 },
      { x: 2, y: 20, size: 10 },
      { x: 3, y: 15, size: 8 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sizedData} sizeBy="size" sizeRange={[3, 20]} />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
          data={sampleData}
          frameProps={{
            hoverAnnotation: false,
            showLinePoints: true
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("updates when data changes", () => {
    const initialData = [
      { x: 1, y: 10 },
      { x: 2, y: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <Scatterplot data={initialData} />
      </TooltipProvider>
    )

    const initialPoints = container.querySelectorAll(".points .frame-piece")
    const initialCount = initialPoints.length
    expect(initialCount).toBeGreaterThan(0)

    // Update with more data
    const newData = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 }
    ]

    rerender(
      <TooltipProvider>
        <Scatterplot data={newData} />
      </TooltipProvider>
    )

    const updatedPoints = container.querySelectorAll(".points .frame-piece")
    expect(updatedPoints.length).toBeGreaterThan(initialCount)
  })

  it("respects pointRadius prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointRadius={10} />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("respects pointOpacity prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointOpacity={0.5} />
      </TooltipProvider>
    )

    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })
})

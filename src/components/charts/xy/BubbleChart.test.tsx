import React from "react"
import { render, fireEvent } from "@testing-library/react"
import { BubbleChart } from "./BubbleChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { MultiLineTooltip } from "../../Tooltip/Tooltip"

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

  // Test case from docs: BubbleChart with MultiLineTooltip on hover
  it("renders tooltip on hover with MultiLineTooltip (docs example)", () => {
    // Exact data from docs
    const bubbleData = [
      { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" },
      { x: 25, y: 35, size: 50, category: "Finance", name: "Company B" },
      { x: 40, y: 15, size: 20, category: "Tech", name: "Company C" },
      { x: 55, y: 45, size: 60, category: "Healthcare", name: "Company D" },
      { x: 70, y: 30, size: 40, category: "Finance", name: "Company E" },
      { x: 20, y: 50, size: 25, category: "Healthcare", name: "Company F" },
      { x: 65, y: 25, size: 45, category: "Tech", name: "Company G" }
    ]

    const { container } = render(
      <TooltipProvider>
        <BubbleChart
          data={bubbleData}
          width={600}
          height={400}
          xLabel="Revenue"
          yLabel="Growth"
          sizeBy="size"
          colorBy="category"
          tooltip={MultiLineTooltip({
            title: "name",
            fields: ["category", "x", "y", "size"]
          })}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()

    // Get the first bubble point
    const points = container.querySelectorAll(".points .frame-piece")
    expect(points.length).toBeGreaterThan(0)

    const firstPoint = points[0] as HTMLElement

    // Simulate hover - this should trigger the tooltip without throwing an error
    expect(() => {
      fireEvent.mouseEnter(firstPoint)
      fireEvent.mouseMove(firstPoint)
    }).not.toThrow()

    // The tooltip content should be rendered
    // Note: The actual tooltip rendering happens via tooltipContent callback
    // which XYFrame calls with the hovered data point
  })

  // Direct test: Call the tooltip function with hover data structure
  it("MultiLineTooltip handles hover annotation data structure", () => {
    const bubbleData = [
      { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" }
    ]

    // Create the tooltip function
    const tooltipFn = MultiLineTooltip({
      title: "name",
      fields: ["category", "x", "y", "size"]
    })

    // Simulate what XYFrame passes to tooltipContent on hover
    // This is a hover annotation object
    const hoverData = bubbleData[0]

    // Call the tooltip function directly - should not throw
    expect(() => {
      const result = tooltipFn(hoverData)
      expect(result).toBeTruthy()
    }).not.toThrow()
  })

  // Test with array data (maybe XYFrame passes array for multiple points)
  it("MultiLineTooltip handles array data without crashing", () => {
    const tooltipFn = MultiLineTooltip({
      title: "name",
      fields: ["category", "x", "y", "size"]
    })

    // Maybe XYFrame passes an array of data points?
    const arrayData = [
      { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" }
    ]

    // This should handle gracefully or throw a clear error
    expect(() => {
      const result = tooltipFn(arrayData as any)
      // Should return null or handle gracefully
    }).not.toThrow()
  })

  // Test with nested data structure (annotation wrapper)
  it("MultiLineTooltip handles nested annotation data structure", () => {
    const tooltipFn = MultiLineTooltip({
      title: "name",
      fields: ["category", "x", "y", "size"]
    })

    // Maybe XYFrame wraps the data in an annotation object
    const annotationData = {
      type: "frame-hover",
      data: { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" },
      x: 10,
      y: 20
    }

    expect(() => {
      const result = tooltipFn(annotationData as any)
      expect(result).toBeTruthy()
    }).not.toThrow()
  })
})

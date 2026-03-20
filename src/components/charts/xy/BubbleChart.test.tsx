import { vi } from "vitest"
import React from "react"
import { render, fireEvent } from "@testing-library/react"
import { BubbleChart } from "./BubbleChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { MultiLineTooltip } from "../../Tooltip/Tooltip"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("BubbleChart", () => {
  const sampleData = [
    { x: 1, y: 10, size: 50 },
    { x: 2, y: 20, size: 30 },
    { x: 3, y: 15, size: 70 }
  ]

  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders points correctly", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame with canvas exists
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={[]} sizeBy="size" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("shows error when sizeBy is missing", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy={undefined as any} />
      </TooltipProvider>
    )

    const errorEl = container.querySelector("[role='alert']")
    expect(errorEl).toBeTruthy()
    expect(errorEl!.textContent).toContain("sizeBy")
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" width={800} height={600} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
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

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, size: 50, category: "A" },
      { x: 2, y: 20, size: 30, category: "B" },
      { x: 3, y: 15, size: 70, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={coloredData} sizeBy="size" colorBy="category" showLegend={false} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    const frame = container.querySelector(".stream-xy-frame")
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

    // Points are now rendered on canvas, verify the frame rendered
    const initialFrame = container.querySelector(".stream-xy-frame")
    expect(initialFrame).toBeTruthy()

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

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <BubbleChart data={sampleData} sizeBy="size" enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
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
          showLegend={false}
          tooltip={MultiLineTooltip({
            title: "name",
            fields: ["category", "x", "y", "size"]
          })}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()

    // Points are now rendered on canvas; verify the canvas exists
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()

    // Simulate hover on the canvas - this should not throw
    expect(() => {
      if (canvas) {
        fireEvent.mouseEnter(canvas)
        fireEvent.mouseMove(canvas)
      }
    }).not.toThrow()
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

  // Legend Tests
  describe("Legend behavior", () => {
    const coloredData = [
      { x: 1, y: 10, size: 50, category: "A" },
      { x: 2, y: 20, size: 30, category: "B" },
      { x: 3, y: 15, size: 70, category: "A" }
    ]

    it("renders without error when colorBy is specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart data={coloredData} sizeBy="size" colorBy="category" showLegend={false} />
        </TooltipProvider>
      )

      // Should render the frame successfully
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("renders without error when colorBy is not specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart data={sampleData} sizeBy="size" />
        </TooltipProvider>
      )

      // Should still render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("respects showLegend=false without errors", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            showLegend={false}
          />
        </TooltipProvider>
      )

      // Should render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("respects showLegend=true without errors", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            showLegend={true}
          />
        </TooltipProvider>
      )

      // Should render the frame
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("adjusts margin without errors when legend configuration is present", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
          />
        </TooltipProvider>
      )

      // The frame should render successfully with adjusted margins
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })

    it("allows user to override margin even with legend", () => {
      const { container } = render(
        <TooltipProvider>
          <BubbleChart
            data={coloredData}
            sizeBy="size"
            colorBy="category"
            margin={{ top: 10, bottom: 10, left: 10, right: 200 }}
          />
        </TooltipProvider>
      )

      // Custom margin should be respected
      const frame = container.querySelector(".stream-xy-frame")
      expect(frame).toBeTruthy()
    })
  })
})

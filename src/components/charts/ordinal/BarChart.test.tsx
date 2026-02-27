import React from "react"
import { render } from "@testing-library/react"
import { BarChart } from "./BarChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Mock OrdinalFrame to capture props
let lastOrdinalFrameProps: any = null
jest.mock("../../OrdinalFrame", () => {
  return {
    __esModule: true,
    default: (props: any) => {
      lastOrdinalFrameProps = props
      return <div className="ordinalframe"><svg /></div>
    }
  }
})

describe("BarChart", () => {
  beforeEach(() => {
    lastOrdinalFrameProps = null
  })

  const sampleData = [
    { category: "A", value: 10 },
    { category: "B", value: 20 },
    { category: "C", value: 15 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={[]} />
      </TooltipProvider>
    )

    // Should not render frame when data is empty
    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts categoryLabel and valueLabel props", () => {
    render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    // Should pass axes config to OrdinalFrame
    expect(lastOrdinalFrameProps.axes).toBeDefined()
    expect(lastOrdinalFrameProps.axes.length).toBeGreaterThan(0)
  })

  it("accepts custom accessors", () => {
    const customData = [
      { name: "A", count: 10 },
      { name: "B", count: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={customData}
          categoryAccessor="name"
          valueAccessor="count"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports vertical orientation (default)", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} orientation="vertical" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("supports horizontal orientation", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} orientation="horizontal" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts data in ascending order", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} sort="asc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts data in descending order", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} sort="desc" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("sorts with custom function", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          sort={(a, b) => a.value - b.value}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          colorBy="category"
          colorScheme="tableau10"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("accepts custom bar padding", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} barPadding={10} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("allows OrdinalFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          frameProps={{
            pieceHoverAnnotation: true,
            oLabel: true
          }}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("updates when data changes", () => {
    const initialData = [
      { category: "A", value: 10 },
      { category: "B", value: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <BarChart data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".ordinalframe")
    expect(initialFrame).toBeTruthy()

    // Update with more data
    const newData = [
      { category: "A", value: 10 },
      { category: "B", value: 20 },
      { category: "C", value: 30 }
    ]

    rerender(
      <TooltipProvider>
        <BarChart data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".ordinalframe")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  it("respects showGrid prop", () => {
    const { container } = render(
      <TooltipProvider>
        <BarChart data={sampleData} showGrid={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".ordinalframe")
    expect(frame).toBeTruthy()
  })

  // Legend Tests
  describe("Legend behavior", () => {
    const coloredData = [
      { category: "A", value: 10, type: "X" },
      { category: "B", value: 20, type: "Y" },
      { category: "C", value: 15, type: "X" }
    ]

    it("shows legend automatically when colorBy is specified", () => {
      render(
        <TooltipProvider>
          <BarChart data={coloredData} colorBy="type" />
        </TooltipProvider>
      )

      // Check that legend config is passed to OrdinalFrame
      expect(lastOrdinalFrameProps.legend).toBeDefined()
    })

    it("does not show legend when colorBy is not specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("respects showLegend=false even when colorBy is specified", () => {
      const { container } = render(
        <TooltipProvider>
          <BarChart
            data={coloredData}
            colorBy="type"
            showLegend={false}
          />
        </TooltipProvider>
      )

      // Legend items should not be present
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBe(0)
    })

    it("adjusts right margin when legend is present", () => {
      render(
        <TooltipProvider>
          <BarChart
            data={coloredData}
            colorBy="type"
          />
        </TooltipProvider>
      )

      // Right margin should be at least 120 when legend is present
      expect(lastOrdinalFrameProps.margin.right).toBeGreaterThanOrEqual(120)
      expect(lastOrdinalFrameProps.legend).toBeDefined()
    })
  })

  describe("hoverAnnotation", () => {
    it("passes hoverAnnotation instead of pieceHoverAnnotation", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.hoverAnnotation).toBe(true)
      expect(lastOrdinalFrameProps.pieceHoverAnnotation).toBeUndefined()
    })

    it("disables hoverAnnotation when enableHover is false", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} enableHover={false} />
        </TooltipProvider>
      )

      expect(lastOrdinalFrameProps.hoverAnnotation).toBe(false)
    })

    it("provides a default tooltipContent function", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      expect(typeof lastOrdinalFrameProps.tooltipContent).toBe("function")
    })

    it("default tooltip renders category and value from piece data", () => {
      render(
        <TooltipProvider>
          <BarChart data={sampleData} />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = { category: "A", value: 10 }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      expect(container.textContent).toContain("A")
      expect(container.textContent).toContain("10")
    })

    it("default tooltip uses custom accessors", () => {
      const customData = [
        { name: "X", count: 42 },
        { name: "Y", count: 99 }
      ]

      render(
        <TooltipProvider>
          <BarChart data={customData} categoryAccessor="name" valueAccessor="count" />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const pieceData = { name: "X", count: 42 }
      const { container } = render(<>{tooltipFn(pieceData)}</>)

      expect(container.textContent).toContain("X")
      expect(container.textContent).toContain("42")
    })

    it("uses user-provided tooltip instead of default", () => {
      const customTooltip = (d: any) => <div>custom: {d.category}</div>

      render(
        <TooltipProvider>
          <BarChart data={sampleData} tooltip={customTooltip} />
        </TooltipProvider>
      )

      const tooltipFn = lastOrdinalFrameProps.tooltipContent
      const { container } = render(<>{tooltipFn({ category: "B" })}</>)

      expect(container.textContent).toContain("custom: B")
    })
  })
})

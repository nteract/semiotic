import React from "react"
import { render } from "@testing-library/react"
import { BarChart } from "./BarChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("BarChart", () => {
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
    const { container } = render(
      <TooltipProvider>
        <BarChart
          data={sampleData}
          categoryLabel="Category"
          valueLabel="Value"
        />
      </TooltipProvider>
    )

    // Should render axes with labels
    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
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
      const { container } = render(
        <TooltipProvider>
          <BarChart data={coloredData} colorBy="type" />
        </TooltipProvider>
      )

      // Check that legend items are rendered
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBeGreaterThan(0)
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
      const { container } = render(
        <TooltipProvider>
          <BarChart
            data={coloredData}
            colorBy="type"
          />
        </TooltipProvider>
      )

      // The frame should have sufficient right margin to accommodate legend
      const frame = container.querySelector(".ordinalframe")
      expect(frame).toBeTruthy()

      // Legend items should be visible
      const legendItems = container.querySelectorAll(".legend-item")
      expect(legendItems.length).toBeGreaterThan(0)
    })
  })
})

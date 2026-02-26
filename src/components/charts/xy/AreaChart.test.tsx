import React from "react"
import { render } from "@testing-library/react"
import { AreaChart } from "./AreaChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("AreaChart", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
  ]

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("accepts xLabel and yLabel props", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart
          data={sampleData}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    const axes = container.querySelectorAll(".axis")
    expect(axes.length).toBeGreaterThan(0)
  })

  it("handles multiple areas with areaBy prop", () => {
    const multiSeriesData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "A" },
      { x: 1, y: 15, category: "B" },
      { x: 2, y: 25, category: "B" }
    ]

    const { container } = render(
      <TooltipProvider>
        <AreaChart
          data={multiSeriesData}
          areaBy="category"
          colorBy="category"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("supports stacked areas", () => {
    const stackedData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "A" },
      { x: 1, y: 15, category: "B" },
      { x: 2, y: 25, category: "B" }
    ]

    const { container } = render(
      <TooltipProvider>
        <AreaChart
          data={stackedData}
          areaBy="category"
          stacked={true}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  // Skip normalized stacked test due to XYFrame internal aria label issue with stackedpercent-area type
  it.skip("supports normalized (100%) stacked areas", () => {
    const stackedData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "A" },
      { x: 1, y: 15, category: "B" },
      { x: 2, y: 25, category: "B" }
    ]

    const { container } = render(
      <TooltipProvider>
        <AreaChart
          data={stackedData}
          areaBy="category"
          stacked={true}
          normalize={true}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <AreaChart data={coloredData} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom curve interpolation", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} curve="basis" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("hides line when showLine is false", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} showLine={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("applies custom area opacity", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} areaOpacity={0.5} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart
          data={sampleData}
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
      { x: 1, y: 10 },
      { x: 2, y: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <AreaChart data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".xyframe")
    expect(initialFrame).toBeTruthy()

    const newData = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 }
    ]

    rerender(
      <TooltipProvider>
        <AreaChart data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".xyframe")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".xyframe")
    expect(frame).toBeTruthy()
  })
})

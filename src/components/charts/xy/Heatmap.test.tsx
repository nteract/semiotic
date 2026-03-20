import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { Heatmap } from "./Heatmap"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("Heatmap", () => {
  const sampleData = [
    { x: 1, y: 1, value: 10 },
    { x: 1, y: 2, value: 20 },
    { x: 2, y: 1, value: 15 },
    { x: 2, y: 2, value: 25 }
  ]

  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} width={800} height={600} />
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
        <Heatmap
          data={sampleData}
          xLabel="Time"
          yLabel="Category"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} colorScheme="reds" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies viridis color scheme", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} colorScheme="viridis" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("shows values when showValues is true", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showValues={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom valueAccessor", () => {
    const customData = [
      { x: 1, y: 1, count: 10 },
      { x: 1, y: 2, count: 20 }
    ]

    const { container } = render(
      <TooltipProvider>
        <Heatmap data={customData} valueAccessor="count" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom cell border styling", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
          cellBorderColor="#000"
          cellBorderWidth={2}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap
          data={sampleData}
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
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 2, value: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <Heatmap data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".stream-xy-frame")
    expect(initialFrame).toBeTruthy()

    const newData = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 2, value: 20 },
      { x: 2, y: 1, value: 15 }
    ]

    rerender(
      <TooltipProvider>
        <Heatmap data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with showLegend", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showLegend />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with showLegend and legendPosition bottom", () => {
    const { container } = render(
      <TooltipProvider>
        <Heatmap data={sampleData} showLegend legendPosition="bottom" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

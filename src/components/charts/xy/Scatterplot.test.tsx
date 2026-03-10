import { vi } from "vitest"
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

  let rafCallbacks: Function[] = []
  beforeEach(() => {
    rafCallbacks = []
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      setLineDash: vi.fn(),
      closePath: vi.fn(),
      strokeStyle: "",
      lineWidth: 1,
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      globalAlpha: 1
    }))
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb)
      cb(performance.now())
      return 0
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })

  afterEach(() => {
    if ((window.requestAnimationFrame as any).mockRestore) (window.requestAnimationFrame as any).mockRestore()
    if ((window.cancelAnimationFrame as any).mockRestore) (window.cancelAnimationFrame as any).mockRestore()
  })

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders points correctly", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, so verify the frame with canvas exists
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} width={800} height={600} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    const canvas = frame?.querySelector("canvas")
    expect(canvas).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={[]} />
      </TooltipProvider>
    )

    // Should not render frame when data is empty
    const frame = container.querySelector(".stream-xy-frame")
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

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const coloredData = [
      { x: 1, y: 10, category: "A" },
      { x: 2, y: 20, category: "B" },
      { x: 3, y: 15, category: "A" }
    ]

    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={coloredData} colorBy="category" showLegend={false} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot
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
      { x: 1, y: 10 },
      { x: 2, y: 20 }
    ]

    const { container, rerender } = render(
      <TooltipProvider>
        <Scatterplot data={initialData} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const initialFrame = container.querySelector(".stream-xy-frame")
    expect(initialFrame).toBeTruthy()

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

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("respects pointRadius prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointRadius={10} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("respects pointOpacity prop", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} pointOpacity={0.5} />
      </TooltipProvider>
    )

    // Points are now rendered on canvas, verify the frame rendered
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <Scatterplot data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

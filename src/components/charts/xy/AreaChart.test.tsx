import { vi } from "vitest"
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
        <AreaChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} width={800} height={600} />
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
        <AreaChart
          data={sampleData}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
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
          showLegend={false}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
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

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom curve interpolation", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} curve="basis" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("hides line when showLine is false", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} showLine={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom area opacity", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} areaOpacity={0.5} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
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
        <AreaChart data={initialData} />
      </TooltipProvider>
    )

    const initialFrame = container.querySelector(".stream-xy-frame")
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

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <AreaChart data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

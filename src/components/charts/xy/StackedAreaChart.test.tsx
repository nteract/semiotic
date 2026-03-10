import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { StackedAreaChart } from "./StackedAreaChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("StackedAreaChart", () => {
  const sampleData = [
    { x: 1, y: 10, category: "A" },
    { x: 2, y: 20, category: "A" },
    { x: 1, y: 15, category: "B" },
    { x: 2, y: 25, category: "B" }
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

  it("renders stacked areas", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedAreaChart
          data={sampleData}
          areaBy="category"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedAreaChart data={[]} areaBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("supports normalized (100%) stacked areas", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedAreaChart
          data={sampleData}
          areaBy="category"
          normalize={true}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies color encoding", () => {
    const { container } = render(
      <TooltipProvider>
        <StackedAreaChart
          data={sampleData}
          areaBy="category"
          colorBy="category"
          showLegend={false}
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

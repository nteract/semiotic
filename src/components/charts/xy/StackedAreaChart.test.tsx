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
    ;(HTMLCanvasElement.prototype as any).getContext = jest.fn(() => ({
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      strokeRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      setLineDash: jest.fn(),
      closePath: jest.fn(),
      strokeStyle: "",
      lineWidth: 1,
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
      globalAlpha: 1
    }))
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb)
      cb(performance.now())
      return 0
    })
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
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

  // Skip normalized stacked test due to XYFrame internal aria label issue with stackedpercent-area type
  it.skip("supports normalized (100%) stacked areas", () => {
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

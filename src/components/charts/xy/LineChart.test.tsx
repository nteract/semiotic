import React from "react"
import { render } from "@testing-library/react"
import { LineChart } from "./LineChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("LineChart", () => {
  const sampleData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 }
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

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles empty data gracefully", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={[]} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeFalsy()
  })

  it("applies custom width and height", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} width={800} height={600} />
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
        <LineChart
          data={sampleData}
          xLabel="Time"
          yLabel="Value"
        />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("handles multiple lines with lineBy prop", () => {
    const multiSeriesData = [
      { x: 1, y: 10, series: "A" },
      { x: 2, y: 20, series: "A" },
      { x: 1, y: 15, series: "B" },
      { x: 2, y: 25, series: "B" }
    ]

    const { container } = render(
      <TooltipProvider>
        <LineChart
          data={multiSeriesData}
          lineBy="series"
          colorBy="series"
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
        <LineChart data={coloredData} colorBy="category" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("shows points when showPoints is true", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} showPoints={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("fills area when fillArea is true", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} fillArea={true} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom curve interpolation", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} curve="monotoneX" />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("allows XYFrame prop overrides via frameProps", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart
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
        <LineChart data={initialData} />
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
        <LineChart data={newData} />
      </TooltipProvider>
    )

    const updatedFrame = container.querySelector(".stream-xy-frame")
    expect(updatedFrame).toBeTruthy()
  })

  it("disables hover when enableHover is false", () => {
    const { container } = render(
      <TooltipProvider>
        <LineChart data={sampleData} enableHover={false} />
      </TooltipProvider>
    )

    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

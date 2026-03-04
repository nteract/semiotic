import React from "react"
import { render } from "@testing-library/react"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeWaterfallChart", () => {
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
    const ref = React.createRef<any>()
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart ref={ref} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with size prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart size={[600, 400]} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with width and height props", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart width={600} height={400} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with tooltip alias", () => {
    const tooltipFn = jest.fn(() => <div>tooltip</div>)
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart tooltip={tooltipFn} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts custom accessors", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart timeAccessor="ts" valueAccessor="val" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts windowSize and windowMode", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart windowSize={500} windowMode="growing" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts arrowOfTime", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart arrowOfTime="left" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("supports ref push API", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeWaterfallChart ref={ref} />
      </TooltipProvider>
    )
    expect(ref.current).toBeTruthy()
    expect(() => ref.current.push({ time: 1, value: 10 })).not.toThrow()
    expect(() => ref.current.clear()).not.toThrow()
  })

  it("accepts decay config", () => {
    const props: any = { decay: { type: "linear" } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts pulse config", () => {
    const props: any = { pulse: { duration: 500 } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts staleness config", () => {
    const props: any = { staleness: { threshold: 5000 } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom className", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart className="my-waterfall" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts positiveColor, negativeColor, and connectorStroke props", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart
          positiveColor="#28a745"
          negativeColor="#dc3545"
          connectorStroke="#999"
        />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

import React from "react"
import { render } from "@testing-library/react"
import { RealtimeTemporalHistogram } from "./RealtimeHistogram"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeTemporalHistogram", () => {
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
        <RealtimeTemporalHistogram ref={ref} binSize={1000} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with size prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} size={[600, 400]} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with width and height props", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} width={600} height={400} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("renders with tooltip alias", () => {
    const tooltipFn = jest.fn(() => <div>tooltip</div>)
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} tooltip={tooltipFn} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts custom accessors", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} timeAccessor="ts" valueAccessor="val" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts windowSize and windowMode", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} windowSize={500} windowMode="growing" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts arrowOfTime", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} arrowOfTime="left" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("supports ref push API", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeTemporalHistogram ref={ref} binSize={1000} />
      </TooltipProvider>
    )
    expect(ref.current).toBeTruthy()
    expect(() => ref.current.push({ time: 1, value: 10 })).not.toThrow()
    expect(() => ref.current.clear()).not.toThrow()
  })

  it("accepts decay config", () => {
    const props: any = { binSize: 1000, decay: { type: "linear" } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts pulse config", () => {
    const props: any = { binSize: 1000, pulse: { duration: 500 } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts staleness config", () => {
    const props: any = { binSize: 1000, staleness: { threshold: 5000 } }
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram {...props} />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("applies custom className", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} className="my-histogram" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts fill and stroke props", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram binSize={1000} fill="#007bff" stroke="#333" />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })

  it("accepts categoryAccessor and colors props", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram
          binSize={1000}
          categoryAccessor="type"
          colors={{ errors: "#dc3545", warnings: "#fd7e14" }}
        />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
  })
})

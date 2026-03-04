import React from "react"
import { render } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeLineChart", () => {
  beforeEach(() => {
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
      cb(performance.now())
      return 0
    })
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })

  afterEach(() => {
    if ((window.requestAnimationFrame as any).mockRestore) (window.requestAnimationFrame as any).mockRestore()
    if ((window.cancelAnimationFrame as any).mockRestore) (window.cancelAnimationFrame as any).mockRestore()
  })

  it("renders a canvas-based frame", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeLineChart />
      </TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} />
      </TooltipProvider>
    )
    expect(ref.current).toBeTruthy()
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  it("push adds data retrievable via getData", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    ref.current.push({ t: 1, v: 10 })
    ref.current.push({ t: 2, v: 20 })
    const data = ref.current.getData()
    expect(data.length).toBe(2)
  })

  it("clear empties the data buffer", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    ref.current.push({ t: 1, v: 10 })
    ref.current.clear()
    expect(ref.current.getData().length).toBe(0)
  })

  it("pushMany adds multiple points", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    ref.current.pushMany([
      { t: 1, v: 10 },
      { t: 2, v: 20 },
      { t: 3, v: 30 }
    ])
    expect(ref.current.getData().length).toBe(3)
  })

  it("accepts all line-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeLineChart
          stroke="#ff0000"
          strokeWidth={3}
          strokeDasharray="4,2"
          width={800}
          height={400}
          timeAccessor="ts"
          valueAccessor="val"
          windowSize={500}
          arrowOfTime="left"
          showAxes={false}
          className="my-chart"
          decay={{ type: "exponential", halfLife: 50 }}
          pulse={{ duration: 300, color: "red" }}
          staleness={{ threshold: 3000, showBadge: true }}
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("renders with controlled data prop", () => {
    const data = [
      { time: 1, value: 10 },
      { time: 2, value: 20 }
    ]
    const { container } = render(
      <TooltipProvider>
        <RealtimeLineChart data={data} timeAccessor="time" valueAccessor="value" />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })
})

import React from "react"
import { render } from "@testing-library/react"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeSwarmChart", () => {
  beforeEach(() => {
    ;(HTMLCanvasElement.prototype as any).getContext = jest.fn(() => ({
      beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(),
      stroke: jest.fn(), fill: jest.fn(), arc: jest.fn(),
      clearRect: jest.fn(), fillRect: jest.fn(), fillText: jest.fn(),
      strokeRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
      scale: jest.fn(), translate: jest.fn(), setLineDash: jest.fn(),
      closePath: jest.fn(),
      strokeStyle: "", lineWidth: 1, fillStyle: "", font: "",
      textAlign: "", textBaseline: "", globalAlpha: 1
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
      <TooltipProvider><RealtimeSwarmChart /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeSwarmChart ref={ref} /></TooltipProvider>)
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeSwarmChart ref={ref} timeAccessor="t" valueAccessor="v" /></TooltipProvider>)
    ref.current.pushMany([{ t: 1, v: 10 }, { t: 2, v: 20 }, { t: 3, v: 30 }])
    expect(ref.current.getData().length).toBe(3)
    ref.current.clear()
    expect(ref.current.getData().length).toBe(0)
  })

  it("accepts all swarm-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          radius={6}
          fill="#28a745"
          opacity={0.8}
          stroke="#000"
          strokeWidth={1}
          width={800}
          height={400}
          categoryAccessor="sensor"
          colors={{ sensor1: "#007bff", sensor2: "#28a745" }}
          windowSize={300}
          arrowOfTime="left"
          showAxes={false}
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("renders with controlled data prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          data={[{ time: 1, value: 5 }, { time: 2, value: 10 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })
})

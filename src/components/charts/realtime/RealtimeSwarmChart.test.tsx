import { vi } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeSwarmChart", () => {
  beforeEach(() => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
      clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
      strokeRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
      scale: vi.fn(), translate: vi.fn(), setLineDash: vi.fn(),
      closePath: vi.fn(),
      setTransform: vi.fn(), transform: vi.fn(), resetTransform: vi.fn(),
      getLineDash: vi.fn(() => []), clip: vi.fn(), rect: vi.fn(),
      arcTo: vi.fn(), bezierCurveTo: vi.fn(), quadraticCurveTo: vi.fn(),
      drawImage: vi.fn(), putImageData: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
      measureText: vi.fn(() => ({ width: 0 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createPattern: vi.fn(), isPointInPath: vi.fn(() => false),
      strokeText: vi.fn(),
      strokeStyle: "", lineWidth: 1, fillStyle: "", font: "",
      textAlign: "", textBaseline: "", globalAlpha: 1
    }))
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(performance.now())
      return 0
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
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
    act(() => { ref.current.pushMany([{ t: 1, v: 10 }, { t: 2, v: 20 }, { t: 3, v: 30 }]) })
    expect(ref.current.getData().length).toBe(3)
    act(() => { ref.current.clear() })
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

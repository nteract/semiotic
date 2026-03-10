import { vi } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeTemporalHistogram } from "./RealtimeHistogram"
import { TooltipProvider } from "../../store/TooltipStore"

describe("RealtimeTemporalHistogram", () => {
  beforeEach(() => {
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
      clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
      strokeRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
      scale: vi.fn(), translate: vi.fn(), setLineDash: vi.fn(),
      closePath: vi.fn(),
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

  it("renders a canvas-based frame with required binSize", () => {
    const { container } = render(
      <TooltipProvider><RealtimeTemporalHistogram binSize={1000} /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeTemporalHistogram ref={ref} binSize={100} /></TooltipProvider>)
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeTemporalHistogram ref={ref} binSize={100} /></TooltipProvider>)
    act(() => { ref.current.pushMany([{ time: 1, value: 10 }, { time: 2, value: 20 }]) })
    expect(ref.current.getData().length).toBe(2)
    act(() => { ref.current.clear() })
    expect(ref.current.getData().length).toBe(0)
  })

  it("accepts all histogram-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram
          binSize={500}
          fill="#007bff"
          stroke="#333"
          strokeWidth={1}
          gap={2}
          width={800}
          height={400}
          categoryAccessor="type"
          colors={{ errors: "#dc3545", warnings: "#fd7e14" }}
          windowSize={300}
          arrowOfTime="left"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("renders with controlled data prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeTemporalHistogram
          binSize={100}
          data={[{ time: 1, value: 5 }, { time: 2, value: 10 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })
})

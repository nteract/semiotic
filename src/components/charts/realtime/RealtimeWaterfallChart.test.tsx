import { vi } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("RealtimeWaterfallChart", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders a canvas-based frame", () => {
    const { container } = render(
      <TooltipProvider><RealtimeWaterfallChart /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeWaterfallChart ref={ref} /></TooltipProvider>)
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeWaterfallChart ref={ref} timeAccessor="t" valueAccessor="v" /></TooltipProvider>)
    act(() => { ref.current.pushMany([{ t: 1, v: 50 }, { t: 2, v: -30 }, { t: 3, v: 20 }]) })
    expect(ref.current.getData().length).toBe(3)
    act(() => { ref.current.clear() })
    expect(ref.current.getData().length).toBe(0)
  })

  it("accepts all waterfall-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeWaterfallChart
          positiveColor="#28a745"
          negativeColor="#dc3545"
          connectorStroke="#999"
          connectorWidth={1}
          gap={2}
          stroke="#666"
          strokeWidth={1}
          width={800}
          height={400}
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
        <RealtimeWaterfallChart
          data={[{ time: 1, value: 50 }, { time: 2, value: -30 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })
})

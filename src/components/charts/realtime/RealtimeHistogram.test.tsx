
import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("RealtimeHistogram", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders a canvas-based frame with required binSize", () => {
    const { container } = render(
      <TooltipProvider><RealtimeHistogram binSize={1000} /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeHistogram ref={ref} binSize={100} /></TooltipProvider>)
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<any>()
    render(<TooltipProvider><RealtimeHistogram ref={ref} binSize={100} /></TooltipProvider>)
    act(() => { ref.current.pushMany([{ time: 1, value: 10 }, { time: 2, value: 20 }]) })
    expect(ref.current.getData().length).toBe(2)
    act(() => { ref.current.clear() })
    expect(ref.current.getData().length).toBe(0)
  })

  it("accepts all histogram-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeHistogram
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
        <RealtimeHistogram
          binSize={100}
          data={[{ time: 1, value: 5 }, { time: 2, value: 10 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("flips the value domain for downward controlled histograms", async () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeHistogram
          ref={ref}
          binSize={1000}
          direction="down"
          data={[
            { time: " ", value: 50, type: "a" },
            { time: 100, value: null, type: "a" },
            { time: 100, value: 5, type: "a" },
            { time: 900, value: 7, type: "b" },
            { time: 2100, value: 4, type: "a" },
          ]}
          timeAccessor="time"
          valueAccessor="value"
          categoryAccessor="type"
        />
      </TooltipProvider>
    )

    await waitFor(() => {
      expect(ref.current?.getScales()?.y).toBeTruthy()
    })

    const domain = ref.current.getScales().y.domain()
    expect(domain[0]).toBeCloseTo(13.2)
    expect(domain[1]).toBe(0)
  })

  it("renders the static TemporalHistogram sibling with bounded data", () => {
    const { container } = render(
      <TooltipProvider>
        <TemporalHistogram
          binSize={1000}
          data={[
            { time: 100, value: 5 },
            { time: 900, value: 7 },
          ]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )

    // Confirm the static sibling actually paints — frame + canvas, same
    // signal as the other RealtimeHistogram tests above, so we know
    // bounded data flows through the streaming-bar pipeline.
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })
})

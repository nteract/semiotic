
import React from "react"
import { render, act, fireEvent } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("RealtimeLineChart", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

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
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} />
      </TooltipProvider>
    )
    expect(ref.current).toBeTruthy()
    expect(typeof ref.current!.push).toBe("function")
    expect(typeof ref.current!.pushMany).toBe("function")
    expect(typeof ref.current!.getData).toBe("function")
    expect(typeof ref.current!.clear).toBe("function")
  })

  it("push adds data retrievable via getData", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    act(() => { ref.current!.push({ t: 1, v: 10 }) })
    act(() => { ref.current!.push({ t: 2, v: 20 }) })
    const data = ref.current!.getData()
    expect(data.length).toBe(2)
  })

  it("seriesAccessor keeps a new group in push mode", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          seriesAccessor="series"
        />
      </TooltipProvider>
    )
    act(() => { ref.current!.push({ t: 1, v: 10, series: "a" }) })
    act(() => { ref.current!.push({ t: 2, v: 20, series: "b" }) })
    const data = ref.current!.getData()
    expect(data).toHaveLength(2)
    expect(new Set(data.map((row) => String(row.series))).size).toBe(2)
  })

  it("clear empties the data buffer", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    act(() => { ref.current!.push({ t: 1, v: 10 }) })
    act(() => { ref.current!.clear() })
    expect(ref.current!.getData().length).toBe(0)
  })

  it("pushMany adds multiple points", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    act(() => {
      ref.current!.pushMany([
        { t: 1, v: 10 },
        { t: 2, v: 20 },
        { t: 3, v: 30 }
      ])
    })
    expect(ref.current!.getData().length).toBe(3)
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

  it("renders its single-series legend when requested", () => {
    const { getByText } = render(
      <TooltipProvider>
        <RealtimeLineChart
          data={[{ time: 1, value: 10 }]}
          showLegend
        />
      </TooltipProvider>
    )
    expect(getByText("Series")).toBeTruthy()
  })

  it("labels its single multi-tooltip row with the value accessor", async () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeLineChart
          data={[{ time: 0, value: 10 }, { time: 10, value: 20 }]}
          timeAccessor="time"
          valueAccessor="value"
          tooltip="multi"
          width={200}
          height={100}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          showAxes={false}
        />
      </TooltipProvider>
    )
    await act(async () => { await Promise.resolve() })
    fireEvent.mouseMove(container.querySelector(".stream-xy-frame > div[role='img']")!, { clientX: 100, clientY: 50 })
    await act(async () => { await Promise.resolve() })
    const labels = Array.from(container.querySelectorAll(".stream-frame-tooltip span"))
      .map(span => span.textContent)
    expect(labels).toEqual(["", "value", "15"])
  })
})

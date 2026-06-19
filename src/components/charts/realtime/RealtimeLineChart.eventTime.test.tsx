import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

describe("RealtimeLineChart — event-time ingestion", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("releases reordered events to the frame in event-time order", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={{ lateness: 5 }}
        />
      </TooltipProvider>
    )
    act(() => {
      // Out-of-order within grace, then jump ahead to flush.
      ref.current.pushMany([
        { t: 5, v: 1 },
        { t: 2, v: 2 },
        { t: 8, v: 3 },
        { t: 30, v: 4 }, // watermark 30, threshold 25 → 2,5,8 released sorted
      ])
    })
    const times = ref.current.getData().map((d: any) => d.t)
    expect(times).toEqual([2, 5, 8])
  })

  it("surfaces late events via onObservation and drops them by default", () => {
    const ref = React.createRef<any>()
    const observations: any[] = []
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={{ lateness: 5 }}
          onObservation={(o) => observations.push(o)}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([
        { t: 100, v: 1 },
        { t: 110, v: 2 }, // advances watermark, releases t=100
        { t: 50, v: 3 }, // late (50 < 110-5)
      ])
    })
    const late = observations.filter((o) => o.type === "late-data")
    expect(late).toHaveLength(1)
    expect(late[0].eventTime).toBe(50)
    expect(late[0].policy).toBe("drop")
    expect(late[0].lateCount).toBe(1)
    // The late datum was dropped — not in the rendered data.
    expect(ref.current.getData().some((d: any) => d.t === 50)).toBe(false)
  })

  it("keeps late events when latePolicy is keep", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={{ lateness: 5, latePolicy: "keep" }}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([
        { t: 100, v: 1 },
        { t: 110, v: 2 },
        { t: 50, v: 3 }, // late but kept
      ])
    })
    expect(ref.current.getData().some((d: any) => d.t === 50)).toBe(true)
  })

  it("composes with aggregate — reordered events feed the accumulator", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={{ lateness: 5 }}
          aggregate={{ size: 100, stat: "count" }}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([
        { t: 10, v: 1 },
        { t: 5, v: 1 },
        { t: 50, v: 1 },
        { t: 200, v: 1 }, // flushes the grace window for window [0,100)
      ])
    })
    const rows = ref.current.getData()
    const firstWindow = rows.find((r: any) => r.__aggStart === 0)
    expect(firstWindow).toBeTruthy()
    // 10, 5, 50 released into window [0,100); 200 still held in grace buffer.
    expect(firstWindow.count).toBe(3)
  })

  it("behaves like a normal stream when eventTime is unset", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([{ t: 5, v: 1 }, { t: 2, v: 2 }])
    })
    // No reordering — arrival order preserved.
    expect(ref.current.getData().map((d: any) => d.t)).toEqual([5, 2])
  })
})

import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import type { RealtimeLineChartHandle } from "./RealtimeLineChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { Datum } from "../shared/datumTypes"
import type { ChartObservation } from "../../store/ObservationStore"

describe("RealtimeLineChart — event-time ingestion", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("releases reordered events to the frame in event-time order", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
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
      ref.current!.pushMany([
        { t: 5, v: 1 },
        { t: 2, v: 2 },
        { t: 8, v: 3 },
        { t: 30, v: 4 }, // watermark 30, threshold 25 → 2,5,8 released sorted
      ])
    })
    const times = ref.current!.getData().map((d: Datum) => d.t)
    expect(times).toEqual([2, 5, 8])
  })

  it("flushes the buffered tail in order and remains usable afterward", () => {
    const ref = React.createRef<RealtimeLineChartHandle>()
    const observations: ChartObservation[] = []
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={{ lateness: 100 }}
          onObservation={(observation) => observations.push(observation)}
        />
      </TooltipProvider>
    )

    act(() => {
      ref.current!.pushMany([
        { t: 8, v: 1 },
        { t: 2, v: 2 },
        { t: 5, v: 3 }
      ])
    })
    expect(ref.current!.getData()).toEqual([])

    act(() => ref.current!.flush())
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([2, 5, 8])

    // The explicit drain commits t=8 as the ordering frontier. Backdated
    // input follows latePolicy instead of silently appending a new zigzag.
    act(() => ref.current!.push({ t: 7, v: 99 }))
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([2, 5, 8])
    expect(
      observations.filter((observation) => observation.type === "late-data")
    ).toMatchObject([{ eventTime: 7, policy: "drop" }])

    // A flush is a reusable boundary rather than a terminal close. Newer
    // events enter a fresh buffered tail and a second flush orders it too.
    act(() => {
      ref.current!.pushMany([
        { t: 12, v: 4 },
        { t: 10, v: 5 }
      ])
    })
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([2, 5, 8])
    act(() => ref.current!.flush())
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([
      2, 5, 8, 10, 12
    ])

    // Repeated flushes are idempotent once the tail is empty.
    act(() => ref.current!.flush())
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([
      2, 5, 8, 10, 12
    ])
  })

  it("drains the old tail before changing or disabling event-time config", () => {
    const ref = React.createRef<RealtimeLineChartHandle>()
    const chart = (eventTime: { lateness: number } | undefined) => (
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          eventTime={eventTime}
        />
      </TooltipProvider>
    )
    const { rerender } = render(chart({ lateness: 100 }))

    act(() => {
      ref.current!.pushMany([
        { t: 8, v: 1 },
        { t: 2, v: 2 },
        { t: 5, v: 3 }
      ])
    })
    expect(ref.current!.getData()).toEqual([])

    // Replacing the policy flushes the old buffer rather than abandoning it.
    rerender(chart({ lateness: 10 }))
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([2, 5, 8])

    act(() => {
      ref.current!.pushMany([
        { t: 30, v: 4 },
        { t: 25, v: 5 }
      ])
    })
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([2, 5, 8])

    // Disabling event-time is the same kind of live boundary. Its tail is
    // routed before subsequent pushes switch to ordinary arrival order.
    rerender(chart(undefined))
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([
      2, 5, 8, 25, 30
    ])
    act(() => ref.current!.push({ t: 20, v: 6 }))
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([
      2, 5, 8, 25, 30, 20
    ])
  })

  it("uses the old accessor to drain before switching event-time accessors", () => {
    const ref = React.createRef<RealtimeLineChartHandle>()
    const chart = (timeAccessor: "firstTime" | "nextTime") => (
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor={timeAccessor}
          valueAccessor="v"
          eventTime={{ lateness: 100 }}
        />
      </TooltipProvider>
    )
    const { rerender } = render(chart("firstTime"))
    act(() => {
      ref.current!.pushMany([
        { id: "late-first", firstTime: 8, nextTime: 1, v: 1 },
        { id: "early-first", firstTime: 2, nextTime: 3, v: 2 },
        { id: "middle-first", firstTime: 5, nextTime: 2, v: 3 }
      ])
    })

    rerender(chart("nextTime"))
    expect(ref.current!.getData().map((d: Datum) => d.id)).toEqual([
      "early-first",
      "middle-first",
      "late-first"
    ])

    act(() => {
      ref.current!.pushMany([
        { id: "next-late", firstTime: 0, nextTime: 12, v: 4 },
        { id: "next-early", firstTime: 0, nextTime: 10, v: 5 }
      ])
      ref.current!.flush()
    })
    expect(ref.current!.getData().map((d: Datum) => d.id)).toEqual([
      "early-first",
      "middle-first",
      "late-first",
      "next-early",
      "next-late"
    ])
  })

  it("surfaces late events via onObservation and drops them by default", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    const observations: ChartObservation[] = []
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
      ref.current!.pushMany([
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
    expect(ref.current!.getData().some((d: Datum) => d.t === 50)).toBe(false)
  })

  it("keeps late events when latePolicy is keep", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
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
      ref.current!.pushMany([
        { t: 100, v: 1 },
        { t: 110, v: 2 },
        { t: 50, v: 3 }, // late but kept
      ])
    })
    expect(ref.current!.getData().some((d: Datum) => d.t === 50)).toBe(true)
  })

  it("composes with aggregate — reordered events feed the accumulator", () => {
    const ref = React.createRef<RealtimeLineChartHandle>()
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
      ref.current!.pushMany([
        { t: 10, v: 1 },
        { t: 5, v: 1 },
        { t: 50, v: 1 },
        { t: 200, v: 1 }, // flushes the grace window for window [0,100)
      ])
    })
    const rows = ref.current!.getData()
    const firstWindow = rows.find((row) => row.__aggStart === 0)!
    expect(firstWindow).toBeTruthy()
    // 10, 5, 50 released into window [0,100); 200 still held in grace buffer.
    expect(firstWindow.count).toBe(3)

    act(() => ref.current!.flush())
    const flushedRows = ref.current!.getData()
    expect(flushedRows.find((row) => row.__aggStart === 200)?.count).toBe(1)
  })

  it("behaves like a normal stream when eventTime is unset", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    render(
      <TooltipProvider>
        <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" />
      </TooltipProvider>
    )
    act(() => {
      ref.current!.pushMany([{ t: 5, v: 1 }, { t: 2, v: 2 }])
    })
    // No reordering — arrival order preserved.
    expect(ref.current!.getData().map((d: Datum) => d.t)).toEqual([5, 2])
  })
})

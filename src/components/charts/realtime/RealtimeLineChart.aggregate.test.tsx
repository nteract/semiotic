import React from "react"
import { render, act } from "@testing-library/react"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { AGG_VALUE, AGG_COUNT } from "./aggregate"

describe("RealtimeLineChart — aggregate mode", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("reduces pushed events into windowed rows via getData", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          aggregate={{ window: "tumbling", size: 10, stat: "mean" }}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([
        { t: 1, v: 10 },
        { t: 5, v: 20 }, // window [0,10): mean 15
        { t: 12, v: 100 }, // window [10,20)
      ])
    })
    const rows = ref.current.getData()
    expect(rows).toHaveLength(2)
    const first = rows.find((r: any) => r[AGG_COUNT] === 2)
    expect(first[AGG_VALUE]).toBe(15)
  })

  it("keeps render rows bounded regardless of event volume (retain)", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          aggregate={{ size: 10, retain: 3 }}
        />
      </TooltipProvider>
    )
    act(() => {
      const points = []
      for (let t = 0; t < 1000; t += 10) points.push({ t, v: t })
      ref.current.pushMany(points)
    })
    expect(ref.current.getData()).toHaveLength(3)
  })

  it("does not bound windows by windowSize — retain is the sole control", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          windowSize={3}
          aggregate={{ size: 10 }} // no retain → unbounded despite windowSize=3
        />
      </TooltipProvider>
    )
    act(() => {
      const points = []
      for (let t = 0; t < 100; t += 10) points.push({ t, v: t }) // 10 windows
      ref.current.pushMany(points)
    })
    expect(ref.current.getData().length).toBe(10)
  })

  it("emits band bounds when a band is requested", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          aggregate={{ size: 10, stat: "mean", band: "minmax" }}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current.pushMany([{ t: 1, v: 5 }, { t: 2, v: 25 }])
    })
    const row = ref.current.getData()[0]
    expect(row.__aggLower).toBe(5)
    expect(row.__aggUpper).toBe(25)
  })

  it("clear resets the aggregated rows", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          aggregate={{ size: 10 }}
        />
      </TooltipProvider>
    )
    act(() => { ref.current.push({ t: 1, v: 10 }) })
    expect(ref.current.getData().length).toBe(1)
    act(() => { ref.current.clear() })
    expect(ref.current.getData().length).toBe(0)
  })

  it("seeds the accumulator from an initial data array", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <RealtimeLineChart
          ref={ref}
          timeAccessor="t"
          valueAccessor="v"
          data={[{ t: 1, v: 10 }, { t: 5, v: 30 }]}
          aggregate={{ size: 10, stat: "mean" }}
        />
      </TooltipProvider>
    )
    const rows = ref.current.getData()
    expect(rows).toHaveLength(1)
    expect(rows[0][AGG_VALUE]).toBe(20)
  })

  it("renders a canvas frame in aggregate mode", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeLineChart timeAccessor="t" valueAccessor="v" aggregate={{ size: 10 }} />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })
})

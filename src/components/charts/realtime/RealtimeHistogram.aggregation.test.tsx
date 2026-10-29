import React from "react"
import { render, waitFor } from "@testing-library/react"
import { renderChart } from "../../server/renderToStaticSVG"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { RealtimeFrameHandle } from "../../realtime/types"

interface RealtimeHistogramTestHandle extends RealtimeFrameHandle {
  getScales(): { y: { domain(): number[] } }
}

// Click-stream rows: a time and a category, no numeric field.
const clicks = [
  { time: 100, page: "home" },
  { time: 200, page: "home" },
  { time: 300, page: "cart" },
  { time: 400, page: "home" },
  { time: 1500, page: "cart" },
]

describe("RealtimeHistogram aggregation", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("counts events per bin without a numeric field", async () => {
    const ref = React.createRef<RealtimeHistogramTestHandle>()
    render(
      <TooltipProvider>
        <RealtimeHistogram
          ref={ref}
          binSize={1000}
          aggregation="count"
          data={clicks}
          timeAccessor="time"
          extentPadding={0}
        />
      </TooltipProvider>
    )
    await waitFor(() => expect(ref.current?.getScales()?.y).toBeTruthy())
    // Four events land in [0, 1000).
    expect(ref.current!.getScales!()!.y.domain()[1]).toBe(4)
  })

  it("ignores valueAccessor when counting", async () => {
    const ref = React.createRef<RealtimeHistogramTestHandle>()
    render(
      <TooltipProvider>
        <RealtimeHistogram
          ref={ref}
          binSize={1000}
          aggregation="count"
          data={clicks.map((row) => ({ ...row, value: 50 }))}
          timeAccessor="time"
          valueAccessor="value"
          categoryAccessor="page"
          extentPadding={0}
        />
      </TooltipProvider>
    )
    await waitFor(() => expect(ref.current?.getScales()?.y).toBeTruthy())
    expect(ref.current!.getScales!()!.y.domain()[1]).toBe(4)
  })

  it("draws nothing for value-less rows under the default sum", async () => {
    const ref = React.createRef<RealtimeHistogramTestHandle>()
    render(
      <TooltipProvider>
        <RealtimeHistogram ref={ref} binSize={1000} data={clicks} timeAccessor="time" />
      </TooltipProvider>
    )
    await waitFor(() => expect(ref.current?.getScales()?.y).toBeTruthy())
    expect(ref.current!.getScales!()!.y.domain()).toEqual([0, 0])
  })

  it("counts on the static server path too", () => {
    const counted = renderChart("TemporalHistogram", {
      data: clicks,
      binSize: 1000,
      aggregation: "count",
      width: 400,
      height: 240,
    })
    const summed = renderChart("TemporalHistogram", {
      data: clicks,
      binSize: 1000,
      width: 400,
      height: 240,
    })
    // Value-less rows sum to nothing; counted, they draw two bins.
    expect((counted.match(/<rect/g) ?? []).length).toBeGreaterThan(
      (summed.match(/<rect/g) ?? []).length
    )
  })
})

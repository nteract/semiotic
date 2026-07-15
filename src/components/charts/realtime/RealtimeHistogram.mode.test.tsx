import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { TooltipProvider } from "../../store/TooltipStore"

// `useChartMode` only affects the props RealtimeHistogram forwards to
// StreamXYFrame; asserting on those requires mocking the frame. Kept in a
// separate file because the top-level vi.mock hoists and would otherwise
// replace the real frame in the sibling canvas-render tests.
let lastXYFrameProps = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef<Partial<StreamXYFrameHandle>, CapturedXYFrameProps>((props, _ref) => {
    lastXYFrameProps = props
    return <div className="stream-xy-frame" />
  }),
}))

describe("RealtimeHistogram — chart mode resolution", () => {
  beforeEach(() => { lastXYFrameProps = {} as CapturedXYFrameProps })

  it("sparkline mode shrinks size and turns axes off", () => {
    // Regression: before the fix only dimensions were threaded through
    // useChartMode — a sparkline render kept full axis chrome on a 120×24
    // canvas, eating most of the drawable area.
    render(
      <TooltipProvider>
        <RealtimeHistogram binSize={100} mode="sparkline" />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.size).toEqual([120, 24])
    expect(lastXYFrameProps.showAxes).toBe(false)
  })

  it("context mode shrinks size and turns axes off", () => {
    render(
      <TooltipProvider>
        <RealtimeHistogram binSize={100} mode="context" />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.size).toEqual([400, 250])
    expect(lastXYFrameProps.showAxes).toBe(false)
  })

  it("primary mode keeps the 600×400 default with axes on", () => {
    render(
      <TooltipProvider>
        <RealtimeHistogram binSize={100} />
      </TooltipProvider>
    )
    expect(lastXYFrameProps.size).toEqual([600, 400])
    expect(lastXYFrameProps.showAxes).toBe(true)
  })
})

import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { act, render } from "@testing-library/react"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { SelectionProvider } from "../../store/SelectionStore"
import { useSelection } from "../../store/useSelection"
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


it("publishes time brush selections and application events, then clears both", () => {
  let selection: ReturnType<typeof useSelection>
  function Probe() {
    selection = useSelection({ name: "time-window" })
    return null
  }
  const onBrush = vi.fn()
  const onObservation = vi.fn()
  render(
    <SelectionProvider>
      <Probe />
      <RealtimeHistogram binSize={10} timeAccessor="timestamp"
        linkedBrush="time-window" onBrush={onBrush} onObservation={onObservation} />
    </SelectionProvider>
  )
  const extent = { x: [10, 20] as [number, number], y: [0, 5] as [number, number] }
  act(() => lastXYFrameProps.onBrush!(extent))
  expect(selection!.isActive).toBe(true)
  expect(selection!.predicate({ timestamp: 15 })).toBe(true)
  expect(selection!.predicate({ timestamp: 30 })).toBe(false)
  expect(onBrush).toHaveBeenLastCalledWith(extent)
  expect(onObservation).toHaveBeenLastCalledWith(expect.objectContaining({ type: "brush", extent }))
  act(() => lastXYFrameProps.onBrush!(null))
  expect(selection!.isActive).toBe(false)
  expect(onBrush).toHaveBeenLastCalledWith(null)
  expect(onObservation).toHaveBeenLastCalledWith(expect.objectContaining({ type: "brush-end" }))
})

it("uses the linked brush dimension for both the overlay and selected interval", () => {
  let selection: ReturnType<typeof useSelection>
  function Probe() {
    selection = useSelection({ name: "two-axis" })
    return null
  }
  const { rerender } = render(
    <SelectionProvider>
      <Probe />
      <RealtimeHistogram binSize={10}
        linkedBrush={{ name: "two-axis", xField: "time", yField: "value" }} />
    </SelectionProvider>
  )
  expect(lastXYFrameProps.brush).toEqual({ dimension: "xy" })
  act(() => lastXYFrameProps.onBrush!({ x: [10, 20], y: [2, 5] }))
  expect(selection!.predicate({ time: 15, value: 3 })).toBe(true)
  expect(selection!.predicate({ time: 15, value: 9 })).toBe(false)
  rerender(
    <SelectionProvider>
      <Probe />
      <RealtimeHistogram binSize={10} brush={{ dimension: "x", snap: "bin" }}
        linkedBrush={{ name: "two-axis", xField: "time", yField: "value" }} />
    </SelectionProvider>
  )
  expect(lastXYFrameProps.brush).toMatchObject({ dimension: "x", snap: "bin" })
})

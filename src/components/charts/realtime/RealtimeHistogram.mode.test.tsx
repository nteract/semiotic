import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamXYFrameHandle } from "../../stream/types"
import { vi } from "vitest"
import React from "react"
import { act, render } from "@testing-library/react"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
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
    expect(lastXYFrameProps.showGrid).toBe(false)
  })

  it.each(["primary", "context", "sparkline"] as const)(
    "%s mode honors explicit grid settings",
    (mode) => {
      const { rerender } = render(<RealtimeHistogram binSize={10} mode={mode} showGrid />)
      expect(lastXYFrameProps.showGrid).toBe(true)
      rerender(<RealtimeHistogram binSize={10} mode={mode} showGrid={false} />)
      expect(lastXYFrameProps.showGrid).toBe(false)
    }
  )
})

describe.each([RealtimeHistogram, TemporalHistogram])("%s bin hover", (Histogram) => {
  const data = [
    { time: 5, value: 4, category: "North" },
    { time: 15, value: 8, category: "South" }
  ]
  const style = (binStart: number, category = "North") => {
    const areaStyle = lastXYFrameProps.areaStyle
    if (typeof areaStyle !== "function") throw new Error("Expected histogram style callback")
    return areaStyle({ binStart, binEnd: binStart + 10, total: 12, category })
  }
  const hover = (binStart: number, category = "North") => {
    act(() => lastXYFrameProps.customHoverBehavior!({
      data: { binStart, binEnd: binStart + 10, total: 12, category },
      x: 100, y: 100
    }))
  }

  it.each([undefined, "category", (d: { time: number; value: number; category?: string }) => d.category ?? "North"] as const)(
    "highlights a whole column with categoryAccessor=%s and restores styles on leave",
    (categoryAccessor) => {
      const onHover = vi.fn()
      const onObservation = vi.fn()
      render(<Histogram data={data} binSize={10} hoverHighlight opacity={0.8}
        categoryAccessor={categoryAccessor} colors={{ North: "#f00", South: "#00f" }}
        onHover={onHover} onObservation={onObservation} />)
      expect(style(0).opacity).toBe(0.8)
      expect(style(10).opacity).toBe(0.8)
      hover(0)
      expect(style(0, "North").opacity).toBe(0.8)
      expect(style(0, "South").opacity).toBe(0.8)
      expect(style(10, "North").opacity).toBe(0.5)
      expect(style(10, "South").opacity).toBe(0.5)
      expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ binStart: 0 }) }))
      expect(onObservation).toHaveBeenLastCalledWith(expect.objectContaining({ type: "hover" }))
      hover(10, "South")
      expect(style(0).opacity).toBe(0.5)
      expect(style(10, "North").opacity).toBe(0.8)
      act(() => lastXYFrameProps.customHoverBehavior!(null))
      expect(style(0).opacity).toBe(0.8)
      expect(style(10).opacity).toBe(0.8)
      expect(onHover).toHaveBeenLastCalledWith(null)
      expect(onObservation).toHaveBeenLastCalledWith(expect.objectContaining({ type: "hover-end" }))
    }
  )

  it.each([undefined, false])("does not dim bins with hoverHighlight=%s", (hoverHighlight) => {
    render(<Histogram data={data} binSize={10} hoverHighlight={hoverHighlight} opacity={0.8} />)
    hover(0)
    expect(style(10).opacity).toBe(0.8)
  })

  it("keeps linked category selection independent of local bin highlighting", () => {
    let selection: ReturnType<typeof useSelection>
    function Probe() {
      selection = useSelection({ name: "histogram-category" })
      return null
    }
    render(<SelectionProvider>
      <Probe />
      <Histogram data={data} binSize={10} hoverHighlight opacity={0.8}
        linkedHover={{ name: "histogram-category", fields: ["category"] }} />
    </SelectionProvider>)
    hover(0)
    expect(selection!.predicate({ category: "North", binStart: 10 })).toBe(true)
    expect(selection!.predicate({ category: "South", binStart: 0 })).toBe(false)
    expect(style(0, "South").opacity).toBe(0.8)
    expect(style(10, "North").opacity).toBe(0.5)
    act(() => lastXYFrameProps.customHoverBehavior!(null))
    expect(selection!.isActive).toBe(false)
  })

  it("restores a sibling selection after local hover ends", () => {
    let selection: ReturnType<typeof useSelection>
    function Probe() {
      selection = useSelection({ name: "sibling-category" })
      return null
    }
    render(<SelectionProvider>
      <Probe />
      <Histogram data={data} binSize={10} hoverHighlight opacity={0.8}
        selection={{ name: "sibling-category", unselectedOpacity: 0.2 }} />
    </SelectionProvider>)
    act(() => selection!.selectPoints({ category: ["North"] }))
    expect(style(0, "South").opacity).toBe(0.2)
    expect(style(10, "North").opacity).toBe(0.8)
    hover(0)
    expect(style(0, "South").opacity).toBe(0.8)
    expect(style(10, "North").opacity).toBe(0.2)
    act(() => lastXYFrameProps.customHoverBehavior!(null))
    expect(style(0, "South").opacity).toBe(0.2)
    expect(style(10, "North").opacity).toBe(0.8)
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

import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { NetworkCustomLayout } from "../networkCustomLayout"
import type { NetworkViewTransform } from "../networkViewportTypes"
import { ZoomableNetworkCustomChart } from "./ZoomableNetworkCustomChart"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import type { ZoomableNetworkCustomChartHandle } from "./types"

const nodes = [{ id: "a" }]
const layout: NetworkCustomLayout = () => ({ sceneNodes: [], sceneEdges: [] })
const initial = { x: 0, y: 0, k: 1 }
const next = { x: -100, y: -75, k: 2 }
const editorLayout: NetworkCustomLayout = () => ({
  sceneNodes: [],
  sceneEdges: [],
  htmlMarks: [
    {
      id: "a",
      x: 10,
      y: 10,
      width: 100,
      height: 60,
      content: <input aria-label="Node note" />
    }
  ]
})
let restoreCanvas: () => void
beforeEach(() => {
  vi.useFakeTimers()
  restoreCanvas = setupCanvasMock({ stubRaf: false })
})
afterEach(() => {
  cleanup()
  restoreCanvas()
  vi.useRealTimers()
})

it.each([false, true])(
  "exposes HTML editors outside atomic images (zoom: %s)",
  (zoom) => {
    const Chart = zoom ? ZoomableNetworkCustomChart : NetworkCustomChart
    const view = render(
      <Chart
        nodes={nodes}
        layout={editorLayout}
        width={400}
        height={300}
        animate={false}
      />
    )
    act(() => vi.advanceTimersByTime(32))
    const editor = view.getByRole("textbox", { name: "Node note" })
    expect(editor.closest('[role="img"]')).toBeNull()
  }
)

it.each([false, true])(
  "exposes the accepted camera before a React commit (controlled: %s)",
  (controlled) => {
    const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
    const snapshots: NetworkViewTransform[] = []
    const chart = (zoom: NetworkViewTransform) => (
      <ZoomableNetworkCustomChart
        ref={ref}
        nodes={nodes}
        layout={layout}
        width={400}
        height={300}
        animate={false}
        margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        zoom={controlled ? zoom : undefined}
        onZoomChange={(_proposal, event) => {
          // This runs inside the driver's frame callback, before React can
          // commit local state. A subsequent input can arrive at the same point.
          if (event.phase === "moving") snapshots.push(ref.current!.getZoom())
        }}
      />
    )
    const view = render(chart(initial))
    act(() => ref.current!.zoomTo(next, 0))
    act(() => vi.advanceTimersByTime(16))
    expect(snapshots).toEqual([controlled ? initial : next])
    expect(ref.current!.getZoom()).toEqual(controlled ? initial : next)
    if (controlled) {
      view.rerender(chart(next))
      expect(ref.current!.getZoom()).toEqual(next)
    }
  }
)

it("commits controlled acceptance within the gesture frame before the next input", () => {
  const ref = React.createRef<ZoomableNetworkCustomChartHandle>()
  function Host() {
    const [zoom, setZoom] = React.useState(initial)
    return (
      <>
        <output data-testid="accepted">{zoom.k}</output>
        <ZoomableNetworkCustomChart
          ref={ref}
          nodes={nodes}
          layout={layout}
          width={400}
          height={300}
          animate={false}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </>
    )
  }
  const view = render(<Host />)
  act(() => {
    ref.current!.zoomTo(next, 0)
    vi.advanceTimersByTime(16)
    // Assert before act finishes and flushes its batch. The next wheel event
    // needs the accepted camera, and the browser must paint the same geometry.
    expect(ref.current!.getZoom()).toEqual(next)
    expect(view.getByTestId("accepted").textContent).toBe("2")
  })
})

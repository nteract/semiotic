import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import type { StreamXYFrameHandle } from "./types"
import { setupCanvasMock, type CanvasContextMock } from "../../test-utils/canvasMock"

/**
 * Frame-level half of the dynamic-prop matrix.
 *
 * The store matrix covers retained data/config semantics. These checks cover
 * props owned by React/canvas composition: background SVG, marginals, and a
 * replacement hover callback. They deliberately drive rAF manually so an
 * assertion observes the resulting paint rather than only a React rerender.
 */

describe("dynamic-prop contract matrix — frame presentation", () => {
  let restore: (() => void) | null = null
  let context: CanvasContextMock
  let pending: FrameRequestCallback[] = []

  function flushFrames(max = 12): void {
    act(() => {
      for (let i = 0; i < max && pending.length > 0; i++) {
        const batch = pending
        pending = []
        for (const callback of batch) callback(performance.now())
      }
    })
  }

  beforeEach(() => {
    pending = []
    restore = setupCanvasMock({ stubRaf: false })
    context = HTMLCanvasElement.prototype.getContext.call(
      document.createElement("canvas"),
      "2d",
    ) as unknown as CanvasContextMock
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      pending.push(callback)
      // Frames coalesce on a truthy rAF token. Returning 0 matches the
      // synchronous test contract used by the existing frame regressions.
      return 0
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })

  afterEach(() => {
    pending = []
    vi.restoreAllMocks()
    restore?.()
    restore = null
  })

  it("repaints the data canvas when backgroundGraphics is added after mount", () => {
    const data = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 10 }]
    const { container, rerender } = render(
      <StreamXYFrame
        chartType="scatter"
        data={data}
        xAccessor="x"
        yAccessor="y"
        background="#ffffff"
        size={[200, 100]}
      />,
    )
    flushFrames()
    ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()

    rerender(
      <StreamXYFrame
        chartType="scatter"
        data={data}
        xAccessor="x"
        yAccessor="y"
        background="#ffffff"
        backgroundGraphics={<rect data-testid="dynamic-background" width="200" height="100" fill="#dbeafe" />}
        size={[200, 100]}
      />,
    )
    expect(container.querySelector('[data-testid="dynamic-background"]')).toBeTruthy()
    flushFrames()

    // The canvas must repaint to stop covering the new SVG sibling with its
    // formerly opaque background fill.
    expect(context.clearRect).toHaveBeenCalled()
  })

  it("repaints Ordinal and Geo canvases when backgroundGraphics is added after mount", () => {
    const cases = [
      {
        renderFrame: (backgroundGraphics?: React.ReactNode) => (
          <StreamOrdinalFrame
            chartType="point"
            background="#ffffff"
            backgroundGraphics={backgroundGraphics}
            size={[200, 100]}
          />
        )
      },
      {
        renderFrame: (backgroundGraphics?: React.ReactNode) => (
          <StreamGeoFrame
            projection="mercator"
            background="#ffffff"
            backgroundGraphics={backgroundGraphics}
            size={[200, 100]}
          />
        )
      }
    ]

    for (const { renderFrame } of cases) {
      const { rerender, unmount } = render(renderFrame())
      flushFrames()
      ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()
      ;(context.fillRect as ReturnType<typeof vi.fn>).mockClear()

      rerender(
        renderFrame(
          <rect data-testid="dynamic-background" width="200" height="100" fill="#dbeafe" />
        )
      )
      flushFrames()

      expect(context.clearRect).toHaveBeenCalled()
      expect(context.fillRect).not.toHaveBeenCalled()
      unmount()
    }
  })

  it("reflows a newly-added marginal and uses a replacement hover callback", () => {
    const data = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    const firstHover = vi.fn()
    const replacementHover = vi.fn()
    const { container, getByTestId, rerender } = render(
      <StreamXYFrame
        chartType="scatter"
        data={data}
        xAccessor="x"
        yAccessor="y"
        xExtent={[0, 10]}
        yExtent={[0, 10]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        enableHover
        customHoverBehavior={firstHover}
        size={[200, 100]}
      />,
    )
    flushFrames()
    rerender(
      <StreamXYFrame
        chartType="scatter"
        data={data}
        xAccessor="x"
        yAccessor="y"
        xExtent={[0, 10]}
        yExtent={[0, 10]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        showAxes={false}
        enableHover
        customHoverBehavior={replacementHover}
        marginalGraphics={{ top: "histogram" }}
        size={[200, 100]}
      />,
    )
    flushFrames()
    expect(getByTestId("marginal-histogram-top")).toBeTruthy()

    const hoverTarget = container.querySelector(".stream-xy-frame > div[role='img']")!
    fireEvent.mouseMove(hoverTarget, { clientX: 0, clientY: 100 })
    flushFrames()

    expect(replacementHover).toHaveBeenCalled()
    expect(firstHover).not.toHaveBeenCalled()
  })

  it("replaces/reorders controlled data and re-resolves accessors through the XY frame", () => {
    const ref = React.createRef<StreamXYFrameHandle>()
    const first = [
      { id: "a", x1: 1, x2: 10, y1: 2, y2: 20 },
      { id: "b", x1: 2, x2: 20, y1: 4, y2: 40 },
    ]
    const replacement = [
      { id: "c", x1: 100, x2: 1_000, y1: 200, y2: 2_000 },
      { id: "d", x1: 200, x2: 2_000, y1: 400, y2: 4_000 },
    ]
    const { rerender } = render(
      <StreamXYFrame
        ref={ref}
        chartType="scatter"
        data={first}
        pointIdAccessor="id"
        xAccessor="x1"
        yAccessor="y1"
        size={[200, 100]}
      />,
    )
    flushFrames()

    rerender(
      <StreamXYFrame
        ref={ref}
        chartType="scatter"
        data={replacement}
        pointIdAccessor="id"
        xAccessor="x1"
        yAccessor="y1"
        size={[200, 100]}
      />,
    )
    flushFrames()
    expect(ref.current!.getData().map((datum) => datum.id)).toEqual(["c", "d"])
    expect(ref.current!.getExtents()).toEqual({ x: [100, 200], y: [200, 400] })

    rerender(
      <StreamXYFrame
        ref={ref}
        chartType="scatter"
        data={[...replacement].reverse()}
        pointIdAccessor="id"
        xAccessor="x2"
        yAccessor="y2"
        size={[200, 100]}
      />,
    )
    flushFrames()
    expect(ref.current!.getData().map((datum) => datum.id)).toEqual(["d", "c"])
    expect(ref.current!.getExtents()).toEqual({ x: [1_000, 2_000], y: [2_000, 4_000] })
  })

  it("replaces controlled ordinal data and re-resolves retained accessors", () => {
    const ref = React.createRef<StreamOrdinalFrameHandle>()
    const data = [
      { id: "a", category: "A", category2: "North", value: 2, value2: 20 },
      { id: "b", category: "B", category2: "South", value: 4, value2: 40 },
    ]
    const { rerender } = render(
      <StreamOrdinalFrame
        ref={ref}
        chartType="bar"
        data={data}
        dataIdAccessor="id"
        oAccessor="category"
        rAccessor="value"
        oSort={false}
        size={[240, 120]}
      />,
    )
    flushFrames()
    const initialMax = ref.current!.getScales()!.r.domain()[1]

    rerender(
      <StreamOrdinalFrame
        ref={ref}
        chartType="bar"
        data={data}
        dataIdAccessor="id"
        oAccessor="category2"
        rAccessor="value2"
        oSort={false}
        size={[240, 120]}
      />,
    )
    flushFrames()
    const reconfiguredScales = ref.current!.getScales()!
    expect(reconfiguredScales.o.domain()).toEqual(["North", "South"])
    // Bar domains are padded/niced, so assert the retained accessor swap
    // changes the scale materially rather than pinning an implementation
    // detail of its exact upper tick.
    expect(reconfiguredScales.r.domain()[1]).toBeGreaterThan(initialMax * 5)

    const replacement = [{ id: "c", category: "C", category2: "West", value: 6, value2: 60 }]
    rerender(
      <StreamOrdinalFrame
        ref={ref}
        chartType="bar"
        data={replacement}
        dataIdAccessor="id"
        oAccessor="category2"
        rAccessor="value2"
        oSort={false}
        size={[240, 120]}
      />,
    )
    flushFrames()
    expect(ref.current!.getData().map((datum) => datum.id)).toEqual(["c"])
    expect(ref.current!.getScales()!.o.domain()).toEqual(["West"])
  })
})

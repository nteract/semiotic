import * as React from "react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, render, waitFor } from "@testing-library/react"
import StreamGeoFrame from "./StreamGeoFrame"
import { createMockCanvasContext, setupCanvasMock } from "../../test-utils/canvasMock"
import type { StreamGeoFrameHandle } from "./geoTypes"

// ResizeObserver is polyfilled globally in src/setupTests.ts.

describe("StreamGeoFrame", () => {
  // No-op rAF: the regression-test scope only needs to observe the
  // initial pipelineConfig that reaches the store, not subsequent
  // render passes. A synchronous-fire stub would recurse the
  // continuous render loop.
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  // ── Regression: every declared *Style prop reaches pipelineConfig ──────
  //
  // Mirrors the guard on StreamXYFrame / StreamOrdinalFrame / StreamNetworkFrame:
  // spies on GeoPipelineStore.updateConfig, renders with sentinel values,
  // asserts each reaches the merged config. Catches future drops at the
  // Frame↔Store seam.
  describe("regression: all declared *Style props reach pipelineConfig", () => {
    it("forwards every *Style prop to the GeoPipelineStore config", async () => {
      const areaStyle = { fill: "__AREA_STYLE__" }
      const pointStyle = () => ({ fill: "__POINT_STYLE__", r: 5 })
      const lineStyle = { stroke: "__LINE_STYLE__", strokeWidth: 2 }

      const StoreModule = await import("./GeoPipelineStore")
      const updateSpy = vi.spyOn(StoreModule.GeoPipelineStore.prototype, "updateConfig")

      try {
        render(
          <StreamGeoFrame
            projection="equalEarth"
            areas={[]}
            areaStyle={areaStyle}
            pointStyle={pointStyle}
            lineStyle={lineStyle}
          />
        )

        const lastConfig = updateSpy.mock.calls[updateSpy.mock.calls.length - 1]?.[0]
        expect(lastConfig, "updateConfig should be invoked with the initial merged config").toBeDefined()

        expect(lastConfig.areaStyle).toBe(areaStyle)
        expect(lastConfig.pointStyle).toBe(pointStyle)
        expect(lastConfig.lineStyle).toBe(lineStyle)
      } finally {
        updateSpy.mockRestore()
      }
    })
  })
})

// Push-mode legend category emission. The outer suite stubs rAF as a
// no-op for cheap pipelineConfig assertions; the emission test needs the
// actual render loop to fire so it lives in a sibling describe with the
// jsdom default rAF. Mirrors the equivalent test on `StreamXYFrame` /
// `StreamOrdinalFrame` so a regression in any frame's wiring is caught
// at the frame level, not just through HOC scenarios.
describe("StreamGeoFrame — legend category emission", () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    const ctx = createMockCanvasContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as any)
    if (!(globalThis as any).Path2D) {
      (globalThis as any).Path2D = class { constructor() {} } as any
    }
  })
  afterEach(() => {
    getContextSpy?.mockRestore()
  })

  it("emits legend category domain changes after push, remove, and clear", async () => {
    const ref = React.createRef<StreamGeoFrameHandle>()
    const onCategoriesChange = vi.fn()
    render(
      <StreamGeoFrame
        ref={ref}
        size={[300, 200]}
        projection="equalEarth"
        xAccessor="lon"
        yAccessor="lat"
        pointIdAccessor="id"
        legendCategoryAccessor="cat"
        onCategoriesChange={onCategoriesChange}
      />
    )

    act(() => {
      ref.current!.pushMany([
        { id: "a", lon: 0, lat: 0, cat: "A" },
        { id: "b", lon: 10, lat: 10, cat: "B" },
      ])
    })
    await waitFor(() => {
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A", "B"])
    })

    act(() => {
      ref.current!.removePoint("b")
    })
    await waitFor(() => {
      expect(onCategoriesChange).toHaveBeenLastCalledWith(["A"])
    })

    act(() => {
      ref.current!.clear()
    })
    await waitFor(() => {
      expect(onCategoriesChange).toHaveBeenLastCalledWith([])
    })
  })
})

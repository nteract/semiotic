import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import StreamGeoFrame from "./StreamGeoFrame"
import { createMockCanvasContext } from "../../test-utils/canvasMock"

// Mock ResizeObserver for jsdom (Stream Frames use it via useResponsiveSize)
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

describe("StreamGeoFrame", () => {
  // Same rationale as StreamNetworkFrame.test.tsx: bespoke mock setup with
  // a no-op rAF to avoid the continuous-render loop recursing on a
  // synchronous mock implementation. The regression-test scope only needs
  // to observe the initial pipelineConfig that reaches the store.
  let getContextSpy: ReturnType<typeof vi.spyOn> | null = null
  let rafSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    const ctx = createMockCanvasContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as any)
    if (!(globalThis as any).Path2D) {
      (globalThis as any).Path2D = class { constructor() {} } as any
    }
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0)
  })
  afterEach(() => {
    getContextSpy?.mockRestore()
    rafSpy?.mockRestore()
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

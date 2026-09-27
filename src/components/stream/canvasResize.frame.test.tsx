import "../../test-utils/registerBuiltInXYPlugins"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import { PipelineStore } from "./PipelineStore"
import {
  setupCanvasMock,
  type CanvasContextMock
} from "../../test-utils/canvasMock"
import type { FrameScheduler } from "./useFrame"

function manualFrames() {
  let latest: FrameRequestCallback | undefined
  let pending = new Map<number, FrameRequestCallback>()
  let handle = 0
  const scheduler: FrameScheduler = {
    requestAnimationFrame(callback) {
      latest = callback
      pending.set(++handle, callback)
      return handle
    },
    cancelAnimationFrame(id) {
      pending.delete(id)
    }
  }
  return {
    scheduler,
    drain() {
      for (let i = 0; i < 20 && pending.size; i++) {
        const batch = pending
        pending = new Map()
        act(() => {
          for (const callback of batch.values()) callback(1000)
        })
      }
      expect(pending.size).toBe(0)
    },
    repaint() {
      act(() => latest?.(1000))
    }
  }
}

describe("canvas resize invalidation (#1319, #1426)", () => {
  let restore: () => void
  let context: CanvasContextMock
  beforeEach(() => {
    restore = setupCanvasMock({ stubRaf: false })
    context = document
      .createElement("canvas")
      .getContext("2d") as unknown as CanvasContextMock
    vi.stubGlobal("innerWidth", 1200)
    vi.stubGlobal("innerHeight", 900)
    vi.stubGlobal("devicePixelRatio", 4)
  })
  afterEach(() => {
    restore()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([true, false])(
    "repaints fixed-size XY after a viewport cap change (resize event: %s)",
    (dispatchResize) => {
      const frames = manualFrames()
      const { container, unmount } = render(
        <StreamXYFrame
          chartType="scatter"
          data={[{ x: 1, y: 2 }]}
          xAccessor="x"
          yAccessor="y"
          size={[301, 201]}
          animate={false}
          frameScheduler={frames.scheduler}
        />
      )
      frames.drain()
      const canvas = container.querySelector("canvas")!
      expect(canvas.width).toBe(903)
      const computeScene = vi.spyOn(PipelineStore.prototype, "computeScene")
      ;(context.clearRect as ReturnType<typeof vi.fn>).mockClear()
      ;(context.fill as ReturnType<typeof vi.fn>).mockClear()
      vi.stubGlobal("innerWidth", 700)
      if (dispatchResize) {
        act(() => window.dispatchEvent(new Event("resize")))
        frames.drain()
      } else {
        // A scheduled hover frame must repaint if sizing clears its data layer,
        // even when the environment event has not been delivered yet.
        frames.repaint()
      }
      expect(canvas.width).toBe(602)
      expect(context.clearRect).toHaveBeenCalled()
      expect(context.fill).toHaveBeenCalled()
      expect(computeScene).not.toHaveBeenCalled()
      unmount()
    }
  )

  it("does not reset ordinal backing stores on repeated fractional-DPR paints", () => {
    vi.stubGlobal("devicePixelRatio", 1.5)
    const frames = manualFrames()
    const { container, unmount } = render(
      <StreamOrdinalFrame
        chartType="bar"
        data={[{ category: "A", value: 2 }]}
        oAccessor="category"
        rAccessor="value"
        size={[301, 201]}
        animate={false}
        frameScheduler={frames.scheduler}
      />
    )
    frames.drain()
    const canvas = container.querySelector("canvas")!
    expect(canvas.width).toBe(452)
    expect(canvas.height).toBe(302)
    const width = vi.spyOn(canvas, "width", "set")
    const height = vi.spyOn(canvas, "height", "set")
    frames.repaint()
    frames.repaint()
    expect(width).not.toHaveBeenCalled()
    expect(height).not.toHaveBeenCalled()
    expect(context.setTransform).toHaveBeenLastCalledWith(
      452 / 301,
      0,
      0,
      302 / 201,
      0,
      0
    )
    unmount()
  })
})

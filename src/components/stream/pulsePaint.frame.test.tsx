import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import {
  recordCanvasOps,
  setupCanvasMock,
  type CanvasContextMock,
  type CanvasOpLog
} from "../../test-utils/canvasMock"

// ── Regression: idle pulse frames repaint and clear their glow ──────────────
//
// A pulse starts inside computeScene, but its intensity is time-based. XY
// previously scheduled rAFs without repainting them when no data was dirty;
// Ordinal repainted but never recomputed the pulse fields, so its ring froze at
// the initial width. These tests own rAF and performance.now() to observe the
// midpoint and one final expiry frame deterministically.

describe("stream frame pulse paint", () => {
  let restore: (() => void) | null = null
  let ctx: CanvasContextMock
  let ops: CanvasOpLog
  let pending: FrameRequestCallback[] = []
  let clock = 1000
  let nextRafId = 0

  function clearOps(): void {
    ops.fillStyles.length = 0
    ops.strokeStyles.length = 0
    ops.fillAlphas.length = 0
    ops.strokeAlphas.length = 0
    ops.strokeLineWidths.length = 0
    ;(ctx.clearRect as ReturnType<typeof vi.fn>).mockClear()
  }

  function orangePulseStrokeWidths(): number[] {
    return ops.strokeStyles.flatMap((style, index) =>
      style === "orange" ? [ops.strokeLineWidths[index]] : []
    )
  }

  function flushFrame(at: number): void {
    clock = at
    const batch = pending
    pending = []
    act(() => {
      for (const callback of batch) callback(clock)
    })
  }

  /** Initial effects can schedule a pre-ingest frame. Keep the test clock at
   * insertion time until the first actual pulse paint has reached the canvas. */
  function flushInitialPulse(): void {
    for (let i = 0; i < 5; i++) {
      flushFrame(1000)
      if (ops.strokeLineWidths.includes(2)) return
    }
    throw new Error("expected the initial pulse frame to paint")
  }

  beforeEach(() => {
    clock = 1000
    nextRafId = 0
    pending = []
    restore = setupCanvasMock({ stubRaf: false })
    ctx = HTMLCanvasElement.prototype.getContext.call(
      document.createElement("canvas"),
      "2d"
    ) as unknown as CanvasContextMock
    ops = recordCanvasOps(ctx)
    vi.spyOn(performance, "now").mockImplementation(() => clock)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      pending.push(callback)
      return ++nextRafId
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })

  afterEach(() => {
    pending = []
    vi.restoreAllMocks()
    restore?.()
    restore = null
  })

  it("repaints StreamXYFrame at pulse midpoint and clears the glow at expiry", () => {
    render(
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 1, y: 2 }]}
        xAccessor="x"
        yAccessor="y"
        pointStyle={() => ({ fill: "#abc" })}
        pulse={{ duration: 100, color: "orange" }}
        size={[200, 100]}
      />
    )
    flushInitialPulse()
    clearOps()

    flushFrame(1050)
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
    expect(orangePulseStrokeWidths()).toContain(1)

    clearOps()
    flushFrame(1100)
    expect((ctx.clearRect as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
    expect(ops.strokeStyles).not.toContain("orange")
  })

  it("refreshes StreamOrdinalFrame's point pulse rather than repainting a frozen ring", () => {
    render(
      <StreamOrdinalFrame
        chartType="point"
        data={[{ category: "A", value: 2 }]}
        oAccessor="category"
        rAccessor="value"
        pieceStyle={() => ({ fill: "#abc" })}
        pulse={{ duration: 100, color: "orange" }}
        size={[200, 100]}
      />
    )
    flushInitialPulse()
    clearOps()

    flushFrame(1050)
    expect(orangePulseStrokeWidths()).toContain(1)

    clearOps()
    flushFrame(1100)
    expect(ops.strokeStyles).not.toContain("orange")
  })
})

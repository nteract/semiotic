import * as React from "react"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { setupCanvasMock, type CanvasContextMock } from "../../../test-utils/canvasMock"
import { ThemeProvider } from "../../ThemeProvider"
import { _resetCSSColorCacheForTest } from "../renderers/resolveCSSColor"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import StreamPhysicsFrame from "./StreamPhysicsFrame"

const quietKernel = {
  gravity: { x: 0, y: 0 },
  velocityDamping: 1,
  sleepSpeed: 100,
  sleepAfter: 0.01
}

function captureFillRectStyles(ctx: CanvasContextMock) {
  const styles: string[] = []
  const original = ctx.fillRect as ((...args: unknown[]) => unknown) | undefined
  ctx.fillRect = ((...args: unknown[]) => {
    styles.push(String(ctx.fillStyle))
    return original?.apply(ctx, args)
  }) as typeof ctx.fillRect
  return {
    styles,
    restore: () => {
      ctx.fillRect = original
    }
  }
}

function getMockCtx(): CanvasContextMock {
  return HTMLCanvasElement.prototype.getContext.call(
    document.createElement("canvas"),
    "2d"
  ) as unknown as CanvasContextMock
}

describe("StreamPhysicsFrame theme repainting", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => {
    cleanupCanvas()
    _resetCSSColorCacheForTest()
  })

  it("repaints a settled canvas when ThemeProvider switches in place", () => {
    const scheduler = createFrameScheduler(0)
    const ctx = getMockCtx()
    const capture = captureFillRectStyles(ctx)
    const config = { fixedDt: 0.1, kernel: quietKernel }
    const chart = (theme: "carbon" | "carbon-dark") => (
      <ThemeProvider theme={theme}>
        <StreamPhysicsFrame
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          config={config}
        />
      </ThemeProvider>
    )

    const { container, rerender } = render(chart("carbon"))
    const canvasContext = ctx as CanvasContextMock & { canvas: HTMLCanvasElement }
    canvasContext.canvas = container.querySelector("canvas")!
    capture.styles.length = 0

    try {
      const requestsBeforeDark = scheduler.requestedHandles.length
      rerender(chart("carbon-dark"))
      expect(scheduler.requestedHandles.length).toBeGreaterThan(requestsBeforeDark)
      if (scheduler.pendingCount) act(() => scheduler.flush())
      expect(capture.styles).toContain("#161616")

      capture.styles.length = 0
      const requestsBeforeLight = scheduler.requestedHandles.length
      rerender(chart("carbon"))
      expect(scheduler.requestedHandles.length).toBeGreaterThan(requestsBeforeLight)
      if (scheduler.pendingCount) act(() => scheduler.flush())
      expect(capture.styles).toContain("#ffffff")
    } finally {
      capture.restore()
    }
  })

  it("repaints a settled canvas when a scoped ancestor CSS token changes", async () => {
    const scheduler = createFrameScheduler(0)
    const ctx = getMockCtx()
    const capture = captureFillRectStyles(ctx)
    const { container } = render(
      <div
        data-testid="theme-scope"
        style={{ "--semiotic-bg": "#101820" } as React.CSSProperties}
      >
        <StreamPhysicsFrame
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />
      </div>
    )
    const canvasContext = ctx as CanvasContextMock & { canvas: HTMLCanvasElement }
    canvasContext.canvas = container.querySelector("canvas")!
    capture.styles.length = 0

    try {
      const requestsBeforeChange = scheduler.requestedHandles.length
      await act(async () => {
        container
          .querySelector<HTMLElement>("[data-testid='theme-scope']")!
          .style.setProperty("--semiotic-bg", "#abcdef")
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(scheduler.requestedHandles.length).toBeGreaterThan(requestsBeforeChange)
      if (scheduler.pendingCount) act(() => scheduler.flush())
      expect(capture.styles).toContain("#abcdef")
    } finally {
      capture.restore()
    }
  })

  it("resolves CSS-backed explicit backgrounds before assigning canvas paint", () => {
    const ctx = getMockCtx()
    const capture = captureFillRectStyles(ctx)
    try {
      render(
        <StreamPhysicsFrame
          size={[200, 120]}
          background="var(--missing-frame-bg, #abcdef)"
          config={{ fixedDt: 0.1, kernel: quietKernel }}
        />
      )

      expect(capture.styles).toContain("#abcdef")
    } finally {
      capture.restore()
    }
  })
})

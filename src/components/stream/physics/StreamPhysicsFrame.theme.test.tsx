import * as React from "react"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import {
  recordCanvasOps,
  setupCanvasMock,
  type CanvasContextMock
} from "../../../test-utils/canvasMock"
import { ThemeProvider } from "../../ThemeProvider"
import { _resetCSSColorCacheForTest } from "../renderers/resolveCSSColor"
import { createFrameScheduler } from "../test-utils/frameScheduler"
import { physicsCanvasThemeCSSValue } from "./PhysicsCanvasTheme"
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

  it("keeps scoped fallback tokens aligned across settled SSR and hydration", () => {
    const scheduler = createFrameScheduler(0)
    const ctx = getMockCtx()
    const backgroundPaint = captureFillRectStyles(ctx)
    const bodyPaint = recordCanvasOps(ctx)
    const canvasContext = ctx as CanvasContextMock & {
      canvas: HTMLCanvasElement
    }
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(function (this: HTMLCanvasElement) {
        canvasContext.canvas = this
        return ctx as unknown as CanvasRenderingContext2D
      })
    const mount = document.createElement("div")
    document.body.appendChild(mount)
    const chart = (
      <div
        data-testid="fallback-theme-scope"
        style={
          {
            "--surface-1": "#101820",
            "--accent": "#3366ff",
            "--text-primary": "#eeeeee"
          } as React.CSSProperties
        }
      >
        <StreamPhysicsFrame
          size={[200, 120]}
          frameScheduler={scheduler.scheduler}
          config={{ fixedDt: 0.1, kernel: quietKernel }}
          initialSpawns={[
            {
              id: "scoped-body",
              x: 30,
              y: 30,
              shape: { type: "circle", radius: 5 },
              mass: 1
            }
          ]}
        />
      </div>
    )
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | null = null

    try {
      mount.innerHTML = renderToString(chart)
      const settledSVG = mount.querySelector("svg.stream-physics-frame__svg")
      expect(settledSVG?.querySelector(":scope > rect")).toHaveAttribute(
        "fill",
        physicsCanvasThemeCSSValue("background")
      )
      const settledBody = settledSVG?.querySelector(
        "g[id$='-data-area'] circle"
      )
      expect(settledBody).toHaveAttribute(
        "fill",
        physicsCanvasThemeCSSValue("primary")
      )
      expect(settledBody).toHaveAttribute(
        "stroke",
        physicsCanvasThemeCSSValue("text")
      )

      backgroundPaint.styles.length = 0
      bodyPaint.fillStyles.length = 0
      bodyPaint.strokeStyles.length = 0
      act(() => {
        root = hydrateRoot(mount, chart)
      })

      if (scheduler.pendingCount) {
        act(() => scheduler.flush())
      }

      expect(backgroundPaint.styles).toContain("#101820")
      expect(bodyPaint.fillStyles).toContain("#3366ff")
      expect(bodyPaint.strokeStyles).toContain("#eeeeee")
      expect(
        errorSpy.mock.calls.filter((call) =>
          /did not match|hydration failed|hydration error/i.test(
            String(call[0] ?? "")
          )
        )
      ).toEqual([])
    } finally {
      if (root) act(() => root?.unmount())
      errorSpy.mockRestore()
      getContextSpy.mockRestore()
      backgroundPaint.restore()
      mount.remove()
    }
  })

  it("keeps plot-space margin translation aligned across settled SSR and canvas hydration", () => {
    const scheduler = createFrameScheduler(0)
    const ctx = getMockCtx()
    const translate = ctx.translate as ReturnType<typeof vi.fn>
    const canvasContext = ctx as CanvasContextMock & {
      canvas: HTMLCanvasElement
    }
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(function (this: HTMLCanvasElement) {
        canvasContext.canvas = this
        return ctx as unknown as CanvasRenderingContext2D
      })
    const mount = document.createElement("div")
    document.body.appendChild(mount)
    const chart = (
      <StreamPhysicsFrame
        size={[200, 120]}
        margin={{ top: 7, right: 0, bottom: 0, left: 11 }}
        frameScheduler={scheduler.scheduler}
        backgroundGraphicsBackdrop="#f8fafc"
        backgroundGraphics={
          <circle data-testid="margin-background" cx={4} cy={5} r={2} />
        }
        config={{ fixedDt: 0.1, kernel: quietKernel }}
        initialSpawns={[
          {
            id: "margin-body",
            x: 30,
            y: 30,
            shape: { type: "circle", radius: 5 },
            mass: 1
          }
        ]}
      />
    )
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | null = null

    try {
      mount.innerHTML = renderToString(chart)
      const settledSVG = mount.querySelector("svg.stream-physics-frame__svg")
      const settledBackdrop = settledSVG?.querySelector(
        "rect.stream-frame-background__backdrop"
      )
      const settledBackground = settledSVG?.querySelector(
        '[data-testid="margin-background"]'
      )
      const settledDataArea = settledSVG?.querySelector("g[id$='-data-area']")
      expect(settledBackdrop?.parentElement).toBe(settledSVG)
      expect(settledBackground?.parentElement).toHaveAttribute(
        "transform",
        "translate(11,7)"
      )
      expect(settledDataArea).toHaveAttribute("transform", "translate(11,7)")

      translate.mockClear()
      act(() => {
        root = hydrateRoot(mount, chart)
      })
      if (scheduler.pendingCount) {
        act(() => scheduler.flush())
      }

      expect(mount.querySelector("svg.stream-physics-frame__svg")).toBeNull()
      const hydratedBackdrop = mount.querySelector(
        "rect.stream-frame-background__backdrop"
      )
      const hydratedBackground = mount.querySelector(
        '[data-testid="margin-background"]'
      )
      expect(hydratedBackdrop?.parentElement?.tagName.toLowerCase()).toBe("svg")
      expect(hydratedBackdrop?.parentElement).not.toHaveAttribute("transform")
      expect(hydratedBackground?.parentElement).toHaveAttribute(
        "transform",
        "translate(11,7)"
      )
      expect(translate).toHaveBeenCalledWith(11, 7)
      expect(
        errorSpy.mock.calls.filter((call) =>
          /did not match|hydration failed|hydration error/i.test(
            String(call[0] ?? "")
          )
        )
      ).toEqual([])
    } finally {
      if (root) act(() => root?.unmount())
      errorSpy.mockRestore()
      getContextSpy.mockRestore()
      mount.remove()
    }
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
    const canvasContext = ctx as CanvasContextMock & {
      canvas: HTMLCanvasElement
    }
    canvasContext.canvas = container.querySelector("canvas")!
    capture.styles.length = 0

    try {
      const requestsBeforeDark = scheduler.requestedHandles.length
      rerender(chart("carbon-dark"))
      expect(scheduler.requestedHandles.length).toBeGreaterThan(
        requestsBeforeDark
      )
      if (scheduler.pendingCount) act(() => scheduler.flush())
      expect(capture.styles).toContain("#161616")

      capture.styles.length = 0
      const requestsBeforeLight = scheduler.requestedHandles.length
      rerender(chart("carbon"))
      expect(scheduler.requestedHandles.length).toBeGreaterThan(
        requestsBeforeLight
      )
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
    const canvasContext = ctx as CanvasContextMock & {
      canvas: HTMLCanvasElement
    }
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

      expect(scheduler.requestedHandles.length).toBeGreaterThan(
        requestsBeforeChange
      )
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

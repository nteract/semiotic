/**
 * Behavioral contracts for useFrame.
 *
 * Each describe-block locks down the contract for one extracted concern.
 * When a new concern is extracted into useFrame, add a describe-block here
 * BEFORE migrating any frame to use it.
 */
import * as React from "react"
import { act, renderHook } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { useFrame } from "./useFrame"
import type { FrameMargin, FrameScheduler, UseFrameInput } from "./useFrame"
import { ThemeProvider, LIGHT_THEME, DARK_THEME, useThemeSelector } from "../store/ThemeStore"
import { _resetCSSColorCacheForTest, resolveCSSColor } from "./renderers/resolveCSSColor"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const DEFAULT_INPUT: UseFrameInput = {
  sizeProp: [800, 600],
  responsiveWidth: false,
  responsiveHeight: false,
  userMargin: undefined,
  marginDefault: { top: 20, right: 30, bottom: 40, left: 50 },
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ThemeProvider, null, children)

describe("useFrame — sizing", () => {
  it("returns sizeProp as size when not responsive", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.size).toEqual([800, 600])
  })

  it("derives adjustedWidth = size[0] - margin.left - margin.right", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.adjustedWidth).toBe(800 - 50 - 30) // 720
  })

  it("derives adjustedHeight = size[1] - margin.top - margin.bottom", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.adjustedHeight).toBe(600 - 20 - 40) // 540
  })

  it("returns a stable responsiveRef for attaching to a container", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const ref1 = result.current.responsiveRef
    rerender()
    expect(result.current.responsiveRef).toBe(ref1)
  })
})

describe("useFrame — margin merge", () => {
  it("returns the default margin when no userMargin", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.margin).toEqual({ top: 20, right: 30, bottom: 40, left: 50 })
  })

  it("shallow-merges userMargin over default", () => {
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, userMargin: { top: 100 } }),
      { wrapper },
    )
    expect(result.current.margin).toEqual({ top: 100, right: 30, bottom: 40, left: 50 })
  })

  it("returns the same margin object across renders when inputs are referentially stable", () => {
    const userMargin = { top: 100 }
    const marginDefault = { top: 20, right: 30, bottom: 40, left: 50 }
    const { result, rerender } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, userMargin, marginDefault }),
      { wrapper },
    )
    const margin1 = result.current.margin
    rerender()
    expect(result.current.margin).toBe(margin1)
  })
})

describe("useFrame — graphics resolution", () => {
  it("returns undefined for unset graphics", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.resolvedForeground).toBeUndefined()
    expect(result.current.resolvedBackground).toBeUndefined()
  })

  it("passes ReactNode graphics through unchanged", () => {
    const fg = React.createElement("g", { id: "fg" })
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, foregroundGraphics: fg }),
      { wrapper },
    )
    expect(result.current.resolvedForeground).toBe(fg)
  })

  it("invokes function-form graphics with current size + margin", () => {
    let receivedCtx: { size: number[]; margin: FrameMargin } | undefined
    const fg = (ctx: { size: number[]; margin: FrameMargin }) => {
      receivedCtx = ctx
      return React.createElement("g", { id: "fg" })
    }
    renderHook(
      () => useFrame({ ...DEFAULT_INPUT, foregroundGraphics: fg }),
      { wrapper },
    )
    expect(receivedCtx).toEqual({
      size: [800, 600],
      margin: { top: 20, right: 30, bottom: 40, left: 50 },
    })
  })
})

describe("useFrame — theme tracking", () => {
  it("returns the current theme from the ThemeStore", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    // The default ThemeStore state is LIGHT_THEME
    expect(result.current.currentTheme).toEqual(LIGHT_THEME)
  })

  it("re-renders with the new theme when setTheme fires on the store", () => {
    // Mount useFrame alongside a useThemeSelector that captures setTheme,
    // so the test can drive a theme change on the shared ThemeStore and
    // verify useFrame's currentTheme output updates to match.
    const { result } = renderHook(
      () => ({
        frame: useFrame(DEFAULT_INPUT),
        setTheme: useThemeSelector(
          (s: { setTheme: (t: "light" | "dark" | "high-contrast") => void }) => s.setTheme,
        ),
      }),
      { wrapper },
    )
    // Baseline: default ThemeStore state is LIGHT_THEME.
    expect(result.current.frame.currentTheme.mode).toBe("light")
    expect(result.current.frame.currentTheme.colors.background).toBe(LIGHT_THEME.colors.background)
    // Drive a theme change and verify the hook's currentTheme flips.
    act(() => {
      result.current.setTheme("dark")
    })
    expect(result.current.frame.currentTheme.mode).toBe("dark")
    expect(result.current.frame.currentTheme.colors.background).not.toBe(LIGHT_THEME.colors.background)
  })
})

describe("useFrame — animate config", () => {
  it("resolves animate=true to a default transition + intro enabled", () => {
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, animate: true }),
      { wrapper },
    )
    expect(result.current.transition).toBeTruthy()
    expect(result.current.introEnabled).toBe(true)
  })

  it("resolves animate=false to no transition", () => {
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, animate: false }),
      { wrapper },
    )
    expect(result.current.transition).toBeUndefined()
    expect(result.current.introEnabled).toBe(false)
  })

  it("resolves animate={ intro: false } to transition + intro disabled", () => {
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, animate: { intro: false } }),
      { wrapper },
    )
    expect(result.current.transition).toBeTruthy()
    expect(result.current.introEnabled).toBe(false)
  })
})

describe("useFrame — reduced motion", () => {
  it("returns the current reduced-motion preference", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    // The default jsdom matchMedia returns false for prefers-reduced-motion.
    expect(typeof result.current.reducedMotion).toBe("boolean")
  })

  it("provides a ref-mirror that always reflects the latest value", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.reducedMotionRef.current).toBe(result.current.reducedMotion)
  })

  it("ref-mirror identity is stable across renders", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const ref1 = result.current.reducedMotionRef
    rerender()
    expect(result.current.reducedMotionRef).toBe(ref1)
  })
})

describe("useFrame — table id", () => {
  it("returns a stable, hash-suffixed id with the semiotic-table- prefix", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(result.current.tableId).toMatch(/^semiotic-table-/)
    expect(result.current.tableId.length).toBeGreaterThan("semiotic-table-".length)
  })

  it("table id is stable across renders for the same instance", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const id1 = result.current.tableId
    rerender()
    expect(result.current.tableId).toBe(id1)
  })

  it("different hook instances get different ids", () => {
    const { result: r1 } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const { result: r2 } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    expect(r1.current.tableId).not.toBe(r2.current.tableId)
  })
})

describe("useFrame — scheduleRender (rAF coalescing)", () => {
  it("returns a stable scheduleRender callback", () => {
    const frameScheduler = createFrameScheduler()
    const { result, rerender } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    const fn1 = result.current.scheduleRender
    rerender()
    expect(result.current.scheduleRender).toBe(fn1)
  })

  it("coalesces a valid zero-valued rAF token", () => {
    const frameScheduler = createFrameScheduler(0)
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    result.current.scheduleRender()
    result.current.scheduleRender()
    result.current.scheduleRender()
    expect(frameScheduler.requestedHandles).toEqual([0])
    expect(frameScheduler.pendingCount).toBe(1)
    expect(result.current.rafRef.current).toBe(0)
  })

  it("invokes the latest renderFnRef.current and releases the pending token before it runs", () => {
    const frameScheduler = createFrameScheduler()
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    let calls = 0
    result.current.renderFnRef.current = () => {
      calls++
    }
    result.current.scheduleRender()
    frameScheduler.flush()
    expect(calls).toBe(1)
    expect(result.current.rafRef.current).toBeNull()
  })

  it("can queue again after a flushed render without relying on the frame's rAF handle", () => {
    const frameScheduler = createFrameScheduler()
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    result.current.scheduleRender()
    frameScheduler.flush()
    result.current.scheduleRender()
    expect(frameScheduler.requestedHandles).toEqual([0, 1])
  })

  it("cancels a pending zero-valued rAF token on unmount", () => {
    const frameScheduler = createFrameScheduler(0)
    const { result, unmount } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    result.current.scheduleRender()
    unmount()
    expect(frameScheduler.cancelledHandles).toEqual([0])
    expect(frameScheduler.pendingCount).toBe(0)
  })

  it("cancels a pending render explicitly so a direct paint can take over", () => {
    const frameScheduler = createFrameScheduler(0)
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    result.current.scheduleRender()
    expect(result.current.rafRef.current).toBe(0)

    result.current.cancelRender()
    expect(frameScheduler.cancelledHandles).toEqual([0])
    expect(frameScheduler.pendingCount).toBe(0)
    expect(result.current.rafRef.current).toBeNull()

    // Cancellation is idempotent and leaves the scheduler reusable.
    result.current.cancelRender()
    result.current.scheduleRender()
    expect(frameScheduler.requestedHandles).toEqual([0, 1])
  })

  it("handles a synchronous test scheduler without leaving a phantom pending token", () => {
    let calls = 0
    const frameScheduler: FrameScheduler = {
      requestAnimationFrame: (callback) => {
        callback(performance.now())
        return 0
      },
      cancelAnimationFrame: () => {},
    }
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler }),
      { wrapper },
    )
    result.current.renderFnRef.current = () => { calls++ }
    result.current.scheduleRender()
    result.current.scheduleRender()
    expect(calls).toBe(2)
    expect(result.current.rafRef.current).toBeNull()
  })

  it("does not recurse when a synchronous scheduler render asks for continuation", () => {
    let calls = 0
    const frameScheduler: FrameScheduler = {
      requestAnimationFrame: (callback) => {
        callback(performance.now())
        return 0
      },
      cancelAnimationFrame: () => {},
    }
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler }),
      { wrapper },
    )
    result.current.renderFnRef.current = () => {
      calls++
      result.current.scheduleRender()
    }

    result.current.scheduleRender()
    expect(calls).toBe(1)
    expect(result.current.rafRef.current).toBeNull()
  })

  it("unmount with no pending rAF is a no-op (no cancel call)", () => {
    const frameScheduler = createFrameScheduler()
    const { unmount } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    unmount()
    expect(frameScheduler.cancelledHandles).toHaveLength(0)
  })

  it("renderFnRef and rafRef identities are stable across renders", () => {
    const frameScheduler = createFrameScheduler()
    const { result, rerender } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    const renderFn = result.current.renderFnRef
    const rafRef = result.current.rafRef
    rerender()
    expect(result.current.renderFnRef).toBe(renderFn)
    expect(result.current.rafRef).toBe(rafRef)
  })
})

describe("useFrame — theme-change effect", () => {
  // Reuse the rAF mock from the surrounding scope behavior — beforeEach
  // installs it, afterEach restores. The theme-change effect both mutates
  // dirtyRef and calls scheduleRender, so we observe both effects.
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = []
  let nextRafId = 1
  const originalRAF = global.requestAnimationFrame
  const originalCAF = global.cancelAnimationFrame

  beforeEach(() => {
    rafCallbacks = []
    nextRafId = 1
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      const id = nextRafId++
      rafCallbacks.push({ id, cb })
      return id
    })
    global.cancelAnimationFrame = ((id: number) => {
      rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id)
    })
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRAF
    global.cancelAnimationFrame = originalCAF
  })

  it("does NOT install the theme-change effect when themeDirtyRef is not provided", () => {
    renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    // No theme-change effect = no scheduleRender call from it = no rAF queued.
    expect(rafCallbacks).toHaveLength(0)
  })

  it("on mount, sets dirtyRef.current = true and queues a render when themeDirtyRef is provided", () => {
    const dirtyRef = { current: false } as React.MutableRefObject<boolean>
    renderHook(
      () => useFrame({ ...DEFAULT_INPUT, themeDirtyRef: dirtyRef }),
      { wrapper },
    )
    expect(dirtyRef.current).toBe(true)
    expect(rafCallbacks).toHaveLength(1)
  })

  it("preserves the frame's dirtyRef initial value when the ref already starts true", () => {
    // Ordinal/Network init dirtyRef to true; the theme effect should be
    // a no-op-with-respect-to-value (still true) rather than flipping it.
    const dirtyRef = { current: true } as React.MutableRefObject<boolean>
    renderHook(
      () => useFrame({ ...DEFAULT_INPUT, themeDirtyRef: dirtyRef }),
      { wrapper },
    )
    expect(dirtyRef.current).toBe(true)
  })

  it("does NOT re-run on a rerender that doesn't change theme", () => {
    const dirtyRef = { current: false } as React.MutableRefObject<boolean>
    const { rerender } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, themeDirtyRef: dirtyRef }),
      { wrapper },
    )
    expect(rafCallbacks).toHaveLength(1) // mount
    dirtyRef.current = false // simulate a render-path resetting the flag
    rafCallbacks = [] // ignore the mount queue
    rerender()
    // No new theme-change effect fire, no new rAF queued.
    expect(rafCallbacks).toHaveLength(0)
    expect(dirtyRef.current).toBe(false)
  })

  it("invalidates cached CSS-variable colors and queues repaint on ThemeStore changes", () => {
    const dirtyRef = { current: false } as React.MutableRefObject<boolean>
    const { result } = renderHook(
      () => ({
        frame: useFrame({ ...DEFAULT_INPUT, themeDirtyRef: dirtyRef }),
        setTheme: useThemeSelector(
          (s: { setTheme: (t: "light" | "dark" | "high-contrast") => void }) => s.setTheme,
        ),
      }),
      { wrapper },
    )

    const canvas = document.createElement("canvas")
    document.body.appendChild(canvas)
    const ctx = { canvas } as CanvasRenderingContext2D
    try {
      canvas.style.setProperty("--semiotic-primary", "#111111")
      _resetCSSColorCacheForTest()

      expect(resolveCSSColor(ctx, "var(--semiotic-primary)")).toBe("#111111")
      canvas.style.setProperty("--semiotic-primary", "#222222")
      expect(resolveCSSColor(ctx, "var(--semiotic-primary)")).toBe("#111111")

      dirtyRef.current = false
      result.current.frame.rafRef.current = null
      rafCallbacks = []

      act(() => {
        result.current.setTheme("dark")
      })

      expect(result.current.frame.currentTheme).toBe(DARK_THEME)
      expect(dirtyRef.current).toBe(true)
      expect(rafCallbacks).toHaveLength(1)
      expect(resolveCSSColor(ctx, "var(--semiotic-primary)")).toBe("#222222")
    } finally {
      canvas.remove()
      // resolveCSSColor lazily attaches a global MutationObserver/matchMedia
      // listener via ensureGlobalObserver. Reset the cache + observer here so
      // they don't leak into later tests in this file or other test files.
      _resetCSSColorCacheForTest()
    }
  })
})

describe("useFrame — hover coalescing", () => {
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = []
  let nextRafId = 1
  let cancelledIds: number[] = []
  const originalRAF = global.requestAnimationFrame
  const originalCAF = global.cancelAnimationFrame

  beforeEach(() => {
    rafCallbacks = []
    nextRafId = 1
    cancelledIds = []
    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      const id = nextRafId++
      rafCallbacks.push({ id, cb })
      return id
    })
    global.cancelAnimationFrame = ((id: number) => {
      cancelledIds.push(id)
      rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id)
    })
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRAF
    global.cancelAnimationFrame = originalCAF
  })

  function flushRafs() {
    const pending = rafCallbacks.slice()
    rafCallbacks = []
    for (const { cb } of pending) cb(performance.now())
  }

  it("coalesces multiple pointermove events into one rAF", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.onPointerMove({ clientX: 10, clientY: 20 })
    result.current.onPointerMove({ clientX: 11, clientY: 21 })
    result.current.onPointerMove({ clientX: 12, clientY: 22 })
    expect(rafCallbacks).toHaveLength(1)
  })

  it("coalesces pointermove events when an injected scheduler returns zero", () => {
    const frameScheduler = createFrameScheduler(0)
    const { result } = renderHook(
      () => useFrame({ ...DEFAULT_INPUT, frameScheduler: frameScheduler.scheduler }),
      { wrapper },
    )
    result.current.onPointerMove({ clientX: 10, clientY: 20 })
    result.current.onPointerMove({ clientX: 11, clientY: 21 })
    expect(frameScheduler.requestedHandles).toEqual([0])
    expect(frameScheduler.pendingCount).toBe(1)
    frameScheduler.flush()
    result.current.onPointerMove({ clientX: 12, clientY: 22 })
    expect(frameScheduler.requestedHandles).toEqual([0, 1])
  })

  it("invokes hoverHandlerRef.current with the LATEST coords on flush", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let lastSeen: { clientX: number; clientY: number } | null = null
    result.current.hoverHandlerRef.current = (coords) => { lastSeen = coords }
    result.current.onPointerMove({ clientX: 10, clientY: 20 })
    result.current.onPointerMove({ clientX: 99, clientY: 88 })
    flushRafs()
    expect(lastSeen).toEqual({ clientX: 99, clientY: 88 })
  })

  it("does not fire hoverHandlerRef when pointermove was never called", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let calls = 0
    result.current.hoverHandlerRef.current = () => { calls++ }
    flushRafs()
    expect(calls).toBe(0)
  })

  it("after flush + frame logic, a subsequent pointermove queues a new rAF", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.onPointerMove({ clientX: 1, clientY: 2 })
    flushRafs()
    result.current.onPointerMove({ clientX: 3, clientY: 4 })
    expect(rafCallbacks).toHaveLength(1)
  })

  it("onPointerLeave cancels any pending pointermove rAF and invokes hoverLeaveRef", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let leaveCalls = 0
    result.current.hoverLeaveRef.current = () => { leaveCalls++ }
    result.current.onPointerMove({ clientX: 5, clientY: 6 })
    expect(rafCallbacks).toHaveLength(1)
    const queuedId = rafCallbacks[0].id
    result.current.onPointerLeave()
    expect(cancelledIds).toContain(queuedId)
    expect(leaveCalls).toBe(1)
  })

  it("onPointerLeave with no pending move still invokes hoverLeaveRef", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let leaveCalls = 0
    result.current.hoverLeaveRef.current = () => { leaveCalls++ }
    result.current.onPointerLeave()
    expect(leaveCalls).toBe(1)
  })

  it("after onPointerLeave, the dropped pointermove does NOT fire its handler when flushed", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let hoverCalls = 0
    result.current.hoverHandlerRef.current = () => { hoverCalls++ }
    result.current.onPointerMove({ clientX: 5, clientY: 6 })
    result.current.onPointerLeave() // cancels the rAF
    flushRafs() // any leftovers (should be none)
    expect(hoverCalls).toBe(0)
  })

  it("cancels pending pointermove rAF on unmount", () => {
    const { result, unmount } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.onPointerMove({ clientX: 5, clientY: 6 })
    expect(rafCallbacks).toHaveLength(1)
    const queuedId = rafCallbacks[0].id
    unmount()
    expect(cancelledIds).toContain(queuedId)
  })

  it("onPointerMove and onPointerLeave callback identities are stable across renders", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const move = result.current.onPointerMove
    const leave = result.current.onPointerLeave
    rerender()
    expect(result.current.onPointerMove).toBe(move)
    expect(result.current.onPointerLeave).toBe(leave)
  })
})

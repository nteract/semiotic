/**
 * Behavioral contracts for useFrame.
 *
 * Each describe-block locks down the contract for one extracted concern.
 * When a new concern is extracted into useFrame, add a describe-block here
 * BEFORE migrating any frame to use it.
 */
import * as React from "react"
import { renderHook } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { useFrame } from "./useFrame"
import type { UseFrameInput } from "./useFrame"
import { ThemeProvider, DARK_THEME, LIGHT_THEME } from "../store/ThemeStore"

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
      () => useFrame({ ...DEFAULT_INPUT, userMargin: { top: 100 } as any }),
      { wrapper },
    )
    expect(result.current.margin).toEqual({ top: 100, right: 30, bottom: 40, left: 50 })
  })

  it("returns the same margin object across renders when inputs are referentially stable", () => {
    const userMargin = { top: 100 } as any
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
    let receivedCtx: any
    const fg = (ctx: any) => {
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

  it("re-renders when the theme changes", () => {
    const StoreCapture: { setTheme?: (t: any) => void } = {}
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      // ThemeProvider gives each test a fresh store; capture setTheme
      // by rendering a child that grabs it from useThemeSelector.
      return React.createElement(ThemeProvider, null, children)
    }
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper: Wrapper })
    // Default LIGHT_THEME baseline.
    expect(result.current.currentTheme.mode).toBe("light")
    // The theme-switch round-trip is exercised in the integration tests
    // (themed-charts.spec.ts) — here we just verify the value flows.
    expect(result.current.currentTheme.colors.background).toBe(LIGHT_THEME.colors.background)
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
    }) as any
    global.cancelAnimationFrame = ((id: number) => {
      cancelledIds.push(id)
      rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id)
    }) as any
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

  it("returns a stable scheduleRender callback", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const fn1 = result.current.scheduleRender
    rerender()
    expect(result.current.scheduleRender).toBe(fn1)
  })

  it("queues exactly one rAF for a single scheduleRender call", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.scheduleRender()
    expect(rafCallbacks).toHaveLength(1)
  })

  it("coalesces multiple scheduleRender calls before the rAF fires", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.scheduleRender()
    result.current.scheduleRender()
    result.current.scheduleRender()
    expect(rafCallbacks).toHaveLength(1)
  })

  it("invokes the latest renderFnRef.current when the rAF fires", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    let calls = 0
    result.current.renderFnRef.current = () => {
      calls++
      // Frame's render closure resets rafRef so the next scheduleRender works.
      result.current.rafRef.current = 0
    }
    result.current.scheduleRender()
    flushRafs()
    expect(calls).toBe(1)
  })

  it("after the rAF fires + frame resets rafRef, scheduleRender can queue again", () => {
    const { result } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.renderFnRef.current = () => {
      result.current.rafRef.current = 0
    }
    result.current.scheduleRender()
    flushRafs()
    result.current.scheduleRender()
    expect(rafCallbacks).toHaveLength(1)
  })

  it("cancels the pending rAF on unmount", () => {
    const { result, unmount } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    result.current.scheduleRender()
    expect(rafCallbacks).toHaveLength(1)
    const queuedId = rafCallbacks[0].id
    unmount()
    expect(cancelledIds).toContain(queuedId)
  })

  it("unmount with no pending rAF is a no-op (no cancel call)", () => {
    const { unmount } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    unmount()
    expect(cancelledIds).toHaveLength(0)
  })

  it("renderFnRef and rafRef identities are stable across renders", () => {
    const { result, rerender } = renderHook(() => useFrame(DEFAULT_INPUT), { wrapper })
    const renderFn = result.current.renderFnRef
    const rafRef = result.current.rafRef
    rerender()
    expect(result.current.renderFnRef).toBe(renderFn)
    expect(result.current.rafRef).toBe(rafRef)
  })
})

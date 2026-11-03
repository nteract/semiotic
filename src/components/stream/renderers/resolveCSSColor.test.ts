import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  resolveCSSColor,
  clearCSSColorCache,
  getCSSColorCacheVersion,
  subscribeToCSSColorInvalidation
} from "./resolveCSSColor"

function makeCtx(varName?: string, value?: string): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas")
  if (varName && value !== undefined) {
    canvas.style.setProperty(varName, value)
  }
  document.body.appendChild(canvas)
  return { canvas } as unknown as CanvasRenderingContext2D
}

describe("resolveCSSColor", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("returns non-var values unchanged", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, "#ff0000")).toBe("#ff0000")
    expect(resolveCSSColor(ctx, "rgb(0,0,0)")).toBe("rgb(0,0,0)")
  })

  it("returns undefined for undefined input", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, undefined)).toBe(undefined)
  })

  it("resolves var() to computed value", () => {
    const ctx = makeCtx("--my-color", "#ff0000")
    expect(resolveCSSColor(ctx, "var(--my-color)")).toBe("#ff0000")
  })

  it("does not install global listeners for resolution without a subscriber", () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe")
    const ctx = makeCtx("--my-color", "#ff0000")

    expect(resolveCSSColor(ctx, "var(--my-color)")).toBe("#ff0000")
    expect(observe).not.toHaveBeenCalled()
  })

  it("uses fallback when var is not defined", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, "var(--undefined-var, #00ff00)")).toBe(
      "#00ff00"
    )
  })

  it("caches resolved values across repeat calls within the same version", () => {
    const ctx = makeCtx("--color", "#abcdef")
    const first = resolveCSSColor(ctx, "var(--color)")
    // Mutate the underlying value — cache should still return original
    ctx.canvas.style.setProperty("--color", "#000000")
    const second = resolveCSSColor(ctx, "var(--color)")
    expect(first).toBe("#abcdef")
    expect(second).toBe("#abcdef")
  })

  it("invalidates cache when clearCSSColorCache is called", () => {
    const ctx = makeCtx("--color", "#abcdef")
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#abcdef")
    ctx.canvas.style.setProperty("--color", "#123456")
    clearCSSColorCache()
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#123456")
  })

  it("invalidates cache when an intermediate wrapper style changes (scoped cascade)", async () => {
    // Documented theming: wrap a chart in a div that sets --semiotic-*.
    // subtree:true MutationObserver should bump the version so canvas re-reads.
    const wrapper = document.createElement("div")
    wrapper.style.setProperty("--semiotic-danger", "#ff0000")
    document.body.appendChild(wrapper)
    const canvas = document.createElement("canvas")
    wrapper.appendChild(canvas)
    const ctx = { canvas } as unknown as CanvasRenderingContext2D

    // jsdom does not inherit custom properties; mirror the computed value on
    // the canvas and verify the wrapper's mutation invalidates its cache.
    canvas.style.setProperty("--semiotic-danger", "#ff0000")
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(() => canvas, listener)
    try {
      expect(resolveCSSColor(ctx, "var(--semiotic-danger)")).toBe("#ff0000")
      canvas.style.setProperty("--semiotic-danger", "#0000ff")
      wrapper.style.setProperty("--semiotic-danger", "#0000ff")
      await Promise.resolve()
      expect(listener).toHaveBeenCalledOnce()
      expect(resolveCSSColor(ctx, "var(--semiotic-danger)")).toBe("#0000ff")
    } finally {
      unsubscribe()
    }
  })

  it("notifies only canvas branches affected by a scoped style mutation", async () => {
    const wrapper = document.createElement("div")
    const canvas = document.createElement("canvas")
    const unrelated = document.createElement("div")
    wrapper.appendChild(canvas)
    document.body.append(wrapper, unrelated)
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(() => canvas, listener)

    try {
      const beforeUnrelatedMutation = getCSSColorCacheVersion()
      unrelated.style.setProperty("--semiotic-primary", "#111111")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).not.toHaveBeenCalled()
      expect(getCSSColorCacheVersion()).toBe(beforeUnrelatedMutation)

      const beforeRelatedMutation = getCSSColorCacheVersion()
      wrapper.style.setProperty("--semiotic-primary", "#222222")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).toHaveBeenCalledTimes(1)
      expect(getCSSColorCacheVersion()).toBe(beforeRelatedMutation + 1)
    } finally {
      unsubscribe()
    }
  })

  it("ignores descendant presentation churn while observing self and ancestors", async () => {
    const ancestor = document.createElement("section")
    const chartRoot = document.createElement("div")
    const tooltip = document.createElement("div")
    const canvas = document.createElement("canvas")
    chartRoot.append(canvas, tooltip)
    ancestor.appendChild(chartRoot)
    document.body.appendChild(ancestor)
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(
      () => chartRoot,
      listener
    )

    try {
      const beforeDescendantMutations = getCSSColorCacheVersion()
      tooltip.style.left = "12px"
      tooltip.className = "semiotic-tooltip visible"
      canvas.style.cursor = "pointer"
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(listener).not.toHaveBeenCalled()
      expect(getCSSColorCacheVersion()).toBe(beforeDescendantMutations)

      canvas.style.setProperty("--semiotic-primary", "#abcdef")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).toHaveBeenCalledTimes(1)

      chartRoot.style.setProperty("--semiotic-primary", "#123456")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).toHaveBeenCalledTimes(2)

      ancestor.classList.add("dark-theme")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).toHaveBeenCalledTimes(3)
      expect(getCSSColorCacheVersion()).toBe(beforeDescendantMutations + 3)
    } finally {
      unsubscribe()
    }
  })

  it("observes a scoped wrapper inside the frame when it contains the painted canvas", async () => {
    const chartRoot = document.createElement("div")
    const scopedWrapper = document.createElement("div")
    const canvas = document.createElement("canvas")
    scopedWrapper.appendChild(canvas)
    chartRoot.appendChild(scopedWrapper)
    document.body.appendChild(chartRoot)
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(
      () => chartRoot,
      listener
    )

    try {
      scopedWrapper.style.setProperty("--semiotic-primary", "#123456")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  })

  it("disconnects the global observer after the last subscriber leaves", () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect")
    const canvas = document.createElement("canvas")
    document.body.appendChild(canvas)
    const unsubscribeA = subscribeToCSSColorInvalidation(() => canvas, vi.fn())
    const unsubscribeB = subscribeToCSSColorInvalidation(() => canvas, vi.fn())

    unsubscribeA()
    expect(disconnect).not.toHaveBeenCalled()
    unsubscribeB()
    expect(disconnect).toHaveBeenCalledTimes(1)

    // A later frame can install a fresh observer after the teardown.
    const unsubscribeC = subscribeToCSSColorInvalidation(() => canvas, vi.fn())
    unsubscribeC()
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it.each([false, true])("refreshes retained canvas colors after a subscription gap (active sibling: %s)", async (activeSibling) => {
    const ctx = makeCtx("--color", "#112233")
    const sibling = makeCtx()
    const unsubscribeSibling = activeSibling
      ? subscribeToCSSColorInvalidation(() => sibling.canvas, vi.fn())
      : undefined
    const unsubscribe = subscribeToCSSColorInvalidation(() => ctx.canvas, vi.fn())
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#112233")
    unsubscribe()

    // Hidden/offscreen frames can retain their canvas while effects are stopped.
    // No subscriber observed this canvas while its scoped CSS variables changed.
    ctx.canvas.style.setProperty("--color", "#abcdef")
    await Promise.resolve()
    const unsubscribeAgain = subscribeToCSSColorInvalidation(() => ctx.canvas, vi.fn())
    try {
      expect(resolveCSSColor(ctx, "var(--color)")).toBe("#abcdef")
    } finally {
      unsubscribeAgain()
      unsubscribeSibling?.()
    }
  })

  it("repaints settled canvases when an asynchronous web font finishes loading", () => {
    const fontSet = new EventTarget()
    const removeListener = vi.spyOn(fontSet, "removeEventListener")
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: fontSet
    })

    const canvas = document.createElement("canvas")
    document.body.appendChild(canvas)
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(() => canvas, listener)

    try {
      const beforeFontLoad = getCSSColorCacheVersion()
      const emptyLoad = Object.assign(new Event("loadingdone"), { fontfaces: [] })
      fontSet.dispatchEvent(emptyLoad)
      expect(listener).not.toHaveBeenCalled()
      expect(getCSSColorCacheVersion()).toBe(beforeFontLoad)
      const loaded = Object.assign(new Event("loadingdone"), { fontfaces: [{}] })
      fontSet.dispatchEvent(loaded)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(getCSSColorCacheVersion()).toBe(beforeFontLoad + 1)
    } finally {
      unsubscribe()
      if (originalFonts) {
        Object.defineProperty(document, "fonts", originalFonts)
      } else {
        Object.defineProperty(document, "fonts", {
          configurable: true,
          value: undefined
        })
      }
    }

    expect(removeListener).toHaveBeenCalledWith(
      "loadingdone",
      expect.any(Function)
    )
    listener.mockClear()
    fontSet.dispatchEvent(new Event("loadingdone"))
    expect(listener).not.toHaveBeenCalled()
  })

  it.each(["modern", "legacy"])("releases %s media-query listeners with the final subscriber", (api) => {
    const events = new EventTarget()
    const add = vi.spyOn(events, "addEventListener")
    const remove = vi.spyOn(events, "removeEventListener")
    const query = api === "modern" ? events : {
      addListener: (listener: EventListener) => events.addEventListener("change", listener),
      removeListener: (listener: EventListener) => events.removeEventListener("change", listener)
    }
    vi.stubGlobal("matchMedia", vi.fn(() => query))
    const ctx = makeCtx()
    const listener = vi.fn()
    const unsubscribe = subscribeToCSSColorInvalidation(() => ctx.canvas, listener)
    try {
      expect(add).toHaveBeenCalledExactlyOnceWith("change", expect.any(Function))
      events.dispatchEvent(new Event("change"))
      expect(listener).toHaveBeenCalledOnce()
      unsubscribe()
      expect(remove).toHaveBeenCalledExactlyOnceWith("change", add.mock.calls[0][1])
      events.dispatchEvent(new Event("change"))
      expect(listener).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
      vi.unstubAllGlobals()
    }
  })

  it("isolates caches between canvases", () => {
    const ctxA = makeCtx("--c", "#aaaaaa")
    const ctxB = makeCtx("--c", "#bbbbbb")
    expect(resolveCSSColor(ctxA, "var(--c)")).toBe("#aaaaaa")
    expect(resolveCSSColor(ctxB, "var(--c)")).toBe("#bbbbbb")
  })

  it("invalidates all canvases at once when cleared", () => {
    const ctxA = makeCtx("--c", "#aaaaaa")
    const ctxB = makeCtx("--c", "#bbbbbb")
    resolveCSSColor(ctxA, "var(--c)")
    resolveCSSColor(ctxB, "var(--c)")
    ctxA.canvas.style.setProperty("--c", "#111111")
    ctxB.canvas.style.setProperty("--c", "#222222")
    clearCSSColorCache()
    expect(resolveCSSColor(ctxA, "var(--c)")).toBe("#111111")
    expect(resolveCSSColor(ctxB, "var(--c)")).toBe("#222222")
  })

  it("clearCSSColorCache(canvas) accepts a canvas arg for backward compat", () => {
    const ctx = makeCtx("--color", "#abcdef")
    resolveCSSColor(ctx, "var(--color)")
    ctx.canvas.style.setProperty("--color", "#fedcba")
    clearCSSColorCache(ctx.canvas)
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#fedcba")
  })

  it("calls getComputedStyle once per (canvas, var, version) triple", () => {
    const ctx = makeCtx("--color", "#abcdef")
    const computedStyle = vi.spyOn(window, "getComputedStyle")
    resolveCSSColor(ctx, "var(--color)")
    resolveCSSColor(ctx, "var(--color)")
    resolveCSSColor(ctx, "var(--color)")
    expect(computedStyle).toHaveBeenCalledOnce()
    clearCSSColorCache()
    resolveCSSColor(ctx, "var(--color)")
    expect(computedStyle).toHaveBeenCalledTimes(2)
  })

  it("falls back to fallback color when ctx.canvas is missing", () => {
    const ctx = {
      canvas: null as unknown as HTMLCanvasElement
    } as CanvasRenderingContext2D
    expect(resolveCSSColor(ctx, "var(--missing, #defabc)")).toBe("#defabc")
  })

  it("resolves a nested var() fallback to its innermost color", () => {
    // The Treemap cell-border stroke: both custom props unset → #fff. The old
    // regex truncated the fallback at the first ")", handing the canvas an
    // unparseable string that painted black instead.
    const ctx = makeCtx()
    expect(
      resolveCSSColor(
        ctx,
        "var(--semiotic-cell-border, var(--semiotic-border, #fff))"
      )
    ).toBe("#fff")
  })

  it("uses the inner var when the outer is unset but the inner is defined", () => {
    const ctx = makeCtx("--semiotic-border", "#cccccc")
    expect(
      resolveCSSColor(
        ctx,
        "var(--semiotic-cell-border, var(--semiotic-border, #fff))"
      )
    ).toBe("#cccccc")
  })

  it("resolves a nested var() fallback with ctx.canvas missing", () => {
    const ctx = {
      canvas: null as unknown as HTMLCanvasElement
    } as CanvasRenderingContext2D
    expect(resolveCSSColor(ctx, "var(--a, var(--b, #fff))")).toBe("#fff")
  })
})

import { describe, expect, it } from "vitest"
import {
  createFrameThemeColorCache,
  LIGHT_FRAME_THEME,
  resolveFrameThemeColors,
  withAlpha
} from "./frameThemeColors"
import {
  _resetCSSColorCacheForTest,
  clearCSSColorCache
} from "./renderers/resolveCSSColor"

describe("withAlpha (frame theme)", () => {
  it("appends alpha to 6-char hex", () => {
    expect(withAlpha("#aabbcc", "66")).toBe("#aabbcc66")
  })

  it("expands 3-char hex before appending alpha", () => {
    expect(withAlpha("#aaa", "66")).toBe("#aaaaaa66")
    expect(withAlpha("#abc", "4D")).toBe("#aabbcc4D")
  })

  it("converts rgb() to rgba()", () => {
    expect(withAlpha("rgb(170, 170, 170)", "66")).toMatch(/^rgba\(170, 170, 170, 0\.4/)
  })

  it("passes through non-hex forms", () => {
    expect(withAlpha("red", "66")).toBe("red")
  })
})

describe("createFrameThemeColorCache", () => {
  it("returns light defaults without an element", () => {
    const cache = createFrameThemeColorCache()
    expect(cache.resolve(null)).toEqual(LIGHT_FRAME_THEME)
  })

  it("reuses resolved colors until the CSS color cache version bumps", () => {
    _resetCSSColorCacheForTest()
    const el = document.createElement("div")
    el.style.setProperty("--semiotic-primary", "#112233")
    el.style.setProperty("--semiotic-bg", "#fafafa")
    document.body.appendChild(el)

    const cache = createFrameThemeColorCache()
    const first = cache.resolve(el)
    expect(first.primary).toBe("#112233")
    expect(first.background).toBe("#fafafa")

    // Mutate style without bumping the cache version — should still return
    // the previous snapshot (version-keyed, not live-querying every call).
    el.style.setProperty("--semiotic-primary", "#abcdef")
    const second = cache.resolve(el)
    expect(second).toBe(first)
    expect(second.primary).toBe("#112233")

    clearCSSColorCache()
    const third = cache.resolve(el)
    expect(third.primary).toBe("#abcdef")

    document.body.removeChild(el)
    _resetCSSColorCacheForTest()
  })

  it("resolveFrameThemeColors falls back to light theme on empty styles", () => {
    const el = document.createElement("div")
    expect(resolveFrameThemeColors(el)).toEqual(LIGHT_FRAME_THEME)
  })
})

import { renderHook, act } from "@testing-library/react"
import { useReducedMotion, useHighContrast } from "./useMediaPreferences"

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mql = {
    matches,
    addEventListener: (_event: string, fn: any) => { listeners.push(fn) },
    removeEventListener: (_event: string, fn: any) => {
      const idx = listeners.indexOf(fn)
      if (idx >= 0) listeners.splice(idx, 1)
    },
  }
  const original = window.matchMedia
  window.matchMedia = vi.fn().mockReturnValue(mql) as any
  return {
    mql,
    listeners,
    restore: () => {
      if (original) {
        window.matchMedia = original
      } else {
        delete (window as any).matchMedia
      }
    }
  }
}

describe("useReducedMotion", () => {
  it("returns false by default (no preference)", () => {
    const mock = mockMatchMedia(false)
    try {
      const { result } = renderHook(() => useReducedMotion())
      expect(result.current).toBe(false)
    } finally {
      mock.restore()
    }
  })

  it("returns true when prefers-reduced-motion matches", () => {
    const mock = mockMatchMedia(true)
    try {
      const { result } = renderHook(() => useReducedMotion())
      expect(result.current).toBe(true)
    } finally {
      mock.restore()
    }
  })

  it("updates when media query changes", () => {
    const mock = mockMatchMedia(false)
    try {
      const { result } = renderHook(() => useReducedMotion())
      expect(result.current).toBe(false)

      act(() => {
        for (const fn of mock.listeners) fn({ matches: true })
      })
      expect(result.current).toBe(true)
    } finally {
      mock.restore()
    }
  })
})

describe("useHighContrast", () => {
  it("returns false by default", () => {
    const mock = mockMatchMedia(false)
    try {
      const { result } = renderHook(() => useHighContrast())
      expect(result.current).toBe(false)
    } finally {
      mock.restore()
    }
  })

  it("returns true when forced-colors is active", () => {
    const mock = mockMatchMedia(true)
    try {
      const { result } = renderHook(() => useHighContrast())
      expect(result.current).toBe(true)
    } finally {
      mock.restore()
    }
  })
})

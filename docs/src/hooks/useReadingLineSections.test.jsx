import React from "react"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import useReadingLineSections, { sectionIndexAtReadingLine } from "./useReadingLineSections"

function section(top, bottom) {
  return { getBoundingClientRect: () => ({ top, bottom }) }
}

describe("useReadingLineSections", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("selects the section crossing the reading line", () => {
    const elements = new Map([
      ["one", section(-400, 200)],
      ["two", section(200, 900)],
      ["three", section(900, 1500)],
    ])
    expect(sectionIndexAtReadingLine(["one", "two", "three"], elements, 1000, 0.38)).toBe(1)
  })

  it("navigates immediately and uses reduced-motion scrolling", () => {
    const { result } = renderHook(() =>
      useReadingLineSections({ ids: ["one", "two"], enabled: false, reducedMotion: true }),
    )
    const scrollIntoView = vi.fn()
    const focus = vi.fn()
    act(() => result.current.registerSection("two", { scrollIntoView, focus }))
    act(() => result.current.navigateTo("two", { focus: false }))
    expect(result.current.activeId).toBe("two")
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" })
  })

  it("ignores stale observer updates until explicit navigation settles", () => {
    vi.useFakeTimers()
    let observerCallback
    const observe = vi.fn()
    const disconnect = vi.fn()
    class IntersectionObserverMock {
      constructor(callback) {
        observerCallback = callback
      }

      observe = observe
      disconnect = disconnect
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)

    const bounds = {
      one: { top: -200, bottom: 800 },
      two: { top: 900, bottom: 1600 },
    }
    const elements = Object.fromEntries(
      Object.entries(bounds).map(([id, rect]) => [id, {
        focus: vi.fn(),
        scrollIntoView: vi.fn(),
        getBoundingClientRect: () => rect,
      }]),
    )
    const { result, rerender } = renderHook(
      ({ enabled }) => useReadingLineSections({
        ids: ["one", "two"],
        enabled,
        readingLine: 0.4,
      }),
      { initialProps: { enabled: false } },
    )
    act(() => {
      result.current.registerSection("one", elements.one)
      result.current.registerSection("two", elements.two)
    })
    rerender({ enabled: true })

    act(() => result.current.navigateTo("two", { focus: false }))
    expect(result.current.activeId).toBe("two")

    // The old section still crosses the reading line during smooth scrolling.
    act(() => observerCallback([]))
    expect(result.current.activeId).toBe("two")

    // Once scrolling settles, ordinary observer-driven selection resumes.
    act(() => vi.advanceTimersByTime(500))
    act(() => observerCallback([]))
    expect(result.current.activeId).toBe("one")
    expect(disconnect).not.toHaveBeenCalled()
  })

  it("does not recreate the observer for equivalent threshold arrays", () => {
    const constructorSpy = vi.fn()
    class IntersectionObserverMock {
      constructor(...args) {
        constructorSpy(...args)
      }

      observe = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
    const element = {
      getBoundingClientRect: () => ({ top: -100, bottom: 900 }),
    }
    const { result, rerender } = renderHook(
      ({ enabled, renderNumber }) => {
        void renderNumber
        return useReadingLineSections({
          ids: ["one"],
          enabled,
          threshold: [0, 0.25, 0.5],
        })
      },
      { initialProps: { enabled: false, renderNumber: 0 } },
    )
    act(() => result.current.registerSection("one", element))
    rerender({ enabled: true, renderNumber: 1 })
    expect(constructorSpy).toHaveBeenCalledTimes(1)
    rerender({ enabled: true, renderNumber: 2 })
    expect(constructorSpy).toHaveBeenCalledTimes(1)
  })
})

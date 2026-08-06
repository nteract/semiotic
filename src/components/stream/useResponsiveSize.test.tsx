import React from "react"
import { act, render, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  resolveResponsiveDimension,
  useResponsiveSize,
} from "./useResponsiveSize"

let resizeCallback: ResizeObserverCallback | undefined

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback
  }
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

describe("useResponsiveSize", () => {
  beforeEach(() => {
    resizeCallback = undefined
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("clamps and buckets responsive dimensions deterministically", () => {
    expect(resolveResponsiveDimension(357.9, 320, 720, 20)).toBe(360)
    expect(resolveResponsiveDimension(100, 320, 720, 20)).toBe(320)
    expect(resolveResponsiveDimension(900, 320, 720, 20)).toBe(720)
    expect(resolveResponsiveDimension(Number.NaN, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it("keeps the base size for SSR and quantizes measured width", () => {
    function Harness() {
      const [ref, size] = useResponsiveSize([320, 200], true, false, {
        minWidth: 320,
        maxWidth: 720,
        widthStep: 20,
      })
      return <div ref={ref} data-testid="container" data-size={size.join("x")} />
    }

    render(<Harness />)

    expect(screen.getByTestId("container").dataset.size).toBe("320x200")

    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 357.9, height: 999 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
    })

    expect(screen.getByTestId("container").dataset.size).toBe("360x200")
  })

  it("does not require ResizeObserver during static rendering", () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const { result } = renderHook(() => useResponsiveSize([480, 240], true, true))
    expect(result.current[1]).toEqual([480, 240])
  })
})

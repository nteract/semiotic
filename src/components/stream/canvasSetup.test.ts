import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getDevicePixelRatio,
  subscribeToCanvasFontInvalidation,
  subscribeToDevicePixelRatioChange,
} from "./canvasSetup"

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, "matchMedia")
})

describe("canvas device pixel ratio", () => {
  it("notifies canvas subscribers when web fonts finish loading and cleans up", () => {
    const listeners = new Set<EventListenerOrEventListenerObject>()
    const fontSet = {
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "loadingdone") listeners.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "loadingdone") listeners.delete(listener)
      })
    }
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")
    Object.defineProperty(document, "fonts", { configurable: true, value: fontSet })
    const listener = vi.fn()
    const unsubscribe = subscribeToCanvasFontInvalidation(listener)

    try {
      for (const registered of listeners) {
        if (typeof registered === "function") registered(new Event("loadingdone"))
        else registered.handleEvent(new Event("loadingdone"))
      }
      expect(listener).toHaveBeenCalledTimes(1)
      unsubscribe()
      expect(listeners.size).toBe(0)
      expect(fontSet.removeEventListener).toHaveBeenCalledWith(
        "loadingdone",
        expect.any(Function)
      )
    } finally {
      unsubscribe()
      Object.defineProperty(
        document,
        "fonts",
        originalFonts || { configurable: true, value: undefined }
      )
    }
  })

  it("keeps the default desktop cap but accepts a consumer override", () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 4 })
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 })
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 })
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn((query: string) => ({
      matches: query === "(pointer: coarse)" ? false : true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) })

    expect(getDevicePixelRatio()).toBe(3)
    expect(getDevicePixelRatio(5)).toBe(4)
    expect(getDevicePixelRatio(2.5)).toBe(2.5)
  })

  it("caps oversized backing stores by area and physical dimension", () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 3 })
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 })
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 })
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) })

    expect(getDevicePixelRatio(undefined, [600, 400])).toBe(3)

    const tallDpr = getDevicePixelRatio(undefined, [496, 8793])
    expect(tallDpr).toBeCloseTo(Math.sqrt(8_388_608 / (496 * 8793)))
    expect(8793 * tallDpr).toBeLessThan(16_384)

    expect(getDevicePixelRatio(undefined, [100, 12_000])).toBeCloseTo(16_384 / 12_000)
  })

  it("re-arms the resolution query and notifies when effective DPR changes", async () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, writable: true, value: 2 })
    const queries: Array<{
      query: string
      change?: () => void
      removeEventListener: ReturnType<typeof vi.fn>
    }> = []

    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn((query: string) => {
      const record = { query, removeEventListener: vi.fn() } as (typeof queries)[number]
      queries.push(record)
      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
          record.change = listener as () => void
        },
        removeEventListener: record.removeEventListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    }) })

    const listener = vi.fn()
    const unsubscribe = subscribeToDevicePixelRatioChange(listener)
    expect(queries[0].query).toBe("(resolution: 2dppx)")

    window.devicePixelRatio = 4
    queries[0].change?.()
    await Promise.resolve()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(queries[0].removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
    expect(queries[1].query).toBe("(resolution: 4dppx)")

    unsubscribe()
    expect(queries[1].removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
  })
})

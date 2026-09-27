import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getDevicePixelRatio,
  subscribeToCanvasFontInvalidation,
  subscribeToDevicePixelRatioChange,
  syncCanvasSize,
} from "./canvasSetup"

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, "matchMedia")
})

describe("canvas device pixel ratio", () => {
  it("reports backing-store invalidation and retains fractional-DPR sizing", () => {
    const canvas = document.createElement("canvas")
    const width = vi.spyOn(canvas, "width", "set")
    const height = vi.spyOn(canvas, "height", "set")
    const first = syncCanvasSize(canvas, [301, 201], 1.5)
    expect(first).toEqual({ resized: true, effectiveDprX: 452 / 301, effectiveDprY: 302 / 201 })
    expect(syncCanvasSize(canvas, [301, 201], 1.5).resized).toBe(false)
    expect(width).toHaveBeenCalledTimes(1)
    expect(height).toHaveBeenCalledTimes(1)
    expect(syncCanvasSize(canvas, [301, 201], 2).resized).toBe(true)
    expect(canvas.width).toBe(602)
    expect(canvas.height).toBe(402)
  })

  it("reuses pointer queries and invalidates on viewport-cap and pointer changes", () => {
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 4 })
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1200 })
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 })
    const pointer = new EventTarget() as MediaQueryList
    Object.defineProperty(pointer, "matches", { configurable: true, writable: true, value: false })
    Object.defineProperty(pointer, "media", { value: "(pointer: coarse)" })
    const matchMedia = vi.fn((query: string) => query === pointer.media ? pointer : {
      media: query, addEventListener: vi.fn(), removeEventListener: vi.fn()
    })
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia })
    const listener = vi.fn()
    const unsubscribe = subscribeToDevicePixelRatioChange(listener)
    for (let i = 0; i < 10; i++) expect(getDevicePixelRatio()).toBe(3)
    expect(matchMedia.mock.calls.filter(([q]) => q === pointer.media)).toHaveLength(1)
    window.innerWidth = 700
    window.dispatchEvent(new Event("resize"))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getDevicePixelRatio()).toBe(2)
    window.innerWidth = 710
    window.dispatchEvent(new Event("resize"))
    expect(listener).toHaveBeenCalledTimes(1)
    window.innerWidth = 1200
    window.dispatchEvent(new Event("resize"))
    expect(listener).toHaveBeenCalledTimes(2)
    Object.defineProperty(pointer, "matches", { value: true })
    pointer.dispatchEvent(new Event("change"))
    expect(listener).toHaveBeenCalledTimes(3)
    expect(getDevicePixelRatio()).toBe(2)
    unsubscribe()
    Object.defineProperty(pointer, "matches", { value: false })
    pointer.dispatchEvent(new Event("change"))
    window.dispatchEvent(new Event("resize"))
    expect(listener).toHaveBeenCalledTimes(3)
  })
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
      const emptyLoad = Object.assign(new Event("loadingdone"), { fontfaces: [] })
      for (const registered of listeners) {
        if (typeof registered === "function") registered(emptyLoad)
        else registered.handleEvent(emptyLoad)
      }
      expect(listener).not.toHaveBeenCalled()
      for (const registered of listeners) {
        if (typeof registered === "function") registered(new Event("loadingdone"))
        else registered.handleEvent(new Event("loadingdone"))
      }
      expect(listener).toHaveBeenCalledTimes(1)
      const loaded = Object.assign(new Event("loadingdone"), { fontfaces: [{}] })
      for (const registered of listeners) {
        if (typeof registered === "function") registered(loaded)
        else registered.handleEvent(loaded)
      }
      expect(listener).toHaveBeenCalledTimes(2)
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

    const oversizedAreaDpr = getDevicePixelRatio(undefined, [4_000, 3_000])
    expect(oversizedAreaDpr).toBeLessThan(1)
    expect(oversizedAreaDpr).toBeCloseTo(Math.sqrt(8_388_608 / (4_000 * 3_000)))
    expect(4_000 * 3_000 * oversizedAreaDpr ** 2).toBeCloseTo(8_388_608)

    const oversizedDimensionDpr = getDevicePixelRatio(undefined, [100, 20_000])
    expect(oversizedDimensionDpr).toBeLessThan(1)
    expect(oversizedDimensionDpr).toBeCloseTo(16_384 / 20_000)
    expect(20_000 * oversizedDimensionDpr).toBeCloseTo(16_384)
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
    const rearmed = queries.find(q => q.query === "(resolution: 4dppx)")!
    expect(rearmed).toBeDefined()

    unsubscribe()
    expect(rearmed.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
  })
})

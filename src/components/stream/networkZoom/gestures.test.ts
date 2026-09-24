import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { bindNetworkZoom } from "./gestures"
import type { NetworkViewTransform } from "../networkViewportTypes"
import type { NetworkZoomOptions } from "./types"

describe("network pointer driver", () => {
  let element: HTMLDivElement
  let view: NetworkViewTransform
  let options: NetworkZoomOptions
  let driver: ReturnType<typeof bindNetworkZoom>
  const change = vi.fn()
  beforeEach(() => {
    vi.useFakeTimers()
    element = document.createElement("div")
    document.body.append(element)
    element.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300)
    const captures = new Set<number>()
    element.setPointerCapture = (id) => {
      captures.add(id)
    }
    element.releasePointerCapture = (id) => {
      captures.delete(id)
    }
    element.hasPointerCapture = (id) => captures.has(id)
    view = { x: 0, y: 0, k: 1 }
    options = { wheelZoom: true, duration: 0, settleDelay: 80 }
    change.mockReset()
    driver = bindNetworkZoom(element, {
      getZoom: () => view,
      getPlot: () => ({ x: 0, y: 0, width: 400, height: 300 }),
      getOptions: () => options,
      change: (next, event) => {
        view = next
        change(next, event)
      }
    })
  })
  afterEach(() => {
    driver.destroy()
    element.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  const pointer = (type: string, id: number, x: number, y: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, {
      pointerId: id,
      pointerType: "touch",
      button: 0,
      clientX: x,
      clientY: y
    })
    element.dispatchEvent(event)
  }
  it("coalesces wheel zoom around the cursor and emits one settled event", () => {
    options.duration = 180
    for (let i = 0; i < 3; i++)
      element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: -100,
          clientX: 100,
          clientY: 75,
          cancelable: true
        })
      )
    expect(change).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(view.k).toBeCloseTo(Math.exp(0.6))
    expect(view.x + 100 * view.k).toBeCloseTo(100)
    expect(view.y + 75 * view.k).toBeCloseTo(75)
    expect(change).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(
      change.mock.calls.filter((call) => call[1].phase === "idle")
    ).toHaveLength(1)
  })
  it.each([
    { direction: -1, ctrlKey: false },
    { direction: 1, ctrlKey: false },
    { direction: -1, ctrlKey: true },
    { direction: 1, ctrlKey: true }
  ])(
    "applies all wheel input each frame without catch-up (direction=$direction, ctrlKey=$ctrlKey)",
    ({ direction, ctrlKey }) => {
      options.duration = 180
      const requestFrame = window.requestAnimationFrame.bind(window)
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
        requestFrame((time) => callback(time - 8))
      )
      const initial = view.k
      for (let i = 0; i < 24; i++) {
        // Wheel input lands late in a frame, after its shared rAF timestamp.
        // A trackpad can deliver such input every frame.
        vi.advanceTimersByTime(12)
        element.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: direction * 8,
            ctrlKey,
            clientX: 100,
            clientY: 75,
            cancelable: true
          })
        )
        vi.advanceTimersByTime(4)
        expect(view.k).toBeCloseTo(
          Math.exp(-direction * (i + 1) * 8 * (ctrlKey ? 0.008 : 0.002)),
          12
        )
        expect(view.x + 100 * view.k).toBeCloseTo(100)
        expect(view.y + 75 * view.k).toBeCloseTo(75)
      }
      const released = { ...view }
      const movingCount = change.mock.calls.length
      vi.advanceTimersByTime(500)
      expect(view).toEqual(released)
      expect(
        change.mock.calls.filter((call) => call[1].phase === "moving")
      ).toHaveLength(movingCount)
      const moves = [
        initial,
        ...change.mock.calls
          .filter((call) => call[1].phase === "moving")
          .map((call) => call[0].k)
      ]
      for (let i = 1; i < moves.length; i++)
        expect((moves[i] - moves[i - 1]) * -direction).toBeGreaterThanOrEqual(
          -1e-12
        )
      expect(
        change.mock.calls.filter((call) => call[1].phase === "idle")
      ).toHaveLength(1)
    }
  )
  it("interrupts a control tween from the visible camera when wheel input begins", () => {
    options.duration = 180
    driver.zoomBy(4)
    vi.advanceTimersByTime(32)
    const visible = { ...view }
    expect(visible.k).toBeGreaterThan(1)
    expect(visible.k).toBeLessThan(4)
    element.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: 100,
        clientX: 200,
        clientY: 150,
        cancelable: true
      })
    )
    vi.advanceTimersByTime(16)
    expect(view.k).toBeCloseTo(visible.k * Math.exp(-0.2), 12)
    expect(view.x + 200 * view.k).toBeCloseTo(200)
    expect(view.y + 150 * view.k).toBeCloseTo(150)
    const released = { ...view }
    vi.advanceTimersByTime(500)
    expect(view).toEqual(released)
  })
  it("reverses wheel direction on the next frame and cancels opposing deltas within a frame", () => {
    options.duration = 500
    const wheel = (deltaY: number) =>
      element.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY,
          clientX: 100,
          clientY: 75,
          cancelable: true
        })
      )
    wheel(-20)
    wheel(20)
    vi.advanceTimersByTime(16)
    expect(view).toEqual({ x: 0, y: 0, k: 1 })
    expect(change).not.toHaveBeenCalled()
    wheel(-10)
    vi.advanceTimersByTime(16)
    expect(view.k).toBeCloseTo(Math.exp(0.02), 12)
    wheel(5)
    vi.advanceTimersByTime(16)
    expect(view.k).toBeCloseTo(Math.exp(0.01), 12)
    expect(view.x + 100 * view.k).toBeCloseTo(100)
    expect(view.y + 75 * view.k).toBeCloseTo(75)
  })
  it.each(["control", "keyboard", "fit", "reset"] as const)(
    "keeps %s tweens within their endpoints with an older frame timestamp",
    (source) => {
      options.duration = 180
      const requestFrame = window.requestAnimationFrame.bind(window)
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
        requestFrame((time) => callback(time - 8))
      )
      vi.advanceTimersByTime(12)
      driver.moveTo({ x: -100, y: -75, k: 2 }, source)
      vi.advanceTimersByTime(4)
      expect(view.k).toBeGreaterThan(1)
      expect(view.k).toBeLessThan(2)
      vi.advanceTimersByTime(500)
      expect(view).toEqual({ x: -100, y: -75, k: 2 })
      for (const [next] of change.mock.calls) {
        expect(next.k).toBeGreaterThanOrEqual(1)
        expect(next.k).toBeLessThanOrEqual(2)
        expect(next.x).toBeGreaterThanOrEqual(-100)
        expect(next.x).toBeLessThanOrEqual(0)
        expect(next.y).toBeGreaterThanOrEqual(-75)
        expect(next.y).toBeLessThanOrEqual(0)
      }
      expect(change.mock.lastCall?.[1]).toEqual({ source, phase: "idle" })
    }
  )
  it("pinches around the midpoint and transitions to one-pointer pan without a jump", () => {
    pointer("pointerdown", 1, 100, 100)
    pointer("pointerdown", 2, 200, 100)
    pointer("pointermove", 2, 300, 100)
    vi.advanceTimersByTime(20)
    expect(view).toEqual({ k: 2, x: -100, y: -100 })
    pointer("pointerup", 2, 300, 100)
    pointer("pointermove", 1, 120, 110)
    vi.advanceTimersByTime(20)
    expect(view).toEqual({ k: 2, x: -80, y: -90 })
    pointer("pointercancel", 1, 120, 110)
    vi.advanceTimersByTime(100)
    expect(change.mock.lastCall?.[1].phase).toBe("idle")
    expect(element.hasPointerCapture(1)).toBe(false)
  })
  it("leaves inputs and unmodified cooperative wheels alone, and suppresses a drag click", () => {
    options.wheelZoom = "modifier"
    const wheel = new WheelEvent("wheel", {
      deltaY: -50,
      clientX: 100,
      clientY: 100,
      cancelable: true
    })
    element.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(false)
    const input = document.createElement("input")
    element.append(input)
    input.dispatchEvent(
      new WheelEvent("wheel", { bubbles: true, deltaY: -50, ctrlKey: true })
    )
    vi.advanceTimersByTime(100)
    expect(view.k).toBe(1)
    pointer("pointerdown", 1, 50, 50)
    pointer("pointermove", 1, 100, 80)
    pointer("pointerup", 1, 100, 80)
    vi.advanceTimersByTime(20)
    const click = new MouseEvent("click", { bubbles: true, cancelable: true })
    element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
  })
  it("locks all imperative and gesture movement and cleans up pending work on disposal", () => {
    options.locked = true
    driver.zoomBy(2)
    driver.panBy(30, 40)
    vi.advanceTimersByTime(200)
    expect(view).toEqual({ x: 0, y: 0, k: 1 })
    options.locked = false
    driver.zoomBy(2)
    driver.destroy()
    vi.advanceTimersByTime(200)
    expect(change).not.toHaveBeenCalled()
  })
  it.each(["cancel", "destroy"] as const)(
    "does not resume a tween when its host calls %s during a camera update",
    (action) => {
      options.duration = 180
      change.mockImplementationOnce(() => driver[action]())
      driver.zoomBy(2)
      vi.advanceTimersByTime(16)
      const stopped = { ...view }
      vi.advanceTimersByTime(500)
      expect(view).toEqual(stopped)
      expect(
        change.mock.calls.filter((call) => call[1].phase === "moving")
      ).toHaveLength(1)
      expect(vi.getTimerCount()).toBe(0)
    }
  )
  it("respects reduced motion and leaves browser keyboard zoom and editors alone", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }))
    )
    options.duration = 500
    driver.zoomBy(2)
    vi.advanceTimersByTime(20)
    expect(view.k).toBe(2)
    const browserZoom = new KeyboardEvent("keydown", {
      key: "+",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    })
    element.dispatchEvent(browserZoom)
    expect(browserZoom.defaultPrevented).toBe(false)
    const input = document.createElement("input")
    element.append(input)
    const edit = new KeyboardEvent("keydown", {
      key: "-",
      bubbles: true,
      cancelable: true
    })
    input.dispatchEvent(edit)
    expect(edit.defaultPrevented).toBe(false)
    vi.advanceTimersByTime(200)
    expect(view.k).toBe(2)
  })
})

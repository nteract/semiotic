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
  const commit = vi.fn()
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
    commit.mockReset()
    driver = bindNetworkZoom(element, {
      getZoom: () => view,
      getPlot: () => ({ x: 0, y: 0, width: 400, height: 300 }),
      getOptions: () => options,
      change: (next, event) => {
        view = next
        change(next, event)
      },
      commit: (next, event) => {
        view = next
        commit(next, event)
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
  it.each(["pointerup", "pointercancel", "cancel", "destroy"])(
    "captures the original mark and releases it on %s",
    (end) => {
      const canvas = document.createElement("canvas")
      element.append(canvas)
      const held = new Set<number>()
      canvas.setPointerCapture = vi.fn((id) => {
        held.add(id)
      })
      canvas.hasPointerCapture = (id) => held.has(id)
      canvas.releasePointerCapture = vi.fn((id) => {
        held.delete(id)
      })
      const event = new Event("pointerdown", {
        bubbles: true,
        cancelable: true
      })
      Object.assign(event, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        clientX: 50,
        clientY: 50
      })
      canvas.dispatchEvent(event)
      expect(canvas.setPointerCapture).toHaveBeenCalledWith(1)
      expect(element.hasPointerCapture(1)).toBe(false)
      if (end === "cancel" || end === "destroy") driver[end]()
      else pointer(end, 1, 50, 50)
      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1)
      expect(held.size).toBe(0)
      expect(change).not.toHaveBeenCalled()
    }
  )
  it.each(["mouse", "touch", "pen"])(
    "only cancels mouse selection, preserving %s tap defaults",
    (pointerType) => {
      const event = new Event("pointerdown", {
        bubbles: true,
        cancelable: true
      })
      Object.assign(event, {
        pointerId: 1,
        pointerType,
        button: 0,
        clientX: 50,
        clientY: 50
      })
      element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(pointerType === "mouse")
    }
  )
  it("locks all imperative and gesture movement and cleans up pending work on disposal", () => {
    options.locked = true
    driver.zoomBy(2)
    driver.panBy(30, 40)
    vi.advanceTimersByTime(200)
    expect(view).toEqual({ x: 0, y: 0, k: 1 })
    options.locked = false
    options.duration = 180
    driver.zoomBy(2)
    driver.destroy()
    vi.advanceTimersByTime(200)
    expect(change).not.toHaveBeenCalled()
  })
  it("applies zero-duration programmatic moves in a microtask and keeps input on frames", async () => {
    driver.moveTo({ x: -40, y: -30, k: 2 }, "control", 0)
    driver.panBy(10, 0)
    expect(change).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(view).toEqual({ x: -30, y: -30, k: 2 })
    expect(change).toHaveBeenCalledOnce()
    expect(change).toHaveBeenLastCalledWith(view, { source: "control", phase: "moving" })

    driver.moveTo({ x: 10, y: 5, k: 2 }, "anchor", 0)
    driver.cancel()
    await Promise.resolve()
    expect(view).toEqual({ x: -30, y: -30, k: 2 })
    driver.moveTo({ x: 10, y: 5, k: 2 }, "anchor", 0)
    await Promise.resolve()
    expect(view).toEqual({ x: 10, y: 5, k: 2 })
    vi.advanceTimersByTime(100)
    expect(change).toHaveBeenLastCalledWith(view, { source: "anchor", phase: "idle" })

    change.mockClear()
    driver.panBy(30, 0, "keyboard")
    await Promise.resolve()
    expect(change).not.toHaveBeenCalled()
    vi.advanceTimersByTime(16)
    expect(view).toEqual({ x: 40, y: 5, k: 2 })
  })
  it("applies a commit move at once through the host's commit path, then settles", () => {
    driver.jumpTo({ x: -40, y: -30, k: 2 }, "control")
    expect(view).toEqual({ x: -40, y: -30, k: 2 })
    expect(commit).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenLastCalledWith(view, { source: "control", phase: "moving" })
    expect(change).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(change).toHaveBeenLastCalledWith(view, { source: "control", phase: "idle" })
    // Bounds, locks and a move already in flight apply as for any move.
    options.maxZoom = 1.5
    driver.jumpTo({ x: 0, y: 0, k: 4 }, "anchor")
    expect(view).toEqual({ x: 0, y: 0, k: 1.5 })
    expect(commit).toHaveBeenLastCalledWith(view, { source: "anchor", phase: "moving" })
    driver.jumpTo({ x: 0, y: 0, k: 1.5 }, "anchor")
    expect(commit).toHaveBeenCalledTimes(2)
    options.duration = 180
    driver.moveTo({ x: -100, y: 0, k: 1 }, "fit")
    driver.jumpTo({ x: 10, y: 20, k: 1 }, "control")
    vi.advanceTimersByTime(300)
    expect(view).toEqual({ x: 10, y: 20, k: 1 })
    options.locked = true
    driver.jumpTo({ x: 0, y: 0, k: 1 }, "control")
    expect(view).toEqual({ x: 10, y: 20, k: 1 })
  })
  it("re-clamps a move in flight to changed bounds instead of cancelling it", async () => {
    driver.moveTo({ x: -20, y: -10, k: 4 }, "control", 0)
    options.maxZoom = 2
    driver.rebound()
    await Promise.resolve()
    expect(view).toEqual({ x: -20, y: -10, k: 2 })
    options.duration = 180
    options.maxZoom = 8
    driver.moveTo({ x: -300, y: -10, k: 4 }, "fit")
    vi.advanceTimersByTime(16)
    const visible = { ...view }
    expect(visible.k).toBeGreaterThan(2)
    expect(visible.k).toBeLessThan(3)
    options.maxZoom = 3
    driver.rebound()
    vi.advanceTimersByTime(16)
    // The tween carries on from the visible camera toward the clamped destination.
    expect(view.k).toBeGreaterThan(visible.k)
    expect(view.k).toBeLessThan(3)
    expect(view.x).toBeLessThan(visible.x)
    vi.advanceTimersByTime(500)
    expect(view).toEqual({ x: -300, y: -10, k: 3 })
    expect(change.mock.lastCall?.[1]).toEqual({ source: "fit", phase: "idle" })
    change.mockClear()
    driver.rebound()
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
  it.each([undefined, true, { arrowKeys: "navigate" }, false] as const)(
    "preserves ordinary arrow navigation with keyboard=%j",
    (keyboard) => {
      options.keyboard = keyboard
      const navigation = vi.fn()
      const frame = document.createElement("div")
      frame.addEventListener("keydown", navigation)
      element.append(frame)
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })
      frame.dispatchEvent(event)
      vi.advanceTimersByTime(20)
      expect(event.defaultPrevented).toBe(false)
      expect(navigation).toHaveBeenCalledOnce()
      expect(view).toEqual({ x: 0, y: 0, k: 1 })
    }
  )
  it.each([0.5, 2])("opts ordinary arrows into screen-pixel pan at scale %s", (k) => {
    options.keyboard = { arrowKeys: "pan" }
    view = { x: 0, y: 0, k }
    const frame = document.createElement("div")
    const navigation = vi.fn()
    frame.addEventListener("keydown", navigation)
    element.append(frame)
    for (const [key, x, y] of [
      ["ArrowRight", -60, 0], ["ArrowDown", -60, -60],
      ["ArrowLeft", 0, -60], ["ArrowUp", 0, 0]
    ] as const) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
      frame.dispatchEvent(event)
      vi.advanceTimersByTime(20)
      expect(event.defaultPrevented).toBe(true)
      expect(view).toEqual({ x, y, k })
    }
    expect(navigation).not.toHaveBeenCalled()
    expect(change.mock.calls.every(([, event]) => event.source === "keyboard")).toBe(true)
  })
  it("reads keyboard policy changes and preserves Alt pan, axis limits and browser shortcuts", () => {
    const press = (key: string, modifiers: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...modifiers })
      element.dispatchEvent(event)
      vi.advanceTimersByTime(20)
      return event
    }
    expect(press("ArrowRight", { altKey: true }).defaultPrevented).toBe(true)
    expect(view.x).toBe(-60)
    options.keyboard = { arrowKeys: "pan" }
    options.pan = "x"
    press("ArrowDown")
    expect(view.y).toBe(0)
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }])
      expect(press("ArrowRight", modifier).defaultPrevented).toBe(false)
    expect(view.x).toBe(-60)
    options.keyboard = { arrowKeys: "navigate" }
    expect(press("ArrowRight").defaultPrevented).toBe(false)
    options.keyboard = false
    expect(press("ArrowRight", { altKey: true }).defaultPrevented).toBe(false)
    expect(press("+").defaultPrevented).toBe(false)
    expect(view).toEqual({ x: -60, y: 0, k: 1 })
  })
  it("respects reduced motion and leaves browser keyboard zoom and editors alone", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }))
    )
    options.duration = 500
    options.keyboard = { arrowKeys: "pan" }
    driver.zoomBy(2)
    await vi.advanceTimersByTimeAsync(20)
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
    const editArrow = new KeyboardEvent("keydown", {
      key: "ArrowRight", bubbles: true, cancelable: true
    })
    input.dispatchEvent(editArrow)
    expect(editArrow.defaultPrevented).toBe(false)
    vi.advanceTimersByTime(200)
    expect(view.k).toBe(2)
  })
})

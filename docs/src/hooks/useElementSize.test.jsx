import React from "react"
import { act, render, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import useElementSize from "./useElementSize"

describe("useElementSize", () => {
  let observerCallback
  let disconnect
  let observe
  let bounds

  beforeEach(() => {
    observerCallback = null
    disconnect = vi.fn()
    observe = vi.fn()
    bounds = { width: 120, height: 48 }
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
      ...bounds,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: bounds.width,
      bottom: bounds.height,
      toJSON: () => ({}),
    }))
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback) {
        observerCallback = callback
      }

      observe(element) {
        observe(element)
      }

      disconnect() {
        disconnect()
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("keeps the deterministic initial size while no element is attached", () => {
    const { result } = renderHook(() => useElementSize({ width: 77, height: 31 }))
    expect(result.current[1]).toEqual({ width: 77, height: 31 })
  })

  it("measures updates, preserves unchanged identity, and disconnects", () => {
    let latest
    function Probe() {
      const [ref, size] = useElementSize({ width: 1, height: 1 })
      latest = size
      return <div ref={ref} />
    }

    const view = render(<Probe />)
    expect(latest).toEqual({ width: 120, height: 48 })
    expect(observe).toHaveBeenCalledWith(view.container.firstElementChild)
    const measured = latest

    act(() => observerCallback([]))
    expect(latest).toBe(measured)

    bounds = { width: 240.126, height: 80.555 }
    act(() => observerCallback([]))
    expect(latest).toEqual({ width: 240.13, height: 80.56 })

    view.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it("observes elements that mount later and follows ref replacements", () => {
    let latest
    function Probe({ mounted, version }) {
      const [ref, size] = useElementSize({ width: 7, height: 9 })
      latest = size
      return mounted ? <div key={version} ref={ref} /> : null
    }

    const view = render(<Probe mounted={false} version={1} />)
    expect(latest).toEqual({ width: 7, height: 9 })

    bounds = { width: 140, height: 52 }
    view.rerender(<Probe mounted version={1} />)
    expect(latest).toEqual({ width: 140, height: 52 })

    bounds = { width: 180, height: 64 }
    view.rerender(<Probe mounted version={2} />)
    expect(latest).toEqual({ width: 180, height: 64 })
    expect(disconnect).toHaveBeenCalledOnce()

    view.unmount()
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it("falls back to window resize events when ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined)
    const add = vi.spyOn(window, "addEventListener")
    const remove = vi.spyOn(window, "removeEventListener")

    let latest
    function Probe() {
      const [ref, size] = useElementSize()
      latest = size
      return <div ref={ref} />
    }

    const view = render(<Probe />)
    expect(add).toHaveBeenCalledWith("resize", expect.any(Function))
    const listener = add.mock.calls.find(([name]) => name === "resize")[1]
    bounds = { width: 260, height: 96 }
    act(() => window.dispatchEvent(new Event("resize")))
    expect(latest).toEqual({ width: 260, height: 96 })
    view.unmount()
    expect(remove).toHaveBeenCalledWith("resize", listener)
  })
})

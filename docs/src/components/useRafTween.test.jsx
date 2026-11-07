import React from "react"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useRafTween } from "./useRafTween"

afterEach(() => vi.useRealTimers())

describe("docs tween lifecycle", () => {
  it("skips initial mount in Strict Mode and cancels queued work on unmount", () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    const onFrame = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ trigger }) => useRafTween({ trigger, onStart, onFrame }),
      { initialProps: { trigger: 0 }, wrapper: React.StrictMode },
    )
    expect(onStart).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    rerender({ trigger: 1 })
    act(() => vi.advanceTimersToNextFrame())
    expect(onFrame).toHaveBeenCalledOnce()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("does not schedule continuation after the frame callback unmounts its owner", () => {
    vi.useFakeTimers()
    const onFrame = vi.fn(() => unmount())
    const { rerender, unmount } = renderHook(({ trigger }) => useRafTween({ trigger, onFrame }), {
      initialProps: { trigger: 0 },
    })
    rerender({ trigger: 1 })
    act(() => vi.advanceTimersToNextFrame())
    expect(onFrame).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("replaces an interrupted tween and reaches the final value once", () => {
    vi.useFakeTimers()
    const onFrame = vi.fn()
    const { rerender } = renderHook(
      ({ trigger }) => useRafTween({ trigger, duration: 32, onStart: () => trigger, onFrame }),
      { initialProps: { trigger: 0 } },
    )
    rerender({ trigger: 1 })
    rerender({ trigger: 2 })
    act(() => vi.advanceTimersByTime(48))
    expect(onFrame).not.toHaveBeenCalledWith(expect.anything(), 1)
    expect(onFrame.mock.calls.filter(([progress]) => progress === 1)).toEqual([[1, 2]])
    expect(vi.getTimerCount()).toBe(0)
  })
})

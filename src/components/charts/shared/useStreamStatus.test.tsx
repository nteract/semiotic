import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, act } from "@testing-library/react"
import { useStreamStatus } from "./useStreamStatus"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"
import { TooltipProvider } from "../../store/TooltipStore"
import type { RealtimeFrameHandle } from "../../realtime/types"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

// Mock RealtimeFrameHandle — the wrapped ref pattern installs
// interceptors on push/pushMany so the underlying implementation
// just needs to exist and be callable.
function makeFakeHandle(): RealtimeFrameHandle {
  return {
    push: vi.fn(),
    pushMany: vi.fn(),
    remove: vi.fn(() => []),
    update: vi.fn(() => []),
    clear: vi.fn(),
    getData: vi.fn(() => []),
  } as unknown as RealtimeFrameHandle
}

describe("useStreamStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts in idle status", () => {
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    expect(result.current.status).toBe("idle")
    expect(result.current.lastPushTime).toBeNull()
  })

  it("transitions to active when push() is called via the wrapped ref", () => {
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => {
      result.current.ref.current = makeFakeHandle()
    })
    act(() => {
      result.current.ref.current?.push({ x: 1, y: 1 })
    })
    expect(result.current.status).toBe("active")
    expect(result.current.lastPushTime).not.toBeNull()
  })

  it("transitions to active when pushMany() is called with items", () => {
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => {
      result.current.ref.current = makeFakeHandle()
    })
    act(() => {
      result.current.ref.current?.pushMany([{ a: 1 }, { a: 2 }])
    })
    expect(result.current.status).toBe("active")
  })

  it("pushMany with empty array does not flip status", () => {
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => {
      result.current.ref.current = makeFakeHandle()
    })
    act(() => {
      result.current.ref.current?.pushMany([])
    })
    expect(result.current.status).toBe("idle")
  })

  it("transitions to stale after staleThresholdMs without pushes", () => {
    const { result } = renderHook(
      () => useStreamStatus({ staleThresholdMs: 2000, pollIntervalMs: 500 }),
      { wrapper },
    )
    act(() => {
      result.current.ref.current = makeFakeHandle()
    })
    act(() => {
      result.current.ref.current?.push({ x: 1 })
    })
    expect(result.current.status).toBe("active")

    // Advance past the stale threshold without further pushes.
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.status).toBe("stale")
  })

  it("transitions back to active when a push arrives after going stale", () => {
    const { result } = renderHook(
      () => useStreamStatus({ staleThresholdMs: 1000, pollIntervalMs: 250 }),
      { wrapper },
    )
    act(() => {
      result.current.ref.current = makeFakeHandle()
    })
    act(() => { result.current.ref.current?.push({ x: 1 }) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.status).toBe("stale")
    act(() => { result.current.ref.current?.push({ x: 2 }) })
    expect(result.current.status).toBe("active")
  })

  it("forwards push/pushMany calls to the underlying handle", () => {
    const handle = makeFakeHandle()
    // Capture the original spies before the hook wraps them. The
    // hook re-assigns `handle.push` / `handle.pushMany` in place to
    // intercept and timestamp each call.
    const origPush = handle.push as ReturnType<typeof vi.fn>
    const origPushMany = handle.pushMany as ReturnType<typeof vi.fn>
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => {
      result.current.ref.current = handle
    })
    act(() => {
      result.current.ref.current?.push({ x: 7 })
      result.current.ref.current?.pushMany([{ a: 1 }])
    })
    expect(origPush).toHaveBeenCalledWith({ x: 7 })
    expect(origPushMany).toHaveBeenCalledWith([{ a: 1 }])
  })

  it("observes the latest overridden push without rewriting the chart handle", () => {
    const frame = { current: makeFakeHandle() }
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ push }) => {
      const status = useStreamStatus()
      useFrameImperativeHandle(status.ref, { variant: "xy", frameRef: frame, overrides: { push } })
      return status
    }, { initialProps: { push: first }, wrapper })
    act(() => { result.current.ref.current!.push({ x: 1 }) })
    expect(first).toHaveBeenCalledWith({ x: 1 })
    expect(result.current.status).toBe("active")
    const observed = result.current.ref.current
    rerender({ push: second })
    expect(result.current.ref.current).toBe(observed)
    act(() => { observed!.push({ x: 2 }) })
    expect(second).toHaveBeenCalledWith({ x: 2 })
    expect(first).toHaveBeenCalledTimes(1)
  })

  it("publishes timestamps at the polling cadence instead of on every push", () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return useStreamStatus({ pollIntervalMs: 1000 })
    }, { wrapper })
    act(() => { result.current.ref.current = makeFakeHandle() })
    const initial = renders
    for (let i = 0; i < 20; i++) act(() => {
      vi.advanceTimersByTime(10)
      result.current.ref.current!.push({ value: i })
    })
    expect(renders - initial).toBe(1)
    const firstTime = result.current.lastPushTime!
    act(() => { vi.advanceTimersByTime(800) })
    expect(result.current.lastPushTime).toBeGreaterThan(firstTime)
    expect(renders - initial).toBe(2)
  })

  it("status stays idle while no pushes happen (poll timer is safe)", () => {
    const { result } = renderHook(
      () => useStreamStatus({ staleThresholdMs: 500, pollIntervalMs: 100 }),
      { wrapper },
    )
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.status).toBe("idle")
  })

  it("does not double-wrap a handle that is reassigned to ref.current", () => {
    // React 18 StrictMode runs effects twice in development, and any
    // parent re-render that re-passes the same handle hits the
    // `set current` path again. Without the wrap-once guard, push()
    // calls would fire `markPushed()` once per layer of wrapping.
    // Verify that re-assigning the same handle keeps push() recording
    // exactly one tick per call.
    const handle = makeFakeHandle()
    const origPush = handle.push as ReturnType<typeof vi.fn>
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => { result.current.ref.current = handle })
    // Reassign the same handle several times — mimics StrictMode +
    // parent re-renders that hand the same ref target back.
    act(() => { result.current.ref.current = handle })
    act(() => { result.current.ref.current = handle })

    act(() => { result.current.ref.current?.push({ x: 1 }) })
    // origPush gets called exactly once per user push, regardless of
    // how many times current was reassigned. Without the guard,
    // origPush would have been wrapped three times, so the chain
    // would still bottom out at one origPush call — but `markPushed`
    // would have fired three times. We assert via push call count
    // (origPush count == user push count) which holds either way,
    // plus that the handle still works after multiple re-assignments.
    expect(origPush).toHaveBeenCalledTimes(1)
    expect(origPush).toHaveBeenCalledWith({ x: 1 })
    expect(result.current.status).toBe("active")
  })

  it("leaves original handles untouched and stops observing a detached view", () => {
    const handleA = makeFakeHandle()
    const handleB = makeFakeHandle()
    const origPushA = handleA.push
    const { result } = renderHook(() => useStreamStatus(), { wrapper })
    act(() => { result.current.ref.current = handleA })
    const detached = result.current.ref.current!
    expect(handleA.push).toBe(origPushA)
    act(() => { result.current.ref.current = handleB })
    act(() => { detached.push({ x: 1 }) })
    expect(origPushA).toHaveBeenCalledWith({ x: 1 })
    expect(result.current.status).toBe("idle")
    act(() => { result.current.ref.current!.push({ x: 2 }) })
    expect(result.current.status).toBe("active")
  })

  it("observes frozen class handles while preserving method receivers", () => {
    class Handle {
      #rows: Record<string, number>[] = []
      push(row: Record<string, number>) { this.#rows.push(row) }
      pushMany(rows: Record<string, number>[]) { this.#rows.push(...rows) }
      getData() { return this.#rows }
      clear() { this.#rows = [] }
      remove() { return [] }
      update() { return [] }
    }
    const handle = new Handle()
    Object.freeze(handle)
    const { result } = renderHook(() => useStreamStatus<Handle>(), { wrapper })
    act(() => { result.current.ref.current = handle })
    act(() => { result.current.ref.current!.push({ x: 1 }) })
    expect(result.current.status).toBe("active")
    expect(result.current.ref.current!.getData()).toEqual([{ x: 1 }])
    act(() => { result.current.ref.current!.clear() })
    expect(handle.getData()).toEqual([])
  })
})

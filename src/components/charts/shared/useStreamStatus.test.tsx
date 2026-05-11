import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, act } from "@testing-library/react"
import { useStreamStatus } from "./useStreamStatus"
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

  it("status stays idle while no pushes happen (poll timer is safe)", () => {
    const { result } = renderHook(
      () => useStreamStatus({ staleThresholdMs: 500, pollIntervalMs: 100 }),
      { wrapper },
    )
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.status).toBe("idle")
  })
})

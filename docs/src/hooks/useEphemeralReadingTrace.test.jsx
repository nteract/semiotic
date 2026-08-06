import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import useEphemeralReadingTrace from "./useEphemeralReadingTrace"

describe("useEphemeralReadingTrace", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    delete document.hidden
    vi.useRealTimers()
  })

  it("collects only after consent and deletes the trace on disable", () => {
    const { result, rerender } = renderHook(
      ({ enabled, activeSection }) => useEphemeralReadingTrace({
        enabled,
        activeSection,
        sectionOrder: ["one", "two"],
        tickMs: 100,
      }),
      { initialProps: { enabled: false, activeSection: "one" } },
    )
    expect(result.current.trace.startedAt).toBeNull()

    rerender({ enabled: true, activeSection: "one" })
    expect(result.current.trace.visits.one).toBe(1)
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.trace.dwell.one).toBeGreaterThanOrEqual(0)

    rerender({ enabled: false, activeSection: "one" })
    expect(result.current.trace).toMatchObject({
      dwell: {},
      visits: {},
      transitions: [],
      startedAt: null,
    })
  })

  it("keeps transitions bounded and records ordered backtracking", () => {
    const { result, rerender } = renderHook(
      ({ activeSection }) => useEphemeralReadingTrace({
        enabled: true,
        activeSection,
        sectionOrder: ["one", "two", "three"],
        maxTransitions: 2,
      }),
      { initialProps: { activeSection: "one" } },
    )
    rerender({ activeSection: "two" })
    rerender({ activeSection: "three" })
    rerender({ activeSection: "one" })
    expect(result.current.trace.transitions).toHaveLength(2)
    expect(result.current.trace.backtracks).toBe(1)
  })

  it("supports disabling transition retention", () => {
    const { result, rerender } = renderHook(
      ({ activeSection }) => useEphemeralReadingTrace({
        enabled: true,
        activeSection,
        maxTransitions: 0,
      }),
      { initialProps: { activeSection: "one" } },
    )
    rerender({ activeSection: "two" })
    expect(result.current.trace.transitions).toEqual([])
  })

  it("does not count a hidden interval shorter than its timer cadence", () => {
    let hidden = false
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    })
    const { result } = renderHook(() => useEphemeralReadingTrace({
      enabled: true,
      activeSection: "one",
      tickMs: 100,
    }))
    act(() => vi.advanceTimersByTime(20))
    hidden = true
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    act(() => vi.advanceTimersByTime(40))
    hidden = false
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    act(() => vi.advanceTimersByTime(40))

    expect(result.current.trace.dwell.one).toBeGreaterThanOrEqual(50)
    expect(result.current.trace.dwell.one).toBeLessThan(90)
  })
})

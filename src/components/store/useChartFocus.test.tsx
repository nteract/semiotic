import React from "react"
import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useChartFocus } from "./useChartFocus"
import { ObservationProvider, useObservationSelector } from "./ObservationStore"
import type { ChartObservation, ObservationStoreState } from "./ObservationStore"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ObservationProvider>{children}</ObservationProvider>
)

function makeHover(overrides: Partial<ChartObservation> = {}): ChartObservation {
  return {
    type: "hover",
    datum: { month: 4, revenue: 32 },
    x: 100,
    y: 200,
    timestamp: Date.now(),
    chartType: "line",
    ...overrides,
  } as ChartObservation
}

function makeHoverEnd(overrides: Partial<ChartObservation> = {}): ChartObservation {
  return {
    type: "hover-end",
    timestamp: Date.now(),
    chartType: "line",
    ...overrides,
  } as ChartObservation
}

function useFocusWithPush(options?: Parameters<typeof useChartFocus>[0]) {
  const focus = useChartFocus(options)
  const push = useObservationSelector((s: ObservationStoreState) => s.pushObservation)
  return { focus, push }
}

describe("useChartFocus", () => {
  it("returns null with no observations", () => {
    const { result } = renderHook(() => useChartFocus(), { wrapper })
    expect(result.current).toBeNull()
  })

  it("converts the latest hover into a focus object", () => {
    const { result } = renderHook(() => useFocusWithPush(), { wrapper })
    act(() => {
      result.current.push(makeHover())
    })
    expect(result.current.focus).toEqual({
      datum: { month: 4, revenue: 32 },
      x: 100,
      y: 200,
      source: "hover",
    })
  })

  it("clears focus on hover-end", () => {
    const { result } = renderHook(() => useFocusWithPush(), { wrapper })
    act(() => {
      result.current.push(makeHover({ timestamp: 1 }))
      result.current.push(makeHoverEnd({ timestamp: 2 }))
    })
    expect(result.current.focus).toBeNull()
  })

  it("respects type filter — click-only mode ignores hovers", () => {
    const { result } = renderHook(() => useFocusWithPush({ types: ["click"] }), { wrapper })
    act(() => {
      result.current.push(makeHover())
    })
    expect(result.current.focus).toBeNull()
  })

  it("filters by chartId when set", () => {
    const { result } = renderHook(
      () => useFocusWithPush({ chartId: "chartA" }),
      { wrapper },
    )
    act(() => {
      result.current.push(makeHover({ chartId: "chartB" }))
    })
    expect(result.current.focus).toBeNull()

    act(() => {
      result.current.push(makeHover({ chartId: "chartA", datum: { id: 1 } }))
    })
    expect(result.current.focus?.datum).toEqual({ id: 1 })
  })

  it("does not error when latest observation has no datum", () => {
    const { result } = renderHook(() => useFocusWithPush(), { wrapper })
    act(() => {
      result.current.push({
        type: "hover",
        timestamp: Date.now(),
        chartType: "line",
        // no datum
      } as ChartObservation)
    })
    expect(result.current.focus).toBeNull()
  })
})

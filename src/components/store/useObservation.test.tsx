import React from "react"
import { vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useChartObserver } from "./useObservation"
import { ObservationProvider, useObservationSelector } from "./ObservationStore"
import type { ChartObservation, ObservationStoreState } from "./ObservationStore"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ObservationProvider>{children}</ObservationProvider>
)

function makeHover(overrides: Partial<ChartObservation> = {}): ChartObservation {
  return {
    type: "hover",
    datum: { x: 1, y: 2 },
    x: 100,
    y: 200,
    timestamp: Date.now(),
    chartType: "line",
    ...overrides
  } as ChartObservation
}

function makeClick(overrides: Partial<ChartObservation> = {}): ChartObservation {
  return {
    type: "click",
    datum: { value: 42 },
    x: 150,
    y: 250,
    timestamp: Date.now(),
    chartType: "bar",
    ...overrides
  } as ChartObservation
}

/**
 * Helper that renders useChartObserver alongside a push function
 * so we can push observations within the same provider context.
 */
function useObserverWithPush(options?: Parameters<typeof useChartObserver>[0]) {
  const observer = useChartObserver(options)
  const push = useObservationSelector((s: ObservationStoreState) => s.pushObservation)
  return { ...observer, push }
}

describe("useChartObserver", () => {
  it("publishes stable snapshots that update memoized consumers without changing earlier snapshots", () => {
    const observed = vi.fn<(snapshot: ChartObservation[]) => void>()
    const { result, rerender } = renderHook(() => {
      const observer = useObserverWithPush()
      const count = React.useMemo(() => observer.observations.length, [observer.observations])
      React.useEffect(() => { observed(observer.observations) }, [observer.observations])
      return { ...observer, count }
    }, { wrapper })
    const empty = result.current.observations
    const first = makeHover({ timestamp: 1 })
    act(() => result.current.push(first))
    const one = result.current.observations
    act(() => result.current.push(makeClick({ timestamp: 2 })))
    const two = result.current.observations

    expect(empty).toEqual([])
    expect(one).toEqual([first])
    expect(two).not.toBe(one)
    expect(result.current.count).toBe(2)
    expect(observed.mock.calls.map(([snapshot]) => snapshot.length)).toEqual([0, 1, 2])
    rerender()
    expect(result.current.observations).toBe(two)

    act(() => {
      for (let i = 3; i <= 105; i++) result.current.push(makeHover({ timestamp: i }))
    })
    expect(two.map(o => o.timestamp)).toEqual([1, 2])
    expect(result.current.observations.map(o => o.timestamp)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 56)
    )
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
    expect(two.map(o => o.timestamp)).toEqual([1, 2])
  })

  it("keeps equivalent inline filters stable and returns detached filtered snapshots", () => {
    const { result, rerender } = renderHook(() =>
      useObserverWithPush({ types: ["click"], chartId: "main", limit: 2 }), { wrapper })
    act(() => result.current.push(makeClick({ chartId: "main", timestamp: 1 })))
    const snapshot = result.current.observations
    rerender()
    expect(result.current.observations).toBe(snapshot)
    act(() => result.current.push(makeHover({ chartId: "main", timestamp: 2 })))
    expect(result.current.observations).toEqual(snapshot)
    expect(snapshot.map(o => o.timestamp)).toEqual([1])
  })

  it("increments the change signal across clear and subsequent pushes", () => {
    const { result } = renderHook(() => ({
      ...useObserverWithPush(),
      version: useObservationSelector(s => s.version)
    }), { wrapper })
    const initial = result.current.version
    act(() => result.current.push(makeHover()))
    const pushed = result.current.version
    act(() => result.current.clear())
    const cleared = result.current.version
    act(() => result.current.push(makeClick()))
    expect(initial).toBeLessThan(pushed)
    expect(pushed).toBeLessThan(cleared)
    expect(cleared).toBeLessThan(result.current.version)
  })

  it("returns empty observations initially", () => {
    const { result } = renderHook(() => useChartObserver(), { wrapper })

    expect(result.current.observations).toEqual([])
    expect(result.current.latest).toBeNull()
    expect(typeof result.current.clear).toBe("function")
  })

  it("receives pushed observations", () => {
    const { result } = renderHook(() => useObserverWithPush(), { wrapper })

    act(() => {
      result.current.push(makeHover())
    })

    expect(result.current.observations).toHaveLength(1)
    expect(result.current.observations[0].type).toBe("hover")
    expect(result.current.latest?.type).toBe("hover")
  })

  it("accumulates multiple observations in order", () => {
    const { result } = renderHook(() => useObserverWithPush(), { wrapper })

    act(() => {
      result.current.push(makeHover({ timestamp: 1 }))
      result.current.push(makeClick({ timestamp: 2 }))
      result.current.push(makeHover({ timestamp: 3 }))
    })

    expect(result.current.observations).toHaveLength(3)
    expect(result.current.observations.map(o => o.type)).toEqual(["hover", "click", "hover"])
    expect(result.current.latest?.timestamp).toBe(3)
  })

  describe("type filtering", () => {
    it("filters by single type", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ types: ["click"] }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover())
        result.current.push(makeClick())
        result.current.push(makeHover())
        result.current.push(makeClick({ timestamp: 999 }))
      })

      expect(result.current.observations).toHaveLength(2)
      expect(result.current.observations.every(o => o.type === "click")).toBe(true)
      expect(result.current.latest?.timestamp).toBe(999)
    })

    it("filters by multiple types", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ types: ["hover", "brush"] }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover())
        result.current.push(makeClick())
        result.current.push({
          type: "brush",
          extent: { x: [0, 10], y: [0, 20] },
          timestamp: Date.now(),
          chartType: "scatter"
        })
      })

      expect(result.current.observations).toHaveLength(2)
      const types = result.current.observations.map(o => o.type)
      expect(types).toEqual(["hover", "brush"])
    })
  })

  describe("chartId filtering", () => {
    it("filters observations by chartId", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ chartId: "revenue-chart" }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover({ chartId: "revenue-chart" }))
        result.current.push(makeHover({ chartId: "cost-chart" }))
        result.current.push(makeClick({ chartId: "revenue-chart" }))
      })

      expect(result.current.observations).toHaveLength(2)
      expect(result.current.observations.every(o => o.chartId === "revenue-chart")).toBe(true)
    })

    it("returns empty when no observations match chartId", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ chartId: "nonexistent" }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover({ chartId: "other" }))
      })

      expect(result.current.observations).toHaveLength(0)
      expect(result.current.latest).toBeNull()
    })
  })

  describe("combined filtering", () => {
    it("applies both type and chartId filters", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ types: ["click"], chartId: "main" }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover({ chartId: "main" }))      // wrong type
        result.current.push(makeClick({ chartId: "sidebar" }))    // wrong chart
        result.current.push(makeClick({ chartId: "main" }))       // match
        result.current.push(makeClick({ chartId: "main", timestamp: 42 })) // match
      })

      expect(result.current.observations).toHaveLength(2)
      expect(result.current.latest?.timestamp).toBe(42)
    })
  })

  describe("limit", () => {
    it("returns only the most recent N observations", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ limit: 3 }),
        { wrapper }
      )

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.push(makeHover({ timestamp: i }))
        }
      })

      expect(result.current.observations).toHaveLength(3)
      // Should be the 3 newest
      expect(result.current.observations[0].timestamp).toBe(7)
      expect(result.current.observations[2].timestamp).toBe(9)
    })

    it("defaults to 50", () => {
      const { result } = renderHook(
        () => useObserverWithPush(),
        { wrapper }
      )

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.push(makeHover({ timestamp: i }))
        }
      })

      expect(result.current.observations).toHaveLength(50)
      expect(result.current.observations[0].timestamp).toBe(10)
    })
  })

  describe("clear", () => {
    it("clears all observations", () => {
      const { result } = renderHook(() => useObserverWithPush(), { wrapper })

      act(() => {
        result.current.push(makeHover())
        result.current.push(makeClick())
      })
      expect(result.current.observations).toHaveLength(2)

      act(() => {
        result.current.clear()
      })

      expect(result.current.observations).toHaveLength(0)
      expect(result.current.latest).toBeNull()
    })
  })

  describe("latest", () => {
    it("returns the last matching observation", () => {
      const { result } = renderHook(
        () => useObserverWithPush({ types: ["click"] }),
        { wrapper }
      )

      act(() => {
        result.current.push(makeHover())
        result.current.push(makeClick({ datum: { value: 1 } }))
        result.current.push(makeClick({ datum: { value: 2 } }))
      })

      expect(result.current.latest?.type).toBe("click")
      if (result.current.latest?.type !== "click") throw new Error("Expected latest observation to be a click")
      expect(result.current.latest.datum.value).toBe(2)
    })
  })
})

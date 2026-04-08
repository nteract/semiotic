import React from "react"
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
        result.current.push(makeClick({ datum: { value: 1 } } as any))
        result.current.push(makeClick({ datum: { value: 2 } } as any))
      })

      expect(result.current.latest?.type).toBe("click")
      expect((result.current.latest as any)?.datum?.value).toBe(2)
    })
  })
})

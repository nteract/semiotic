import React from "react"
import { act, renderHook } from "@testing-library/react"
import { ObservationProvider, useObservationSelector } from "./ObservationStore"
import type { ChartObservation, HoverObservation, ClickObservation, BrushObservation } from "./ObservationStore"

function createTestStore() {
  const { result } = renderHook(() => useObservationSelector(state => state), {
    wrapper: ({ children }) => React.createElement(ObservationProvider, { children })
  })
  return {
    get observations() { return result.current.observations },
    get version() { return result.current.version },
    pushObservation(observation: ChartObservation) {
      act(() => result.current.pushObservation(observation))
    },
    clearObservations() { act(() => result.current.clearObservations()) }
  }
}

function makeHover(overrides: Partial<HoverObservation> = {}): HoverObservation {
  return {
    type: "hover",
    datum: { x: 1, y: 2 },
    x: 100,
    y: 200,
    timestamp: Date.now(),
    chartType: "line",
    ...overrides
  }
}

function makeClick(overrides: Partial<ClickObservation> = {}): ClickObservation {
  return {
    type: "click",
    datum: { category: "A", value: 42 },
    x: 150,
    y: 250,
    timestamp: Date.now(),
    chartType: "bar",
    ...overrides
  }
}

function makeBrush(overrides: Partial<BrushObservation> = {}): BrushObservation {
  return {
    type: "brush",
    extent: { x: [0, 100], y: [0, 50] },
    timestamp: Date.now(),
    chartType: "scatter",
    ...overrides
  }
}

describe("ObservationStore", () => {
  describe("pushObservation", () => {
    it("appends observations and increments version", () => {
      const store = createTestStore()
      expect(store.observations).toHaveLength(0)
      expect(store.version).toBe(0)

      store.pushObservation(makeHover())
      expect(store.observations).toHaveLength(1)
      expect(store.version).toBe(1)

      store.pushObservation(makeClick())
      expect(store.observations).toHaveLength(2)
      expect(store.version).toBe(2)
    })

    it("preserves observation type and payload", () => {
      const store = createTestStore()
      const hover = makeHover({ datum: { metric: "latency", value: 350 }, chartId: "chart-1" })
      store.pushObservation(hover)

      const stored = store.observations[0] as HoverObservation
      expect(stored.type).toBe("hover")
      expect(stored.datum.metric).toBe("latency")
      expect(stored.datum.value).toBe(350)
      expect(stored.chartId).toBe("chart-1")
      expect(stored.x).toBe(100)
      expect(stored.y).toBe(200)
    })

    it("stores all observation types", () => {
      const store = createTestStore()
      store.pushObservation(makeHover())
      store.pushObservation({ type: "hover-end", timestamp: Date.now(), chartType: "line" })
      store.pushObservation(makeClick())
      store.pushObservation({ type: "click-end", timestamp: Date.now(), chartType: "bar" })
      store.pushObservation(makeBrush())
      store.pushObservation({ type: "brush-end", timestamp: Date.now(), chartType: "scatter" })
      store.pushObservation({
        type: "selection",
        selection: { name: "highlight", fields: { region: "West" } },
        timestamp: Date.now(),
        chartType: "bar"
      })
      store.pushObservation({
        type: "selection-end",
        selection: { name: "highlight" },
        timestamp: Date.now(),
        chartType: "bar"
      })
      store.pushObservation({
        type: "focus",
        datum: { id: "datum-a" },
        inputType: "keyboard",
        timestamp: Date.now(),
        chartType: "line"
      })
      store.pushObservation({
        type: "activate",
        datum: { id: "datum-a" },
        inputType: "touch",
        timestamp: Date.now(),
        chartType: "line"
      })
      store.pushObservation({
        type: "annotation-activate",
        annotationId: "note-a",
        inputType: "navigation-tree",
        timestamp: Date.now(),
        chartType: "AccessibleNavTree"
      })

      expect(store.observations).toHaveLength(11)
      const types = store.observations.map(o => o.type)
      expect(types).toEqual([
        "hover", "hover-end", "click", "click-end",
        "brush", "brush-end", "selection", "selection-end",
        "focus", "activate", "annotation-activate"
      ])
    })
  })

  describe("ring buffer eviction", () => {
    it("evicts oldest observations when exceeding maxObservations", () => {
      const store = createTestStore()
      // maxObservations defaults to 100
      for (let i = 0; i < 105; i++) {
        store.pushObservation(makeHover({ timestamp: i }))
      }

      expect(store.observations).toHaveLength(100)
      // oldest should have been evicted — first remaining is timestamp 5
      expect(store.observations[0].timestamp).toBe(5)
      // newest is timestamp 104
      expect(store.observations[99].timestamp).toBe(104)
    })

    it("increments version for every push including evictions", () => {
      const store = createTestStore()
      for (let i = 0; i < 105; i++) {
        store.pushObservation(makeHover())
      }
      expect(store.version).toBe(105)
    })
  })

  describe("clearObservations", () => {
    it("empties the observation list and increments version", () => {
      const store = createTestStore()
      store.pushObservation(makeHover())
      store.pushObservation(makeClick())
      expect(store.observations).toHaveLength(2)
      expect(store.version).toBe(2)

      store.clearObservations()
      expect(store.observations).toHaveLength(0)
      expect(store.version).toBe(3)
    })

    it("allows new pushes after clear", () => {
      const store = createTestStore()
      store.pushObservation(makeHover())
      store.clearObservations()
      store.pushObservation(makeClick())

      expect(store.observations).toHaveLength(1)
      expect(store.observations[0].type).toBe("click")
      expect(store.version).toBe(3)
    })
  })

  describe("in-place mutation semantics", () => {
    it("mutates the same array reference (no copies)", () => {
      const store = createTestStore()
      const ref = store.observations
      store.pushObservation(makeHover())
      // Same array identity — the store mutates in place for performance
      expect(store.observations).toBe(ref)
    })
  })
})

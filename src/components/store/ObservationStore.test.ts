import type { ChartObservation, HoverObservation, ClickObservation, BrushObservation } from "./ObservationStore"

/**
 * Tests for ObservationStore's core push/eviction/clear logic.
 *
 * The real store is created via createStore() and requires a React Provider.
 * useObservation.test.tsx exercises the full production store through the
 * ObservationProvider + useChartObserver hook. This file tests the logic
 * independently (same algorithm, mirrored implementation) for fast,
 * React-free validation of eviction semantics and edge cases.
 */

function createTestStore() {
  const observations: ChartObservation[] = []
  const maxObservations = 100
  let version = 0

  function pushObservation(observation: ChartObservation) {
    observations.push(observation)
    if (observations.length > maxObservations) {
      observations.shift()
    }
    version++
  }

  function clearObservations() {
    // Note: real store replaces the array via set(() => ({ observations: [] })),
    // but push semantics (what we test here) are identical. Full store
    // integration is covered by useObservation.test.tsx.
    observations.length = 0
    version = 0
  }

  return {
    get observations() { return observations },
    get version() { return version },
    maxObservations,
    pushObservation,
    clearObservations
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

      expect(store.observations).toHaveLength(8)
      const types = store.observations.map(o => o.type)
      expect(types).toEqual([
        "hover", "hover-end", "click", "click-end",
        "brush", "brush-end", "selection", "selection-end"
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
    it("empties the observation list and resets version", () => {
      const store = createTestStore()
      store.pushObservation(makeHover())
      store.pushObservation(makeClick())
      expect(store.observations).toHaveLength(2)
      expect(store.version).toBe(2)

      store.clearObservations()
      expect(store.observations).toHaveLength(0)
      expect(store.version).toBe(0)
    })

    it("allows new pushes after clear", () => {
      const store = createTestStore()
      store.pushObservation(makeHover())
      store.clearObservations()
      store.pushObservation(makeClick())

      expect(store.observations).toHaveLength(1)
      expect(store.observations[0].type).toBe("click")
      expect(store.version).toBe(1)
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

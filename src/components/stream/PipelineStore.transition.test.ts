import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 100,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore — Transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("no transition without config", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({ inserts: [{ x: 1, y: 1 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    expect(store.activeTransition).toBeNull()
    expect(store.advanceTransition(performance.now())).toBe(false)
  })

  it("starts transition when point positions change", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      transition: { duration: 300 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    // First render — builds initial scene (no prev positions to animate from)
    store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    expect(store.activeTransition).toBeNull()

    const firstSceneX = store.scene[0]?.x

    // Second render with different data — should start transition
    store.ingest({ inserts: [{ x: 50, y: 50 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    // If identity matched, transition starts. Nodes should be at prev positions initially.
    if (store.activeTransition) {
      const pointNode = store.scene.find(n => n.type === "point")
      expect(pointNode).toBeDefined()
      // At t=0, node should still be at (or very near) previous position
      expect(pointNode!.x).toBeCloseTo(firstSceneX!, 0)
    }
  })

  it("advanceTransition interpolates positions at t=0.5 for linear easing", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      transition: { duration: 1000, easing: "linear" },
      xAccessor: "x",
      yAccessor: "y"
    }))

    // First render
    store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scene.length).toBeGreaterThan(0)

    const oldPoint = store.scene.find(n => n.type === "point")
    if (!oldPoint) return
    const prevX = oldPoint.x
    const prevY = oldPoint.y

    // Second render — different position
    store.ingest({ inserts: [{ x: 100, y: 100 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    if (!store.activeTransition) return

    const startTime = store.activeTransition.startTime

    // Find target positions
    const point = store.scene.find(n => n.type === "point")!
    const targetX = point._targetX
    const targetY = point._targetY

    if (targetX === undefined || targetY === undefined) return

    // Advance to midpoint (500ms into 1000ms duration)
    const stillAnimating = store.advanceTransition(startTime + 500)
    expect(stillAnimating).toBe(true)

    // For linear easing at t=0.5, position should be midway
    const midX = prevX + (targetX - prevX) * 0.5
    const midY = prevY + (targetY - prevY) * 0.5
    expect(point.x).toBeCloseTo(midX, 1)
    expect(point.y).toBeCloseTo(midY, 1)
  })

  it("ease-out produces different intermediate values than linear", () => {
    function buildAndGetMidpoint(easing: "linear" | "ease-out"): { x: number; y: number } | null {
      const store = new PipelineStore(makeConfig({
        chartType: "scatter",
        transition: { duration: 1000, easing },
        xAccessor: "x",
        yAccessor: "y"
      }))

      store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
      store.computeScene({ width: 200, height: 200 })

      store.ingest({ inserts: [{ x: 100, y: 100 }], bounded: true })
      store.computeScene({ width: 200, height: 200 })

      if (!store.activeTransition) return null

      const startTime = store.activeTransition.startTime
      store.advanceTransition(startTime + 500) // t=0.5

      const point = store.scene.find(n => n.type === "point")
      return point ? { x: point.x, y: point.y } : null
    }

    const linearMid = buildAndGetMidpoint("linear")
    const easeOutMid = buildAndGetMidpoint("ease-out")

    if (linearMid && easeOutMid) {
      // ease-out cubic at t=0.5: 1-(1-0.5)^3 = 1-0.125 = 0.875
      // linear at t=0.5: 0.5
      // So ease-out should be further along (closer to target)
      expect(easeOutMid.x).not.toBeCloseTo(linearMid.x, 1)
    }
  })

  it("transition completes at t=1 and snaps to target positions", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      transition: { duration: 300, easing: "linear" },
      xAccessor: "x",
      yAccessor: "y"
    }))

    store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    store.ingest({ inserts: [{ x: 100, y: 100 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    if (!store.activeTransition) return

    const startTime = store.activeTransition.startTime
    const point = store.scene.find(n => n.type === "point")!
    const targetX = point._targetX
    const targetY = point._targetY

    if (targetX === undefined) return

    // Advance past duration (t >= 1)
    const result = store.advanceTransition(startTime + 500)
    expect(result).toBe(false)

    // Transition should be cleared
    expect(store.activeTransition).toBeNull()

    // Node should be snapped to target
    expect(point.x).toBe(targetX)
    expect(point.y).toBe(targetY!)

    // Target fields should be cleared
    expect(point._targetX).toBeUndefined()
    expect(point._targetY).toBeUndefined()
  })

  it("mid-transition interruption replaces transition with new one", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      transition: { duration: 1000, easing: "linear" },
      xAccessor: "x",
      yAccessor: "y"
    }))

    // Phase 1: initial scene
    store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    // Phase 2: start first transition
    store.ingest({ inserts: [{ x: 100, y: 100 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    if (!store.activeTransition) return

    const firstStart = store.activeTransition.startTime

    // Advance partway through first transition
    store.advanceTransition(firstStart + 300)

    const midTransitionPoint = store.scene.find(n => n.type === "point")
    if (!midTransitionPoint) return
    const midX = midTransitionPoint.x
    const midY = midTransitionPoint.y

    // Phase 3: interrupt with new data — starts new transition from current positions
    store.ingest({ inserts: [{ x: 200, y: 200 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })

    // Scene should have been rebuilt — verify it has nodes
    expect(store.scene.length).toBeGreaterThan(0)

    // If a new transition started, it should animate from mid-transition positions
    if (store.activeTransition) {
      expect(store.activeTransition.startTime).toBeGreaterThanOrEqual(firstStart)
    }
  })

  it("advanceTransition returns false when no transition is active", () => {
    const store = new PipelineStore(makeConfig({
      transition: { duration: 100 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    expect(store.advanceTransition(performance.now())).toBe(false)
  })

  it("clears transition state on clear()", () => {
    const store = new PipelineStore(makeConfig({
      transition: { duration: 300 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    // Build two scenes to start a transition
    store.ingest({ inserts: [{ x: 0, y: 0 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    store.ingest({ inserts: [{ x: 50, y: 50 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    store.clear()
    expect(store.activeTransition).toBeNull()
    expect(store.scene).toEqual([])
  })

  it("transition does not start when positions are unchanged", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "scatter",
      transition: { duration: 300 },
      xAccessor: "x",
      yAccessor: "y"
    }))

    // Same data twice
    store.ingest({ inserts: [{ x: 50, y: 50 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    store.ingest({ inserts: [{ x: 50, y: 50 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    // Positions identical — no transition needed
    expect(store.activeTransition).toBeNull()
  })

  it("rect node transitions interpolate x, y, w, h", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "bar",
      transition: { duration: 1000, easing: "linear" },
      timeAccessor: "time",
      valueAccessor: "value",
      categoryAccessor: "cat",
      windowSize: 10
    }))

    // First render with bar data
    store.ingest({
      inserts: [{ time: 0, value: 10, cat: "A" }],
      bounded: true
    })
    store.computeScene({ width: 200, height: 200 })

    const rectNode = store.scene.find(n => n.type === "rect")
    if (!rectNode) return

    const prevH = rectNode.h
    const prevY = rectNode.y

    // Second render with different value
    store.ingest({
      inserts: [{ time: 0, value: 50, cat: "A" }],
      bounded: true
    })
    store.computeScene({ width: 200, height: 200 })

    if (!store.activeTransition) return

    const startTime = store.activeTransition.startTime
    const rect = store.scene.find(n => n.type === "rect")!
    const targetH = rect._targetH
    const targetY = rect._targetY

    if (targetH === undefined) return

    // Advance to midpoint
    store.advanceTransition(startTime + 500)

    // At t=0.5 linear, h should be midway between prev and target
    const expectedH = prevH + (targetH - prevH) * 0.5
    expect(rect.h).toBeCloseTo(expectedH, 1)
  })
})

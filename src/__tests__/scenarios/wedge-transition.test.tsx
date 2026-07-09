/**
 * Tests for wedge angle interpolation and animated intro.
 *
 * Phase 1: Pie/donut wedge angles transition smoothly on data change.
 * Phase 2: Animated intro — chart elements animate from zero on first render.
 */

import { OrdinalPipelineStore } from "../../components/stream/OrdinalPipelineStore"
import type {
  OrdinalPipelineConfig,
  OrdinalSceneNode,
  WedgeSceneNode
} from "../../components/stream/ordinalTypes"

function isWedge(n: OrdinalSceneNode): n is WedgeSceneNode {
  return n.type === "wedge"
}

function makeConfig(overrides: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "pie",
    windowSize: 500,
    windowMode: "sliding",
    extentPadding: 0.05,
    projection: "radial",
    categoryAccessor: "category",
    valueAccessor: "value",
    transition: { duration: 300 },
    ...overrides,
  }
}

function makeBarConfig(overrides: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    windowSize: 500,
    windowMode: "sliding",
    extentPadding: 0.05,
    projection: "vertical",
    categoryAccessor: "category",
    valueAccessor: "value",
    transition: { duration: 300 },
    ...overrides,
  }
}

const layout = { width: 400, height: 400 }

// ── Phase 1: Wedge angle interpolation ──────────────────────────────

describe("wedge angle interpolation", () => {
  it("getNodeKey returns w:{category} for wedge nodes", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    const wedges = store.scene.filter(n => n.type === "wedge")
    expect(wedges.length).toBe(2)
    // After startTransition, wedge nodes should have _transitionKey set
    // But on first render with no intro, they won't have keys yet.
    // Push new data to trigger a transition.
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 70 },
      { category: "B", value: 30 },
    ] })
    store.computeScene(layout)

    const wedgesAfter = store.scene.filter(n => n.type === "wedge")
    expect(wedgesAfter.some(w => w._transitionKey === "w:A")).toBe(true)
    expect(wedgesAfter.some(w => w._transitionKey === "w:B")).toBe(true)
  })

  it("startTransition sets _targetStartAngle/_targetEndAngle when data changes", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    // Capture original angles
    const wedgeA1 = store.scene.find((n): n is WedgeSceneNode => isWedge(n) && n.category === "A")!
    const origStart = wedgeA1.startAngle
    const origEnd = wedgeA1.endAngle

    // Change data — new proportions
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 80 },
      { category: "B", value: 20 },
    ] })
    store.computeScene(layout)

    const wedgeA2 = store.scene.find((n): n is WedgeSceneNode => isWedge(n) && n.category === "A")!
    // Node should be at previous angles with targets set
    expect(wedgeA2._targetStartAngle).toBeDefined()
    expect(wedgeA2._targetEndAngle).toBeDefined()
    // Current angles should be the old ones
    expect(wedgeA2.startAngle).toBeCloseTo(origStart, 4)
    expect(wedgeA2.endAngle).toBeCloseTo(origEnd, 4)
    // Active transition should be set
    expect(store.activeTransition).not.toBeNull()
  })

  it("advanceTransition interpolates wedge angles at t=0.5", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    const wedgeA1 = store.scene.find((n): n is WedgeSceneNode => isWedge(n) && n.category === "A")!
    const oldEnd = wedgeA1.endAngle

    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 80 },
      { category: "B", value: 20 },
    ] })
    store.computeScene(layout)

    const wedgeA2 = store.scene.find((n): n is WedgeSceneNode => isWedge(n) && n.category === "A")!
    const targetEnd = wedgeA2._targetEndAngle!

    // Advance to ~50% (approximate by setting time halfway through duration)
    const startTime = store.activeTransition!.startTime
    const midTime = startTime + 150 // half of 300ms
    store.advanceTransition(midTime)

    // Angle should be between old and target (not exact midpoint due to easing)
    expect(wedgeA2.endAngle).toBeGreaterThan(Math.min(oldEnd, targetEnd))
    expect(wedgeA2.endAngle).toBeLessThan(Math.max(oldEnd, targetEnd))
  })

  it("entering wedge starts at zero arc", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    // Add a new category
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 40 },
      { category: "B", value: 40 },
      { category: "C", value: 20 },
    ] })
    store.computeScene(layout)

    const wedgeC = store.scene.find((n): n is WedgeSceneNode => isWedge(n) && n.category === "C")!
    // Entering wedge should have collapsed angles (start === end)
    expect(wedgeC.startAngle).toBe(wedgeC.endAngle)
    // With targets to expand to
    expect(wedgeC._targetStartAngle).toBeDefined()
    expect(wedgeC._targetEndAngle).toBeDefined()
    expect(wedgeC._targetEndAngle! - wedgeC._targetStartAngle!).toBeGreaterThan(0)
  })

  it("exiting wedge gets exit node with _targetOpacity: 0", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 40 },
      { category: "B", value: 40 },
      { category: "C", value: 20 },
    ] })
    store.computeScene(layout)

    // Remove category C
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    // Exit node should be appended
    expect(store.exitNodes.length).toBeGreaterThan(0)
    const exitC = store.exitNodes.find(
      n => n.type === "wedge" && n._transitionKey === "w:C"
    )
    expect(exitC).toBeDefined()
    expect(exitC!._targetOpacity).toBe(0)
  })
})

// ── Phase 2: Animated intro ─────────────────────────────────────────

describe("animated intro (ordinal)", () => {
  it("bars start at baseline height 0 with introAnimation", () => {
    const store = new OrdinalPipelineStore(makeBarConfig({ introAnimation: true }))
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 100 },
      { category: "B", value: 200 },
    ] })
    store.computeScene(layout)

    // Transition should be active
    expect(store.activeTransition).not.toBeNull()

    // All rects should have targets set (growing from 0)
    const rects = store.scene.filter(n => n.type === "rect")
    expect(rects.length).toBeGreaterThan(0)
    for (const rect of rects) {
      expect(rect._targetH).toBeDefined()
      // Current height should be 0 (at baseline)
      expect(rect.h).toBe(0)
    }
  })

  it("wedges start collapsed with introAnimation", () => {
    const store = new OrdinalPipelineStore(makeConfig({ introAnimation: true }))
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 50 },
      { category: "B", value: 50 },
    ] })
    store.computeScene(layout)

    expect(store.activeTransition).not.toBeNull()

    const wedges = store.scene.filter(n => n.type === "wedge")
    for (const w of wedges) {
      // All wedges should start at collapsed angle
      expect(w.startAngle).toBe(w.endAngle)
      expect(w._targetStartAngle).toBeDefined()
      expect(w._targetEndAngle).toBeDefined()
    }
  })

  it("no intro without introAnimation flag", () => {
    const store = new OrdinalPipelineStore(makeBarConfig({ introAnimation: false }))
    store.ingest({ bounded: true, inserts: [
      { category: "A", value: 100 },
    ] })
    store.computeScene(layout)

    // No transition on first render
    expect(store.activeTransition).toBeNull()
  })

  it("clear() resets _hasRenderedOnce — intro fires again", () => {
    const store = new OrdinalPipelineStore(makeBarConfig({ introAnimation: true }))
    store.ingest({ bounded: true, inserts: [{ category: "A", value: 100 }] })
    store.computeScene(layout)
    expect(store.activeTransition).not.toBeNull()

    // Complete transition
    store.advanceTransition(store.activeTransition!.startTime + 1e6)
    expect(store.activeTransition).toBeNull()

    // Clear and re-ingest
    store.clear()
    store.ingest({ bounded: true, inserts: [{ category: "A", value: 100 }] })
    store.computeScene(layout)

    // Intro should fire again
    expect(store.activeTransition).not.toBeNull()
  })
})

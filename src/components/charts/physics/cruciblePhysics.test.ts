import { describe, expect, it } from "vitest"
import {
  buildCrucibleLayout,
  buildCrucibleStateSpawns,
  compileCruciblePlan,
  crucibleBoundaryColliders,
  crucibleComponentBodyId,
  crucibleProductBodyId,
  replayCruciblePlan,
  resolveCrucibleSnapshotAt,
  resolveCrucibleTime
} from "./cruciblePhysics"
import type { CrucibleCompileOptions } from "./crucibleTypes"

type TestDatum = { id: string; amount: number; category: string }

function options(): CrucibleCompileOptions<TestDatum> {
  return {
    data: [
      { id: "a", amount: 1, category: "policy" },
      { id: "b", amount: 2, category: "attack" }
    ],
    idAccessor: "id",
    amountAccessor: "amount",
    categoryAccessor: "category",
    phases: [
      { id: "heat", duration: 2 },
      { id: "work", duration: 3 }
    ],
    outlets: [
      { id: "product", side: "bottom" },
      { id: "residue", side: "left" }
    ],
    products: [{ id: "alloy", outletId: "product" }],
    seed: 13
  }
}

describe("Crucible compilation and replay", () => {
  it("cuts generic wall apertures for every side outlet while retaining dividers", () => {
    const layout = buildCrucibleLayout(
      [900, 520],
      [
        { id: "left-a", side: "left" },
        { id: "left-b", side: "left" },
        { id: "right-a", side: "right" },
        { id: "right-b", side: "right" },
        { id: "bottom-a", side: "bottom" },
        { id: "bottom-b", side: "bottom" }
      ]
    )
    const wallSegments = crucibleBoundaryColliders(layout).filter(
      (collider) =>
        collider.id.startsWith("crucible:wall:") &&
        collider.shape.type === "segment"
    )

    for (const side of ["left", "right", "bottom"] as const) {
      const outlets = layout.outlets.filter((outlet) => outlet.side === side)
      const segments = wallSegments
        .filter((collider) => collider.id.startsWith(`crucible:wall:${side}`))
        .map((collider) => {
          if (collider.shape.type !== "segment")
            throw new Error("Expected a wall segment")
          return side === "bottom"
            ? [collider.shape.x1, collider.shape.x2]
            : [collider.shape.y1, collider.shape.y2]
        })
        .map(([start, end]) => [Math.min(start, end), Math.max(start, end)])
        .sort((left, right) => left[0] - right[0])
      const openings = outlets
        .map((outlet) =>
          side === "bottom"
            ? [outlet.x, outlet.x + outlet.width]
            : [outlet.y, outlet.y + outlet.height]
        )
        .sort((left, right) => left[0] - right[0])

      expect(segments.length).toBeGreaterThanOrEqual(openings.length)
      for (const [openingStart, openingEnd] of openings) {
        expect(
          segments.every(
            ([segmentStart, segmentEnd]) =>
              segmentEnd <= openingStart || segmentStart >= openingEnd
          )
        ).toBe(true)
      }
      expect(
        segments.some(
          ([segmentStart, segmentEnd]) =>
            segmentStart >= openings[0][1] && segmentEnd <= openings[1][0]
        )
      ).toBe(true)
      expect(
        segments.some(
          ([segmentStart, segmentEnd]) =>
            segmentEnd <= openings[0][0] || segmentStart >= openings[1][1]
        )
      ).toBe(true)
    }
  })

  it("orders phase-end, absolute-boundary, then phase-start events", () => {
    const plan = compileCruciblePlan({
      ...options(),
      events: [
        {
          id: "absolute",
          at: { time: 2 },
          effects: [
            { type: "set-metric", target: "run", metricsDelta: { order: 10 } }
          ]
        },
        {
          id: "start",
          at: { phaseId: "work", progress: 0 },
          effects: [
            { type: "set-metric", target: "run", metricsDelta: { order: 100 } }
          ]
        },
        {
          id: "end",
          at: { phaseId: "heat", progress: 1 },
          effects: [
            { type: "set-metric", target: "run", metricsDelta: { order: 1 } }
          ]
        }
      ]
    })
    expect(plan.events.map((event) => event.id)).toEqual([
      "end",
      "absolute",
      "start"
    ])
    expect(plan.events.map((event) => event.phaseId)).toEqual([
      "heat",
      "work",
      "work"
    ])
    expect(resolveCrucibleTime(plan, 2)).toMatchObject({
      phaseId: "work",
      phaseElapsed: 0,
      complete: false
    })
    const atBoundary = replayCruciblePlan(plan, 2)
    expect(atBoundary.state.eventsApplied).toEqual(["end", "absolute", "start"])
    expect(atBoundary.state.metrics.order).toBe(111)
  })

  it("replays an incremental product to the same terminal state on every call", () => {
    const plan = compileCruciblePlan({
      ...options(),
      events: [
        {
          id: "begin",
          at: { phaseId: "heat", progress: 0.5 },
          effects: [
            {
              type: "combine",
              sourceIds: ["a"],
              productId: "alloy",
              complete: false
            }
          ]
        },
        {
          id: "add",
          at: { phaseId: "work", progress: 0.5 },
          effects: [
            { type: "contribute", sourceIds: ["b"], productId: "alloy" }
          ]
        },
        {
          id: "finish",
          at: { phaseId: "work", progress: 1 },
          effects: [{ type: "complete-product", productId: "alloy" }]
        }
      ]
    })
    const first = replayCruciblePlan(plan)
    const second = replayCruciblePlan(plan)
    expect(first.state).toEqual(second.state)
    expect(first.state.products.alloy).toMatchObject({
      amount: 3,
      sourceIds: ["a", "b"],
      status: "complete",
      outletId: "product"
    })
    expect(first.state.complete).toBe(true)
    expect(plan.terminalState).toEqual(first.state)
  })

  it("has a canonical key for fresh equivalent arrays", () => {
    const first = compileCruciblePlan(options())
    const second = compileCruciblePlan({
      ...options(),
      data: options().data.map((datum) => ({ ...datum })),
      phases: options().phases.map((phase) => ({ ...phase })),
      products: options().products?.map((product) => ({ ...product })),
      outlets: options().outlets?.map((outlet) => ({ ...outlet }))
    })
    expect(first.semanticKey).toBe(second.semanticKey)
  })

  it("places arbitrary replay states deterministically with stable body ids", () => {
    const plan = compileCruciblePlan({
      ...options(),
      events: [
        {
          id: "make",
          at: { time: 1 },
          effects: [{ type: "combine", sourceIds: ["a"], productId: "alloy" }]
        }
      ]
    })
    const state = replayCruciblePlan(plan, 1).state
    const first = buildCrucibleStateSpawns(state, plan.layout, { seed: 99 })
    const second = buildCrucibleStateSpawns(state, plan.layout, { seed: 99 })
    expect(first).toEqual(second)
    expect(first.map((spawn) => spawn.id)).toContain(
      crucibleComponentBodyId("a")
    )
    expect(first.map((spawn) => spawn.id)).toContain(
      crucibleProductBodyId("alloy")
    )
    expect(crucibleComponentBodyId("a:b")).not.toBe(
      crucibleComponentBodyId("a%3Ab")
    )
  })

  it("distributes products across the full width of a wide bottom outlet", () => {
    const productIds = ["topic-1", "topic-2", "topic-3", "topic-4"]
    const plan = compileCruciblePlan({
      data: productIds.map((id) => ({ id, amount: 1, category: "token" })),
      idAccessor: "id",
      amountAccessor: "amount",
      categoryAccessor: "category",
      size: [1010, 520],
      phases: [{ id: "quench", duration: 1 }],
      outlets: [{ id: "topics", side: "bottom" }],
      products: productIds.map((id, order) => ({
        id,
        order,
        outletId: "topics"
      })),
      events: productIds.map((id, index) => ({
        id: `form-${id}`,
        at: { time: 0.5 },
        effects: [
          {
            type: "combine" as const,
            sourceIds: [id],
            productId: id
          }
        ],
        order: index
      }))
    })
    const outlet = plan.layout.outlets[0]
    const productSpawns = buildCrucibleStateSpawns(
      plan.terminalState,
      plan.layout
    )
      .filter((spawn) =>
        productIds.some((id) => spawn.id === crucibleProductBodyId(id))
      )
      .sort((a, b) => a.x - b.x)

    expect(productSpawns).toHaveLength(productIds.length)
    expect(productSpawns.map((spawn) => spawn.x)).toEqual(
      productIds.map(
        (_, index) =>
          outlet.x + (index + 0.5) * (outlet.width / productIds.length)
      )
    )
    expect(productSpawns[0].x + productSpawns.at(-1)!.x).toBeCloseTo(
      outlet.x * 2 + outlet.width
    )
  })

  it("defaults snapshots to terminal and reports transactional event failures", () => {
    const plan = compileCruciblePlan({
      ...options(),
      events: [
        {
          id: "bad",
          at: { time: 1 },
          effects: [
            { type: "set-state", select: { ids: ["a"] }, state: "retained" },
            { type: "combine", sourceIds: ["b"], productId: "not-declared" }
          ]
        }
      ]
    })
    expect(resolveCrucibleSnapshotAt(plan, undefined)).toBe(plan.duration)
    expect(plan.terminalState.components.a.status).toBe("active")
    expect(plan.terminalState.eventsApplied).toEqual([])
    expect(
      plan.diagnostics.some((item) => item.code === "unknown-product")
    ).toBe(true)
  })
})

import { describe, expect, it } from "vitest"
import {
  applyCrucibleEvent,
  buildCrucibleProjection,
  evaluateCrucibleConservation,
  resolveCrucibleSelector
} from "./crucibleEffects"
import { createInitialCrucibleState } from "./cruciblePhysics"
import type {
  CrucibleApplyContext,
  CrucibleEvent,
  CrucibleProductDefinition,
  CrucibleRunState
} from "./crucibleTypes"

type TestDatum = {
  id: string
  category: string
  amount: number
  metrics?: Record<string, number>
}

const phases = [{ id: "heat", duration: 10 }] as const
const products: CrucibleProductDefinition[] = [
  {
    id: "alloy",
    label: "Public alloy",
    category: "concept",
    outletId: "product"
  },
  { id: "left", outletId: "product" },
  { id: "right", outletId: "product" }
]
const outlets = [{ id: "product" }, { id: "residue" }]

function initialState(): CrucibleRunState<TestDatum> {
  return createInitialCrucibleState({
    data: [
      { id: "b", category: "policy", amount: 3, metrics: { salience: 3 } },
      { id: "a", category: "policy", amount: 1, metrics: { salience: 1 } },
      { id: "c", category: "attack", amount: 2, metrics: { salience: 2 } }
    ],
    phases,
    idAccessor: "id",
    categoryAccessor: "category",
    amountAccessor: "amount",
    metricsAccessor: "metrics"
  }).state
}

function context(at: number): CrucibleApplyContext {
  return { phaseId: "heat", authoredAt: at, appliedAt: at, products, outlets }
}

function apply(
  state: CrucibleRunState<TestDatum>,
  event: CrucibleEvent,
  at: number
): CrucibleRunState<TestDatum> {
  const result = applyCrucibleEvent(state, event, context(at))
  expect(
    result.diagnostics.filter((item) => item.severity === "error")
  ).toEqual([])
  expect(result.applied).toBe(true)
  return result.state
}

describe("Crucible effects", () => {
  it("resolves intersecting selectors lexically before count", () => {
    const selected = resolveCrucibleSelector(initialState(), {
      ids: ["c", "b", "a"],
      categories: ["policy"],
      statuses: ["active"],
      count: 1
    })
    expect(selected.ids).toEqual(["a"])
    expect(selected.diagnostics).toEqual([])
  })

  it("rolls an entire event back when a later effect is invalid", () => {
    const state = initialState()
    const result = applyCrucibleEvent(
      state,
      {
        id: "bad-transaction",
        at: { time: 1 },
        effects: [
          { type: "set-state", select: { ids: ["a"] }, state: "retained" },
          { type: "combine", sourceIds: ["b"], productId: "missing" }
        ]
      },
      context(1)
    )
    expect(result.applied).toBe(false)
    expect(result.state).toBe(state)
    expect(result.state.components.a.status).toBe("active")
    expect(result.materializations).toEqual([])
    expect(result.observations).toEqual([])
    expect(
      result.diagnostics.some((item) => item.code === "unknown-product")
    ).toBe(true)
  })

  it("forms, contributes to, and completes one exclusive alloy", () => {
    let state = initialState()
    state = apply(
      state,
      {
        id: "begin-alloy",
        at: { time: 1 },
        effects: [
          {
            type: "combine",
            sourceIds: ["a"],
            productId: "alloy",
            complete: false
          }
        ]
      },
      1
    )
    expect(state.products.alloy.status).toBe("forming")
    expect(state.products.alloy.amount).toBe(1)

    state = apply(
      state,
      {
        id: "add-policy",
        at: { time: 2 },
        effects: [{ type: "contribute", sourceIds: ["b"], productId: "alloy" }]
      },
      2
    )
    state = apply(
      state,
      {
        id: "pour",
        at: { time: 3 },
        effects: [{ type: "complete-product", productId: "alloy" }]
      },
      3
    )

    expect(state.products.alloy).toMatchObject({
      amount: 4,
      sourceIds: ["a", "b"],
      status: "complete",
      outletId: "product"
    })
    expect(state.components.a.productIds).toEqual(["alloy"])
    expect(state.components.b.productIds).toEqual(["alloy"])
    expect(evaluateCrucibleConservation(state)).toMatchObject({
      input: 6,
      products: 4,
      unassigned: 2,
      output: 6,
      conserved: true
    })

    const duplicate = applyCrucibleEvent(
      state,
      {
        id: "reuse",
        at: { time: 4 },
        effects: [{ type: "combine", sourceIds: ["a"], productId: "left" }]
      },
      context(4)
    )
    expect(duplicate.applied).toBe(false)
    expect(
      duplicate.diagnostics.some(
        (item) => item.code === "source-already-assigned"
      )
    ).toBe(true)
  })

  it("admits evidence relations between a forming product and a new contribution", () => {
    let state = apply(
      initialState(),
      {
        id: "begin-related",
        at: { time: 1 },
        effects: [
          {
            type: "combine",
            sourceIds: ["a"],
            productId: "alloy",
            complete: false
          }
        ]
      },
      1
    )
    state = apply(
      state,
      {
        id: "discover-relation",
        at: { time: 2 },
        effects: [
          {
            type: "set-relation",
            relation: { id: "a-b", sourceIds: ["a", "b"], strength: 0.8 }
          }
        ]
      },
      2
    )
    state = apply(
      state,
      {
        id: "related-contribution",
        at: { time: 3 },
        effects: [
          {
            type: "contribute",
            sourceIds: ["b"],
            productId: "alloy",
            basisRelationIds: ["a-b"]
          }
        ]
      },
      3
    )
    expect(state.products.alloy.sourceIds).toEqual(["a", "b"])
    expect(state.relations["a-b"]).toMatchObject({
      status: "resolved",
      resolution: "combined"
    })
  })

  it("splits one source into declared complete products without double counting", () => {
    const state = apply(
      initialState(),
      {
        id: "split-attack",
        at: { time: 2 },
        effects: [
          {
            type: "split",
            sourceId: "c",
            products: [
              { productId: "left", amount: 0.75 },
              { productId: "right", amount: 1.25 }
            ]
          }
        ]
      },
      2
    )
    expect(state.components.c.productIds).toEqual(["left", "right"])
    expect(state.products.left.status).toBe("complete")
    expect(state.products.right.amount).toBe(1.25)
    expect(evaluateCrucibleConservation(state).conserved).toBe(true)
  })

  it("projects products separately from still-independent source material", () => {
    const state = apply(
      initialState(),
      {
        id: "product-one",
        at: { time: 1 },
        effects: [
          { type: "combine", sourceIds: ["a", "b"], productId: "alloy" }
        ]
      },
      1
    )
    const rows = buildCrucibleProjection(state, { groupBy: "product" })
    expect(rows.map((row) => row.key)).toEqual(["alloy", "unassigned"])
    expect(rows.find((row) => row.key === "alloy")).toMatchObject({
      amount: 4,
      count: 1,
      productId: "alloy"
    })
    expect(rows.find((row) => row.key === "unassigned")).toMatchObject({
      amount: 2,
      count: 1
    })
  })
})

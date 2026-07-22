import { describe, expect, it } from "vitest"
import { buildCrucibleProductEvents as buildFromPhysicsSurface } from "../../semiotic-physics"
import { buildCrucibleProductEvents as buildFromChartSurface } from "./CrucibleChart"
import { compileCruciblePlan, replayCruciblePlan } from "./cruciblePhysics"
import { buildCrucibleProductEvents } from "./crucibleProgram"

describe("buildCrucibleProductEvents", () => {
  it("is available from the CrucibleChart public module", () => {
    expect(buildFromChartSurface).toBe(buildCrucibleProductEvents)
    expect(buildFromPhysicsSurface).toBe(buildCrucibleProductEvents)
  })

  it("builds an explicit forming lifecycle without inventing membership or timing", () => {
    const sourceIds = ["a", "b"]
    const relationIds = ["a--b"]
    const events = buildCrucibleProductEvents({
      productId: "alloy",
      idPrefix: "observed-alloy",
      form: {
        at: { phaseId: "heat", progress: 0.25 },
        sourceIds,
        basisRelationIds: relationIds,
        label: "Open observed alloy"
      },
      contributions: [
        {
          id: "admit-c",
          at: { phaseId: "heat", progress: 0.6 },
          sourceIds: ["c"],
          description: "An externally supplied assay admits c."
        }
      ],
      complete: {
        at: { phaseId: "pour", progress: 0.4 },
        outletId: "accepted",
        reason: "The authored assay passed."
      }
    })

    expect(events).toEqual([
      {
        id: "observed-alloy-form",
        at: { phaseId: "heat", progress: 0.25 },
        label: "Open observed alloy",
        effects: [
          {
            type: "combine",
            sourceIds: ["a", "b"],
            productId: "alloy",
            basisRelationIds: ["a--b"],
            complete: false
          }
        ]
      },
      {
        id: "admit-c",
        at: { phaseId: "heat", progress: 0.6 },
        description: "An externally supplied assay admits c.",
        effects: [
          {
            type: "contribute",
            sourceIds: ["c"],
            productId: "alloy"
          }
        ]
      },
      {
        id: "observed-alloy-complete",
        at: { phaseId: "pour", progress: 0.4 },
        effects: [
          {
            type: "complete-product",
            productId: "alloy",
            outletId: "accepted",
            reason: "The authored assay passed."
          }
        ]
      }
    ])

    expect(sourceIds).toEqual(["a", "b"])
    expect(relationIds).toEqual(["a--b"])
  })

  it("replays through forming, contribution, and completion states", () => {
    const events = buildCrucibleProductEvents({
      productId: "alloy",
      form: {
        at: { time: 0.5 },
        sourceIds: ["a"]
      },
      contributions: [
        {
          at: { time: 1 },
          sourceIds: ["b"]
        }
      ],
      complete: {
        at: { time: 1.5 },
        outletId: "accepted"
      }
    })
    const plan = compileCruciblePlan({
      data: [
        { id: "a", amount: 2 },
        { id: "b", amount: 3 }
      ],
      idAccessor: "id",
      amountAccessor: "amount",
      phases: [{ id: "treatment", duration: 2 }],
      products: [{ id: "alloy", outletId: "accepted" }],
      outlets: [{ id: "accepted", side: "bottom" }],
      events
    })

    expect(plan.diagnostics).toEqual([])
    expect(replayCruciblePlan(plan, 0.5).state.products.alloy).toMatchObject({
      amount: 2,
      sourceIds: ["a"],
      status: "forming"
    })
    expect(replayCruciblePlan(plan, 1).state.products.alloy).toMatchObject({
      amount: 5,
      sourceIds: ["a", "b"],
      status: "forming"
    })
    expect(replayCruciblePlan(plan, 1.5).state.products.alloy).toMatchObject({
      amount: 5,
      sourceIds: ["a", "b"],
      status: "complete",
      outletId: "accepted"
    })
  })
})

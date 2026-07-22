import { describe, expect, it, vi } from "vitest"
import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { PhysicsPipelineControlSurface } from "../../stream/physics/PhysicsPipelineStore"
import { compileCruciblePlan, crucibleProductBodyId } from "./cruciblePhysics"
import {
  advanceCrucibleRuntime,
  computeCrucibleBodyForce,
  crucibleStateSpawns,
  crucibleStateTargets,
  nextCruciblePhaseBoundary,
  reconcileCrucibleBodies,
  replayCrucibleRuntime,
  targetForCrucibleBody
} from "./crucibleController"

const plan = compileCruciblePlan({
  data: [
    { id: "tax", label: "tax", count: 12 },
    { id: "jobs", label: "jobs", count: 9 }
  ],
  idAccessor: "id",
  labelAccessor: "label",
  amountAccessor: "count",
  size: [490, 410],
  phases: [
    { id: "test", duration: 1, motion: "mix", intensity: 0.8 },
    { id: "pour", duration: 1, motion: "pour" }
  ],
  products: [{ id: "tax-jobs", label: "tax + jobs", outletId: "product" }],
  events: [
    {
      id: "form",
      at: { phaseId: "test", progress: 0.5 },
      effects: [
        {
          type: "combine",
          sourceIds: ["tax", "jobs"],
          productId: "tax-jobs"
        }
      ]
    }
  ]
})

describe("CrucibleChart replay controller", () => {
  it("advances from origin while emitting only newly crossed observations", () => {
    const before = replayCrucibleRuntime(plan, 0.4, true)
    const crossed = advanceCrucibleRuntime(plan, before.state, 0.75, true)
    const later = advanceCrucibleRuntime(plan, crossed.state, 1.4, true)

    expect(before.observations).toEqual([])
    expect(crossed.state.eventsApplied).toEqual(["form"])
    expect(crossed.observations.some((item) => item.eventId === "form")).toBe(
      true
    )
    expect(
      crossed.materializations.some((item) => item.type === "form-product")
    ).toBe(true)
    expect(later.observations).toEqual([])
    expect(later.materializations).toEqual([])
  })

  it("steps to authored phase boundaries rather than arbitrary frame time", () => {
    expect(nextCruciblePhaseBoundary(plan, 0.2)).toBe(1)
    expect(nextCruciblePhaseBoundary(plan, 1)).toBe(2)
    expect(nextCruciblePhaseBoundary(plan, 2)).toBe(2)
  })

  it("derives product motion targets from the ledger projection", () => {
    const runtime = replayCrucibleRuntime(plan, 0.75, false)
    const targets = crucibleStateTargets(plan, runtime.state)
    const spawn = crucibleStateSpawns(plan, runtime.state).find(
      (candidate) => candidate.id === crucibleProductBodyId("tax-jobs")
    )!
    const body = {
      ...spawn,
      prevX: plan.layout.chamber.x,
      prevY: plan.layout.chamber.y,
      x: plan.layout.chamber.x,
      y: plan.layout.chamber.y,
      vx: 0,
      vy: 0,
      angle: 0,
      sleeping: false
    } as PhysicsBodyState

    const target = targetForCrucibleBody({
      body,
      plan,
      state: runtime.state,
      targets
    })
    const force = computeCrucibleBodyForce({
      body,
      plan,
      state: runtime.state,
      targets
    })

    expect(target).toEqual(targets.get("product:tax-jobs"))
    expect(Math.hypot(force?.x ?? 0, force?.y ?? 0)).toBeGreaterThan(0)
  })

  it("makes the authored pour phase pull routed bodies through outlet apertures", () => {
    const runtime = replayCrucibleRuntime(plan, 1.25, false)
    const targets = crucibleStateTargets(plan, runtime.state)
    const target = targets.get("product:tax-jobs")!
    const spawn = crucibleStateSpawns(plan, runtime.state).find(
      (candidate) => candidate.id === crucibleProductBodyId("tax-jobs")
    )!
    const body = {
      ...spawn,
      prevX: target.x - 20,
      prevY: target.y,
      x: target.x - 20,
      y: target.y,
      vx: 0,
      vy: 0,
      angle: 0,
      sleeping: false
    } as PhysicsBodyState
    const holdPlan = {
      ...plan,
      phases: plan.phases.map((phase) =>
        phase.id === "pour" ? { ...phase, motion: "hold" as const } : phase
      )
    }

    const pourForce = computeCrucibleBodyForce({
      body,
      plan,
      state: runtime.state,
      targets
    })
    const holdForce = computeCrucibleBodyForce({
      body,
      plan: holdPlan,
      state: runtime.state,
      targets
    })

    expect(Math.abs(pourForce?.x ?? 0)).toBeGreaterThan(
      Math.abs(holdForce?.x ?? 0)
    )
  })

  it("adds only missing bounded marks when an event materializes a product", () => {
    const desired = crucibleStateSpawns(
      plan,
      replayCrucibleRuntime(plan, 0.75).state
    )
    const pushMany = vi.fn()
    const controls = {
      readBodies: () => [
        {
          id: desired[0].id
        } as PhysicsBodyState
      ],
      pushMany
    } as unknown as PhysicsPipelineControlSurface

    const added = reconcileCrucibleBodies(controls, desired)

    expect(added).toEqual(desired.slice(1).map((spawn) => spawn.id))
    expect(pushMany).toHaveBeenCalledWith(desired.slice(1))
  })
})

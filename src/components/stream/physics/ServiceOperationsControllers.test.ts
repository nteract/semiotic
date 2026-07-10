import { describe, expect, it } from "vitest"
import {
  createDependencyGateController,
  createServiceLevelController,
  createServiceResourcePoolController
} from "./ServiceOperationsControllers"
import { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type { StreamPhysicsBodyRegionState } from "./StreamPhysicsFrame"

function makeStore() {
  return new PhysicsPipelineStore({
    kernel: { seed: 1, gravity: { x: 0, y: 0 }, velocityDamping: 1 },
    colliders: [],
    fixedDt: 1 / 60,
    maxSubsteps: 4
  })
}

function regionState(ids: string[]): StreamPhysicsBodyRegionState {
  return { activeRegionIds: ids, regionIds: ids, charges: {}, attributes: {}, energy: 0 }
}

describe("service operations controllers", () => {
  it("keeps a finite resource assignment until its case releases", () => {
    const pool = createServiceResourcePoolController({
      resources: [{ id: "rep-1", home: { x: 0, y: 0 } }]
    })
    expect(pool.assign("case-a")?.resourceId).toBe("rep-1")
    expect(pool.assign("case-b")).toBeNull()
    expect(pool.getSnapshot().assigned).toBe(1)
    expect(pool.release("case-a")).toBe(true)
    expect(pool.assign("case-b")?.resourceId).toBe("rep-1")
  })

  it("records protected and late-resolution service-level outcomes", () => {
    const store = makeStore()
    store.enqueue([
      { id: "protected", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { kind: "case", deadline: 2 } },
      { id: "late", x: 10, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { kind: "case", deadline: 2 } }
    ])
    store.tick(0)
    const controller = createServiceLevelController({
      bodyFilter: (body) => body.datum?.kind === "case",
      deadlineAccessor: "deadline"
    })
    const context = (elapsed: number) => ({
      result: {} as never,
      controls: store.controls(),
      dt: 0.1,
      elapsed,
      getRegionState: () => undefined
    })
    controller.tick(context(0))
    expect(controller.protect("protected")).toBe(true)
    controller.tick(context(2.1))
    expect(controller.getCase("late")?.state).toBe("unhappy")
    expect(controller.complete("protected")).toBe(true)
    expect(controller.complete("late")).toBe(true)
    expect(controller.getCase("protected")?.state).toBe("resolved")
    expect(controller.getCase("late")?.state).toBe("resolved-unhappy")
  })

  it("holds dependency-bound work until its recovery time", () => {
    const store = makeStore()
    store.enqueue([{ id: "case", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { requiresRecovery: true } }])
    store.tick(0)
    const controller = createDependencyGateController({
      regionId: "recovery",
      opensAt: 3,
      bodyFilter: (body) => body.datum?.requiresRecovery === true
    })
    const context = (elapsed: number) => ({
      result: {} as never,
      controls: store.controls(),
      dt: 0.1,
      elapsed,
      getRegionState: () => regionState(["recovery"])
    })
    controller.tick(context(1))
    expect(controller.getSnapshot().blocked).toBe(1)
    controller.tick(context(3))
    expect(controller.getSnapshot()).toMatchObject({ isOpen: true, blocked: 0, released: 1 })
  })
})

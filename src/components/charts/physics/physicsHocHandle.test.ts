import { describe, expect, it } from "vitest"
import { bodyIdsForSeedRow } from "./physicsHocHandle"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"

describe("bodyIdsForSeedRow", () => {
  it("matches a single body whose id equals the row id", () => {
    const spawns: PhysicsQueuedSpawn[] = [
      { id: "a", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { id: "a" } }
    ]
    expect(bodyIdsForSeedRow("a", spawns)).toEqual(["a"])
  })

  it("collects unitized multi-body piles for one row", () => {
    const spawns: PhysicsQueuedSpawn[] = [
      { id: "row-0", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { id: "row", unitIndex: 0 } },
      { id: "row-1", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { id: "row", unitIndex: 1 } },
      { id: "other-0", x: 0, y: 0, mass: 1, shape: { type: "circle", radius: 4 }, datum: { id: "other", unitIndex: 0 } }
    ]
    expect(bodyIdsForSeedRow("row", spawns)).toEqual(["row-0", "row-1"])
  })

  it("falls back to [rowId] when nothing matches", () => {
    expect(bodyIdsForSeedRow("missing", [])).toEqual(["missing"])
  })
})

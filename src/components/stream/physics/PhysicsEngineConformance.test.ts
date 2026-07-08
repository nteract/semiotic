import { describe, expect, it } from "vitest"
import { BuiltInPhysicsEngineAdapter } from "./PhysicsEngineAdapter"
import {
  comparePhysicsEngineConformance,
  runPhysicsEngineConformance
} from "./PhysicsEngineConformance"

describe("PhysicsEngineAdapter conformance tape", () => {
  it("passes the built-in adapter against its own golden run exactly", () => {
    const factory = (options = {}) => new BuiltInPhysicsEngineAdapter(options)
    const expected = runPhysicsEngineConformance(factory, {
      determinism: "strict"
    })
    const actual = runPhysicsEngineConformance(factory, {
      determinism: "strict"
    })

    expect(
      comparePhysicsEngineConformance(actual, expected, {
        determinism: "strict"
      })
    ).toEqual([])
  })

  it("exercises the required adapter semantics", () => {
    const result = runPhysicsEngineConformance(
      (options = {}) => new BuiltInPhysicsEngineAdapter(options),
      { determinism: "strict" }
    )

    expect(result.deterministicReplay).toHaveLength(8)
    expect(result.sensorEvents).toEqual([
      "sensor-enter:window-a:event",
      "sensor-exit:window-a:event"
    ])
    expect(result.sensorFinalX).toBeGreaterThan(100)
    expect(result.sleepWakeEvents).toContain("sleep:ball")
    expect(result.sleepWakeEvents).toContain("wake:ball")
    expect(result.snapshotReplay.map((body) => body.id)).toEqual(["ball"])
    expect(result.springBodyX).toBeGreaterThan(0)
  })
})

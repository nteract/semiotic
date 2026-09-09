import { describe, expect, it } from "vitest"
import { checkPhysicsConfig } from "./diagnosePhysicsChecks"
import type { Datum } from "./datumTypes"
import type { Diagnosis } from "./diagnoseTypes"
import {
  buildPhysicsPile,
  generatePhysicsPileMechanicalSamples
} from "../physics/physicsPilePhysics"

function diagnose(props: Datum) {
  const findings: Diagnosis[] = []
  checkPhysicsConfig("UnitPileChart", props, findings)
  return findings
}

describe("UnitPile body budget diagnostics", () => {
  it("counts one partial circle for every positive source record", () => {
    const data = Array.from({ length: 1501 }, (_, id) => ({
      id,
      category: "A",
      value: 0.49
    }))
    const warning = diagnose({
      data,
      valueAccessor: "value",
      unitValue: 100
    }).find((entry) => entry.code === "PHYSICS_BODY_BUDGET")
    expect(warning?.message).toContain("1501")
    expect(warning?.fix).toContain("one body per positive source record")
  })

  it("defaults to counting rows even when they have a value field", () => {
    const data = Array.from({ length: 1501 }, (_, id) => ({
      id,
      category: "A",
      value: 0
    }))
    expect(
      diagnose({ data, unitValue: 100 }).find(
        (entry) => entry.code === "PHYSICS_BODY_BUDGET"
      )?.message
    ).toContain("1501")
    expect(diagnose({ data: [{ category: "A", value: 10000 }] })).toEqual([])
  })

  it("keeps floating point full units and indexed accessors aligned with the builder", () => {
    const data = [{ category: "A" }, { category: "A" }]
    const valueAccessor = (_datum: Datum, index = 0) =>
      index === 0 ? 0.07 : 14.94
    const layout = buildPhysicsPile({
      data,
      categoryAccessor: "category",
      valueAccessor,
      unitValue: 0.01,
      ballRadius: 5,
      seed: 1,
      size: [400, 300]
    })
    expect(layout.initialSpawns).toHaveLength(1501)
    expect(
      diagnose({ data, valueAccessor, unitValue: 0.01 }).find(
        (entry) => entry.code === "PHYSICS_BODY_BUDGET"
      )?.message
    ).toContain("1501")
    expect(
      diagnose({
        data: [{ category: "A", value: 15 }],
        valueAccessor: "value",
        unitValue: 0.01
      })
    ).toEqual([])
  })

  it("uses the latest value for duplicate source IDs and ignores invalid quantities", () => {
    expect(
      diagnose({
        data: [
          { id: "corrected", value: 9999 },
          { id: "corrected", value: 2 },
          { value: true },
          { value: NaN },
          { value: Infinity },
          { value: -10 }
        ],
        valueAccessor: "value"
      })
    ).toEqual([])
  })

  it.each([
    { simulationMode: "mechanical", mode: "primary" },
    { mode: "mechanical" }
  ])(
    "counts generated quantities for %j, regardless of the supplied sample rows",
    (mode) => {
      expect(
        diagnose({
          ...mode,
          mechanicalCount: 1601,
          unitValue: 100,
          data: []
        }).find((entry) => entry.code === "PHYSICS_BODY_BUDGET")?.message
      ).toContain("1601")
      expect(
        diagnose({ ...mode, mechanicalCount: 4, data: [{ value: 10000 }] })
      ).toEqual([])
    }
  )

  it("honors explicit sample mode over the legacy mechanical alias", () => {
    expect(
      diagnose({
        simulationMode: "sample",
        mode: "mechanical",
        mechanicalCount: 2000,
        data: []
      })
    ).toEqual([])
  })

  it("applies an authored value accessor to mechanical records", () => {
    const valueAccessor = (_datum: Datum, index = 0) =>
      index === 0 ? 1501 : 0
    const data = generatePhysicsPileMechanicalSamples({ count: 4 })
    expect(
      buildPhysicsPile({
        data,
        valueAccessor,
        categoryAccessor: "category",
        unitValue: 1,
        ballRadius: 5,
        seed: 1,
        size: [400, 300]
      }).initialSpawns
    ).toHaveLength(1501)
    expect(
      diagnose({
        simulationMode: "mechanical",
        mechanicalCount: 4,
        valueAccessor
      }).find((entry) => entry.code === "PHYSICS_BODY_BUDGET")?.message
    ).toContain("1501")
  })
})

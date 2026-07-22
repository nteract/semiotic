import { describe, expect, it } from "vitest"
import { CrucibleChart as DirectCrucibleChart } from "./CrucibleChart"
import {
  CrucibleChart as PhysicsCrucibleChart,
  compileCruciblePlan as compileFromPhysics
} from "../../semiotic-physics"
import { CrucibleChart as ChartsCrucibleChart } from "../index"
import { CrucibleChart as AICrucibleChart } from "../../semiotic-ai"

describe("CrucibleChart public surfaces", () => {
  it("exports one component through charts, physics, and AI entry points", () => {
    expect(PhysicsCrucibleChart).toBe(DirectCrucibleChart)
    expect(ChartsCrucibleChart).toBe(DirectCrucibleChart)
    expect(AICrucibleChart).toBe(DirectCrucibleChart)
  })

  it("exports the deterministic compiler from semiotic/physics", () => {
    const plan = compileFromPhysics({
      data: [{ id: "word" }],
      phases: [{ id: "exchange", duration: 1 }]
    })

    expect(plan.duration).toBe(1)
    expect(plan.initialState.components.word).toBeDefined()
  })
})

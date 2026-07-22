import { describe, expect, it } from "vitest"
import { getCapability } from "../../ai/chartCapabilities"
import type { ChartDataProfile } from "../../ai/chartCapabilityTypes"
import { PHYSICS_CHART_SPECS } from "../shared/chartSpecsPhysics"
import { CrucibleChartCapability } from "./CrucibleChart.capability"

const flatProfile = {
  data: [{ id: "a", concept: "jobs", count: 12 }],
  rowCount: 1,
  primary: { category: "concept", y: "count" }
} as unknown as ChartDataProfile

describe("CrucibleChart AI capability", () => {
  it("is registered but refuses to invent an authored program from flat rows", () => {
    expect(getCapability("CrucibleChart")).toBe(CrucibleChartCapability)
    expect(CrucibleChartCapability.fits(flatProfile)).toContain(
      "authored phases"
    )
    expect(CrucibleChartCapability.buildProps(flatProfile)).toEqual({
      data: flatProfile.data
    })
  })

  it("declares the conservative public schema contract", () => {
    const spec = PHYSICS_CHART_SPECS.CrucibleChart
    expect(spec.required).toEqual(["data", "phases"])
    expect(spec.ownProps.products.description).toContain("never inferred")
    expect(spec.ownProps.events.type).toBe("array")
    expect(spec.ownProps.outlets.type).toBe("array")
    expect(spec.ownProps.playbackRate.default).toBe(1)
    expect(spec.ownProps.rerunMS.type).toEqual(["number", "null"])
    expect(spec.capabilities.supportsPush).toBe(false)
    expect(spec.capabilities.supportsSSR).toBe(true)
  })
})

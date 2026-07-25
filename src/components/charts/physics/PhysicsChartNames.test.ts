/**
 * Physics chart naming + deprecated aliases.
 *
 * Two names leaked the substrate into the user-facing API: `PhysicsPileChart`
 * and `PhysicalFlowChart`. Nothing else in Semiotic is `SVGLineChart`, and
 * "Physical" told a reader nothing about the reading protocol. They are now
 * `UnitPileChart` (values unitize into countable bodies) and `PacketFlowChart`
 * (discrete packets travel authored routes).
 *
 * The old names stay exported indefinitely. This pins that promise, and pins the
 * rule that registries carry only the canonical name — the same shape as the
 * pre-existing `GuantletChart` typo alias.
 */
import { describe, expect, it } from "vitest"
import { UnitPileChart, PhysicsPileChart } from "./UnitPileChart"
import { PacketFlowChart, PhysicalFlowChart } from "./PacketFlowChart"
import { GauntletChart, GuantletChart } from "./GauntletChart"
import { CHART_SPECS } from "../shared/chartSpecs"
import { getCapability } from "../../ai/chartCapabilities"

describe("deprecated physics chart aliases", () => {
  it("keeps the old names importable and identical to the new ones", () => {
    expect(PhysicsPileChart).toBe(UnitPileChart)
    expect(PhysicalFlowChart).toBe(PacketFlowChart)
    // The pre-existing typo alias this pattern follows.
    expect(GuantletChart).toBe(GauntletChart)
  })

  it("reports the canonical displayName, not the alias", () => {
    expect(
      (UnitPileChart as { displayName?: string }).displayName ?? "UnitPileChart"
    ).toBe("UnitPileChart")
    expect((PacketFlowChart as { displayName?: string }).displayName).toBe(
      "PacketFlowChart"
    )
  })
})

describe("registries carry only the canonical name", () => {
  it("registers the new names", () => {
    expect(CHART_SPECS.UnitPileChart?.name).toBe("UnitPileChart")
    expect(CHART_SPECS.PacketFlowChart?.name).toBe("PacketFlowChart")
    expect(getCapability("UnitPileChart")?.component).toBe("UnitPileChart")
    expect(getCapability("PacketFlowChart")?.component).toBe("PacketFlowChart")
  })

  it("does not double-register the deprecated names", () => {
    // Registering both would inflate the surface-parity counts and let
    // suggestCharts recommend the same chart twice under two names.
    expect(CHART_SPECS.PhysicsPileChart).toBeUndefined()
    expect(CHART_SPECS.PhysicalFlowChart).toBeUndefined()
    expect(getCapability("PhysicsPileChart")).toBeUndefined()
    expect(getCapability("PhysicalFlowChart")).toBeUndefined()
  })

  it("leaves no substrate-prefixed chart names in the registry", () => {
    // PhysicsCustomChart is exempt: the four custom-layout escape hatches are
    // named by frame family (XY/Ordinal/Network/Geo/Physics), which is correct.
    const leaking = Object.keys(CHART_SPECS).filter(
      (name) => /^Physic/.test(name) && name !== "PhysicsCustomChart"
    )
    expect(leaking).toEqual([])
  })
})

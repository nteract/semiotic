import { describe, expect, it } from "vitest"
import { OrdinalStyleResolver } from "./OrdinalStyleResolver"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

const baseConfig: OrdinalPipelineConfig = {
  chartType: "bar",
  windowSize: 500,
  windowMode: "sliding",
  extentPadding: 0.05,
  projection: "vertical"
}

describe("OrdinalStyleResolver", () => {
  it("treats inherited barColors keys as unmapped categories", () => {
    const resolver = new OrdinalStyleResolver()

    expect(
      resolver.resolvePieceStyle(
        { ...baseConfig, barColors: {} },
        { category: "constructor" },
        "constructor"
      )
    ).toEqual({ fill: "#007bff" })
  })

  it("keeps own barColors entries authoritative", () => {
    const resolver = new OrdinalStyleResolver()

    expect(
      resolver.resolvePieceStyle(
        { ...baseConfig, barColors: { constructor: "#123456" } },
        { category: "constructor" },
        "constructor"
      )
    ).toEqual({ fill: "#123456" })
  })
})

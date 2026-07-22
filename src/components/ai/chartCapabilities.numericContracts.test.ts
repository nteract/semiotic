import { describe, expect, it } from "vitest"
import { BUILT_IN_NUMERIC_CONTRACTS } from "../data/numericContracts"
import { getCapabilities } from "./chartCapabilities"

describe("built-in capability numeric contracts", () => {
  it("keeps the public capability catalog in identity parity with the contract table", () => {
    const capabilities = getCapabilities()
    const byComponent = new Map(
      capabilities.map((capability) => [capability.component, capability]),
    )

    for (const [component, contracts] of Object.entries(
      BUILT_IN_NUMERIC_CONTRACTS,
    )) {
      expect(
        byComponent.get(component),
        `${component} needs a built-in capability`,
      ).toBeDefined()
      expect(
        byComponent.get(component)?.numericContracts,
        `${component} must expose its canonical numeric contract`,
      ).toBe(contracts)
    }

    for (const capability of capabilities) {
      if (!capability.numericContracts) continue
      expect(
        BUILT_IN_NUMERIC_CONTRACTS[capability.component],
        `${capability.component} declares a non-canonical numeric contract`,
      ).toBe(capability.numericContracts)
    }
  })
})

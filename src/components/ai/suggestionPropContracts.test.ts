import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { getCapabilities } from "./chartCapabilities"
import { suggestionPropContractForFamily } from "./suggestionPropContracts"

describe("suggestion prop contracts", () => {
  it("matches the generated component contract for every built-in capability", () => {
    const manifest = JSON.parse(
      readFileSync("ai/surface-manifest.json", "utf8")
    ) as {
      components: {
        suggestionPropContracts: Record<string, unknown>
      }
    }

    for (const capability of getCapabilities()) {
      expect(
        capability.suggestionPropContract ??
          suggestionPropContractForFamily(capability.family),
        capability.component
      ).toEqual(
        manifest.components.suggestionPropContracts[capability.component]
      )
    }
  })
})

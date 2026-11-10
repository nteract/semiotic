import { describe, expect, it, vi } from "vitest"
import { loadConsumerContracts } from "../../../scripts/check-consumer-contracts"
import { serverPropContracts } from "../../../consumer-contracts/server-props"
import { serverPropAssertions } from "../../../consumer-contracts/server-prop-assertions"
import { CHART_CONFIGS } from "./serverChartConfigs"

const seeds = loadConsumerContracts()
const contextFor = (id: string) => {
  const contract = serverPropContracts.find((entry) => entry.id === id)!
  return {
    contract,
    seed: seeds.find((seed) => seed.contract.id === contract.fixture)
  }
}

describe("reviewed server prop contracts", () => {
  it("executes exactly the assertions declared in coverage metadata", () => {
    expect(Object.keys(serverPropAssertions).sort()).toEqual(
      serverPropContracts.map((entry) => entry.id).sort()
    )
  })
  for (const contract of serverPropContracts) {
    it(`${contract.id}: ${contract.observable}`, () => {
      serverPropAssertions[contract.id](contextFor(contract.id))
    })
  }

  it.each([
    ["LineChart", "band", "line-band", /band must produce/],
    ["SwimlaneChart", "rExtent", "SwimlaneChart-bars", /valueExtent must pin/],
    ["BarChart", "roundedTop", "BarChart-bars", /roundedTop must create/]
  ] as const)(
    "detects missing %s forwarding of %s even when the input is read",
    (component, prop, id, diagnostic) => {
      const config = CHART_CONFIGS[component]
      const original = config.buildProps
      const spy = vi
        .spyOn(config, "buildProps")
        .mockImplementation((...args) => {
          const forwarded = original(...args)
          void forwarded[prop] // Reading the name does not count as honoring it.
          delete forwarded[prop]
          return forwarded
        })
      try {
        expect(() => serverPropAssertions[id](contextFor(id))).toThrow(
          diagnostic
        )
      } finally {
        spy.mockRestore()
      }
      serverPropAssertions[id](contextFor(id))
    }
  )
})

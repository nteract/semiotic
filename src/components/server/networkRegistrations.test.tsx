import { describe, expect, it } from "vitest"
import { NETWORK_COMPONENT_REGISTRY } from "../../../ai/componentRegistryNetwork.generated"
import * as networkCharts from "../semiotic-network"
import { MotifBraidChart, DependencyForestChart } from "../semiotic-atlas"
import { networkDefinitionFixtures } from "../../test-utils/networkDefinitionFixtures"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const expectedComponents = {
  ...networkCharts,
  MotifBraidChart,
  DependencyForestChart
}

describe("generated network registrations", () => {
  it.each(Object.entries(networkDefinitionFixtures))(
    "renders data marks for %s",
    (chart, props) => {
      const name = chart as keyof typeof networkDefinitionFixtures
      expect(NETWORK_COMPONENT_REGISTRY[name]).toEqual({
        component: expectedComponents[name],
        category: "network"
      })
      const { svg, evidence } = renderChartWithEvidence(chart, {
        ...props,
        width: 900,
        height: 500,
        title: `${chart} registration check`
      })
      expect(evidence.component).toBe(chart)
      expect(evidence.empty).toBe(false)
      expect(evidence.markCount).toBeGreaterThan(0)
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain(`${chart} registration check`)
    }
  )
})

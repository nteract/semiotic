import { describe, expect, it } from "vitest"
import { ORDINAL_COMPONENT_REGISTRY } from "../../../ai/componentRegistryOrdinal.generated"
import * as ordinalCharts from "../semiotic-ordinal"
import { ordinalDefinitionFixtures } from "../../test-utils/ordinalDefinitionFixtures"
import { renderChartWithEvidence } from "./renderToStaticSVG"

describe("generated ordinal registrations", () => {
  it.each(Object.entries(ordinalDefinitionFixtures))(
    "renders data marks for %s",
    (chart, props) => {
      const name = chart as keyof typeof ordinalDefinitionFixtures
      expect(ORDINAL_COMPONENT_REGISTRY[name]).toEqual({
        component: ordinalCharts[name],
        category: "ordinal"
      })
      const { svg, evidence } = renderChartWithEvidence(chart, {
        ...props,
        width: 600,
        height: 400,
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

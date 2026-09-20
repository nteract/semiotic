import { describe, expect, it } from "vitest"
import { PHYSICS_COMPONENT_REGISTRY } from "../../../ai/componentRegistryPhysics.generated"
import { physicsDefinitionFixtures } from "../../../scripts/fixtures/physics-definition-fixtures"
import * as physicsCharts from "../semiotic-physics"
import { FlowCircuitChart } from "../semiotic-atlas"
import { renderChartWithEvidence } from "./renderToStaticSVG"

const expectedComponents = { ...physicsCharts, FlowCircuitChart }

describe("generated physics registrations", () => {
  it.each(Object.entries(physicsDefinitionFixtures))(
    "renders data marks for %s",
    (chart, props) => {
      const name = chart as keyof typeof physicsDefinitionFixtures
      expect(PHYSICS_COMPONENT_REGISTRY[name]).toEqual({
        component: expectedComponents[name],
        category: "physics"
      })
      const { svg, evidence } = renderChartWithEvidence(chart, {
        ...props,
        width: 980,
        height: 860,
        title: `${chart} registration check`
      })
      expect(evidence.component).toBe(chart)
      expect(evidence.frameType).toBe("physics")
      expect(evidence.empty).toBe(false)
      expect(evidence.markCount).toBeGreaterThan(0)
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain(`${chart} registration check`)
    }
  )
})

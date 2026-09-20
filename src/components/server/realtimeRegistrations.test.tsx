import { describe, expect, it } from "vitest"
import { COMPONENT_REGISTRY } from "../../../ai/componentRegistry"
import { REALTIME_COMPONENT_REGISTRY } from "../../../ai/componentRegistryRealtime.generated"
import { realtimeDefinitionFixtures } from "../../test-utils/realtimeDefinitionFixtures"
import { TemporalHistogram } from "../semiotic-realtime"
import { renderChartWithEvidence } from "./renderToStaticSVG"
import { inspectChart } from "../ai/chartClinic"

const routes = {
  RealtimeLineChart: "realtime-line-chart",
  RealtimeHistogram: "realtime-histogram",
  TemporalHistogram: "realtime-histogram",
  RealtimeSwarmChart: "realtime-swarm-chart",
  RealtimeWaterfallChart: "realtime-waterfall-chart",
  RealtimeHeatmap: "realtime-heatmap"
}

describe("generated realtime registrations", () => {
  it("preserves the MCP TemporalHistogram component and category", () => {
    expect(REALTIME_COMPONENT_REGISTRY).toEqual({
      TemporalHistogram: { component: TemporalHistogram, category: "xy" }
    })
  })

  it.each(Object.entries(realtimeDefinitionFixtures))(
    "renders bounded %s data and supplies valid Clinic links",
    (chart, props) => {
      if (chart !== "TemporalHistogram")
        expect(COMPONENT_REGISTRY).not.toHaveProperty(chart)
      const { svg, evidence } = renderChartWithEvidence(chart, {
        ...props,
        width: 600,
        height: 400,
        title: `${chart} snapshot`
      })
      expect(evidence.component).toBe(chart)
      expect(evidence.frameType).toBe("xy")
      expect(evidence.empty).toBe(false)
      expect(evidence.markCount).toBeGreaterThan(0)
      expect(svg).not.toMatch(/NaN|Infinity/)
      expect(svg).toContain(`${chart} snapshot`)
      expect(inspectChart({ component: chart, props }).bundle).toMatchObject({
        category: "realtime",
        recommendedImport: "semiotic/realtime",
        serverImport: "semiotic/server",
        docsRoute: `/charts/${routes[chart as keyof typeof routes]}`
      })
    }
  )
})

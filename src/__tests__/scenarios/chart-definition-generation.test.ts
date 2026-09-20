import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { generateFamilyRegistrations } from "../../../scripts/lib/chart-definition-generators"
import { buildChartSpecArtifacts } from "../../../scripts/lib/chart-spec-artifacts"
import { NETWORK_CHART_DEFINITIONS } from "../../components/charts/shared/chartDefinitionsNetwork"
import {
  motifBraidChart,
  dependencyForestChart
} from "../../components/server/serverChartConfigsAtlas"
import {
  processSankey,
  circlePack
} from "../../components/server/serverChartConfigsNetwork"
import { PHYSICS_CHART_DEFINITIONS } from "../../components/charts/shared/chartDefinitionsPhysics"
import { flowCircuitChart } from "../../components/server/serverChartConfigsAtlas"
import {
  galtonBoardChart,
  crucibleChart,
  packetFlowChart,
  physicsCustomChart
} from "../../components/server/serverChartConfigsPhysics"
import { chainReactionChart } from "../../components/server/serverChartConfigsComposite"
import { ORDINAL_CHART_DEFINITIONS } from "../../components/charts/shared/chartDefinitionsOrdinal"
import {
  gaugeChart,
  likertChart,
  violinPlot,
  radarChart
} from "../../components/server/serverChartConfigsOrdinal"
import { XY_CHART_DEFINITIONS } from "../../components/charts/shared/chartDefinitionsXY"
import type { ChartDefinition } from "../../components/charts/shared/chartDefinition"
import { CHART_CONFIGS } from "../../components/server/serverChartConfigs"
import { areaChart } from "../../components/server/serverChartConfigsXY"
import { heatmap } from "../../components/server/serverChartConfigHeatmap"
import {
  minimapChart,
  scatterplotMatrix
} from "../../components/server/serverChartConfigsComposite"

import { REALTIME_CHART_DEFINITIONS } from "../../components/charts/shared/chartDefinitionsRealtime"
import { temporalHistogram } from "../../components/server/serverChartConfigsXY"
import { realtimeLineChart } from "../../components/server/serverChartConfigsRealtime"

const metadata = readFileSync("ai/componentMetadata.cjs", "utf8")

describe("chart definition generation", () => {
  it("uses one current projection for every checked-in output", () => {
    const { files } = buildChartSpecArtifacts(process.cwd())
    expect(Object.keys(files)).toHaveLength(15)
    for (const [filename, expected] of Object.entries(files)) {
      expect(readFileSync(filename, "utf8"), filename).toBe(expected)
    }
  })

  it("preserves actual renderer identity across ordinary, heatmap and composite XY charts", () => {
    expect(CHART_CONFIGS.AreaChart).toBe(areaChart)
    expect(CHART_CONFIGS.Heatmap).toBe(heatmap)
    expect(CHART_CONFIGS.MinimapChart).toBe(minimapChart)
    expect(CHART_CONFIGS.ScatterplotMatrix).toBe(scatterplotMatrix)
  })

  it("preserves ordinal renderer identities, including re-exported gauge and Likert renderers", () => {
    expect(CHART_CONFIGS.GaugeChart).toBe(gaugeChart)
    expect(CHART_CONFIGS.LikertChart).toBe(likertChart)
    expect(CHART_CONFIGS.ViolinPlot).toBe(violinPlot)
    expect(CHART_CONFIGS.RadarChart).toBe(radarChart)
  })

  it("updates ordinal registrations without changing XY or authored categories", () => {
    const files = generateFamilyRegistrations(
      "ordinal",
      { GaugeChart: ORDINAL_CHART_DEFINITIONS.GaugeChart },
      metadata
    )
    const authored = (text: string) =>
      text.replace(
        / {2}\/\/ BEGIN GENERATED ORDINAL CHARTS[\s\S]*? {2}\/\/ END GENERATED ORDINAL CHARTS/,
        ""
      )
    expect(authored(files["ai/componentMetadata.cjs"])).toBe(authored(metadata))
    expect(files["ai/componentRegistryOrdinal.generated.ts"]).toContain(
      'GaugeChart: { component: GaugeChart, category: "ordinal" }'
    )
    expect(
      files["src/components/server/serverChartConfigsOrdinal.generated.ts"]
    ).toContain("GaugeChart: gaugeChart")
    expect(() =>
      generateFamilyRegistrations("xy", ORDINAL_CHART_DEFINITIONS, metadata)
    ).toThrow("explicit static renderer")
  })

  it("preserves network renderers and Atlas entry points while updating only its category", () => {
    expect(CHART_CONFIGS.MotifBraidChart).toBe(motifBraidChart)
    expect(CHART_CONFIGS.DependencyForestChart).toBe(dependencyForestChart)
    expect(CHART_CONFIGS.ProcessSankey).toBe(processSankey)
    expect(CHART_CONFIGS.CirclePack).toBe(circlePack)
    const files = generateFamilyRegistrations(
      "network",
      NETWORK_CHART_DEFINITIONS,
      metadata
    )
    const components = files["ai/componentRegistryNetwork.generated.ts"]
    expect(components).toContain(
      'import { MotifBraidChart, DependencyForestChart } from "semiotic/atlas"'
    )
    const aiImports = components
      .split("\n")
      .find((line) => line.endsWith('from "semiotic/ai"'))!
    expect(aiImports).toContain("ForceDirectedGraph")
    expect(aiImports).not.toMatch(/MotifBraidChart|DependencyForestChart/)
    const authored = (text: string) =>
      text.replace(
        / {2}\/\/ BEGIN GENERATED NETWORK CHARTS[\s\S]*? {2}\/\/ END GENERATED NETWORK CHARTS/,
        ""
      )
    expect(authored(files["ai/componentMetadata.cjs"])).toBe(authored(metadata))
  })

  it("preserves physics, composite, and Atlas mappings without absorbing the custom escape hatch", () => {
    expect(CHART_CONFIGS.GaltonBoardChart).toBe(galtonBoardChart)
    expect(CHART_CONFIGS.CrucibleChart).toBe(crucibleChart)
    expect(CHART_CONFIGS.PacketFlowChart).toBe(packetFlowChart)
    expect(CHART_CONFIGS.ChainReactionChart).toBe(chainReactionChart)
    expect(CHART_CONFIGS.FlowCircuitChart).toBe(flowCircuitChart)
    expect(CHART_CONFIGS.PhysicsCustomChart).toBe(physicsCustomChart)
    const files = generateFamilyRegistrations(
      "physics",
      PHYSICS_CHART_DEFINITIONS,
      metadata
    )
    const components = files["ai/componentRegistryPhysics.generated.ts"]
    expect(components).toContain(
      'import { FlowCircuitChart } from "semiotic/atlas"'
    )
    expect(
      components.split("\n").find((line) => line.endsWith('from "semiotic/ai"'))
    ).not.toContain("FlowCircuitChart")
    expect(
      files["src/components/server/serverChartConfigsPhysics.generated.ts"]
    ).not.toContain("PhysicsCustomChart")
    const authored = (text: string) =>
      text.replace(
        / {2}\/\/ BEGIN GENERATED PHYSICS CHARTS[\s\S]*? {2}\/\/ END GENERATED PHYSICS CHARTS/,
        ""
      )
    expect(authored(files["ai/componentMetadata.cjs"])).toBe(authored(metadata))
  })

  it("separates realtime server snapshots from the narrower MCP render surface", () => {
    expect(CHART_CONFIGS.TemporalHistogram).toBe(temporalHistogram)
    expect(CHART_CONFIGS.RealtimeLineChart).toBe(realtimeLineChart)
    const files = generateFamilyRegistrations(
      "realtime",
      REALTIME_CHART_DEFINITIONS,
      metadata
    )
    const components = files["ai/componentRegistryRealtime.generated.ts"]
    expect(components).toContain(
      'TemporalHistogram: { component: TemporalHistogram, category: "xy" }'
    )
    for (const name of Object.keys(REALTIME_CHART_DEFINITIONS)) {
      expect(
        files["src/components/server/serverChartConfigsRealtime.generated.ts"]
      ).toContain(`${name}:`)
      if (name !== "TemporalHistogram") expect(components).not.toContain(name)
    }
    const authored = (text: string) =>
      text.replace(
        / {2}\/\/ BEGIN GENERATED REALTIME CHARTS[\s\S]*? {2}\/\/ END GENERATED REALTIME CHARTS/,
        ""
      )
    expect(authored(files["ai/componentMetadata.cjs"])).toBe(authored(metadata))
  })

  it("projects changed references into registrations without overwriting authored metadata", () => {
    const original = XY_CHART_DEFINITIONS.AreaChart
    const moved: ChartDefinition = {
      ...original,
      metadata: {
        ...original.metadata,
        support: {
          browser: "react",
          server: {
            mode: "render-chart",
            chartConfig: "AreaChart",
            implementation: {
              module: "./movedRenderer",
              exportName: "movedArea"
            }
          }
        }
      }
    }
    const files = generateFamilyRegistrations(
      "xy",
      { AreaChart: moved },
      metadata
    )
    const server =
      files["src/components/server/serverChartConfigsXY.generated.ts"]
    expect(server).toContain('import { movedArea } from "./movedRenderer"')
    expect(server).toContain("AreaChart: movedArea")
    expect(server).not.toMatch(/import.*chartDefinitions/)
    const authored = (text: string) =>
      text.replace(
        / {2}\/\/ BEGIN GENERATED XY CHARTS[\s\S]*? {2}\/\/ END GENERATED XY CHARTS/,
        ""
      )
    expect(authored(files["ai/componentMetadata.cjs"])).toBe(authored(metadata))
    expect(files["ai/componentRegistryXY.generated.ts"]).toContain(
      'AreaChart: { component: AreaChart, category: "xy" }'
    )
  })

  it("rejects missing static renderer references and ambiguous marker regions", () => {
    const definition = XY_CHART_DEFINITIONS.AreaChart
    const missing: ChartDefinition = {
      ...definition,
      metadata: {
        ...definition.metadata,
        support: {
          browser: "react",
          server: { mode: "render-chart", chartConfig: "AreaChart" }
        }
      }
    }
    expect(() =>
      generateFamilyRegistrations("xy", { AreaChart: missing }, metadata)
    ).toThrow("explicit static renderer")
    expect(() =>
      generateFamilyRegistrations(
        "xy",
        XY_CHART_DEFINITIONS,
        metadata + "\n  // BEGIN GENERATED XY CHARTS"
      )
    ).toThrow("exactly one")
  })
})

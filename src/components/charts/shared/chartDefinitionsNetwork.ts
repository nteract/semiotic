import { createChartDefinition, type ChartDefinition } from "./chartDefinition"
import { NETWORK_CHART_SPECS } from "./chartSpecsNetwork"
import { ATLAS_CHART_SPECS } from "./chartSpecsAtlas"

/** Network registration references, including the two network Atlas readers. */
const references = {
  MotifBraidChart: [
    "motif-braid-chart",
    "motifBraidChart",
    "serverChartConfigsAtlas"
  ],
  DependencyForestChart: [
    "dependency-forest-chart",
    "dependencyForestChart",
    "serverChartConfigsAtlas"
  ],
  ForceDirectedGraph: [
    "force-directed-graph",
    "forceDirectedGraph",
    "serverChartConfigsNetwork"
  ],
  SankeyDiagram: [
    "sankey-diagram",
    "sankeyDiagram",
    "serverChartConfigsNetwork"
  ],
  ProcessSankey: [
    "process-sankey",
    "processSankey",
    "serverChartConfigsNetwork"
  ],
  ChordDiagram: ["chord-diagram", "chordDiagram", "serverChartConfigsNetwork"],
  TreeDiagram: ["tree-diagram", "treeDiagram", "serverChartConfigsNetwork"],
  Treemap: ["treemap", "treemap", "serverChartConfigsNetwork"],
  CirclePack: ["circle-pack", "circlePack", "serverChartConfigsNetwork"],
  OrbitDiagram: ["orbit-diagram", "orbitDiagram", "serverChartConfigsNetwork"]
} as const

export type NetworkChartDefinitionId = keyof typeof references

export const NETWORK_CHART_DEFINITIONS = Object.fromEntries(
  Object.entries(references).map(([name, [route, exportName, module]]) => {
    const spec = NETWORK_CHART_SPECS[name] ?? ATLAS_CHART_SPECS[name]
    if (!spec) throw new Error(`Missing network chart spec: ${name}`)
    const propDocs = {
      componentName: name,
      route: `/charts/${route}`,
      source: `docs/src/pages/charts/${name}Page.jsx`
    }
    return [
      name,
      createChartDefinition(spec, {
        implementation: {
          module: spec.importPath ?? "semiotic/network",
          exportName: name
        },
        capabilityModule:
          name in ATLAS_CHART_SPECS
            ? "src/components/charts/shared/chartSpecsAtlas.ts"
            : `src/components/charts/network/${name}.capability.ts`,
        propDocs,
        server: {
          mode: "render-chart",
          chartConfig: name,
          implementation: { module: `./${module}`, exportName }
        },
        examples:
          name === "ForceDirectedGraph"
            ? [
                {
                  route: "/examples/local-government-explorer",
                  source:
                    "docs/src/pages/examples/LocalGovernmentExplorerExamplePage.jsx"
                }
              ]
            : [
                {
                  kind: "chart-doc",
                  route: propDocs.route,
                  source: propDocs.source
                }
              ]
      })
    ]
  })
) as Readonly<Record<NetworkChartDefinitionId, ChartDefinition>>

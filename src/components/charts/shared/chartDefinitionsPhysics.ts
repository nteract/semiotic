import { createChartDefinition, type ChartDefinition } from "./chartDefinition"
import { PHYSICS_CHART_SPECS } from "./chartSpecsPhysics"
import { ATLAS_CHART_SPECS } from "./chartSpecsAtlas"

/** Physics registration references, including the Atlas Flow Circuit reader. */
const references = {
  FlowCircuitChart: [
    "flow-circuit-chart",
    "flowCircuitChart",
    "serverChartConfigsAtlas"
  ],
  GaltonBoardChart: [
    "galton-board-chart",
    "galtonBoardChart",
    "serverChartConfigsPhysics"
  ],
  EventDropChart: [
    "event-drop-chart",
    "eventDropChart",
    "serverChartConfigsPhysics"
  ],
  UnitPileChart: [
    "unit-pile-chart",
    "unitPileChart",
    "serverChartConfigsPhysics"
  ],
  CollisionSwarmChart: [
    "collision-swarm-chart",
    "collisionSwarmChart",
    "serverChartConfigsPhysics"
  ],
  PacketFlowChart: [
    "packet-flow-chart",
    "packetFlowChart",
    "serverChartConfigsPhysics"
  ],
  ProcessFlowChart: [
    "process-flow-chart",
    "processFlowChart",
    "serverChartConfigsPhysics"
  ],
  GauntletChart: [
    "gauntlet-chart",
    "gauntletChart",
    "serverChartConfigsPhysics"
  ],
  CrucibleChart: [
    "crucible-chart",
    "crucibleChart",
    "serverChartConfigsPhysics"
  ],
  ChainReactionChart: [
    "chain-reaction-chart",
    "chainReactionChart",
    "serverChartConfigsComposite"
  ]
} as const

export type PhysicsChartDefinitionId = keyof typeof references

export const PHYSICS_CHART_DEFINITIONS = Object.fromEntries(
  Object.entries(references).map(([name, [route, exportName, module]]) => {
    const spec = PHYSICS_CHART_SPECS[name] ?? ATLAS_CHART_SPECS[name]
    if (!spec) throw new Error(`Missing physics chart spec: ${name}`)
    const propDocs = {
      componentName: name,
      route: `/charts/${route}`,
      source: `docs/src/pages/charts/${name}Page.jsx`
    }
    return [
      name,
      createChartDefinition(spec, {
        implementation: {
          module: spec.importPath ?? "semiotic/physics",
          exportName: name
        },
        capabilityModule:
          name in ATLAS_CHART_SPECS
            ? "src/components/charts/shared/chartSpecsAtlas.ts"
            : `src/components/charts/physics/${name}.capability.ts`,
        propDocs,
        server: {
          mode: "render-chart",
          chartConfig: name,
          implementation: { module: `./${module}`, exportName }
        },
        examples: [
          { kind: "chart-doc", route: propDocs.route, source: propDocs.source }
        ]
      })
    ]
  })
) as Readonly<Record<PhysicsChartDefinitionId, ChartDefinition>>

/**
 * AUTO-GENERATED from chartDefinitionsPhysics.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import type { ChartConfig } from "./serverChartConfigShared"
import { flowCircuitChart } from "./serverChartConfigsAtlas"
import { galtonBoardChart, eventDropChart, unitPileChart, collisionSwarmChart, packetFlowChart, processFlowChart, gauntletChart, crucibleChart } from "./serverChartConfigsPhysics"
import { chainReactionChart } from "./serverChartConfigsComposite"

export const PHYSICS_CHART_CONFIGS = {
  FlowCircuitChart: flowCircuitChart,
  GaltonBoardChart: galtonBoardChart,
  EventDropChart: eventDropChart,
  UnitPileChart: unitPileChart,
  CollisionSwarmChart: collisionSwarmChart,
  PacketFlowChart: packetFlowChart,
  ProcessFlowChart: processFlowChart,
  GauntletChart: gauntletChart,
  CrucibleChart: crucibleChart,
  ChainReactionChart: chainReactionChart
} satisfies Record<string, ChartConfig>

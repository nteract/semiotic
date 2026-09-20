/**
 * AUTO-GENERATED from chartDefinitionsPhysics.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run `npm run docs:chart-specs:schema`.
 */
import { FlowCircuitChart } from "semiotic/atlas"
import { GaltonBoardChart, EventDropChart, UnitPileChart, CollisionSwarmChart, PacketFlowChart, ProcessFlowChart, GauntletChart, CrucibleChart, ChainReactionChart } from "semiotic/ai"
import type { RegistryEntry } from "./componentRegistry"

export const PHYSICS_COMPONENT_REGISTRY = {
  FlowCircuitChart: { component: FlowCircuitChart, category: "physics" },
  GaltonBoardChart: { component: GaltonBoardChart, category: "physics" },
  EventDropChart: { component: EventDropChart, category: "physics" },
  UnitPileChart: { component: UnitPileChart, category: "physics" },
  CollisionSwarmChart: { component: CollisionSwarmChart, category: "physics" },
  PacketFlowChart: { component: PacketFlowChart, category: "physics" },
  ProcessFlowChart: { component: ProcessFlowChart, category: "physics" },
  GauntletChart: { component: GauntletChart, category: "physics" },
  CrucibleChart: { component: CrucibleChart, category: "physics" },
  ChainReactionChart: { component: ChainReactionChart, category: "physics" }
} satisfies Record<string, RegistryEntry>

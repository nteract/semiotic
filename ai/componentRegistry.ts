/**
 * Maps component names to their React component + category.
 * Used by the MCP server to look up components for rendering.
 */
import { REALTIME_COMPONENT_REGISTRY } from "./componentRegistryRealtime.generated"
import type { ComponentType } from "react"
import { ORDINAL_COMPONENT_REGISTRY } from "./componentRegistryOrdinal.generated"
import { XY_COMPONENT_REGISTRY } from "./componentRegistryXY.generated"
import { NETWORK_COMPONENT_REGISTRY } from "./componentRegistryNetwork.generated"
import { PHYSICS_COMPONENT_REGISTRY } from "./componentRegistryPhysics.generated"

import { BigNumber, ChartRecipe } from "semiotic/ai"

import {
  ChoroplethMap,
  ProportionalSymbolMap,
  FlowMap,
  DistanceCartogram
} from "semiotic/geo"

export interface RegistryEntry {
  component: ComponentType<any>
  category: "xy" | "ordinal" | "network" | "geo" | "physics" | "value"
  recipeId?: string
}

export const COMPONENT_REGISTRY: Record<string, RegistryEntry> = {
  ...XY_COMPONENT_REGISTRY,
  ...REALTIME_COMPONENT_REGISTRY,

  ...ORDINAL_COMPONENT_REGISTRY,

  ...NETWORK_COMPONENT_REGISTRY,

  ChoroplethMap: { component: ChoroplethMap, category: "geo" },
  ProportionalSymbolMap: { component: ProportionalSymbolMap, category: "geo" },
  FlowMap: { component: FlowMap, category: "geo" },
  DistanceCartogram: { component: DistanceCartogram, category: "geo" },

  ...PHYSICS_COMPONENT_REGISTRY,

  BigNumber: { component: BigNumber, category: "value" },

  ParallelCoordinatesRecipe: {
    component: ChartRecipe,
    category: "ordinal",
    recipeId: "ParallelCoordinatesRecipe"
  },
  CalendarHeatmapRecipe: {
    component: ChartRecipe,
    category: "xy",
    recipeId: "CalendarHeatmapRecipe"
  }
}

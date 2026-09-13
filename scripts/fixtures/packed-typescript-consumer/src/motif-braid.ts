import {
  prepareNetworkAtlasAsync,
  prepareMotifBraid,
  motifBraidLayout,
  type NetworkAtlasSpec,
  type NetworkAtlasSource,
  type PrepareNetworkAtlasResult,
  type MotifBraidProjection,
  type MotifBraidLayoutConfig
} from "semiotic/recipes/core"
import * as recipes from "semiotic/recipes"
import { renderChart } from "semiotic/server"

export async function renderBraid(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource
) {
  const prepared: PrepareNetworkAtlasResult = await prepareNetworkAtlasAsync(
    spec,
    source
  )
  if (!prepared.ok) return prepared.issues
  const braid: MotifBraidProjection = await prepareMotifBraid(prepared.atlas)
  const layoutConfig: MotifBraidLayoutConfig = { braid }
  return renderChart("NetworkCustomChart", {
    nodes: braid.sceneSeeds.nodes,
    edges: braid.sceneSeeds.edges,
    layout: motifBraidLayout,
    layoutConfig,
    width: 640,
    height: 360
  })
}

export const mixedPreparation: typeof prepareNetworkAtlasAsync =
  recipes.prepareNetworkAtlasAsync
export const mixedProjection: typeof prepareMotifBraid =
  recipes.prepareMotifBraid
export const mixedLayout: typeof motifBraidLayout = recipes.motifBraidLayout
export type MixedProjection = recipes.MotifBraidProjection
export type MixedSpec = recipes.NetworkAtlasSpec
export type MixedSource = recipes.NetworkAtlasSource

export const requiredPathScope: NetworkAtlasSpec["forest"]["requiredPaths"] = {
  roots: ["A"],
  relationScopeId: "directed-admitted"
}

export const countedOccurrence: NonNullable<
  NetworkAtlasSource["occurrences"]
>[number] = {
  id: "counted",
  entityId: "cohort",
  entityCount: 7,
  nodePath: ["A", "B", "A"],
  stepEntityCounts: [100, 50, 10],
  complete: true
}

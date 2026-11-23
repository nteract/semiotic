import { compareRecipeIds } from "../../utils/compareRecipeIds"
import { entityCountOf } from "./entityCounts"
import { selectCapsules, type MotifCapsule } from "./capsules"
import {
  assignedDenominator,
  comparePartitionRates,
  resolveComparison,
  type UnavailableDifference,
  type SignedReadout
} from "./compare"
import { containsRoute } from "./support"
import { prefixIdFor } from "./ids"
import { buildMotifProfile, type MotifProfileStrip } from "./profile"
import type {
  AtlasOccurrence,
  PreparedNetworkAtlas,
  PrefixForest
} from "./types"

export type TrajectoryGroup = {
  id: string
  occurrenceId: string
  partition?: string
  nodePath: string[]
  entityCount: number
  /** Traffic at each nodePath step; entityCount remains the cohort weight. */
  stepEntityCounts?: number[]
  /** Canonical escaped nodePath key produced by prepareMotifBraid. */
  signature: string
}

export type BraidRibbon = {
  id: string
  groupId: string
  partition?: string
  fromPrefixId: string
  toPrefixId: string
  fromState: string
  toState: string
  entityCount: number
  /** Traffic at the destination step. Omit for a constant-width transition. */
  toEntityCount?: number
}

export type { SignedReadout, UnavailableDifference } from "./compare"

export type MotifBraidProjection = {
  atlas: PreparedNetworkAtlas
  groups: TrajectoryGroup[]
  signatureOrder: string[]
  ribbons: BraidRibbon[]
  capsules: MotifCapsule[]
  profile: MotifProfileStrip
  differences: SignedReadout[]
  unavailableDifferences?: UnavailableDifference[]
  prefixForest: PrefixForest
  sceneSeeds: {
    nodes: Array<{ id: string; partition?: string; signature?: string }>
    edges: Array<{ id: string; source: string; target: string }>
  }
}

function groupFromOccurrence(
  occurrence: AtlasOccurrence
): TrajectoryGroup | undefined {
  if (occurrence.missingPrehistory) return undefined
  return {
    id: `group:${occurrence.id}`,
    occurrenceId: occurrence.id,
    partition: occurrence.partition,
    nodePath: occurrence.nodePath,
    entityCount: entityCountOf(occurrence),
    ...(occurrence.stepEntityCounts && {
      stepEntityCounts: [...occurrence.stepEntityCounts]
    }),
    signature: prefixIdFor(occurrence.nodePath, occurrence.nodePath.length - 1)
  }
}

/** Geometry consumed by the React and static chart readers. */
export function prepareBraidGeometry(atlas: PreparedNetworkAtlas) {
  const prefixForest: PrefixForest = atlas.prefixForest ?? {
    kind: "observed-prefix",
    rootIds: [],
    nodes: [],
    order: []
  }
  const occurrences = atlas.prefixForest ? (atlas.source.occurrences ?? []) : []
  const groups = occurrences
    .map(groupFromOccurrence)
    .filter((group): group is TrajectoryGroup => Boolean(group))

  const signatures = new Set(groups.map(group => group.signature))
  const signatureOrder = prefixForest.order.filter(id => signatures.delete(id))
  for (const id of [...signatures].sort((a, b) => compareRecipeIds(a, b))) signatureOrder.push(id)

  const ribbons: BraidRibbon[] = []
  for (const group of groups) {
    for (let i = 0; i < group.nodePath.length - 1; i++) {
      const fromPrefixId = prefixIdFor(group.nodePath, i)
      const toPrefixId = prefixIdFor(group.nodePath, i + 1)
      ribbons.push({
        id: `ribbon:${group.id}:${i}`,
        groupId: group.id,
        partition: group.partition,
        fromPrefixId,
        toPrefixId,
        fromState: group.nodePath[i],
        toState: group.nodePath[i + 1],
        entityCount: group.stepEntityCounts?.[i] ?? group.entityCount,
        ...(group.stepEntityCounts && {
          toEntityCount: group.stepEntityCounts[i + 1]
        })
      })
    }
  }

  const sceneSeeds = {
    nodes: groups.map((group) => ({
      id: group.id,
      partition: group.partition,
      signature: group.signature
    })),
    edges: ribbons.map((ribbon) => ({
      id: ribbon.id,
      source: ribbon.fromPrefixId,
      target: ribbon.toPrefixId
    }))
  }

  return { atlas, groups, signatureOrder, ribbons, prefixForest, sceneSeeds }
}

export function prepareMotifBraid(
  atlas: PreparedNetworkAtlas
): MotifBraidProjection {
  const comparison = resolveComparison(atlas)
  return {
    ...prepareBraidGeometry(atlas),
    capsules: atlas.prefixForest
      ? selectCapsules(
          atlas.motifs.matches,
          atlas.source.occurrences,
          atlas.spec.comparison?.motifTemplates
        )
      : [],
    profile: buildMotifProfile(atlas),
    ...comparePartitionRates(comparison)
  }
}

export function ribbonSupportsRoute(
  braid: MotifBraidProjection,
  route: readonly string[]
): boolean {
  return braid.groups.some((group) => containsRoute(group.nodePath, route))
}

export { assignedDenominator }

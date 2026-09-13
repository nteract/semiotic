import { selectCapsules, type MotifCapsule } from "./capsules"
import {
  assignedDenominator,
  buildComparison,
  signedDifferenceBps
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

export type SignedReadout = {
  motif: string
  leftPartition: string
  rightPartition: string
  leftCount: number
  rightCount: number
  deltaCount: number
  deltaBps: number
  denominator: number
}

export type MotifBraidProjection = {
  atlas: PreparedNetworkAtlas
  groups: TrajectoryGroup[]
  signatureOrder: string[]
  ribbons: BraidRibbon[]
  capsules: MotifCapsule[]
  profile: MotifProfileStrip
  differences: SignedReadout[]
  prefixForest: PrefixForest
  sceneSeeds: {
    nodes: Array<{ id: string; partition?: string; signature?: string }>
    edges: Array<{ id: string; source: string; target: string }>
  }
}

function entityCountOf(occurrence: AtlasOccurrence): number {
  return occurrence.entityCount ?? 1
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

export function prepareMotifBraid(
  atlas: PreparedNetworkAtlas
): MotifBraidProjection {
  const prefixForest = atlas.prefixForest
  if (!prefixForest) {
    return {
      atlas,
      groups: [],
      signatureOrder: [],
      ribbons: [],
      capsules: [],
      profile: buildMotifProfile(atlas),
      differences: [],
      prefixForest: {
        kind: "observed-prefix",
        rootIds: [],
        nodes: [],
        order: []
      },
      sceneSeeds: { nodes: [], edges: [] }
    }
  }

  const groups = (atlas.source.occurrences ?? [])
    .map(groupFromOccurrence)
    .filter((group): group is TrajectoryGroup => Boolean(group))

  const signatureIndex = new Map<string, number>()
  for (const group of groups) {
    const rank = prefixForest.order.indexOf(group.signature)
    const current = signatureIndex.get(group.signature)
    const next = rank === -1 ? prefixForest.order.length : rank
    if (current == null || next < current)
      signatureIndex.set(group.signature, next)
  }
  const signatureOrder = [
    ...new Set(groups.map((group) => group.signature))
  ].sort((left, right) => {
    const rank =
      (signatureIndex.get(left) ?? 0) - (signatureIndex.get(right) ?? 0)
    return rank !== 0 ? rank : left.localeCompare(right)
  })

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

  const capsules = selectCapsules(atlas.motifs.matches)
  const comparison = atlas.comparison ?? buildComparison(atlas)
  const differences: SignedReadout[] = []
  if (comparison && comparison.partitions.length >= 2) {
    const left = comparison.rows[0]
    const right = comparison.rows[1]
    const denom = Math.min(left.assigned, right.assigned) || left.assigned
    const leftLoop = left.motifUsers["repeated-state-episode"] ?? 0
    const rightLoop = right.motifUsers["repeated-state-episode"] ?? 0
    differences.push({
      motif: "repeated-state-episode",
      leftPartition: left.partition,
      rightPartition: right.partition,
      leftCount: leftLoop,
      rightCount: rightLoop,
      deltaCount: rightLoop - leftLoop,
      deltaBps: signedDifferenceBps(leftLoop, rightLoop, denom),
      denominator: denom
    })
    differences.push({
      motif: "purchases",
      leftPartition: left.partition,
      rightPartition: right.partition,
      leftCount: left.outcomes.purchases ?? 0,
      rightCount: right.outcomes.purchases ?? 0,
      deltaCount:
        (right.outcomes.purchases ?? 0) - (left.outcomes.purchases ?? 0),
      deltaBps: signedDifferenceBps(
        left.outcomes.purchases ?? 0,
        right.outcomes.purchases ?? 0,
        denom
      ),
      denominator: denom
    })
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

  return {
    atlas,
    groups,
    signatureOrder,
    ribbons,
    capsules,
    profile: buildMotifProfile(atlas),
    differences,
    prefixForest,
    sceneSeeds
  }
}

export function ribbonSupportsRoute(
  braid: MotifBraidProjection,
  route: readonly string[]
): boolean {
  return braid.groups.some((group) => containsRoute(group.nodePath, route))
}

export { assignedDenominator }

import { selectCapsules, type MotifCapsule } from "./capsules"
import { assignedDenominator, buildComparison, signedDifferenceBps } from "./compare"
import { prefixIdFor } from "./prefixForest"
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
  expandedCapsuleIds: string[]
  sceneSeeds: {
    nodes: Array<{ id: string; partition?: string; signature?: string }>
    edges: Array<{ id: string; source: string; target: string }>
  }
}

function entityCountOf(occurrence: AtlasOccurrence): number {
  return occurrence.entityCount ?? 1
}

function groupFromOccurrence(occurrence: AtlasOccurrence): TrajectoryGroup | undefined {
  if (occurrence.missingPrehistory) return undefined
  return {
    id: `group:${occurrence.id}`,
    occurrenceId: occurrence.id,
    partition: occurrence.partition,
    nodePath: occurrence.nodePath,
    entityCount: entityCountOf(occurrence),
    signature: occurrence.nodePath.join(">")
  }
}

export function prepareMotifBraid(
  atlas: PreparedNetworkAtlas,
  options: { expandedCapsuleIds?: string[] } = {}
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
      expandedCapsuleIds: options.expandedCapsuleIds ?? [],
      sceneSeeds: { nodes: [], edges: [] }
    }
  }

  const groups = (atlas.source.occurrences ?? [])
    .map(groupFromOccurrence)
    .filter((group): group is TrajectoryGroup => Boolean(group))

  const signatureIndex = new Map<string, number>()
  for (const group of groups) {
    const firstPrefix = prefixIdFor(group.nodePath, 0)
    const rank = prefixForest.order.indexOf(firstPrefix)
    const current = signatureIndex.get(group.signature)
    const next = rank === -1 ? prefixForest.order.length : rank
    if (current == null || next < current) signatureIndex.set(group.signature, next)
  }
  const signatureOrder = [...new Set(groups.map((group) => group.signature))].sort(
    (left, right) => {
      const rank = (signatureIndex.get(left) ?? 0) - (signatureIndex.get(right) ?? 0)
      return rank !== 0 ? rank : left.localeCompare(right)
    }
  )

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
        entityCount: group.entityCount
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
      deltaCount: (right.outcomes.purchases ?? 0) - (left.outcomes.purchases ?? 0),
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
    expandedCapsuleIds: options.expandedCapsuleIds ?? [],
    sceneSeeds
  }
}

export function ribbonSupportsRoute(
  braid: MotifBraidProjection,
  route: readonly string[]
): boolean {
  const signature = route.join(">")
  return braid.groups.some(
    (group) => group.signature === signature || group.nodePath.join(">").includes(signature)
  )
}

export { assignedDenominator }

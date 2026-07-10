/** Pure settled projections derived from physics events and body groups. */

import type { StreamPhysicsRegionEvent } from "../stream/physics/StreamPhysicsFrame"
import type { BodyGroupSpec } from "./processPhysics"

export interface RegionCountBucket {
  id: string
  label?: string
  count: number
  bodyIds: string[]
}

export type RegionCountMap = Record<string, RegionCountBucket>

/** Reduce region-enter events into per-region unique body counts. */
export function aggregateRegionCounts(
  previous: RegionCountMap,
  event: Pick<StreamPhysicsRegionEvent, "type" | "bodyId" | "region">
): RegionCountMap {
  if (event.type !== "region-enter") return previous
  const regionId = event.region.id
  const current = previous[regionId] ?? {
    id: regionId,
    label: event.region.label ?? regionId,
    count: 0,
    bodyIds: []
  }
  if (current.bodyIds.includes(event.bodyId)) return previous
  const bodyIds = [...current.bodyIds, event.bodyId]
  return {
    ...previous,
    [regionId]: {
      ...current,
      count: bodyIds.length,
      bodyIds
    }
  }
}

export function regionCountsToProjectionRows(
  counts: RegionCountMap,
  order?: readonly string[]
): Array<{ label: string; value: number }> {
  const ids = order ?? Object.keys(counts)
  return ids
    .map((id) => counts[id])
    .filter((bucket): bucket is RegionCountBucket => bucket != null)
    .map((bucket) => ({
      label: bucket.label ?? bucket.id,
      value: bucket.count
    }))
}

/**
 * Group-completion ledger for all-members, any-member, and weighted-threshold
 * stories. Pure: callers supply which member ids have been absorbed.
 */
export function groupCompletionRows(
  groups: readonly BodyGroupSpec[],
  absorbedBodyIds: ReadonlySet<string> | readonly string[]
): Array<{
  id: string
  label: string
  mode: "allMembersAbsorbed" | "anyAbsorbed" | "threshold"
  complete: boolean
  absorbed: number
  total: number
  absorbedValue: number
  totalValue: number
  threshold?: number
  missing: string[]
}> {
  const absorbed =
    absorbedBodyIds instanceof Set
      ? absorbedBodyIds
      : new Set(absorbedBodyIds)
  return groups.map((group) => {
    const members = group.bodyIds ?? []
    const missing = members.filter((id) => !absorbed.has(id))
    const absorbedCount = members.length - missing.length
    const mode = group.completion?.mode ?? "allMembersAbsorbed"
    const valueByBodyId = group.completion?.valueByBodyId
    const memberValue = (bodyId: string): number => {
      const configured = valueByBodyId?.[bodyId]
      return Number.isFinite(configured) && Number(configured) >= 0
        ? Number(configured)
        : 1
    }
    const totalValue = members.reduce(
      (sum, bodyId) => sum + memberValue(bodyId),
      0
    )
    const absorbedValue = members.reduce(
      (sum, bodyId) => sum + (absorbed.has(bodyId) ? memberValue(bodyId) : 0),
      0
    )
    const configuredThreshold = group.completion?.threshold
    const threshold =
      mode === "threshold"
        ? Number.isFinite(configuredThreshold) && Number(configuredThreshold) >= 0
          ? Number(configuredThreshold)
          : totalValue
        : undefined
    const complete =
      members.length > 0 &&
      (mode === "anyAbsorbed"
        ? absorbedCount > 0
        : mode === "threshold"
          ? absorbedValue >= (threshold ?? totalValue)
          : missing.length === 0)
    return {
      id: group.id,
      label: group.label ?? group.id,
      mode,
      complete,
      absorbed: absorbedCount,
      total: members.length,
      absorbedValue,
      totalValue,
      threshold,
      missing
    }
  })
}

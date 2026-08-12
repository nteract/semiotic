// Bonded multi-slot group helpers for ProcessSankey lane ordering.
// Contiguous groupBy blocks move as indivisible units during readability search.

import type { WeightedOrderRelation } from "../../../recipes/layout1d"
import type { ProcessSankeySlot } from "./algorithm"
import {
  compareProcessSankeyIds,
  createProcessSankeyRecord,
  slotStableId,
  type SlotByNode
} from "./layoutGeometry"

export interface BondedSlotUnit {
  anchor: number
  stableId: string
  slots: ProcessSankeySlot[]
}

export function mapForOrder(order: readonly ProcessSankeySlot[]): SlotByNode {
  const result: SlotByNode = createProcessSankeyRecord<number>()
  order.forEach((slot, index) => {
    for (const occupant of slot.occupants) result[occupant.id] = index
  })
  return result
}

export function applyOrder(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  order: readonly ProcessSankeySlot[]
): void {
  slots.splice(0, slots.length, ...order)
  const next = mapForOrder(order)
  for (const id of Object.keys(slotByNode)) delete slotByNode[id]
  Object.assign(slotByNode, next)
}

/** Build indivisible ordering units. Ungrouped slots remain independent;
 * every non-empty group becomes one unit whose anchor is the mean position of
 * its members. Sorting by that anchor is a deterministic minimum-disruption
 * projection from any unconstrained ordering into a contiguous group order. */
export function bondedSlotUnits(
  order: readonly ProcessSankeySlot[]
): BondedSlotUnit[] {
  const grouped = new Map<
    string,
    { indexes: number[]; slots: ProcessSankeySlot[] }
  >()
  const units: BondedSlotUnit[] = []
  order.forEach((slot, index) => {
    if (!slot.group) {
      units.push({ anchor: index, stableId: slotStableId(slot), slots: [slot] })
      return
    }
    const entry = grouped.get(slot.group) ?? { indexes: [], slots: [] }
    entry.indexes.push(index)
    entry.slots.push(slot)
    grouped.set(slot.group, entry)
  })
  for (const [group, entry] of grouped) {
    units.push({
      anchor:
        entry.indexes.reduce((sum, index) => sum + index, 0) /
        entry.indexes.length,
      stableId: `${group}\u0000${entry.slots.map(slotStableId).join("\u0000")}`,
      // Preserve the within-block order from the input sequence so barycenter
      // and swap search on units never scramble an already-good internal order.
      slots: entry.slots
    })
  }
  return units.sort(
    (a, b) =>
      a.anchor - b.anchor || compareProcessSankeyIds(a.stableId, b.stableId)
  )
}

export function bondedSlotOrder(
  order: readonly ProcessSankeySlot[]
): ProcessSankeySlot[] {
  if (!order.some((slot) => slot.group)) return [...order]
  return bondedSlotUnits(order).flatMap((unit) => unit.slots)
}

export function hasMultiSlotBond(order: readonly ProcessSankeySlot[]): boolean {
  const seen = new Set<string>()
  for (const slot of order) {
    if (!slot.group) continue
    if (seen.has(slot.group)) return true
    seen.add(slot.group)
  }
  return false
}

export function flattenBondedUnits(
  units: readonly BondedSlotUnit[]
): ProcessSankeySlot[] {
  return units.flatMap((unit) => unit.slots)
}

/**
 * Collapse slot-level weighted relations onto bonded units. Multi-slot groups
 * become single supernodes so barycenter / swap search places the whole block
 * next to its dominant partners instead of letting unconstrained slot moves
 * interleave foreign rows through the block and only re-glue afterwards.
 */
export function unitRelationsFromSlots(
  units: readonly BondedSlotUnit[],
  slotRelations: readonly WeightedOrderRelation<ProcessSankeySlot>[]
): WeightedOrderRelation<BondedSlotUnit>[] {
  const unitOfSlot = new Map<ProcessSankeySlot, BondedSlotUnit>()
  for (const unit of units) {
    for (const slot of unit.slots) unitOfSlot.set(slot, unit)
  }
  const aggregated = new Map<string, WeightedOrderRelation<BondedSlotUnit>>()
  for (const relation of slotRelations) {
    const sourceUnit = unitOfSlot.get(relation.source)
    const targetUnit = unitOfSlot.get(relation.target)
    if (!sourceUnit || !targetUnit || sourceUnit === targetUnit) continue
    const weight =
      Number.isFinite(relation.weight) && relation.weight! > 0
        ? relation.weight!
        : 1
    const key =
      sourceUnit.stableId < targetUnit.stableId
        ? `${sourceUnit.stableId}\u0000${targetUnit.stableId}`
        : `${targetUnit.stableId}\u0000${sourceUnit.stableId}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.weight = (existing.weight ?? 0) + weight
    } else {
      aggregated.set(key, { source: sourceUnit, target: targetUnit, weight })
    }
  }
  return [...aggregated.values()]
}

/**
 * Reorder slots inside each multi-slot unit toward their external partners.
 * Keeps the unit contiguous while aligning members that hand off to a neighbor
 * toward that neighbor's side of the block (classic compound-node median).
 */
export function orderWithinBondedUnits(
  units: readonly BondedSlotUnit[],
  slotRelations: readonly WeightedOrderRelation<ProcessSankeySlot>[],
  compareSlots: (a: ProcessSankeySlot, b: ProcessSankeySlot) => number
): BondedSlotUnit[] {
  const unitIndex = new Map<ProcessSankeySlot, number>()
  units.forEach((unit, index) => {
    for (const slot of unit.slots) unitIndex.set(slot, index)
  })
  return units.map((unit, index) => {
    if (unit.slots.length <= 1) return unit
    const score = new Map<ProcessSankeySlot, number>()
    for (const slot of unit.slots) score.set(slot, 0)
    for (const relation of slotRelations) {
      const sourceUnit = unitIndex.get(relation.source)
      const targetUnit = unitIndex.get(relation.target)
      if (sourceUnit == null || targetUnit == null) continue
      const weight =
        Number.isFinite(relation.weight) && relation.weight! > 0
          ? relation.weight!
          : 1
      // External partner below the block pulls positive; above pulls negative.
      if (sourceUnit === index && targetUnit !== index) {
        const side = targetUnit > index ? 1 : -1
        score.set(
          relation.source,
          (score.get(relation.source) ?? 0) + weight * side
        )
      } else if (targetUnit === index && sourceUnit !== index) {
        const side = sourceUnit > index ? 1 : -1
        score.set(
          relation.target,
          (score.get(relation.target) ?? 0) + weight * side
        )
      }
    }
    const ordered = [...unit.slots].sort(
      (a, b) => (score.get(a) ?? 0) - (score.get(b) ?? 0) || compareSlots(a, b)
    )
    return { ...unit, slots: ordered }
  })
}

/** Apply the node-group contiguity constraint regardless of laneOrder mode. */
export function bondProcessSankeySlotGroups(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode
): void {
  if (!slots.some((slot) => slot.group)) return
  applyOrder(slots, slotByNode, bondedSlotOrder(slots))
}

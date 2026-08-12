// Topology packing cache + rehydrate for ProcessSankey multi-pass layout.

import type {
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySlot
} from "./algorithm"
import { createProcessSankeyRecord, type SlotByNode } from "./layoutGeometry"

/**
 * Reapply a frozen packing assignment under updated mass/lifetime data.
 * Occupant membership and row identity stay fixed; peaks and end times refresh.
 * Used by multi-pass layout so expensive packing search runs once per topology.
 */
export function rehydrateProcessSankeySlots(
  frozenSlots: readonly ProcessSankeySlot[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>
): { slots: ProcessSankeySlot[]; slotByNode: SlotByNode } {
  const slots: ProcessSankeySlot[] = frozenSlots.map((slot) => {
    const occupants = slot.occupants.map((occupant) => ({
      id: occupant.id,
      end: laneLifetime[occupant.id]?.end ?? occupant.end
    }))
    let topPeak = 0
    let botPeak = 0
    for (const occupant of occupants) {
      const data = nodeData[occupant.id]
      topPeak = Math.max(topPeak, data?.topPeak || 0)
      botPeak = Math.max(botPeak, data?.botPeak || 0)
    }
    return {
      occupants,
      peak: { topPeak, botPeak },
      ...(slot.group != null ? { group: slot.group } : {})
    }
  })
  const slotByNode: SlotByNode = createProcessSankeyRecord<number>()
  slots.forEach((slot, index) => {
    for (const occupant of slot.occupants) slotByNode[occupant.id] = index
  })
  return { slots, slotByNode }
}

/** Topology + mass signature for packing cache (plot size independent). */
export function processSankeyPackingSignature(
  nodes: readonly ProcessSankeyNode[],
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>
): string {
  const nodePart = nodes
    .map((n) => {
      const data = nodeData[n.id]
      const life = laneLifetime[n.id]
      return [
        n.id,
        n.group ?? "",
        n.xExtent?.[0] ?? "",
        n.xExtent?.[1] ?? "",
        data?.topPeak ?? 0,
        data?.botPeak ?? 0,
        life?.start ?? "",
        life?.end ?? ""
      ].join(":")
    })
    .join("|")
  const edgePart = edges
    .map((e) =>
      [e.id, e.source, e.target, e.value, e.startTime, e.endTime].join(":")
    )
    .join("|")
  return `${nodePart}#${edgePart}`
}

const PACKING_CACHE_MAX = 12
const packingResultCache = new Map<
  string,
  { slots: ProcessSankeySlot[]; slotByNode: SlotByNode }
>()

export function lookupPackingCache(
  key: string
): { slots: ProcessSankeySlot[]; slotByNode: SlotByNode } | undefined {
  return packingResultCache.get(key)
}

export function storePackingCache(
  key: string,
  result: { slots: ProcessSankeySlot[]; slotByNode: SlotByNode }
): void {
  if (packingResultCache.has(key)) packingResultCache.delete(key)
  packingResultCache.set(key, {
    slots: result.slots.map((slot) => ({
      occupants: slot.occupants.map((o) => ({ ...o })),
      peak: { ...slot.peak },
      ...(slot.group != null ? { group: slot.group } : {})
    })),
    slotByNode: Object.assign(
      createProcessSankeyRecord<number>(),
      result.slotByNode
    )
  })
  while (packingResultCache.size > PACKING_CACHE_MAX) {
    const oldest = packingResultCache.keys().next().value
    if (oldest == null) break
    packingResultCache.delete(oldest)
  }
}

/** Test helper: clear the packing topology cache. */
export function clearProcessSankeyPackingCache(): void {
  packingResultCache.clear()
}

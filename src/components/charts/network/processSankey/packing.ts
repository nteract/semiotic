import type {
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySlot
} from "./algorithm"
import {
  compareProcessSankeyIds,
  createProcessSankeyRecord,
  type SlotByNode
} from "./layoutGeometry"
import {
  clearProcessSankeyPackingCache,
  lookupPackingCache,
  processSankeyPackingSignature,
  rehydrateProcessSankeySlots,
  storePackingCache
} from "./packingCache"
import {
  buildPackingConflicts,
  chronologicalColoring,
  chronologicalIds,
  continuityColoring,
  exclusivePartnerWeights,
  improveLargeContinuityColoring
} from "./packingOptimization"

export {
  clearProcessSankeyPackingCache,
  processSankeyPackingSignature,
  rehydrateProcessSankeySlots
}

const MASS_EPSILON = 1e-9

type PackingWindow = ProcessSankeyLaneLifetime

/**
 * The dashed rail lifetime includes incident ribbon halves so readers can
 * follow a node through a transition. Packing needs a narrower reservation:
 * the interval in which the node band itself carries visible mass. Otherwise
 * aggregate fast/slow ribbons make sequential phases look simultaneous and
 * prevent natural same-row handoffs.
 */
function occupiedBandWindow(
  data: ProcessSankeyNodeData | undefined,
  railLifetime: ProcessSankeyLaneLifetime
): PackingWindow {
  let start = Infinity
  let end = -Infinity
  for (const sample of data?.samples ?? []) {
    if (sample.topMass + sample.botMass <= MASS_EPSILON) continue
    start = Math.min(start, sample.t)
    end = Math.max(end, sample.t)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end))
    return { start: null, end: null }

  // Synthetic source baselines begin one time unit before their first event.
  // Clamp those seeds back to the semantic rail without trimming real mass.
  if (railLifetime.start != null) start = Math.max(start, railLifetime.start)
  if (railLifetime.end != null) end = Math.min(end, railLifetime.end)
  return end >= start ? { start, end } : { start: null, end: null }
}


export function packProcessSankeySlots(
  nodes: readonly ProcessSankeyNode[],
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>
): { slots: ProcessSankeySlot[]; slotByNode: SlotByNode } {
  const cacheKey = processSankeyPackingSignature(
    nodes,
    edges,
    nodeData,
    laneLifetime
  )
  const cached = lookupPackingCache(cacheKey)
  if (cached) {
    // Rehydrate peaks/ends against the live nodeData (cache stores membership).
    return rehydrateProcessSankeySlots(cached.slots, nodeData, laneLifetime)
  }

  const windows = createProcessSankeyRecord<PackingWindow>()
  for (const node of nodes) {
    windows[node.id] = occupiedBandWindow(
      nodeData[node.id],
      laneLifetime[node.id]
    )
  }

  const ids = chronologicalIds(nodes, windows)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const groupById = new Map(
    nodes.map((node) => [node.id, node.group || undefined])
  )
  const exclusive = exclusivePartnerWeights(edges)
  const packingConflicts = buildPackingConflicts(
    ids,
    windows,
    laneLifetime,
    edges,
    groupById,
    exclusive
  )
  const baseline = chronologicalColoring(ids, packingConflicts, exclusive)
  const continuitySeed = {
    ...baseline,
    assignment: improveLargeContinuityColoring(
      ids,
      packingConflicts,
      edges,
      baseline
    )
  }
  const searchedAssignment = continuityColoring(
    ids,
    packingConflicts,
    edges,
    continuitySeed
  )
  // Semantic spill constraints make the chronological greedy bound larger
  // than the best exact coloring in some small graphs. The search can then
  // leave a color unused; compact labels before materializing slots so an
  // empty row never becomes visible geometry.
  const denseSlot = new Map<number, number>()
  const assignment = searchedAssignment.map((slot) => {
    if (!denseSlot.has(slot)) denseSlot.set(slot, denseSlot.size)
    return denseSlot.get(slot)!
  })
  const slots: ProcessSankeySlot[] = Array.from(
    { length: denseSlot.size || (nodes.length > 0 ? 1 : 0) },
    () => ({ occupants: [], peak: { topPeak: 0, botPeak: 0 } })
  )
  const slotByNode: SlotByNode = createProcessSankeyRecord<number>()

  ids.forEach((id, index) => {
    const slotIndex = assignment[index]
    const slot = slots[slotIndex]
    slot.occupants.push({ id, end: windows[id].end ?? -Infinity })
    const group = nodeById.get(id)?.group
    if (group) slot.group = group
    slotByNode[id] = slotIndex
  })

  // Invisible/orphan nodes do not consume row capacity. Preserve their stable
  // identity by attaching them to the first row, matching the old reuse path.
  for (const node of [...nodes].sort((a, b) =>
    compareProcessSankeyIds(a.id, b.id)
  )) {
    if (slotByNode[node.id] != null) continue
    slots[0].occupants.push({ id: node.id, end: -Infinity })
    slotByNode[node.id] = 0
  }

  for (const slot of slots) {
    slot.occupants.sort(
      (a, b) =>
        (windows[a.id].start ?? Infinity) - (windows[b.id].start ?? Infinity) ||
        compareProcessSankeyIds(a.id, b.id)
    )
    for (const occupant of slot.occupants) {
      const data = nodeData[occupant.id]
      slot.peak.topPeak = Math.max(slot.peak.topPeak, data?.topPeak || 0)
      slot.peak.botPeak = Math.max(slot.peak.botPeak, data?.botPeak || 0)
    }
  }

  const result = { slots, slotByNode }
  storePackingCache(cacheKey, result)
  return result
}

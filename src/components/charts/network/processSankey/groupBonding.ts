import type {
  ProcessSankeyAttachment,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySample,
  ProcessSankeySlot,
} from "./algorithm"
import type { SlotByNode } from "./layoutGeometry"

const MASS_EPSILON = 1e-9

function sampleMass(sample: ProcessSankeySample): number {
  return sample.topMass + sample.botMass
}

function representativeAt(
  data: ProcessSankeyNodeData,
  time: number,
): ProcessSankeySample | null {
  const exact = data.samples.filter((sample) => sample.t === time)
  if (exact.length > 0) {
    return exact.reduce((best, sample) =>
      sampleMass(sample) >= sampleMass(best) ? sample : best,
    exact[0])
  }
  let found: ProcessSankeySample | null = null
  for (const sample of data.samples) {
    if (sample.t > time) break
    found = sample
  }
  return found
}

function cloneNodeData(
  data: Record<string, ProcessSankeyNodeData>,
): Record<string, ProcessSankeyNodeData> {
  return Object.fromEntries(Object.entries(data).map(([id, node]) => [id, {
    ...node,
    samples: node.samples.map((sample) => ({ ...sample })),
    localAttachments: new Map([...node.localAttachments].map(([edgeId, attachment]) => [
      edgeId,
      { ...attachment },
    ])),
  }]))
}

/**
 * Translate same-group bands as a time-aware streamgraph stack.
 *
 * Slot ordering still supplies a stable within-group order and reserves the
 * group's collision-free outer envelope. At every group sample time, active
 * slots are restacked without holes around that envelope's center. Nodes that
 * reuse one slot at an exact handoff share its position instead of being
 * double-counted. The same mass-space delta is copied to every attachment at
 * that time, retaining the node/ribbon partition invariant.
 */
export function bondProcessSankeyNodeData(
  nodes: readonly ProcessSankeyNode[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  slots: readonly ProcessSankeySlot[],
  slotByNode: Readonly<SlotByNode>,
  centerlines: Readonly<Record<string, number>>,
  valueScale: number,
  groupPadding = 0,
): Record<string, ProcessSankeyNodeData> {
  const groups = new Map<string, ProcessSankeyNode[]>()
  for (const node of nodes) {
    if (!node.group || !nodeData[node.id]) continue
    const members = groups.get(node.group) ?? []
    members.push(node)
    groups.set(node.group, members)
  }
  if (groups.size === 0 || !(valueScale > 0)) return nodeData

  const result = cloneNodeData(nodeData)

  for (const [group, members] of groups) {
    const groupSlots = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.group === group)
    if (groupSlots.length === 0) continue

    const first = groupSlots[0].slot
    const last = groupSlots.at(-1)!.slot
    const firstCenter = centerlines[first.occupants[0]?.id]
    const lastCenter = centerlines[last.occupants[0]?.id]
    if (!Number.isFinite(firstCenter) || !Number.isFinite(lastCenter)) continue
    const blockTop = firstCenter - first.peak.topPeak * valueScale
    const blockBottom = lastCenter + last.peak.botPeak * valueScale
    const blockCenter = (blockTop + blockBottom) / 2

    const times = [...new Set(members.flatMap((node) =>
      nodeData[node.id].samples.map((sample) => sample.t),
    ))].sort((a, b) => a - b)
    const deltaByNode = new Map<string, Map<number, number>>()
    for (const node of members) deltaByNode.set(node.id, new Map())

    for (const time of times) {
      const activeBySlot = new Map<number, Array<{
        node: ProcessSankeyNode
        sample: ProcessSankeySample
      }>>()
      for (const node of members) {
        const sample = representativeAt(nodeData[node.id], time)
        if (!sample || sampleMass(sample) <= MASS_EPSILON) continue
        const slot = slotByNode[node.id]
        if (slot == null) continue
        const active = activeBySlot.get(slot) ?? []
        active.push({ node, sample })
        activeBySlot.set(slot, active)
      }
      const activeSlots = [...activeBySlot]
        .sort((a, b) => a[0] - b[0])
        .map(([slot, active]) => ({
          slot,
          active,
          mass: Math.max(...active.map(({ sample }) => sampleMass(sample))),
        }))
      if (activeSlots.length === 0) continue

      const totalMass = activeSlots.reduce((sum, active) => sum + active.mass, 0)
      const internalPadding = Math.max(0, groupPadding) * Math.max(0, activeSlots.length - 1)
      let cursor = blockCenter - (totalMass * valueScale + internalPadding) / 2
      for (const activeSlot of activeSlots) {
        for (const { node, sample } of activeSlot.active) {
          const desiredBoundaryOffset =
            (cursor - centerlines[node.id]) / valueScale + sample.topMass
          const delta = desiredBoundaryOffset - (sample.boundaryOffset ?? 0)
          deltaByNode.get(node.id)!.set(time, delta)
        }
        cursor += activeSlot.mass * valueScale + Math.max(0, groupPadding)
      }
    }

    for (const node of members) {
      const original = nodeData[node.id]
      const translated = result[node.id]
      const deltas = deltaByNode.get(node.id)!
      const samples: ProcessSankeySample[] = []
      for (const time of times) {
        const delta = deltas.get(time)
        const exact = original.samples.filter((sample) => sample.t === time)
        if (exact.length > 0) {
          samples.push(...exact.map((sample) => ({
            ...sample,
            ...(delta != null ? {
              boundaryOffset: (sample.boundaryOffset ?? 0) + delta,
            } : {}),
          })))
          continue
        }
        const sample = representativeAt(original, time)
        if (delta == null || !sample || sampleMass(sample) <= MASS_EPSILON) continue
        samples.push({
          ...sample,
          t: time,
          boundaryOffset: (sample.boundaryOffset ?? 0) + delta,
        })
      }
      translated.samples = samples
      translated.localAttachments = new Map([...original.localAttachments].map(
        ([edgeId, attachment]): [string, ProcessSankeyAttachment] => {
          const delta = deltas.get(attachment.time)
          return [edgeId, {
            ...attachment,
            ...(delta != null ? {
              boundaryOffset: (attachment.boundaryOffset ?? 0) + delta,
            } : {}),
          }]
        },
      ))
    }
  }

  return result
}

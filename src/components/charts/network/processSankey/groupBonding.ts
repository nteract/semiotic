import { appendToGroup } from "../../../utils/appendToGroup"
import { intervalTimes } from "./bandPaths"
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

function translateBoundary<T extends { boundaryOffset?: number; groupOffset?: number }>(point: T, delta?: number): T {
  return delta === undefined ? { ...point } : {
    ...point,
    boundaryOffset: (point.boundaryOffset ?? 0) + delta,
    groupOffset: (point.groupOffset ?? 0) + delta
  }
}

function createSampleCursor(data: ProcessSankeyNodeData) {
  const byTime = new Map<number, ProcessSankeySample[]>()
  for (const sample of data.samples) {
    // Exact matching uses ===; unlike Map lookup, NaN never matches itself.
    if (Number.isNaN(sample.t)) continue
    appendToGroup(byTime, sample.t, sample)
  }

  let nextIndex = 0
  let lastTime = -Infinity
  return (time: number) => {
    // Group times advance monotonically. Reset for the second pass, while
    // retaining the original prefix-scan behavior even for unsorted samples.
    if (!(time >= lastTime)) nextIndex = 0
    lastTime = time
    const exact = byTime.get(time)
    if (exact) {
      const sample = exact.reduce((best, candidate) =>
        sampleMass(candidate) >= sampleMass(best) ? candidate : best,
      exact[0])
      return { exact, sample }
    }
    while (nextIndex < data.samples.length && !(data.samples[nextIndex].t > time)) {
      nextIndex++
    }
    return { exact, sample: data.samples[nextIndex - 1] ?? null }
  }
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
  smoothDomain?: readonly [number, number],
): Record<string, ProcessSankeyNodeData> {
  const groups = new Map<string, ProcessSankeyNode[]>()
  for (const node of nodes) {
    if (!node.group || !nodeData[node.id]) continue
    appendToGroup(groups, node.group, node)
  }
  if (groups.size === 0 || !(valueScale > 0)) return nodeData

  const result = { ...nodeData }
  const slotGap = Math.max(0, groupPadding)

  for (const [group, members] of groups) {
    const groupSlots = slots.filter(slot => slot.group === group)
    if (groupSlots.length === 0) continue

    const first = groupSlots[0]
    const last = groupSlots.at(-1)!
    const firstCenter = centerlines[first.occupants[0]?.id]
    const lastCenter = centerlines[last.occupants[0]?.id]
    if (!Number.isFinite(firstCenter) || !Number.isFinite(lastCenter)) continue
    const blockTop = firstCenter - first.peak.topPeak * valueScale
    const blockBottom = lastCenter + last.peak.botPeak * valueScale
    const blockCenter = (blockTop + blockBottom) / 2

    const eventTimes = [...new Set(members.flatMap((node) =>
      nodeData[node.id].samples.map((sample) => sample.t),
    ))].sort((a, b) => a - b)
    const times = smoothDomain
      ? eventTimes.flatMap((time, i) => i
        ? [...intervalTimes(eventTimes[i - 1], time, smoothDomain, true), time]
        : [time])
      : eventTimes
    const series = members.map(node => ({
      node, slot: slotByNode[node.id], sampleAt: createSampleCursor(nodeData[node.id]), deltas: new Map<number, number>()
    })).sort((a, b) => (a.slot ?? Infinity) - (b.slot ?? Infinity))

    for (const time of times) {
      const activeSlots: Array<{
        index: number
        mass: number
        rows: { node: ProcessSankeyNode, sample: ProcessSankeySample, deltas: Map<number, number> }[]
      }> = []
      for (const { node, slot, sampleAt, deltas } of series) {
        const { sample } = sampleAt(time)
        if (!sample || slot == null) continue
        const mass = sampleMass(sample)
        if (mass <= MASS_EPSILON) continue
        let active = activeSlots.at(-1)
        if (active?.index !== slot) {
          active = { index: slot, mass, rows: [] }
          activeSlots.push(active)
        }
        active.mass = Math.max(active.mass, mass)
        active.rows.push({ node, sample, deltas })
      }
      const totalMass = activeSlots.reduce((sum, active) => sum + active.mass, 0)
      const internalPadding = slotGap * (activeSlots.length - 1)
      let cursor = blockCenter - (totalMass * valueScale + internalPadding) / 2
      for (const activeSlot of activeSlots) {
        for (const { node, sample, deltas } of activeSlot.rows) {
          const desiredBoundaryOffset =
            (cursor - centerlines[node.id]) / valueScale + sample.topMass
          const delta = desiredBoundaryOffset - (sample.boundaryOffset ?? 0)
          deltas.set(time, delta)
        }
        cursor += activeSlot.mass * valueScale + slotGap
      }
    }

    for (const { node, sampleAt, deltas } of series) {
      const original = nodeData[node.id]
      const samples: ProcessSankeySample[] = []
      for (const time of times) {
        const delta = deltas.get(time)
        const { exact, sample } = sampleAt(time)
        if (exact) {
          for (const state of exact) samples.push(translateBoundary(state, delta))
          continue
        }
        if (delta == null || !sample || sampleMass(sample) <= MASS_EPSILON) continue
        samples.push({ ...translateBoundary(sample, delta), t: time })
      }
      const localAttachments = new Map([...original.localAttachments].map(
        ([edgeId, attachment]): [string, ProcessSankeyAttachment] =>
          [edgeId, translateBoundary(attachment, deltas.get(attachment.time))]
      ))
      result[node.id] = { ...original, samples, localAttachments }
    }
  }

  return result
}

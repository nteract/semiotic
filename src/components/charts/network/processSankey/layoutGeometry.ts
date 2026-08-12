import {
  packBandsBySilhouette,
  placeWithMinGap,
  type SilhouetteSample
} from "../../../recipes/layout1d"
import type {
  ProcessSankeyAttachment,
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyLayoutQuality,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeyRibbonLane,
  ProcessSankeySlot
} from "./algorithm"

export type { ProcessSankeyRibbonLane }
export type SlotByNode = Record<string, number>

/** Dictionary for authored identifiers, including JavaScript prototype keys. */
export function createProcessSankeyRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}

export interface SlotGeometryOptions {
  plotH: number
  padding: number
  valueScale: number
  /** Scale used only to seed/retain legacy stack center spacing. This may be
   * larger than `valueScale` when a band-inflation cap creates slack. */
  stackValueScale?: number
  lanePlacement?: "stack" | "hug"
  /** Pixels between adjacent slots carrying the same non-empty group. */
  groupPadding?: number
  /** Precomputed adjacent clearances for hot ordering loops. */
  adjacentClearance?: readonly number[]
}

export interface SlotGeometry {
  adjacentClearance: number[]
  centerlines: Record<string, number>
  slotCenter: number[]
  stackCenter: number[]
  verticalUtilization: number
}

export function compareProcessSankeyIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function slotStableId(slot: ProcessSankeySlot): string {
  return slot.occupants
    .map((d) => d.id)
    .sort(compareProcessSankeyIds)
    .join("\u0000")
}

export function processSankeyGapPaddings(
  slots: readonly ProcessSankeySlot[],
  padding: number,
  groupPadding = 0
): number[] {
  return slots.slice(0, -1).map((slot, index) => {
    const next = slots[index + 1]
    return slot.group != null && slot.group === next.group
      ? groupPadding
      : padding
  })
}

function slotSilhouettes(
  slots: readonly ProcessSankeySlot[],
  nodeData: Record<string, ProcessSankeyNodeData>
): SilhouetteSample[][] {
  return slots.map((slot) => {
    const byTime = new Map<number, { before: number; after: number }>()
    for (const occupant of slot.occupants) {
      const data = nodeData[occupant.id]
      if (!data) continue
      for (const sample of data.samples) {
        const current = byTime.get(sample.t) ?? { before: 0, after: 0 }
        const boundaryOffset = sample.boundaryOffset ?? 0
        byTime.set(sample.t, {
          before: Math.max(current.before, sample.topMass - boundaryOffset),
          after: Math.max(current.after, sample.botMass + boundaryOffset)
        })
      }
    }
    return [...byTime]
      .sort((a, b) => a[0] - b[0])
      .map(([at, extents]) => ({ at, ...extents }))
  })
}

/** Pair clearance helper used to cache all slot-pair geometries once before
 * an ordering search instead of rebuilding silhouettes per candidate. */
export function computeSlotPairClearance(
  upper: ProcessSankeySlot,
  lower: ProcessSankeySlot,
  nodeData: Record<string, ProcessSankeyNodeData>
): number {
  return (
    packBandsBySilhouette(slotSilhouettes([upper, lower], nodeData))
      .adjacentClearance[0] ?? 0
  )
}

function stackCenters(
  slots: readonly ProcessSankeySlot[],
  adjacentClearance: readonly number[],
  options: SlotGeometryOptions
): number[] {
  if (slots.length === 0) return []
  const { padding, plotH, valueScale } = options
  const spacingScale = options.stackValueScale ?? valueScale
  const gapPaddings = processSankeyGapPaddings(
    slots,
    padding,
    options.groupPadding ?? 0
  )
  const centers = [padding + slots[0].peak.topPeak * spacingScale]
  for (let i = 1; i < slots.length; i++) {
    centers.push(
      centers[i - 1] +
        adjacentClearance[i - 1] * spacingScale +
        gapPaddings[i - 1]
    )
  }
  const bottom =
    centers[centers.length - 1] +
    slots[slots.length - 1].peak.botPeak * spacingScale +
    padding
  if (bottom > plotH && bottom > 0) {
    const scale = plotH / bottom
    for (let i = 0; i < centers.length; i++) centers[i] *= scale
  }
  return centers
}

function attachmentOffset(
  attachment: ProcessSankeyAttachment,
  valueScale: number
): number {
  const boundaryOffset = (attachment.boundaryOffset ?? 0) * valueScale
  const value = attachment.value * valueScale
  if (attachment.kind === "out") {
    const before = attachment.sideMassBefore * valueScale
    return (
      boundaryOffset +
      (attachment.side === "top" ? -before + value / 2 : before - value / 2)
    )
  }
  const after = attachment.sideMassAfter * valueScale
  return (
    boundaryOffset +
    (attachment.side === "top" ? -after + value / 2 : after - value / 2)
  )
}

function hugCenters(
  slots: readonly ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: readonly ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  adjacentClearance: readonly number[],
  stackCenter: readonly number[],
  options: SlotGeometryOptions
): number[] {
  const n = slots.length
  if (n === 0) return []
  const { padding, plotH, valueScale } = options
  const gapPaddings = processSankeyGapPaddings(
    slots,
    padding,
    options.groupPadding ?? 0
  )
  const minGaps = adjacentClearance.map(
    (clearance, index) => clearance * valueScale + gapPaddings[index]
  )
  const lower = padding + slots[0].peak.topPeak * valueScale
  const upper = plotH - padding - slots[n - 1].peak.botPeak * valueScale
  const requiredSpan = minGaps.reduce((sum, gap) => sum + gap, 0)
  if (upper - lower <= requiredSpan + 1e-6) {
    return stackCenters(slots, adjacentClearance, options)
  }

  // A scale cap leaves the legacy (uncapped) stack centerlines as a useful,
  // stable starting point while the thinner bands create movable slack.
  let centers = n === 1 ? [(lower + upper) / 2] : [...stackCenter]

  for (let iteration = 0; iteration < 12; iteration++) {
    const desiredSum = new Array<number>(n).fill(0)
    const desiredWeight = new Array<number>(n).fill(0)
    for (const edge of edges) {
      const sourceSlot = slotByNode[edge.source]
      const targetSlot = slotByNode[edge.target]
      if (sourceSlot == null || targetSlot == null || sourceSlot === targetSlot)
        continue
      const sourceAttachment = nodeData[edge.source]?.localAttachments.get(
        edge.id
      )
      const targetAttachment = nodeData[edge.target]?.localAttachments.get(
        edge.id
      )
      if (!sourceAttachment || !targetAttachment) continue
      const weight =
        edge.value > 0 && Number.isFinite(edge.value) ? edge.value : 1
      const sourceOffset = attachmentOffset(sourceAttachment, valueScale)
      const targetOffset = attachmentOffset(targetAttachment, valueScale)
      desiredSum[sourceSlot] +=
        (centers[targetSlot] + targetOffset - sourceOffset) * weight
      desiredWeight[sourceSlot] += weight
      desiredSum[targetSlot] +=
        (centers[sourceSlot] + sourceOffset - targetOffset) * weight
      desiredWeight[targetSlot] += weight
    }

    const desired = centers.map((center, i) => {
      if (desiredWeight[i] === 0) return center
      const partnerMean = desiredSum[i] / desiredWeight[i]
      // Damping prevents two connected lanes from trading positions on
      // alternating iterations while the isotonic constraint pools them.
      return center * 0.45 + partnerMean * 0.55
    })
    const next = placeWithMinGap({
      desired,
      minGaps,
      weights: desiredWeight.map((weight) => Math.max(1, weight)),
      min: lower,
      max: upper
    })
    let movement = 0
    for (let i = 0; i < n; i++)
      movement = Math.max(movement, Math.abs(next[i] - centers[i]))
    centers = next
    if (movement < 0.01) break
  }
  return centers
}

export function computeSlotGeometry(
  nodes: readonly ProcessSankeyNode[],
  edges: readonly ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  slots: readonly ProcessSankeySlot[],
  slotByNode: SlotByNode,
  options: SlotGeometryOptions
): SlotGeometry {
  const adjacentClearance = options.adjacentClearance
    ? [...options.adjacentClearance]
    : packBandsBySilhouette(slotSilhouettes(slots, nodeData)).adjacentClearance
  const stackCenter = stackCenters(slots, adjacentClearance, options)
  let slotCenter =
    options.lanePlacement === "hug"
      ? hugCenters(
          slots,
          slotByNode,
          edges,
          nodeData,
          adjacentClearance,
          stackCenter,
          options
        )
      : [...stackCenter]
  if (options.lanePlacement === "hug") {
    const centersFor = (
      positions: readonly number[]
    ): Record<string, number> => {
      const result = createProcessSankeyRecord<number>()
      for (const node of nodes) result[node.id] = positions[slotByNode[node.id]]
      return result
    }
    // Coordinate assignment is an optional readability pass. Retain stack if
    // numerical damping or conflicting attachment offsets make it regress the
    // pixel-length metric it exists to improve.
    if (
      totalPixelEdgeLength(centersFor(slotCenter), edges) >
      totalPixelEdgeLength(centersFor(stackCenter), edges) + 1e-6
    ) {
      slotCenter = [...stackCenter]
    }
  }
  const centerlines = createProcessSankeyRecord<number>()
  for (const node of nodes)
    centerlines[node.id] = slotCenter[slotByNode[node.id]]

  let top = Infinity
  let bottom = -Infinity
  for (const node of nodes) {
    const center = centerlines[node.id]
    const data = nodeData[node.id]
    if (!Number.isFinite(center) || !data) continue
    top = Math.min(top, center - data.topPeak * options.valueScale)
    bottom = Math.max(bottom, center + data.botPeak * options.valueScale)
  }
  const verticalUtilization =
    Number.isFinite(top) && Number.isFinite(bottom) && options.plotH > 0
      ? Math.max(0, Math.min(1, (bottom - top) / options.plotH))
      : 0
  return {
    adjacentClearance,
    centerlines,
    slotCenter,
    stackCenter,
    verticalUtilization
  }
}

export function totalPixelEdgeLength(
  centerlines: Record<string, number>,
  edges: readonly ProcessSankeyEdge[]
): number {
  let total = 0
  for (const edge of edges) {
    const source = centerlines[edge.source]
    const target = centerlines[edge.target]
    if (Number.isFinite(source) && Number.isFinite(target)) {
      total += Math.abs(source - target) * (edge.value > 0 ? edge.value : 1)
    }
  }
  return total
}

function massAt(
  data: ProcessSankeyNodeData | undefined,
  time: number
): { top: number; bot: number } {
  const samples = data?.samples
  if (!samples || samples.length === 0 || time < samples[0].t)
    return { top: 0, bot: 0 }
  let lo = 0
  let hi = samples.length - 1
  let found = 0
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (samples[mid].t <= time) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  const boundaryOffset = samples[found].boundaryOffset ?? 0
  return {
    top: samples[found].topMass - boundaryOffset,
    bot: samples[found].botMass + boundaryOffset
  }
}

function cubic(
  value0: number,
  value1: number,
  value2: number,
  value3: number,
  t: number
): number {
  const mt = 1 - t
  return (
    mt * mt * mt * value0 +
    3 * mt * mt * t * value1 +
    3 * mt * t * t * value2 +
    t * t * t * value3
  )
}

function parameterAtX(xFraction: number, controlFraction: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2
    const x = cubic(0, controlFraction, controlFraction, 1, mid)
    if (x < xFraction) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function attachmentRange(
  attachment: ProcessSankeyAttachment,
  centerline: number,
  valueScale: number
): [number, number] {
  const center = centerline + attachmentOffset(attachment, valueScale)
  const half = (attachment.value * valueScale) / 2
  return [center - half, center + half]
}

function overlapRatio(a0: number, a1: number, b0: number, b1: number): number {
  const overlap = Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
  return overlap / Math.max(1e-9, a1 - a0)
}

export interface TransitOcclusionOptions {
  valueScale: number
  ribbonLane?: ProcessSankeyRibbonLane
  domain?: [number, number]
  /** `score` uses a bounded sample set during ordering; `quality` adds every
   * lane event breakpoint and interval midpoint for the reported metric. */
  mode?: "score" | "quality"
}

/**
 * Value-weighted ribbon coverage of intermediate lane bands over each edge's
 * authored event window. Ribbon y values come from the same cubic used by the
 * renderer; x is inverted by bisection. Optional render-only feeder runway is
 * intentionally absent because it does not alter the edge's event interval.
 */
export function measureTransitOcclusion(
  edges: readonly ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  slots: readonly ProcessSankeySlot[],
  slotByNode: SlotByNode,
  centerlines: Record<string, number>,
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>,
  options: TransitOcclusionOptions
): number {
  const { valueScale, domain, mode = "quality" } = options
  const control =
    options.ribbonLane === "source"
      ? 0.85
      : options.ribbonLane === "target"
        ? 0.15
        : 0.5
  let total = 0
  for (const edge of edges) {
    const sourceSlot = slotByNode[edge.source]
    const targetSlot = slotByNode[edge.target]
    if (
      sourceSlot == null ||
      targetSlot == null ||
      Math.abs(sourceSlot - targetSlot) < 2
    )
      continue
    const sourceAttachment = nodeData[edge.source]?.localAttachments.get(
      edge.id
    )
    const targetAttachment = nodeData[edge.target]?.localAttachments.get(
      edge.id
    )
    if (!sourceAttachment || !targetAttachment) continue
    const start = Math.max(edge.startTime, domain?.[0] ?? -Infinity)
    const end = Math.min(edge.endTime, domain?.[1] ?? Infinity)
    if (!(end > start)) continue
    const [sourceTop, sourceBottom] = attachmentRange(
      sourceAttachment,
      centerlines[edge.source],
      valueScale
    )
    const [targetTop, targetBottom] = attachmentRange(
      targetAttachment,
      centerlines[edge.target],
      valueScale
    )
    const firstSlot = Math.min(sourceSlot, targetSlot) + 1
    const lastSlot = Math.max(sourceSlot, targetSlot) - 1
    for (let slotIndex = firstSlot; slotIndex <= lastSlot; slotIndex++) {
      const slot = slots[slotIndex]
      if (!slot) continue
      const boundaries = [start, end]
      if (mode === "quality") {
        for (const occupant of slot.occupants) {
          for (const sample of nodeData[occupant.id]?.samples ?? []) {
            if (sample.t > start && sample.t < end) boundaries.push(sample.t)
          }
        }
      }
      const ratioAt = (time: number): number => {
        const xFraction = (time - start) / (end - start)
        const parameter = parameterAtX(xFraction, control)
        const ribbonTop = cubic(
          sourceTop,
          sourceTop,
          targetTop,
          targetTop,
          parameter
        )
        const ribbonBottom = cubic(
          sourceBottom,
          sourceBottom,
          targetBottom,
          targetBottom,
          parameter
        )
        let ratio = 0
        for (const occupant of slot.occupants) {
          if (occupant.id === edge.source || occupant.id === edge.target)
            continue
          const lifetime = laneLifetime[occupant.id]
          if (lifetime?.start != null && time < lifetime.start) continue
          if (lifetime?.end != null && time > lifetime.end) continue
          const mass = massAt(nodeData[occupant.id], time)
          const centerline = centerlines[occupant.id]
          ratio = Math.max(
            ratio,
            overlapRatio(
              ribbonTop,
              ribbonBottom,
              centerline - mass.top * valueScale,
              centerline + mass.bot * valueScale
            )
          )
        }
        return ratio
      }
      const distinctBoundaries = [...new Set(boundaries)].sort((a, b) => a - b)
      let integral = 0
      for (let i = 0; i < distinctBoundaries.length - 1; i++) {
        const intervalStart = distinctBoundaries[i]
        const intervalEnd = distinctBoundaries[i + 1]
        const interval = intervalEnd - intervalStart
        // Three interior evaluations avoid discontinuity ambiguity at mass
        // events and time-weight the metric, so event-dense periods do not
        // count more merely because they contribute more sample rows.
        const ratio =
          (ratioAt(intervalStart + interval * 0.25) +
            ratioAt(intervalStart + interval * 0.5) +
            ratioAt(intervalStart + interval * 0.75)) /
          3
        integral += ratio * interval
      }
      total += (integral / (end - start)) * (edge.value > 0 ? edge.value : 1)
    }
  }
  return total
}

export function computeLayoutQuality(
  crossings: number,
  weightedLength: number,
  edges: readonly ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  slots: readonly ProcessSankeySlot[],
  slotByNode: SlotByNode,
  centerlines: Record<string, number>,
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>,
  valueScale: number,
  verticalUtilization: number,
  ribbonLane: ProcessSankeyRibbonLane = "both",
  domain?: [number, number]
): ProcessSankeyLayoutQuality {
  return {
    crossings,
    weightedLength,
    pixelLength: totalPixelEdgeLength(centerlines, edges),
    transitOcclusion: measureTransitOcclusion(
      edges,
      nodeData,
      slots,
      slotByNode,
      centerlines,
      laneLifetime,
      { valueScale, ribbonLane, domain, mode: "quality" }
    ),
    verticalUtilization
  }
}

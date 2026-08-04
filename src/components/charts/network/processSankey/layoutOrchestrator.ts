// ProcessSankey layout orchestrator — multi-pass packing, ordering, scale, quality.

import {
  compareProcessSankeyIds,
  computeLayoutQuality,
  computeSlotGeometry,
  processSankeyGapPaddings,
  slotStableId,
  type ProcessSankeyRibbonLane,
  type SlotByNode,
} from "./layoutGeometry"
import {
  applyFixedSlotOrder,
  bondProcessSankeySlotGroups,
  countCrossings,
  orderProcessSankeySlots,
  totalEdgeLength,
  type ProcessSankeyOrderingResult,
} from "./ordering"
import { packProcessSankeySlots, rehydrateProcessSankeySlots } from "./packing"
import { bondProcessSankeyNodeData } from "./groupBonding"
import {
  assignSameSlotHandoffSides,
  assignSides,
  buildEdgeIndex,
  collectEndpointPositions,
  computeNode,
  hasResolvableAttachmentTies,
  rebalanceOutgoingSides,
} from "./massSimulation"
import type {
  ProcessSankeyEdge,
  ProcessSankeyEdgeIndex,
  ProcessSankeyLaneLifetime,
  ProcessSankeyLayout,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeyOptions,
  ProcessSankeySlot,
} from "./processSankeyTypes"

interface LaneLayoutOptions {
  plotH: number
  padding: number
  valueScale: number
  stackValueScale?: number
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  lifetimeMode?: "full" | "half"
  lanePlacement?: "stack" | "hug"
  groupPadding?: number
  ribbonLane?: ProcessSankeyRibbonLane
  domain?: [number, number]
  /** Run search only on the first dry pass. Later passes freeze packing + order. */
  runOrdering?: boolean
  fixedSlotOrder?: readonly string[]
  /**
   * Frozen packing assignment from an earlier pass. When set, packing search is
   * skipped and peaks/ends are rehydrated onto the same occupant membership.
   */
  frozenSlots?: readonly ProcessSankeySlot[]
}

interface LaneLayoutResult {
  effectiveSlotsHeight: number
  centerlines: Record<string, number>
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>
  slots: ProcessSankeySlot[]
  slotByNode: SlotByNode
  slotCenter: number[]
  stackCenter: number[]
  verticalUtilization: number
  selectedSlotOrder: string[]
  initialSlotOrder: string[]
  ordering: ProcessSankeyOrderingResult | null
  crossingsBefore: number | null
  crossingsAfter: number | null
  lengthBefore: number | null
  lengthAfter: number | null
}

export function computeLaneLayout(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  edgeIndex: ProcessSankeyEdgeIndex,
  opts: LaneLayoutOptions,
): LaneLayoutResult {
  const {
    plotH, padding, valueScale, packing, laneOrder, lifetimeMode = "half",
    lanePlacement = "stack", groupPadding = 0, ribbonLane = "both", domain,
  } = opts
  const topPeak: Record<string, number> = {}
  const botPeak: Record<string, number> = {}
  for (const n of nodes) {
    topPeak[n.id] = nodeData[n.id].topPeak || 0
    botPeak[n.id] = nodeData[n.id].botPeak || 0
  }

  const half = lifetimeMode === "half"
  const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {}
  for (const n of nodes) {
    // xExtent: optional [start, end] explicit lifetime bounds. The
    // node's lane spans `min(xExtent[0], earliestEdge)` to
    // `max(xExtent[1], latestEdge)` — explicit extent extends the
    // lane *outward* but never trims it inside the actual edge range.
    const explicitStart = Array.isArray(n.xExtent) ? n.xExtent[0] : null
    const explicitEnd   = Array.isArray(n.xExtent) ? n.xExtent[1] : null
    let tStart: number = explicitStart != null && Number.isFinite(explicitStart) ? explicitStart : Infinity
    let tEnd: number   = explicitEnd   != null && Number.isFinite(explicitEnd)   ? explicitEnd   : -Infinity
    for (const e of edgeIndex.outgoing[n.id]) {
      if (e.startTime < tStart) tStart = e.startTime
      // systemInTime (when set) pre-dates startTime — the source node
      // holds the unit of mass from systemInTime through startTime, so
      // its lane lifetime has to include the earlier time or the band
      // gets clipped at startTime and the systemInTime gradient stub
      // has no surface to paint on.
      if (e.systemInTime != null && Number.isFinite(e.systemInTime) && e.systemInTime < tStart) {
        tStart = e.systemInTime
      }
      const endForSource = half ? (e.startTime + e.endTime) / 2 : e.endTime
      if (endForSource > tEnd) tEnd = endForSource
    }
    for (const e of edgeIndex.incoming[n.id]) {
      const startForTarget = half ? (e.startTime + e.endTime) / 2 : e.startTime
      if (startForTarget < tStart) tStart = startForTarget
      if (e.endTime > tEnd) tEnd = e.endTime
      // systemOutTime mirror: target holds the unit of mass through
      // endTime → systemOutTime, so the lane has to extend right or
      // the band gets cut off at endTime and the systemOutTime fade-
      // out has nowhere to render.
      if (e.systemOutTime != null && Number.isFinite(e.systemOutTime) && e.systemOutTime > tEnd) {
        tEnd = e.systemOutTime
      }
    }
    laneLifetime[n.id] = {
      start: Number.isFinite(tStart) ? tStart : null,
      end:   Number.isFinite(tEnd)   ? tEnd   : null,
    }
  }

  let slotByNode: SlotByNode = {}
  let slots: ProcessSankeySlot[] = []
  let initialSlotOrder: string[] = []

  if (opts.frozenSlots) {
    // Later layout passes: keep packing membership, refresh peaks only.
    const rehydrated = rehydrateProcessSankeySlots(opts.frozenSlots, nodeData, laneLifetime)
    slots = rehydrated.slots
    slotByNode = rehydrated.slotByNode
    initialSlotOrder = slots.map(slotStableId)
  } else if (packing === "reuse") {
    const packed = packProcessSankeySlots(nodes, edges, nodeData, laneLifetime)
    slots = packed.slots
    slotByNode = packed.slotByNode
  } else {
    nodes.forEach((n, i) => {
      slots.push({
        occupants: [{ id: n.id, end: laneLifetime[n.id]?.end ?? -Infinity }],
        peak: { topPeak: topPeak[n.id], botPeak: botPeak[n.id] },
        ...(n.group ? { group: n.group } : {}),
      })
      slotByNode[n.id] = i
    })
  }

  // Group projection is a hard constraint, independent of the optional lane
  // ordering strategy. This also gives the optimizer a legal baseline.
  // Frozen slots already carry bonded membership; re-bond is idempotent.
  bondProcessSankeySlotGroups(slots, slotByNode)
  if (initialSlotOrder.length === 0) initialSlotOrder = slots.map(slotStableId)
  let ordering: ProcessSankeyOrderingResult | null = null
  if (opts.frozenSlots) {
    // Packing + order already decided; only geometry changes with mass/scale.
  } else if (opts.fixedSlotOrder) {
    applyFixedSlotOrder(slots, slotByNode, opts.fixedSlotOrder)
  } else if (opts.runOrdering && laneOrder && laneOrder !== "insertion") {
    ordering = orderProcessSankeySlots(
      nodes, edges, nodeData, laneLifetime, slots, slotByNode,
      { plotH, padding, valueScale, groupPadding, laneOrder, ribbonLane, domain },
    )
  }
  bondProcessSankeySlotGroups(slots, slotByNode)

  const geometry = computeSlotGeometry(nodes, edges, nodeData, slots, slotByNode, {
    plotH, padding, valueScale, stackValueScale: opts.stackValueScale,
    lanePlacement, groupPadding,
  })

  const effectiveSlotsHeight = slots.length === 0
    ? 0
    : slots[0].peak.topPeak
      + geometry.adjacentClearance.reduce((a, b) => a + b, 0)
      + slots[slots.length - 1].peak.botPeak

  const crossingsBefore = ordering?.before.crossings ?? null
  const crossingsAfter = ordering?.after.crossings ?? null
  const lengthBefore = ordering?.before.weightedLength ?? null
  const lengthAfter = ordering?.after.weightedLength ?? null

  return {
    effectiveSlotsHeight,
    centerlines: geometry.centerlines,
    laneLifetime, slots, slotByNode,
    slotCenter: geometry.slotCenter,
    stackCenter: geometry.stackCenter,
    verticalUtilization: geometry.verticalUtilization,
    selectedSlotOrder: slots.map(slotStableId),
    initialSlotOrder,
    ordering,
    crossingsBefore, crossingsAfter, lengthBefore, lengthAfter,
  }
}

export function computeProcessSankeyLayout(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  opts: ProcessSankeyOptions,
): ProcessSankeyLayout {
  const {
    plotH,
    pairing = "temporal",
    packing = "reuse",
    laneOrder = "crossing-min",
    lifetimeMode = "half",
    maxValueScale,
    lanePlacement = "stack",
    nodeSizing = "temporal",
    groupPadding: rawGroupPadding = 0,
    ribbonLane = "both",
    domain,
  } = opts
  const groupPadding = Number.isFinite(rawGroupPadding) ? Math.max(0, rawGroupPadding) : 0

  const edgeIndex = buildEdgeIndex(nodes, edges)
  const sides = assignSides(nodes, edges, edgeIndex, pairing)
  let nodeData: Record<string, ProcessSankeyNodeData> = {}
  for (const n of nodes) {
    nodeData[n.id] = computeNode(n, edgeIndex, sides, undefined, nodeSizing)
  }

  // First pass: pack + order once. Later passes rehydrate the same packing
  // membership under updated sides/mass so the expensive continuity search
  // does not re-run (and cannot silently drop the first-pass assignment).
  const basePadding = 12
  const dry1 = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding: basePadding, valueScale: 1, packing, laneOrder, lifetimeMode,
    runOrdering: true, lanePlacement: "stack", groupPadding, ribbonLane, domain,
  })
  const frozenSlots = dry1.slots.map((slot) => ({
    occupants: slot.occupants.map((o) => ({ ...o })),
    peak: { ...slot.peak },
    ...(slot.group != null ? { group: slot.group } : {}),
  }))

  // Override sides based on slot ordering: top when target is in a
  // higher slot, bot when lower. Same-slot edges begin as bottom-side
  // handoffs; the chronological balance pass below assigns the final side.
  const sameSlotEdgeIds = new Set<string>()
  for (const e of edges) {
    const ss = dry1.slotByNode[e.source]
    const ts = dry1.slotByNode[e.target]
    if (ss === undefined || ts === undefined) continue
    const sObj = sides.get(e.id)!
    if (ss === ts) {
      sameSlotEdgeIds.add(e.id)
      sObj.sourceSide = "bot"
      sObj.targetSide = "bot"
      continue
    }
    if (ts < ss) { sObj.sourceSide = "top"; sObj.targetSide = "bot" }
    else        { sObj.sourceSide = "bot"; sObj.targetSide = "top" }
  }

  // Same-slot incoming edges align with the node's outgoing side so
  // pure accretors (PR1, PR2 etc) don't step.
  for (const n of nodes) {
    const out = edgeIndex.outgoing[n.id]
    const inn = edgeIndex.incoming[n.id]
    const outSides = new Set(out.map((e) => sides.get(e.id)!.sourceSide))
    const inSides  = new Set(inn.map((e) => sides.get(e.id)!.targetSide))
    if (outSides.size === 1 && inn.length > 0) {
      const align = [...outSides][0]
      for (const e of inn) {
        if (dry1.slotByNode[e.source] === dry1.slotByNode[e.target]) {
          sides.get(e.id)!.targetSide = align
        }
      }
    }
    if (inSides.size === 1 && out.length > 0) {
      const align = [...inSides][0]
      for (const e of out) {
        if (dry1.slotByNode[e.source] === dry1.slotByNode[e.target]) {
          sides.get(e.id)!.sourceSide = align
        }
      }
    }
  }

  assignSameSlotHandoffSides(edges, sides, dry1.slotByNode)

  rebalanceOutgoingSides(nodes, edgeIndex, sides, sameSlotEdgeIds)

  // Recompute samples with new sides
  nodeData = {}
  for (const n of nodes) {
    nodeData[n.id] = computeNode(n, edgeIndex, sides, undefined, nodeSizing)
  }
  const dry = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding: basePadding, valueScale: 1, packing, laneOrder, lifetimeMode,
    frozenSlots, lanePlacement: "stack",
    groupPadding, ribbonLane, domain,
  })

  // valueScale: tight effective slot height, not sum of per-slot peaks
  const slotsHeight = dry.effectiveSlotsHeight ?? dry.slots.reduce(
    (s, slot) => s + slot.peak.topPeak + slot.peak.botPeak, 0
  )
  const bondedGapCount = dry.slots.slice(0, -1).reduce((count, slot, index) =>
    count + (slot.group != null && slot.group === dry.slots[index + 1].group ? 1 : 0), 0)
  const standardGapCount = Math.max(1, dry.slots.length + 1 - bondedGapCount)
  const padding = Math.min(
    basePadding,
    Math.max(0, plotH * 0.35 - bondedGapCount * groupPadding) / standardGapCount,
  )
  const totalGaps = padding * 2 + processSankeyGapPaddings(
    dry.slots, padding, groupPadding,
  ).reduce((sum, gap) => sum + gap, 0)
  const naturalValueScale = slotsHeight > 0
    ? Math.max(0, (plotH - totalGaps) / slotsHeight)
    : 1
  const valueScale = Number.isFinite(maxValueScale) && maxValueScale! > 0
    ? Math.min(naturalValueScale, maxValueScale!)
    : naturalValueScale

  let layout = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding, valueScale, packing, laneOrder, lifetimeMode,
    frozenSlots, lanePlacement,
    groupPadding, ribbonLane, domain,
    stackValueScale: naturalValueScale,
  })

  // M3: when final geometry differs from the dry scale=1 stack pass (hug
  // placement and/or a binding maxValueScale), re-score adjacent order under
  // the rendered cost. Packing membership stays frozen; only lane permutation
  // may change, and only when exact-transit cost improves.
  const maxScaleBinds = Number.isFinite(maxValueScale) && maxValueScale! > 0 &&
    maxValueScale! + 1e-12 < naturalValueScale
  const needsGeometryRefine = laneOrder !== "insertion" &&
    (lanePlacement === "hug" || maxScaleBinds)
  if (needsGeometryRefine && layout.slots.length > 1) {
    orderProcessSankeySlots(
      nodes, edges, nodeData, layout.laneLifetime, layout.slots, layout.slotByNode,
      {
        plotH, padding, valueScale, groupPadding, laneOrder, ribbonLane, domain,
        lanePlacement, mode: "geometry-refine",
      },
    )
    layout = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
      plotH, padding, valueScale, packing, laneOrder, lifetimeMode,
      frozenSlots: layout.slots,
      fixedSlotOrder: layout.slots.map(slotStableId),
      lanePlacement, groupPadding, ribbonLane, domain,
      stackValueScale: naturalValueScale,
    })
  }

  // Resolve equal-time attachment stacks from the opposite endpoint after
  // lane ordering and final-scale geometry are known. Chronology remains the
  // primary key; this pass only removes avoidable fan crossings such as many
  // simultaneous Launch departures reaching Lunar Orbit at different times.
  if (hasResolvableAttachmentTies(edgeIndex, sides)) {
    const endpointPositions = collectEndpointPositions(
      edges, nodeData, layout.centerlines, valueScale,
    )
    nodeData = {}
    for (const node of nodes) {
      nodeData[node.id] = computeNode(node, edgeIndex, sides, endpointPositions, nodeSizing)
    }
    layout = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
      plotH, padding, valueScale, packing, laneOrder, lifetimeMode,
      frozenSlots: layout.slots,
      fixedSlotOrder: layout.slots.map(slotStableId),
      lanePlacement, groupPadding, ribbonLane, domain,
      stackValueScale: naturalValueScale,
    })
  }

  // Rebuild the initial packed order with the final mass/scale so every
  // before/after quality field is directly comparable in rendered pixels.
  const initialRank = new Map(dry1.initialSlotOrder.map((id, index) => [id, index]))
  const baselineSlots = [...layout.slots].sort((a, b) =>
    (initialRank.get(slotStableId(a)) ?? Infinity) - (initialRank.get(slotStableId(b)) ?? Infinity) ||
    compareProcessSankeyIds(slotStableId(a), slotStableId(b)),
  )
  const baselineSlotByNode: SlotByNode = {}
  baselineSlots.forEach((slot, index) => {
    for (const occupant of slot.occupants) baselineSlotByNode[occupant.id] = index
  })
  const baselineGeometry = computeSlotGeometry(
    nodes, edges, nodeData, baselineSlots, baselineSlotByNode,
    {
      plotH, padding, valueScale, stackValueScale: naturalValueScale,
      lanePlacement: "stack", groupPadding,
    },
  )
  const baselineNodeData = bondProcessSankeyNodeData(
    nodes, nodeData, baselineSlots, baselineSlotByNode,
    baselineGeometry.centerlines, valueScale, groupPadding,
  )
  const layoutQualityBefore = computeLayoutQuality(
    countCrossings(baselineSlotByNode, edges),
    totalEdgeLength(baselineSlotByNode, edges),
    edges, baselineNodeData, baselineSlots, baselineSlotByNode,
    baselineGeometry.centerlines, layout.laneLifetime, valueScale,
    baselineGeometry.verticalUtilization, ribbonLane, domain,
  )
  nodeData = bondProcessSankeyNodeData(
    nodes, nodeData, layout.slots, layout.slotByNode,
    layout.centerlines, valueScale, groupPadding,
  )
  const layoutQuality = computeLayoutQuality(
    countCrossings(layout.slotByNode, edges),
    totalEdgeLength(layout.slotByNode, edges),
    edges, nodeData, layout.slots, layout.slotByNode,
    layout.centerlines, layout.laneLifetime, valueScale,
    layout.verticalUtilization, ribbonLane, domain,
  )

  return {
    nodeData,
    sides,
    valueScale,
    padding,
    compressedPadding: padding < basePadding,
    centerlines: layout.centerlines,
    laneLifetime: layout.laneLifetime,
    slots: layout.slots,
    slotByNode: layout.slotByNode,
    crossingsBefore: laneOrder === "insertion" ? null : layoutQualityBefore.crossings,
    crossingsAfter: laneOrder === "insertion" ? null : layoutQuality.crossings,
    lengthBefore: laneOrder === "insertion" ? null : layoutQualityBefore.weightedLength,
    lengthAfter: laneOrder === "insertion" ? null : layoutQuality.weightedLength,
    layoutQualityBefore,
    layoutQuality,
  }
}

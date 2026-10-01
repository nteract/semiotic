import { ProcessSankeyCrossings } from "./crossings"
import {
  orderByBarycenter,
  orderExactSmall,
  refineByAdjacentSwaps,
  type WeightedOrderRelation,
} from "../../../recipes/layout1d"
import type {
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySlot,
} from "./algorithm"
import {
  compareProcessSankeyIds,
  computeSlotPairClearance,
  computeSlotGeometry,
  measureTransitOcclusion,
  slotStableId,
  totalPixelEdgeLength,
  type SlotByNode,
} from "./layoutGeometry"
import {
  applyOrder,
  bondedSlotOrder,
  bondedSlotUnits,
  bondProcessSankeySlotGroups,
  flattenBondedUnits,
  hasMultiSlotBond,
  mapForOrder,
  orderWithinBondedUnits,
  unitRelationsFromSlots,
  type BondedSlotUnit,
} from "./orderingBond"
import { centerBoundaryHubs } from "./boundaryHubOrdering"
import type {
  ProcessSankeyOrderMetrics,
  ProcessSankeyOrderingOptions,
  ProcessSankeyOrderingResult,
} from "./orderingTypes"

export type {
  ProcessSankeyOrderMetrics,
  ProcessSankeyOrderingOptions,
  ProcessSankeyOrderingResult,
} from "./orderingTypes"

export { bondProcessSankeySlotGroups }

export function countCrossings(slotByNode: SlotByNode, edges: readonly ProcessSankeyEdge[]): number {
  const lanes = [...new Set(Object.values(slotByNode))].sort((a, b) => a - b)
  const ranks = new Map(lanes.map((lane, i) => [lane, i]))
  const nodeSlots = new Map(Object.entries(slotByNode).map(([id, lane]) => [id, ranks.get(lane)!]))
  return new ProcessSankeyCrossings(edges, nodeSlots, lanes.length).count(lanes.map((_, i) => i))
}

export function totalEdgeLength(slotByNode: SlotByNode, edges: readonly ProcessSankeyEdge[]): number {
  let total = 0
  for (const edge of edges) {
    const source = slotByNode[edge.source]
    const target = slotByNode[edge.target]
    if (source == null || target == null) continue
    total += Math.abs(source - target) * (edge.value > 0 ? edge.value : 1)
  }
  return total
}

const BRUTE_FORCE_MAX = 8
const BRUTE_FORCE_EVALUATION_MAX = 50_000
const LEGACY_BRUTE_FORCE_EDGE_MAX = 40
const permutationCount = (count: number): number => {
  let result = 1
  for (let value = 2; value <= count; value++) result *= value
  return result
}
// Preserve the former worst-case exact-search envelope: 8! permutations,
// forty routed edges, and every possible edge pair participating in the
// crossing proxy. Measuring the arrays the evaluator actually visits admits
// dense small layouts when their temporal/shared-endpoint structure is cheap.
const BRUTE_FORCE_WORK_MAX = /* @__PURE__ */ permutationCount(BRUTE_FORCE_MAX) * (
  BRUTE_FORCE_MAX +
  LEGACY_BRUTE_FORCE_EDGE_MAX +
  LEGACY_BRUTE_FORCE_EDGE_MAX * (LEGACY_BRUTE_FORCE_EDGE_MAX - 1) / 2
)
const ORDERING_EVALUATION_BUDGET = 3000


/** Place ranked slots or bonded units alternately around the center. */
function insideOut<T>(ranked: readonly T[]): T[] {
  const arranged = new Array<T>(ranked.length)
  const middle = Math.floor((ranked.length - 1) / 2)
  let above = middle - 1, below = middle + 1
  if (ranked.length > 0) arranged[middle] = ranked[0]
  for (let i = 1; i < ranked.length; i++) {
    if (i % 2 === 1 && below < ranked.length) arranged[below++] = ranked[i]
    else if (above >= 0) arranged[above--] = ranked[i]
    else arranged[below++] = ranked[i]
  }
  return arranged
}

/** Retain the best ordering while considering each ranked item at the center. */
function refineCenter<T>(order: T[], ranked: readonly T[], cost: (order: T[]) => number): T[] {
  let current = cost(order), bestCost = current
  let best = [...order]
  const middle = Math.floor((order.length - 1) / 2)
  for (const item of ranked) {
    const index = order.indexOf(item)
    if (index === middle) continue
    order.splice(index, 1)
    order.splice(middle, 0, item)
    const next = cost(order)
    if (next <= current) {
      current = next
      if (next < bestCost) { best = [...order]; bestCost = next }
    } else {
      order.splice(middle, 1)
      order.splice(index, 0, item)
    }
  }
  return best
}

/**
 * Optimize one already-packed ProcessSankey slot list. Crossing changes for
 * adjacent swaps are evaluated only for edge pairs incident to the two moved
 * slots; pixel length and transit are O(E·slots), avoiding the old O(E²)
 * rescore at every transpose candidate.
 */
export function orderProcessSankeySlots(
  nodes: readonly ProcessSankeyNode[],
  edges: readonly ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  _laneLifetime: Record<string, ProcessSankeyLaneLifetime>,
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  options: ProcessSankeyOrderingOptions,
): ProcessSankeyOrderingResult {
  const initialOrder = [...slots]
  const stableId = new Map(slots.map((slot) => [slot, slotStableId(slot)]))
  const slotForNode = new Map<string, ProcessSankeySlot>()
  for (const slot of slots) for (const occupant of slot.occupants) slotForNode.set(occupant.id, slot)
  const edgeSlots = new Map<ProcessSankeyEdge, readonly [ProcessSankeySlot, ProcessSankeySlot]>()
  const relations: WeightedOrderRelation<ProcessSankeySlot>[] = []
  for (const edge of edges) {
    const source = slotForNode.get(edge.source)
    const target = slotForNode.get(edge.target)
    if (!source || !target) continue
    edgeSlots.set(edge, [source, target])
    if (source !== target) relations.push({ source, target, weight: edge.value })
  }
  const totalWeight = edges.reduce((sum, edge) => sum + (edge.value > 0 ? edge.value : 1), 0)
  const averageGap = options.plotH / Math.max(1, slots.length)
  const totalPeak = slots.reduce((sum, slot) => sum + slot.peak.topPeak + slot.peak.botPeak, 0)
  // Make crossings lexicographically dominant. Pixel length is bounded by
  // plotH·edgeWeight, while the hot-loop transit proxy is bounded by the
  // summed slot silhouettes. The +1 leaves no equality edge case.
  const crossingPenalty = Math.max(1, totalWeight) * (
    Math.max(1, options.plotH) +
    averageGap * Math.max(totalPeak, slots.length) +
    Math.max(1, slots.length - 1) * 1e-6
  ) + 1
  // Exclusive handoffs (one partner only) should sit on/near each other even
  // when pairwise crossings are already zero. Without this, a 0-crossing order
  // can still route secession-style ribbons through vacant historical lanes.
  // Scale with averageGap·4 so exclusive adjacency outranks typical hug pixel
  // reshuffles at equal crossings, while remaining far below one crossing.
  const exclusiveSpanUnit = averageGap * 4
  const evaluations = { fullCrossing: 0, localCrossing: 0 }
  // Clearance is only needed for adjacent pairs in candidate orders — compute
  // on demand and cache rather than materializing the full S×S matrix up front.
  const pairClearance = new Map<ProcessSankeySlot, Map<ProcessSankeySlot, number>>()
  const clearanceBetween = (upper: ProcessSankeySlot, lower: ProcessSankeySlot): number => {
    let row = pairClearance.get(upper)
    if (!row) {
      row = new Map()
      pairClearance.set(upper, row)
    }
    const cached = row.get(lower)
    if (cached != null) return cached
    const value = computeSlotPairClearance(upper, lower, nodeData)
    row.set(lower, value)
    return value
  }
  const stableSlotIndex = new Map(slots.map((slot, index) => [slot, index]))
  const crossingIndex = new ProcessSankeyCrossings(edges,
    new Map([...slotForNode].map(([id, slot]) => [id, stableSlotIndex.get(slot)!])), slots.length)
  const positionsFor = (order: readonly ProcessSankeySlot[]): Int32Array => {
    const positions = new Int32Array(slots.length)
    for (let i = 0; i < order.length; i++) positions[stableSlotIndex.get(order[i])!] = i
    return positions
  }
  const routeByEdge = new Map([...edgeSlots].map(([edge, [source, target]]) => [edge, {
    source: stableSlotIndex.get(source)!, target: stableSlotIndex.get(target)!,
    weight: edge.value > 0 ? edge.value : 1,
  }]))
  const edgeRoutes = [...routeByEdge.values()]

  const outgoingPartners = new Map<string, Set<string>>()
  const incomingPartners = new Map<string, Set<string>>()
  const allPartners = new Map<string, Set<string>>()
  const addPartner = (map: Map<string, Set<string>>, id: string, partner: string): void => {
    if (!map.has(id)) map.set(id, new Set())
    map.get(id)!.add(partner)
  }
  for (const edge of edges) {
    addPartner(outgoingPartners, edge.source, edge.target)
    addPartner(incomingPartners, edge.target, edge.source)
    addPartner(allPartners, edge.source, edge.target)
    addPartner(allPartners, edge.target, edge.source)
  }

  const isExclusiveHandoff = (edge: ProcessSankeyEdge): boolean => {
    // Pure exclusive source, or a temporary branch whose only overall neighbor
    // is this partner (secession leave/return).
    return (outgoingPartners.get(edge.source)?.size === 1 &&
      outgoingPartners.get(edge.source)!.has(edge.target)) ||
      allPartners.get(edge.source)?.size === 1 ||
      allPartners.get(edge.target)?.size === 1
  }
  const exclusiveEdgeRoutes = edges.flatMap((edge) => {
    if (!isExclusiveHandoff(edge)) return []
    const route = routeByEdge.get(edge)
    if (!route || route.source === route.target) return []
    return [route]
  })
  const exclusiveSpanCostFromPositions = (positions: ArrayLike<number>): number => {
    let total = 0
    for (const route of exclusiveEdgeRoutes) {
      // Prefer adjacency (span 0–1 free); each extra hop is pure detour.
      total += Math.max(0, Math.abs(positions[route.source] - positions[route.target]) - 1) *
        route.weight
    }
    return total * exclusiveSpanUnit
  }
  const exclusiveSpanCostForOrder = (order: readonly ProcessSankeySlot[]): number =>
    exclusiveSpanCostFromPositions(positionsFor(order))
  const fastPositions = new Int32Array(slots.length)
  const fastCenters = new Float64Array(slots.length)
  const fastPrefix = new Float64Array(slots.length + 1)
  const evaluateFastProxyCost = (order: readonly ProcessSankeySlot[]): number => {
    for (let i = 0; i < order.length; i++) fastPositions[stableSlotIndex.get(order[i])!] = i
    const crossings = crossingIndex.count(fastPositions)
    if (order.length > 0) {
      const first = stableSlotIndex.get(order[0])!
      fastCenters[first] = options.padding + order[0].peak.topPeak * options.valueScale
      for (let i = 1; i < order.length; i++) {
        const previous = stableSlotIndex.get(order[i - 1])!
        const current = stableSlotIndex.get(order[i])!
        fastCenters[current] = fastCenters[previous] +
          clearanceBetween(order[i - 1], order[i]) * options.valueScale + options.padding
      }
      const last = stableSlotIndex.get(order[order.length - 1])!
      const bottom = fastCenters[last] + order[order.length - 1].peak.botPeak * options.valueScale + options.padding
      if (bottom > options.plotH && bottom > 0) {
        const scale = options.plotH / bottom
        for (let i = 0; i < fastCenters.length; i++) fastCenters[i] *= scale
      }
    }
    fastPrefix[0] = 0
    for (let i = 0; i < order.length; i++) {
      fastPrefix[i + 1] = fastPrefix[i] + order[i].peak.topPeak + order[i].peak.botPeak
    }
    let weightedLength = 0
    let pixelLength = 0
    let transit = 0
    for (const route of edgeRoutes) {
      const source = fastPositions[route.source]
      const target = fastPositions[route.target]
      weightedLength += Math.abs(source - target) * route.weight
      pixelLength += Math.abs(fastCenters[route.source] - fastCenters[route.target]) * route.weight
      if (Math.abs(source - target) >= 2) {
        const lo = Math.min(source, target) + 1
        const hi = Math.max(source, target)
        transit += (fastPrefix[hi] - fastPrefix[lo]) * route.weight
      }
    }
    return crossings * crossingPenalty + pixelLength + transit * averageGap +
      exclusiveSpanCostFromPositions(fastPositions) + weightedLength * 1e-6
  }

  // Fast transit-density proxy for the ordering loop. The reported quality
  // metric remains exact over authored event windows; this prefix-sum form keeps each candidate
  // O(E + slots) while still penalizing heavy ribbons crossing dense lanes.
  const transitDensityCost = (
    order: readonly ProcessSankeySlot[],
    map: SlotByNode,
  ): number => {
    const prefix = new Array<number>(order.length + 1).fill(0)
    for (let i = 0; i < order.length; i++) {
      prefix[i + 1] = prefix[i] + order[i].peak.topPeak + order[i].peak.botPeak
    }
    let total = 0
    for (const edge of edges) {
      const source = map[edge.source]
      const target = map[edge.target]
      if (source == null || target == null || Math.abs(source - target) < 2) continue
      const lo = Math.min(source, target) + 1
      const hi = Math.max(source, target)
      total += (prefix[hi] - prefix[lo]) * (edge.value > 0 ? edge.value : 1)
    }
    return total
  }

  const secondaryMetrics = (order: readonly ProcessSankeySlot[]) => {
    const map = mapForOrder(order)
    const adjacentClearance = order.slice(0, -1).map((slot, index) =>
      clearanceBetween(slot, order[index + 1]),
    )
    const geometry = computeSlotGeometry(nodes, edges, nodeData, order, map, {
      plotH: options.plotH,
      padding: options.padding,
      valueScale: options.valueScale,
      lanePlacement: options.lanePlacement ?? "stack",
      groupPadding: options.groupPadding,
      adjacentClearance,
    })
    return {
      map,
      geometry,
      weightedLength: totalEdgeLength(map, edges),
      pixelLength: totalPixelEdgeLength(geometry.centerlines, edges),
    }
  }
  const evaluate = (
    order: readonly ProcessSankeySlot[],
    knownCrossings?: number,
    transitMode?: "score" | "quality",
  ): ProcessSankeyOrderMetrics => {
    let crossings = knownCrossings
    if (crossings == null) {
      crossings = crossingIndex.count(positionsFor(order))
      evaluations.fullCrossing++
    }
    const { map, geometry, weightedLength, pixelLength } = secondaryMetrics(order)
    const transitOcclusion = transitMode ? measureTransitOcclusion(
      edges, nodeData, order, map, geometry.centerlines, _laneLifetime,
      { valueScale: options.valueScale, ribbonLane: options.ribbonLane, domain: options.domain, mode: transitMode },
    ) : transitDensityCost(order, map)
    return {
      crossings, weightedLength, pixelLength, transitOcclusion,
      cost: crossings * crossingPenalty + pixelLength + transitOcclusion * averageGap +
        exclusiveSpanCostForOrder(order) + weightedLength * 1e-6,
    }
  }
  const evaluateExactTransit = (
    order: readonly ProcessSankeySlot[],
    knownCrossings?: number,
    // Score uses ribbon endpoints in the hot loop; quality includes mass events.
    transitMode: "score" | "quality" = "quality",
  ): ProcessSankeyOrderMetrics => evaluate(order, knownCrossings, transitMode)

  let order = [...initialOrder]
  const compareSlots = (a: ProcessSankeySlot, b: ProcessSankeySlot) =>
    compareProcessSankeyIds(stableId.get(a)!, stableId.get(b)!)
  const multiSlotBonded = hasMultiSlotBond(order)

  const transposeSlots = (
    candidate: ProcessSankeySlot[],
    score: (order: readonly ProcessSankeySlot[], crossings?: number) => ProcessSankeyOrderMetrics,
    passes: number,
    budget = ORDERING_EVALUATION_BUDGET,
  ): ProcessSankeySlot[] => {
    let current = score(candidate)
    for (let pass = 0; pass < passes && budget > 0; pass++) {
      let improved = false
      const swapIndexes = Array.from({ length: candidate.length - 1 }, (_, i) => i)
      if (pass % 2 === 1) swapIndexes.reverse()
      for (const i of swapIndexes) {
        if (budget-- <= 0) break
        const first = candidate[i]
        const second = candidate[i + 1]
        const change = crossingIndex.swapDelta(stableSlotIndex.get(first)!, stableSlotIndex.get(second)!, positionsFor(candidate))
        ;[candidate[i], candidate[i + 1]] = [second, first]
        evaluations.localCrossing += change.evaluations
        const next = score(candidate, current.crossings + change.delta)
        if (next.cost < current.cost) {
          current = next
          improved = true
        } else {
          ;[candidate[i], candidate[i + 1]] = [first, second]
        }
      }
      if (!improved) break
    }
    return candidate
  }

  const scalableReadabilityOrder = (input: readonly ProcessSankeySlot[]): ProcessSankeySlot[] => {
    const candidate = orderByBarycenter(input, relations, (next) => evaluate(next).cost, {
      passes: 6,
      compare: compareSlots,
      maxEvaluations: ORDERING_EVALUATION_BUDGET,
    })
    return transposeSlots(candidate, evaluate, 6)
  }

  const readabilityOrder = (input: readonly ProcessSankeySlot[]): ProcessSankeySlot[] => {
    const scalableCandidate = scalableReadabilityOrder(input)
    const exactWork = input.length <= BRUTE_FORCE_MAX
      ? permutationCount(input.length) * (
        input.length + edgeRoutes.length + crossingIndex.work
      )
      : Infinity
    if (exactWork > BRUTE_FORCE_WORK_MAX) return scalableCandidate

    const exactCandidate = orderExactSmall(input, evaluateFastProxyCost, {
      maxItems: BRUTE_FORCE_MAX,
      maxEvaluations: BRUTE_FORCE_EVALUATION_MAX,
    })
    // Exhaustive permutation search uses the bounded density proxy in its hot
    // loop. It can certify a crossing improvement, but attachment sides and
    // node silhouettes are rebuilt after this dry ordering pass, so secondary
    // geometry measured here is not the final rendered geometry. At equal
    // crossings retain the scalable seed; the later authored-window transpose
    // pass can refine it without replacing it on proxy evidence alone.
    const exactMetrics = evaluateExactTransit(exactCandidate)
    const scalableMetrics = evaluateExactTransit(scalableCandidate)
    if (exactMetrics.crossings !== scalableMetrics.crossings) {
      return exactMetrics.crossings < scalableMetrics.crossings
        ? exactCandidate
        : scalableCandidate
    }
    return scalableCandidate
  }

  /**
   * Primary search over bonded units (compound nodes). Running unconstrained
   * slot barycenter first and re-gluing groups by mean anchor lets foreign
   * rows settle between a multi-slot feeder block and its exclusive sink;
   * treating the block as one supernode keeps exclusive handoffs local.
   */
  const unitReadabilityOrder = (input: readonly ProcessSankeySlot[]): ProcessSankeySlot[] => {
    let units = bondedSlotUnits(input)
    if (units.length <= 1) return flattenBondedUnits(units)

    const unitCost = (next: readonly BondedSlotUnit[]) =>
      evaluate(flattenBondedUnits(next)).cost
    const compareUnits = (a: BondedSlotUnit, b: BondedSlotUnit) =>
      compareProcessSankeyIds(a.stableId, b.stableId)

    // Seed: slot-level readability, then project into contiguous units. This
    // preserves useful within-block relative order without letting foreign
    // slots remain interleaved through the primary unit search.
    const slotSeed = readabilityOrder(input)
    units = bondedSlotUnits(slotSeed)
    units = orderWithinBondedUnits(units, relations, compareSlots)

    const unitRelations = unitRelationsFromSlots(units, relations)
    units = orderByBarycenter(units, unitRelations, unitCost, {
      passes: 6,
      compare: compareUnits,
      maxEvaluations: ORDERING_EVALUATION_BUDGET,
    })
    units = refineByAdjacentSwaps(units, unitCost, {
      passes: 8,
      maxEvaluations: ORDERING_EVALUATION_BUDGET,
    })

    // Small unit counts fit exact search under the same work envelope used for
    // slot permutations — multi-slot bonds often collapse a large slot list to
    // a handful of units (e.g. a 3-slot feeder block + a few shared rows).
    const exactWork = units.length <= BRUTE_FORCE_MAX
      ? permutationCount(units.length) * (
        units.length + edgeRoutes.length + crossingIndex.work
      )
      : Infinity
    if (exactWork <= BRUTE_FORCE_WORK_MAX) {
      const exactUnits = orderExactSmall(units, (next) =>
        evaluateFastProxyCost(flattenBondedUnits(next)), {
        maxItems: BRUTE_FORCE_MAX,
        maxEvaluations: BRUTE_FORCE_EVALUATION_MAX,
      })
      const exactFlat = flattenBondedUnits(exactUnits)
      const scalableFlat = flattenBondedUnits(units)
      const exactMetrics = evaluateExactTransit(exactFlat)
      const scalableMetrics = evaluateExactTransit(scalableFlat)
      if (exactMetrics.crossings !== scalableMetrics.crossings) {
        units = exactMetrics.crossings < scalableMetrics.crossings ? exactUnits : units
      } else if (exactMetrics.cost < scalableMetrics.cost) {
        // At equal crossings, exact unit search may still win on length/transit
        // — unlike the slot path we accept that, because unit moves cannot tear
        // bonded blocks and the geometry they imply is stable under rebond.
        units = exactUnits
      }
    }

    // Refresh within-block order once unit positions are known so members face
    // their dominant external partner.
    units = orderWithinBondedUnits(units, relations, compareSlots)
    return flattenBondedUnits(units)
  }

  const unitSize = (unit: BondedSlotUnit) =>
    unit.slots.reduce((sum, slot) => sum + slot.peak.topPeak + slot.peak.botPeak, 0)
  const compareUnitSize = (a: BondedSlotUnit, b: BondedSlotUnit) =>
    unitSize(b) - unitSize(a) || compareProcessSankeyIds(a.stableId, b.stableId)
  const compareSlotSize = (a: ProcessSankeySlot, b: ProcessSankeySlot) =>
    (b.peak.topPeak + b.peak.botPeak) - (a.peak.topPeak + a.peak.botPeak) || compareSlots(a, b)

  const geometryRefineOnly = options.mode === "geometry-refine"

  // Geometry-refine skips barycenter / exact permutation / inside-out and only
  // runs the bounded exact-transit transpose below — the M3 post-scale pass.
  if (!geometryRefineOnly &&
      (options.laneOrder === "crossing-min" || options.laneOrder === "crossing-min+inside-out")) {
    order = multiSlotBonded ? unitReadabilityOrder(order) : readabilityOrder(order)
  } else if (!geometryRefineOnly && options.laneOrder === "inside-out") {
    if (multiSlotBonded) {
      const units = bondedSlotUnits(order)
      const ranked = [...units].sort(compareUnitSize)
      order = flattenBondedUnits(insideOut(ranked))
    } else {
      const ranked = [...order].sort(compareSlotSize)
      order = insideOut(ranked)
    }
  }

  if (!geometryRefineOnly &&
      options.laneOrder === "crossing-min+inside-out" && order.length > 1) {
    // Largest-first center bias, guarded by the full pixel/transit score. Keep
    // the best end-to-end readability snapshot if any later move regresses.
    // Multi-slot bonds move as whole units so center bias cannot split a block.
    if (multiSlotBonded) {
      const units = bondedSlotUnits(order)
      const ranked = [...units].sort(compareUnitSize)
      order = flattenBondedUnits(refineCenter(units, ranked,
        (candidate) => evaluate(flattenBondedUnits(candidate)).cost))
    } else {
      const ranked = [...order].sort(compareSlotSize)
      order = refineCenter(order, ranked, (candidate) => evaluate(candidate).cost)
    }
  }

  if ((geometryRefineOnly ||
      options.laneOrder === "crossing-min" ||
      options.laneOrder === "crossing-min+inside-out") && order.length > 1) {
    // One bounded authored-window geometry pass makes the exact cubic occlusion
    // metric part of the accepted cost without putting it in every hot-loop
    // candidate of the barycenter/swap stages above. This pass still scores
    // adjacent transposes with exact transit so exclusive handoffs stay local;
    // the final before/after snapshot below remains the last authority. With
    // multi-slot bonds, transpose whole units so a refinement pass cannot
    // re-introduce foreign rows inside a block. Sole search step for
    // mode="geometry-refine" (post-scale M3).
    if (multiSlotBonded) {
      let units = refineByAdjacentSwaps(bondedSlotUnits(order), (candidate) =>
        evaluateExactTransit(flattenBondedUnits(candidate), undefined, "score").cost,
      { passes: 6 })
      // Final within-block alignment after unit positions settle.
      units = orderWithinBondedUnits(units, relations, compareSlots)
      order = flattenBondedUnits(units)
    } else {
      transposeSlots(order, (candidate, crossings) => evaluateExactTransit(candidate, crossings, "score"), 1, Infinity)
    }
  }

  const constrainedInitialOrder = bondedSlotOrder(initialOrder)
  order = bondedSlotOrder(order)

  let after = evaluateExactTransit(order)
  const exactBefore = evaluateExactTransit(constrainedInitialOrder)
  if (geometryRefineOnly) {
    // Post-scale refine may chase hug pixel wins, but must not invent crossings
    // or stretch exclusive handoffs the topology pass already straightened.
    const beforeSpan = exclusiveSpanCostForOrder(constrainedInitialOrder)
    const afterSpan = exclusiveSpanCostForOrder(order)
    if (
      after.crossings > exactBefore.crossings ||
      (after.crossings === exactBefore.crossings && afterSpan > beforeSpan + 1e-9) ||
      after.cost > exactBefore.cost
    ) {
      order = constrainedInitialOrder
      after = exactBefore
    }
  } else if (after.cost > exactBefore.cost) {
    order = constrainedInitialOrder
    after = exactBefore
  }

  const centered = centerBoundaryHubs({
    order,
    after,
    nodes,
    edges,
    outgoingPartners,
    incomingPartners,
    slotForNode,
    averageGap,
    evaluate: evaluateExactTransit,
  })
  order = centered.order
  after = centered.after
  applyOrder(slots, slotByNode, order)
  return {
    before: exactBefore,
    after,
    initialOrder: initialOrder.map((slot) => stableId.get(slot)!),
    evaluations,
  }
}

/** Reapply a previously selected slot permutation without rerunning search. */
export function applyFixedSlotOrder(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  orderedStableIds: readonly string[],
): void {
  const rank = new Map(orderedStableIds.map((id, index) => [id, index]))
  const ordered = [...slots].sort((a, b) => {
    const rankA = rank.get(slotStableId(a)) ?? Infinity
    const rankB = rank.get(slotStableId(b)) ?? Infinity
    return rankA - rankB || compareProcessSankeyIds(slotStableId(a), slotStableId(b))
  })
  applyOrder(slots, slotByNode, ordered)
}

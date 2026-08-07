import {
  countPairwiseCrossings,
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

function isCrossingCandidate(a: ProcessSankeyEdge, b: ProcessSankeyEdge): boolean {
  if (a.source === b.source || a.target === b.target ||
      a.source === b.target || a.target === b.source) return false
  return Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime)
}

export function countCrossings(slotByNode: SlotByNode, edges: readonly ProcessSankeyEdge[]): number {
  return countPairwiseCrossings(
    edges,
    (edge) => [slotByNode[edge.source], slotByNode[edge.target]],
    isCrossingCandidate,
  )
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

interface CrossingPair {
  index: number
  first: ProcessSankeyEdge
  second: ProcessSankeyEdge
  involvedSlots: Set<ProcessSankeySlot>
}

function crossingForPair(pair: CrossingPair, positions: Map<ProcessSankeySlot, number>, edgeSlots: Map<ProcessSankeyEdge, readonly [ProcessSankeySlot, ProcessSankeySlot]>): number {
  const [as, at] = edgeSlots.get(pair.first)!
  const [bs, bt] = edgeSlots.get(pair.second)!
  return ((positions.get(as)! - positions.get(bs)!) * (positions.get(at)! - positions.get(bt)!) < 0) ? 1 : 0
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
const BRUTE_FORCE_WORK_MAX = permutationCount(BRUTE_FORCE_MAX) * (
  BRUTE_FORCE_MAX +
  LEGACY_BRUTE_FORCE_EDGE_MAX +
  LEGACY_BRUTE_FORCE_EDGE_MAX * (LEGACY_BRUTE_FORCE_EDGE_MAX - 1) / 2
)
const ORDERING_EVALUATION_BUDGET = 3000

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
  const crossingPairs: CrossingPair[] = []
  for (let i = 0; i < edges.length; i++) {
    if (!edgeSlots.has(edges[i])) continue
    for (let j = i + 1; j < edges.length; j++) {
      if (!edgeSlots.has(edges[j]) || !isCrossingCandidate(edges[i], edges[j])) continue
      const involvedSlots = new Set<ProcessSankeySlot>([
        ...edgeSlots.get(edges[i])!, ...edgeSlots.get(edges[j])!,
      ])
      crossingPairs.push({ index: crossingPairs.length, first: edges[i], second: edges[j], involvedSlots })
    }
  }
  const crossingPairsBySlot = new Map<ProcessSankeySlot, CrossingPair[]>()
  for (const slot of slots) crossingPairsBySlot.set(slot, [])
  for (const pair of crossingPairs) {
    for (const slot of pair.involvedSlots) crossingPairsBySlot.get(slot)?.push(pair)
  }
  const affectedMarks = new Uint32Array(crossingPairs.length)
  let affectedGeneration = 0

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
  const edgeRoutes = edges.flatMap((edge) => {
    const route = edgeSlots.get(edge)
    if (!route) return []
    return [{
      source: stableSlotIndex.get(route[0])!,
      target: stableSlotIndex.get(route[1])!,
      weight: edge.value > 0 ? edge.value : 1,
    }]
  })
  const routeByEdge = new Map<ProcessSankeyEdge, { source: number; target: number }>()
  for (const edge of edges) {
    const route = edgeSlots.get(edge)
    if (route) routeByEdge.set(edge, {
      source: stableSlotIndex.get(route[0])!,
      target: stableSlotIndex.get(route[1])!,
    })
  }

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
    return [{
      source: route.source,
      target: route.target,
      weight: edge.value > 0 ? edge.value : 1,
    }]
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
  const exclusiveSpanCostForOrder = (order: readonly ProcessSankeySlot[]): number => {
    const positions = new Int16Array(slots.length)
    for (let i = 0; i < order.length; i++) {
      positions[stableSlotIndex.get(order[i])!] = i
    }
    return exclusiveSpanCostFromPositions(positions)
  }
  const crossingRoutes = crossingPairs.map((pair) => {
    const first = routeByEdge.get(pair.first)!
    const second = routeByEdge.get(pair.second)!
    return [first.source, first.target, second.source, second.target] as const
  })
  const fastPositions = new Int16Array(slots.length)
  const fastCenters = new Float64Array(slots.length)
  const fastPrefix = new Float64Array(slots.length + 1)
  const evaluateFastProxyCost = (order: readonly ProcessSankeySlot[]): number => {
    for (let i = 0; i < order.length; i++) fastPositions[stableSlotIndex.get(order[i])!] = i
    let crossings = 0
    for (const [as, at, bs, bt] of crossingRoutes) {
      if ((fastPositions[as] - fastPositions[bs]) * (fastPositions[at] - fastPositions[bt]) < 0) crossings++
    }
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
      transitOcclusion: transitDensityCost(order, map),
    }
  }
  const finishMetrics = (
    crossings: number,
    secondary: ReturnType<typeof secondaryMetrics>,
    order: readonly ProcessSankeySlot[],
  ): ProcessSankeyOrderMetrics => ({
    crossings,
    weightedLength: secondary.weightedLength,
    pixelLength: secondary.pixelLength,
    transitOcclusion: secondary.transitOcclusion,
    cost: crossings * crossingPenalty + secondary.pixelLength +
      secondary.transitOcclusion * averageGap +
      exclusiveSpanCostForOrder(order) +
      secondary.weightedLength * 1e-6,
  })
  const evaluate = (order: readonly ProcessSankeySlot[], knownCrossings?: number): ProcessSankeyOrderMetrics => {
    let crossings = knownCrossings
    if (crossings == null) {
      const positions = new Map(order.map((slot, index) => [slot, index]))
      crossings = crossingPairs.reduce((sum, pair) => sum + crossingForPair(pair, positions, edgeSlots), 0)
      evaluations.fullCrossing++
    }
    return finishMetrics(crossings, secondaryMetrics(order), order)
  }
  const evaluateExactTransit = (
    order: readonly ProcessSankeySlot[],
    knownCrossings?: number,
    /**
     * `"score"` samples only the authored start/end of each ribbon (hot-loop).
     * `"quality"` also samples intermediate mass events (final authority).
     */
    transitMode: "score" | "quality" = "quality",
  ): ProcessSankeyOrderMetrics => {
    let crossings = knownCrossings
    if (crossings == null) {
      const positions = new Map(order.map((slot, index) => [slot, index]))
      crossings = crossingPairs.reduce((sum, pair) => sum + crossingForPair(pair, positions, edgeSlots), 0)
      evaluations.fullCrossing++
    }
    const secondary = secondaryMetrics(order)
    return finishMetrics(crossings, {
      ...secondary,
      transitOcclusion: measureTransitOcclusion(
        edges, nodeData, order, secondary.map, secondary.geometry.centerlines, _laneLifetime,
        {
          valueScale: options.valueScale,
          ribbonLane: options.ribbonLane,
          domain: options.domain,
          mode: transitMode,
        },
      ),
    }, order)
  }

  let order = [...initialOrder]
  const compareSlots = (a: ProcessSankeySlot, b: ProcessSankeySlot) =>
    compareProcessSankeyIds(stableId.get(a)!, stableId.get(b)!)
  const multiSlotBonded = hasMultiSlotBond(order)

  const scalableReadabilityOrder = (input: readonly ProcessSankeySlot[]): ProcessSankeySlot[] => {
    const candidate = orderByBarycenter(input, relations, (next) => evaluate(next).cost, {
      passes: 6,
      compare: compareSlots,
      maxEvaluations: ORDERING_EVALUATION_BUDGET,
    })
    let current = evaluate(candidate)
    let budget = ORDERING_EVALUATION_BUDGET
    for (let pass = 0; pass < 6 && budget > 0; pass++) {
      let improved = false
      const swapIndexes = Array.from({ length: candidate.length - 1 }, (_, i) => i)
      if (pass % 2 === 1) swapIndexes.reverse()
      for (const i of swapIndexes) {
        if (budget-- <= 0) break
        const first = candidate[i]
        const second = candidate[i + 1]
        const positionsBefore = new Map(candidate.map((slot, index) => [slot, index]))
        let affectedBefore = 0
        const affected: CrossingPair[] = []
        affectedGeneration++
        for (const pair of [...(crossingPairsBySlot.get(first) ?? []), ...(crossingPairsBySlot.get(second) ?? [])]) {
          if (affectedMarks[pair.index] === affectedGeneration) continue
          affectedMarks[pair.index] = affectedGeneration
          affected.push(pair)
          affectedBefore += crossingForPair(pair, positionsBefore, edgeSlots)
        }
        ;[candidate[i], candidate[i + 1]] = [second, first]
        const positionsAfter = new Map(positionsBefore)
        positionsAfter.set(first, i + 1)
        positionsAfter.set(second, i)
        let affectedAfter = 0
        for (const pair of affected) affectedAfter += crossingForPair(pair, positionsAfter, edgeSlots)
        evaluations.localCrossing += affected.length
        const next = evaluate(candidate, current.crossings - affectedBefore + affectedAfter)
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

  const readabilityOrder = (input: readonly ProcessSankeySlot[]): ProcessSankeySlot[] => {
    const scalableCandidate = scalableReadabilityOrder(input)
    const exactWork = input.length <= BRUTE_FORCE_MAX
      ? permutationCount(input.length) * (
        input.length + edgeRoutes.length + crossingRoutes.length
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
        units.length + edgeRoutes.length + crossingRoutes.length
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

  const geometryRefineOnly = options.mode === "geometry-refine"

  // Geometry-refine skips barycenter / exact permutation / inside-out and only
  // runs the bounded exact-transit transpose below — the M3 post-scale pass.
  if (!geometryRefineOnly &&
      (options.laneOrder === "crossing-min" || options.laneOrder === "crossing-min+inside-out")) {
    order = multiSlotBonded ? unitReadabilityOrder(order) : readabilityOrder(order)
  } else if (!geometryRefineOnly && options.laneOrder === "inside-out") {
    if (multiSlotBonded) {
      const units = bondedSlotUnits(order)
      const unitSize = (unit: BondedSlotUnit) =>
        unit.slots.reduce((sum, slot) => sum + slot.peak.topPeak + slot.peak.botPeak, 0)
      const ranked = [...units].sort((a, b) =>
        unitSize(b) - unitSize(a) || compareProcessSankeyIds(a.stableId, b.stableId),
      )
      const arranged = new Array<BondedSlotUnit>(ranked.length)
      let above = Math.floor((ranked.length - 1) / 2) - 1
      let below = Math.floor((ranked.length - 1) / 2) + 1
      if (ranked.length > 0) arranged[Math.floor((ranked.length - 1) / 2)] = ranked[0]
      for (let i = 1; i < ranked.length; i++) {
        if (i % 2 === 1 && below < ranked.length) arranged[below++] = ranked[i]
        else if (above >= 0) arranged[above--] = ranked[i]
        else arranged[below++] = ranked[i]
      }
      order = flattenBondedUnits(arranged)
    } else {
      const ranked = [...order].sort((a, b) => {
        const sizeA = a.peak.topPeak + a.peak.botPeak
        const sizeB = b.peak.topPeak + b.peak.botPeak
        return sizeB - sizeA || compareSlots(a, b)
      })
      const arranged = new Array<ProcessSankeySlot>(ranked.length)
      let above = Math.floor((ranked.length - 1) / 2) - 1
      let below = Math.floor((ranked.length - 1) / 2) + 1
      if (ranked.length > 0) arranged[Math.floor((ranked.length - 1) / 2)] = ranked[0]
      for (let i = 1; i < ranked.length; i++) {
        if (i % 2 === 1 && below < ranked.length) arranged[below++] = ranked[i]
        else if (above >= 0) arranged[above--] = ranked[i]
        else arranged[below++] = ranked[i]
      }
      order = arranged
    }
  }

  if (!geometryRefineOnly &&
      options.laneOrder === "crossing-min+inside-out" && order.length > 1) {
    // Largest-first center bias, guarded by the full pixel/transit score. Keep
    // the best end-to-end readability snapshot if any later move regresses.
    // Multi-slot bonds move as whole units so center bias cannot split a block.
    if (multiSlotBonded) {
      const units = bondedSlotUnits(order)
      let current = evaluate(flattenBondedUnits(units))
      let best = flattenBondedUnits(units)
      let bestMetrics = current
      const middle = Math.floor((units.length - 1) / 2)
      const unitSize = (unit: BondedSlotUnit) =>
        unit.slots.reduce((sum, slot) => sum + slot.peak.topPeak + slot.peak.botPeak, 0)
      const ranked = [...units].sort((a, b) =>
        unitSize(b) - unitSize(a) || compareProcessSankeyIds(a.stableId, b.stableId),
      )
      for (const unit of ranked) {
        const currentIndex = units.indexOf(unit)
        if (currentIndex === middle) continue
        units.splice(currentIndex, 1)
        units.splice(middle, 0, unit)
        const flat = flattenBondedUnits(units)
        const next = evaluate(flat)
        if (next.cost <= current.cost) {
          current = next
          if (next.cost < bestMetrics.cost) { best = flat; bestMetrics = next }
        } else {
          units.splice(middle, 1)
          units.splice(currentIndex, 0, unit)
        }
      }
      order = best
    } else {
      let current = evaluate(order)
      let best = [...order]
      let bestMetrics = current
      const middle = Math.floor((order.length - 1) / 2)
      const ranked = [...order].sort((a, b) =>
        (b.peak.topPeak + b.peak.botPeak) - (a.peak.topPeak + a.peak.botPeak) || compareSlots(a, b),
      )
      for (const slot of ranked) {
        const currentIndex = order.indexOf(slot)
        if (currentIndex === middle) continue
        order.splice(currentIndex, 1)
        order.splice(middle, 0, slot)
        const next = evaluate(order)
        if (next.cost <= current.cost) {
          current = next
          if (next.cost < bestMetrics.cost) { best = [...order]; bestMetrics = next }
        } else {
          order.splice(middle, 1)
          order.splice(currentIndex, 0, slot)
        }
      }
      order = best
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
      let units = bondedSlotUnits(order)
      let current = evaluateExactTransit(flattenBondedUnits(units), undefined, "score")
      for (let pass = 0; pass < 6 && units.length > 1; pass++) {
        let improved = false
        for (let i = 0; i < units.length - 1; i++) {
          ;[units[i], units[i + 1]] = [units[i + 1], units[i]]
          const candidate = flattenBondedUnits(units)
          const next = evaluateExactTransit(candidate, undefined, "score")
          if (next.cost < current.cost) {
            order = candidate
            current = next
            improved = true
          } else {
            ;[units[i], units[i + 1]] = [units[i + 1], units[i]]
          }
        }
        if (!improved) break
      }
      // Final within-block alignment after unit positions settle.
      units = orderWithinBondedUnits(bondedSlotUnits(order), relations, compareSlots)
      order = flattenBondedUnits(units)
    } else {
      let current = evaluateExactTransit(order, undefined, "score")
      for (let i = 0; i < order.length - 1; i++) {
        const first = order[i]
        const second = order[i + 1]
        const positionsBefore = new Map(order.map((slot, index) => [slot, index]))
        let affectedBefore = 0
        const affected: CrossingPair[] = []
        affectedGeneration++
        for (const pair of [...(crossingPairsBySlot.get(first) ?? []), ...(crossingPairsBySlot.get(second) ?? [])]) {
          if (affectedMarks[pair.index] === affectedGeneration) continue
          affectedMarks[pair.index] = affectedGeneration
          affected.push(pair)
          affectedBefore += crossingForPair(pair, positionsBefore, edgeSlots)
        }
        ;[order[i], order[i + 1]] = [second, first]
        const positionsAfter = new Map(positionsBefore)
        positionsAfter.set(first, i + 1)
        positionsAfter.set(second, i)
        let affectedAfter = 0
        for (const pair of affected) affectedAfter += crossingForPair(pair, positionsAfter, edgeSlots)
        evaluations.localCrossing += affected.length
        const next = evaluateExactTransit(
          order,
          current.crossings - affectedBefore + affectedAfter,
          "score",
        )
        if (next.cost < current.cost) current = next
        else [order[i], order[i + 1]] = [first, second]
      }
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
    slots,
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

import type {
  ProcessSankeyEdge,
  ProcessSankeyLaneLifetime,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySlot,
} from "./algorithm"
import { compareProcessSankeyIds, type SlotByNode } from "./layoutGeometry"

const MASS_EPSILON = 1e-9
const EXACT_PACKING_NODE_MAX = 12
const EXACT_PACKING_EVALUATION_MAX = 75_000
const LARGE_PACKING_SWAP_EVALUATION_MAX = 100_000
const LARGE_PACKING_ROLE_PAIR_MAX = 50_000

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
  railLifetime: ProcessSankeyLaneLifetime,
): PackingWindow {
  let start = Infinity
  let end = -Infinity
  for (const sample of data?.samples ?? []) {
    if (sample.topMass + sample.botMass <= MASS_EPSILON) continue
    start = Math.min(start, sample.t)
    end = Math.max(end, sample.t)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { start: null, end: null }

  // Synthetic source baselines begin one time unit before their first event.
  // Clamp those seeds back to the semantic rail without trimming real mass.
  if (railLifetime.start != null) start = Math.max(start, railLifetime.start)
  if (railLifetime.end != null) end = Math.min(end, railLifetime.end)
  return end >= start ? { start, end } : { start: null, end: null }
}

function windowsOverlap(a: PackingWindow, b: PackingWindow): boolean {
  if (a.start == null || a.end == null || b.start == null || b.end == null) return false
  // A handoff at exactly the same instant is intentionally compatible: the
  // outgoing and incoming bands meet rather than occupy the row together.
  return !(a.end <= b.start || b.end <= a.start)
}

function pairKey(a: string, b: string): string {
  return compareProcessSankeyIds(a, b) <= 0 ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

interface PackingConflicts {
  conflicts: (a: string, b: string) => boolean
}

function continuityDegreeMaps(edges: readonly ProcessSankeyEdge[]): {
  incoming: Map<string, number>
  outgoing: Map<string, number>
} {
  const incomingPartners = new Map<string, Set<string>>()
  const outgoingPartners = new Map<string, Set<string>>()
  for (const edge of edges) {
    if (!outgoingPartners.has(edge.source)) outgoingPartners.set(edge.source, new Set())
    if (!incomingPartners.has(edge.target)) incomingPartners.set(edge.target, new Set())
    outgoingPartners.get(edge.source)!.add(edge.target)
    incomingPartners.get(edge.target)!.add(edge.source)
  }
  return {
    incoming: new Map([...incomingPartners].map(([id, partners]) => [id, partners.size])),
    outgoing: new Map([...outgoingPartners].map(([id, partners]) => [id, partners.size])),
  }
}

/**
 * Exclusive packing role for *terminal* handoffs only:
 * - pure source-only feeders (no incoming, one outgoing sink), or
 * - temporary branches whose only overall neighbor is one partner
 *   (leave/return to a single core).
 *
 * Intermediate chain stages (in from A, out to B) are intentionally excluded —
 * they must stay free to share rows for continuity packing (Launch→Orbit→…).
 * Mixing two different terminal roles on one row is what forces later ordering
 * to drag one exclusive handoff across the other's partner.
 */
function exclusivePartnerWeights(
  edges: readonly ProcessSankeyEdge[],
): Map<string, { partner: string; weight: number }> {
  const outgoing = new Map<string, Map<string, number>>()
  const incoming = new Map<string, Map<string, number>>()
  const add = (
    map: Map<string, Map<string, number>>,
    from: string,
    to: string,
    weight: number,
  ): void => {
    let row = map.get(from)
    if (!row) {
      row = new Map()
      map.set(from, row)
    }
    row.set(to, (row.get(to) ?? 0) + weight)
  }
  for (const edge of edges) {
    const weight = edge.value > 0 && Number.isFinite(edge.value) ? edge.value : 1
    add(outgoing, edge.source, edge.target, weight)
    add(incoming, edge.target, edge.source, weight)
  }
  const result = new Map<string, { partner: string; weight: number }>()
  const consider = (id: string): void => {
    if (result.has(id)) return
    const outs = outgoing.get(id)
    const inns = incoming.get(id)
    // Pure source-only feeder → one sink.
    if (outs && outs.size === 1 && (!inns || inns.size === 0)) {
      const [partner, weight] = [...outs][0]
      result.set(id, { partner, weight })
      return
    }
    // Temporary exclusive branch: only one overall neighbor.
    const neighbors = new Map<string, number>()
    for (const [partner, weight] of outs ?? []) {
      neighbors.set(partner, (neighbors.get(partner) ?? 0) + weight)
    }
    for (const [partner, weight] of inns ?? []) {
      neighbors.set(partner, (neighbors.get(partner) ?? 0) + weight)
    }
    if (neighbors.size === 1) {
      const [partner, weight] = [...neighbors][0]
      result.set(id, { partner, weight })
    }
  }
  for (const edge of edges) {
    consider(edge.source)
    consider(edge.target)
  }
  return result
}

/**
 * Two exclusive-role nodes are compatible on one row when:
 * - they share a sink,
 * - they are each other's only partner (mutual temporary branch), or
 * - one is the exclusive partner of the other (sequential handoff onto the
 *   partner's row — Oregon→Territories may share Territories' lane even when
 *   Territories itself is exclusive toward States).
 * Otherwise they fight over different destinations and must not share a lane.
 */
function exclusiveRolesCompatible(
  a: string,
  b: string,
  exclusive: ReadonlyMap<string, { partner: string; weight: number }>,
): boolean {
  const roleA = exclusive.get(a)
  const roleB = exclusive.get(b)
  if (!roleA || !roleB) return true
  if (roleA.partner === roleB.partner) return true
  if (roleA.partner === b || roleB.partner === a) return true
  return false
}

function mixesExclusiveRoles(
  id: string,
  members: readonly string[],
  exclusive: ReadonlyMap<string, { partner: string; weight: number }>,
): boolean {
  if (!exclusive.has(id)) return false
  return members.some((other) => !exclusiveRolesCompatible(id, other, exclusive))
}

function continuityWeight(
  edge: ProcessSankeyEdge,
  degrees: ReturnType<typeof continuityDegreeMaps>,
): number {
  const value = edge.value > 0 && Number.isFinite(edge.value) ? edge.value : 1
  // A one-out source or one-in target describes a semantic continuation more
  // strongly than one branch of a fan. Reward both ends independently; a
  // unique-to-unique handoff receives 3x weight while actual ribbon width
  // remains the base signal.
  return value * (
    1 +
    (degrees.outgoing.get(edge.source) === 1 ? 1 : 0) +
    (degrees.incoming.get(edge.target) === 1 ? 1 : 0)
  )
}

/**
 * Active bands are the primary row reservation, but they are not the whole
 * visual footprint: the incident ribbons occupy the broader rail lifetime.
 * When two alternate phases share the same predecessor and successor and
 * their rails overlap at a very close handoff, putting them on the same row
 * makes their transition bundles collide. Mark that small semantic family
 * for a local spill row instead of silently placing one member in an unrelated row.
 *
 * Direct sequential handoffs remain reusable even when their rails overlap;
 * those are precisely the straight-through Launch -> Orbit cases packing is
 * intended to reveal.
 */
function buildPackingConflicts(
  ids: readonly string[],
  windows: Readonly<Record<string, PackingWindow>>,
  railLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>,
  edges: readonly ProcessSankeyEdge[],
  groupById: ReadonlyMap<string, string | undefined>,
): PackingConflicts {
  const directPairs = new Set<string>()
  const predecessors = new Map(ids.map((id) => [id, new Set<string>()]))
  const successors = new Map(ids.map((id) => [id, new Set<string>()]))
  for (const edge of edges) {
    directPairs.add(pairKey(edge.source, edge.target))
    predecessors.get(edge.target)?.add(edge.source)
    successors.get(edge.source)?.add(edge.target)
  }

  // Enumerate only actual shared-neighbor groups. This avoids scanning all
  // node pairs on sparse process graphs, which are the common large case.
  const sharedPredecessorPairs = new Map<string, [string, string]>()
  const sharedSuccessorPairs = new Set<string>()
  const addMemberPairs = (
    members: readonly string[],
    pairs: Map<string, [string, string]> | Set<string>,
  ): void => {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = pairKey(members[i], members[j])
        if (pairs instanceof Map) pairs.set(key, [members[i], members[j]])
        else pairs.add(key)
      }
    }
  }
  for (const members of successors.values()) addMemberPairs([...members], sharedPredecessorPairs)
  for (const members of predecessors.values()) addMemberPairs([...members], sharedSuccessorPairs)

  const guardedNodes = new Set<string>()
  for (const [key, [a, b]] of sharedPredecessorPairs) {
    // A common sink alone describes ordinary accumulators such as PR1..PR5
    // merging into Library. Reserve spill rows only for true alternates that
    // both leave and return through the same process role (Low Pass/Surface).
    if (!sharedSuccessorPairs.has(key)) continue
    if (windowsOverlap(windows[a], windows[b])) continue
    if (!windowsOverlap(railLifetime[a], railLifetime[b])) continue
    guardedNodes.add(a)
    guardedNodes.add(b)
  }

  return {
    conflicts: (a, b) => {
      const groupA = groupById.get(a)
      const groupB = groupById.get(b)
      // Distinct bonded identities never share a physical row — otherwise
      // temporal reuse would let one lane belong to two blocks over the chart.
      if (groupA != null && groupB != null && groupA !== groupB) return true
      // Grouped ↔ ungrouped is allowed only for a direct sequential handoff.
      // That keeps exclusive feeder blocks on the same row as their sink
      // (straight process continuation) without letting unrelated later nodes
      // colonize the bonded rows and drag foreign traffic through the block.
      if ((groupA != null) !== (groupB != null) && !directPairs.has(pairKey(a, b))) {
        return true
      }
      if (windowsOverlap(windows[a], windows[b])) return true
      if (!guardedNodes.has(a) && !guardedNodes.has(b)) return false
      return !directPairs.has(pairKey(a, b))
    },
  }
}

function chronologicalIds(
  nodes: readonly ProcessSankeyNode[],
  windows: Readonly<Record<string, PackingWindow>>,
): string[] {
  return nodes
    .filter((node) => windows[node.id].start != null)
    .sort((a, b) =>
      (windows[a.id].start as number) - (windows[b.id].start as number) ||
      (windows[a.id].end as number) - (windows[b.id].end as number) ||
      compareProcessSankeyIds(a.id, b.id),
    )
    .map((node) => node.id)
}

/** Chronological greedy coloring, used as both a bound and large-chart path. */
function chronologicalColoring(
  ids: readonly string[],
  packingConflicts: PackingConflicts,
  exclusive: ReadonlyMap<string, { partner: string; weight: number }> = new Map(),
): { assignment: number[]; slotCount: number } {
  const slotMembers: string[][] = []
  const assignment: number[] = []
  for (const id of ids) {
    // Prefer a legal row that does not mix terminal exclusive destination roles.
    // Intermediate chain stages are not in `exclusive`, so they still fall
    // through to ordinary first-fit and keep multi-stage continuity packing.
    // Terminal exclusive nodes open a new row rather than mixing Confed→States
    // with Panama→Colonies just to save a color (exact search cannot invent
    // colors beyond this baseline budget).
    let slot = slotMembers.findIndex((members) =>
      members.every((other) => !packingConflicts.conflicts(id, other)) &&
      !mixesExclusiveRoles(id, members, exclusive),
    )
    if (slot === -1 && !exclusive.has(id)) {
      slot = slotMembers.findIndex((members) =>
        members.every((other) => !packingConflicts.conflicts(id, other)),
      )
    }
    if (slot === -1) {
      slot = slotMembers.length
      slotMembers.push([])
    }
    slotMembers[slot].push(id)
    assignment.push(slot)
  }
  return { assignment, slotCount: slotMembers.length }
}

/**
 * Exact coloring becomes combinatorial, but large stage-based rivers still
 * need continuity-aware row reuse. Improve the minimum-row greedy coloring
 * with bounded legal moves and pair swaps. Direct handoffs are the primary
 * objective; at equal handoff continuity, a secondary source-role objective
 * keeps temporally reused feeder rows coherent by destination. Swapping two
 * simultaneous nodes often lets both reclaim their strongest predecessor rows
 * (for example Western-zone Bremen and Soviet-zone GDR) without weakening
 * packing.
 */
function improveLargeContinuityColoring(
  ids: readonly string[],
  packingConflicts: PackingConflicts,
  edges: readonly ProcessSankeyEdge[],
  baseline: { assignment: number[]; slotCount: number },
): number[] {
  if (ids.length <= EXACT_PACKING_NODE_MAX || baseline.slotCount <= 1) {
    return baseline.assignment
  }

  const position = new Map(ids.map((id, index) => [id, index]))
  const flowAffinity = Array.from({ length: ids.length }, () => new Map<number, number>())
  const degrees = continuityDegreeMaps(edges)
  for (const edge of edges) {
    const source = position.get(edge.source)
    const target = position.get(edge.target)
    if (source == null || target == null || source === target) continue
    const weight = continuityWeight(edge, degrees)
    flowAffinity[source].set(target, (flowAffinity[source].get(target) ?? 0) + weight)
    flowAffinity[target].set(source, (flowAffinity[target].get(source) ?? 0) + weight)
  }

  // A physical row is reused across time, so its historical occupants still
  // shape where the global row-order pass can sensibly place it. Keep
  // exclusive-partner feeders (source-only sinks and temporary branches) aimed
  // at the same destination coherent, and avoid mixing disjoint exclusive
  // roles when another legal row exists. Secondary to direct handoff continuity:
  // no amount of role similarity may break a stronger source -> target same-row
  // continuation.
  const exclusive = exclusivePartnerWeights(edges)
  const roleWeights = ids.map((id) => exclusive.get(id)?.weight ?? 0)
  const roleAffinity = Array.from({ length: ids.length }, () => new Map<number, number>())
  let rolePairs = 0
  for (let first = 0; first < ids.length - 1 && rolePairs < LARGE_PACKING_ROLE_PAIR_MAX; first++) {
    if (!exclusive.has(ids[first])) continue
    for (let second = first + 1; second < ids.length; second++) {
      if (!exclusive.has(ids[second])) continue
      // A pair that can never occupy the same physical row contributes a
      // constant zero to every legal coloring, so omit it from both memory
      // and hot-loop delta scans. This is common in wide fan-in datasets.
      if (packingConflicts.conflicts(ids[first], ids[second])) continue
      rolePairs++
      const weight = Math.min(roleWeights[first], roleWeights[second]) ||
        Math.max(roleWeights[first], roleWeights[second])
      // Compatible exclusive roles attract (shared sink, mutual branch, or
      // direct handoff onto the partner). Incompatible roles repel.
      const relation = exclusiveRolesCompatible(ids[first], ids[second], exclusive)
        ? weight
        : -weight
      if (Math.abs(relation) <= MASS_EPSILON) continue
      roleAffinity[first].set(second, relation)
      roleAffinity[second].set(first, relation)
      if (rolePairs >= LARGE_PACKING_ROLE_PAIR_MAX) break
    }
  }

  const assignment = [...baseline.assignment]
  const members = Array.from({ length: baseline.slotCount }, () => [] as number[])
  assignment.forEach((slot, index) => members[slot].push(index))

  const swapDeltaFor = (
    relations: readonly Map<number, number>[],
    first: number,
    second: number,
  ): number => {
    const firstSlot = assignment[first]
    const secondSlot = assignment[second]
    let delta = 0
    const seen = new Set<string>()
    for (const endpoint of [first, second]) {
      for (const [neighbor, weight] of relations[endpoint]) {
        const key = endpoint < neighbor ? `${endpoint}:${neighbor}` : `${neighbor}:${endpoint}`
        if (seen.has(key)) continue
        seen.add(key)
        const oldSame = assignment[endpoint] === assignment[neighbor]
        const endpointSlot = endpoint === first ? secondSlot : firstSlot
        const neighborSlot = neighbor === first
          ? secondSlot
          : neighbor === second
            ? firstSlot
            : assignment[neighbor]
        const nextSame = endpointSlot === neighborSlot
        if (oldSame !== nextSame) delta += nextSame ? weight : -weight
      }
    }
    return delta
  }

  const moveDeltaFor = (
    relations: readonly Map<number, number>[],
    node: number,
    targetSlot: number,
  ): number => {
    let delta = 0
    for (const [neighbor, weight] of relations[node]) {
      const oldSame = assignment[node] === assignment[neighbor]
      const nextSame = targetSlot === assignment[neighbor]
      if (oldSame !== nextSame) delta += nextSame ? weight : -weight
    }
    return delta
  }

  const improves = (flow: number, role: number): boolean =>
    flow > MASS_EPSILON || (Math.abs(flow) <= MASS_EPSILON && role > MASS_EPSILON)

  const beats = (
    flow: number,
    role: number,
    bestFlow: number,
    bestRole: number,
  ): boolean =>
    flow > bestFlow + MASS_EPSILON ||
    (Math.abs(flow - bestFlow) <= MASS_EPSILON && role > bestRole + MASS_EPSILON)

  let evaluations = 0
  for (let pass = 0; pass < 32 && evaluations < LARGE_PACKING_SWAP_EVALUATION_MAX; pass++) {
    let bestKind: "move" | "swap" | null = null
    let bestFirst = -1
    let bestSecond = -1
    let bestTarget = -1
    let bestFlowDelta = -Infinity
    let bestRoleDelta = -Infinity
    for (let node = 0; node < ids.length; node++) {
      for (let targetSlot = 0; targetSlot < members.length; targetSlot++) {
        if (evaluations++ >= LARGE_PACKING_SWAP_EVALUATION_MAX) break
        if (targetSlot === assignment[node]) continue
        if (!members[targetSlot].every((other) =>
          !packingConflicts.conflicts(ids[node], ids[other]))) continue
        const flowDelta = moveDeltaFor(flowAffinity, node, targetSlot)
        const roleDelta = moveDeltaFor(roleAffinity, node, targetSlot)
        if (improves(flowDelta, roleDelta) &&
            beats(flowDelta, roleDelta, bestFlowDelta, bestRoleDelta)) {
          bestKind = "move"
          bestFirst = node
          bestSecond = -1
          bestTarget = targetSlot
          bestFlowDelta = flowDelta
          bestRoleDelta = roleDelta
        }
      }
      if (evaluations >= LARGE_PACKING_SWAP_EVALUATION_MAX) break
    }
    for (let first = 0; first < ids.length - 1; first++) {
      for (let second = first + 1; second < ids.length; second++) {
        if (evaluations++ >= LARGE_PACKING_SWAP_EVALUATION_MAX) break
        const firstSlot = assignment[first]
        const secondSlot = assignment[second]
        if (firstSlot === secondSlot) continue
        if (!members[secondSlot].every((other) =>
          other === second || !packingConflicts.conflicts(ids[first], ids[other]))) continue
        if (!members[firstSlot].every((other) =>
          other === first || !packingConflicts.conflicts(ids[second], ids[other]))) continue
        const flowDelta = swapDeltaFor(flowAffinity, first, second)
        const roleDelta = swapDeltaFor(roleAffinity, first, second)
        if (improves(flowDelta, roleDelta) &&
            beats(flowDelta, roleDelta, bestFlowDelta, bestRoleDelta)) {
          bestKind = "swap"
          bestFirst = first
          bestSecond = second
          bestTarget = -1
          bestFlowDelta = flowDelta
          bestRoleDelta = roleDelta
        }
      }
      if (evaluations >= LARGE_PACKING_SWAP_EVALUATION_MAX) break
    }
    if (bestKind == null || bestFirst === -1) break

    if (bestKind === "move") {
      const sourceSlot = assignment[bestFirst]
      members[sourceSlot].splice(members[sourceSlot].indexOf(bestFirst), 1)
      members[bestTarget].push(bestFirst)
      assignment[bestFirst] = bestTarget
      continue
    }

    const firstSlot = assignment[bestFirst]
    const secondSlot = assignment[bestSecond]
    members[firstSlot].splice(members[firstSlot].indexOf(bestFirst), 1, bestSecond)
    members[secondSlot].splice(members[secondSlot].indexOf(bestSecond), 1, bestFirst)
    assignment[bestFirst] = secondSlot
    assignment[bestSecond] = firstSlot
  }
  return assignment
}

function lexicographicallyBefore(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return a.length < b.length
}

/**
 * Small ProcessSankeys can afford to examine every coloring up to the
 * chronological greedy bound. Among them, maximize the edge value whose
 * endpoints share a row:
 * the objective makes heavy sequential bundles straight without inventing a
 * topology-specific stage order. A hard evaluation budget retains predictable
 * behavior for adversarial interval sets.
 */
function continuityColoring(
  ids: readonly string[],
  packingConflicts: PackingConflicts,
  edges: readonly ProcessSankeyEdge[],
  baseline: { assignment: number[]; slotCount: number },
): number[] {
  if (ids.length === 0 || ids.length > EXACT_PACKING_NODE_MAX || baseline.slotCount <= 1) {
    return baseline.assignment
  }

  const position = new Map(ids.map((id, index) => [id, index]))
  const relation = Array.from({ length: ids.length }, () => new Float64Array(ids.length))
  const incoming = Array.from({ length: ids.length }, () => new Map<number, number>())
  const outgoing = Array.from({ length: ids.length }, () => new Map<number, number>())
  const degrees = continuityDegreeMaps(edges)
  for (const edge of edges) {
    const source = position.get(edge.source)
    const target = position.get(edge.target)
    if (source == null || target == null || source === target) continue
    const weight = continuityWeight(edge, degrees)
    relation[source][target] += weight
    relation[target][source] += weight
    outgoing[source].set(target, (outgoing[source].get(target) ?? 0) + weight)
    incoming[target].set(source, (incoming[target].get(source) ?? 0) + weight)
  }
  const exclusive = exclusivePartnerWeights(edges)
  const roleWeights = ids.map((id) => exclusive.get(id)?.weight ?? 0)
  const affinity = Array.from({ length: ids.length }, () => new Float64Array(ids.length))
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      // Nodes with the same predecessor/successor role are good temporal row
      // alternates even when no edge directly connects them (e.g. LOW PASS
      // and SURFACE both branch from and return to LUNAR ORBIT).
      for (const [neighbor, weight] of incoming[i]) {
        affinity[i][j] += Math.min(weight, incoming[j].get(neighbor) ?? 0)
      }
      for (const [neighbor, weight] of outgoing[i]) {
        affinity[i][j] += Math.min(weight, outgoing[j].get(neighbor) ?? 0)
      }
      // Exclusive roles: compatible roles attract; incompatible roles repel so
      // a Confed→States branch never permanently shares a lane with a
      // Panama→Colonies feeder when another coloring has equal handoff flow.
      if (exclusive.has(ids[i]) && exclusive.has(ids[j])) {
        const roleWeight = Math.min(roleWeights[i], roleWeights[j]) ||
          Math.max(roleWeights[i], roleWeights[j])
        affinity[i][j] += exclusiveRolesCompatible(ids[i], ids[j], exclusive)
          ? roleWeight
          : -roleWeight
      }
      affinity[j][i] = affinity[i][j]
    }
  }

  const score = (assignment: readonly number[]): { flow: number; affinity: number } => {
    let flow = 0
    let roleAffinity = 0
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (assignment[i] !== assignment[j]) continue
        flow += relation[i][j]
        roleAffinity += affinity[i][j]
      }
    }
    return { flow, affinity: roleAffinity }
  }

  let best = [...baseline.assignment]
  let bestScore = score(best)
  let evaluations = 0
  const assignment = new Array<number>(ids.length).fill(-1)
  const members = Array.from({ length: baseline.slotCount }, () => [] as number[])

  const search = (
    index: number,
    maxSlot: number,
    currentFlow: number,
    currentAffinity: number,
  ): void => {
    if (evaluations >= EXACT_PACKING_EVALUATION_MAX) return
    if (index === ids.length) {
      evaluations++
      if (currentFlow > bestScore.flow ||
          (currentFlow === bestScore.flow && currentAffinity > bestScore.affinity) ||
          (currentFlow === bestScore.flow && currentAffinity === bestScore.affinity &&
            lexicographicallyBefore(assignment, best))) {
        best = [...assignment]
        bestScore = { flow: currentFlow, affinity: currentAffinity }
      }
      return
    }

    const lastCandidate = Math.min(maxSlot + 1, baseline.slotCount - 1)
    for (let slot = 0; slot <= lastCandidate; slot++) {
      if (members[slot].some((other) => packingConflicts.conflicts(ids[index], ids[other]))) {
        continue
      }
      let addedFlow = 0
      let addedAffinity = 0
      for (const other of members[slot]) {
        addedFlow += relation[index][other]
        addedAffinity += affinity[index][other]
      }
      assignment[index] = slot
      members[slot].push(index)
      search(
        index + 1,
        Math.max(maxSlot, slot),
        currentFlow + addedFlow,
        currentAffinity + addedAffinity,
      )
      members[slot].pop()
      assignment[index] = -1
      if (evaluations >= EXACT_PACKING_EVALUATION_MAX) return
    }
  }

  // Color names are interchangeable, so pin the first chronological node to
  // row zero and introduce later rows in sequence. This removes K! duplicates.
  assignment[0] = 0
  members[0].push(0)
  search(1, 0, 0, 0)
  return best
}

/**
 * Reapply a frozen packing assignment under updated mass/lifetime data.
 * Occupant membership and row identity stay fixed; peaks and end times refresh.
 * Used by multi-pass layout so expensive packing search runs once per topology.
 */
export function rehydrateProcessSankeySlots(
  frozenSlots: readonly ProcessSankeySlot[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>,
): { slots: ProcessSankeySlot[]; slotByNode: SlotByNode } {
  const slots: ProcessSankeySlot[] = frozenSlots.map((slot) => {
    const occupants = slot.occupants.map((occupant) => ({
      id: occupant.id,
      end: laneLifetime[occupant.id]?.end ?? occupant.end,
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
      ...(slot.group != null ? { group: slot.group } : {}),
    }
  })
  const slotByNode: SlotByNode = {}
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
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>,
): string {
  const nodePart = nodes.map((n) => {
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
      life?.end ?? "",
    ].join(":")
  }).join("|")
  const edgePart = edges.map((e) =>
    [e.id, e.source, e.target, e.value, e.startTime, e.endTime].join(":"),
  ).join("|")
  return `${nodePart}#${edgePart}`
}

const PACKING_CACHE_MAX = 12
const packingResultCache = new Map<string, { slots: ProcessSankeySlot[]; slotByNode: SlotByNode }>()

function storePackingCache(
  key: string,
  result: { slots: ProcessSankeySlot[]; slotByNode: SlotByNode },
): void {
  if (packingResultCache.has(key)) packingResultCache.delete(key)
  packingResultCache.set(key, {
    slots: result.slots.map((slot) => ({
      occupants: slot.occupants.map((o) => ({ ...o })),
      peak: { ...slot.peak },
      ...(slot.group != null ? { group: slot.group } : {}),
    })),
    slotByNode: { ...result.slotByNode },
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

export function packProcessSankeySlots(
  nodes: readonly ProcessSankeyNode[],
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  laneLifetime: Readonly<Record<string, ProcessSankeyLaneLifetime>>,
): { slots: ProcessSankeySlot[]; slotByNode: SlotByNode } {
  const cacheKey = processSankeyPackingSignature(nodes, edges, nodeData, laneLifetime)
  const cached = packingResultCache.get(cacheKey)
  if (cached) {
    // Rehydrate peaks/ends against the live nodeData (cache stores membership).
    return rehydrateProcessSankeySlots(cached.slots, nodeData, laneLifetime)
  }

  const windows: Record<string, PackingWindow> = {}
  for (const node of nodes) {
    windows[node.id] = occupiedBandWindow(nodeData[node.id], laneLifetime[node.id])
  }

  const ids = chronologicalIds(nodes, windows)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const groupById = new Map(nodes.map((node) => [node.id, node.group || undefined]))
  const packingConflicts = buildPackingConflicts(
    ids, windows, laneLifetime, edges, groupById,
  )
  const exclusive = exclusivePartnerWeights(edges)
  const baseline = chronologicalColoring(ids, packingConflicts, exclusive)
  const continuitySeed = {
    ...baseline,
    assignment: improveLargeContinuityColoring(ids, packingConflicts, edges, baseline),
  }
  const searchedAssignment = continuityColoring(ids, packingConflicts, edges, continuitySeed)
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
    () => ({ occupants: [], peak: { topPeak: 0, botPeak: 0 } }),
  )
  const slotByNode: SlotByNode = {}

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
  for (const node of [...nodes].sort((a, b) => compareProcessSankeyIds(a.id, b.id))) {
    if (slotByNode[node.id] != null) continue
    slots[0].occupants.push({ id: node.id, end: -Infinity })
    slotByNode[node.id] = 0
  }

  for (const slot of slots) {
    slot.occupants.sort((a, b) =>
      (windows[a.id].start ?? Infinity) - (windows[b.id].start ?? Infinity) ||
      compareProcessSankeyIds(a.id, b.id),
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

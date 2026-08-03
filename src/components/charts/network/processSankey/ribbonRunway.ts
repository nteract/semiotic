interface RibbonRunwayNode {
  id: string
  group?: string
  xExtent?: [number, number]
}

interface RibbonRunwayEdge {
  id: string
  source: string
  target: string
  startTime: number
  systemInTime?: number
}

/**
 * Resolve the earliest stable visual departure for each eligible feeder edge.
 *
 * Only source-only nodes qualify: an accumulator with incoming transactions
 * can change its attachment stack before departure, so pulling a later ribbon
 * backward could place its strip outside the band that actually existed then.
 * A feeder must also prove that it existed earlier via xExtent/systemInTime.
 * Later departures from the same feeder cannot borrow across an earlier
 * departure, when the source silhouette changes.
 */
export function computeFeederRibbonRunwayStarts(
  nodes: readonly RibbonRunwayNode[],
  edges: readonly RibbonRunwayEdge[],
  domain: readonly [number, number],
): Map<string, number> {
  const incomingNodeIds = new Set(edges.map((edge) => edge.target))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const outgoingBySource = new Map<string, RibbonRunwayEdge[]>()

  for (const edge of edges) {
    if (incomingNodeIds.has(edge.source)) continue
    const outgoing = outgoingBySource.get(edge.source) ?? []
    outgoing.push(edge)
    outgoingBySource.set(edge.source, outgoing)
  }

  // Bonded silhouettes can share a projected clock only when every member is
  // an explicit, source-only feeder that empties in one lockstep departure.
  // Sequential grouped departures need phase-aware bonding and stay exact.
  const groupMembers = new Map<string, RibbonRunwayNode[]>()
  for (const node of nodes) {
    if (!node.group) continue
    const members = groupMembers.get(node.group) ?? []
    members.push(node)
    groupMembers.set(node.group, members)
  }
  const lockstepGroups = new Set<string>()
  for (const [group, members] of groupMembers) {
    const groupEdges = members.flatMap((member) => outgoingBySource.get(member.id) ?? [])
    const departureTimes = new Set(groupEdges.map((edge) => edge.startTime))
    if (groupEdges.length > 0 && departureTimes.size === 1 && members.every((member) => {
      const start = member.xExtent?.[0]
      const departure = groupEdges[0].startTime
      return !incomingNodeIds.has(member.id) &&
        (outgoingBySource.get(member.id)?.length ?? 0) > 0 &&
        Number.isFinite(start) && start! < departure
    })) {
      lockstepGroups.add(group)
    }
  }

  const runwayByEdge = new Map<string, number>()
  for (const [source, outgoing] of outgoingBySource) {
    const node = nodeById.get(source)
    if (node?.group && !lockstepGroups.has(node.group)) continue
    const explicitStart = node?.xExtent?.[0]
    const sorted = [...outgoing].sort((a, b) =>
      a.startTime - b.startTime || a.id.localeCompare(b.id),
    )
    // Without xExtent, computeNode's synthesized source stock begins one data
    // unit before the first departure. A much earlier systemInTime decorates
    // that stock but does not expand the aggregate silhouette, so do not pull
    // a ribbon ahead of the pixels the band can actually hand off.
    const implicitStockStart = sorted[0]?.startTime - 1
    let previousDeparture: number | null = null

    for (let index = 0; index < sorted.length;) {
      const departure = sorted[index].startTime
      let end = index + 1
      while (end < sorted.length && sorted[end].startTime === departure) end++

      for (let cursor = index; cursor < end; cursor++) {
        const edge = sorted[cursor]
        const hasExplicitStart = Number.isFinite(explicitStart) && explicitStart! < edge.startTime
        const hasSystemStart = Number.isFinite(edge.systemInTime) && edge.systemInTime! < edge.startTime
        if (!hasExplicitStart && !hasSystemStart) continue

        let floor = domain[0]
        if (hasExplicitStart) floor = Math.max(floor, explicitStart!)
        if (hasSystemStart) floor = Math.max(floor, edge.systemInTime!)
        if (!hasExplicitStart && hasSystemStart && Number.isFinite(implicitStockStart)) {
          floor = Math.max(floor, implicitStockStart)
        }
        if (previousDeparture != null) floor = Math.max(floor, previousDeparture)
        if (floor < edge.startTime) runwayByEdge.set(edge.id, floor)
      }

      previousDeparture = departure
      index = end
    }
  }


  // A lockstep bonded group is one contiguous silhouette. Use its latest
  // member floor for every ribbon so no member begins before a neighbor exists.
  for (const [group, members] of groupMembers) {
    if (!lockstepGroups.has(group)) continue
    const groupEdges = members.flatMap((member) => outgoingBySource.get(member.id) ?? [])
    if (!groupEdges.every((edge) => runwayByEdge.has(edge.id))) {
      for (const edge of groupEdges) runwayByEdge.delete(edge.id)
      continue
    }
    const sharedFloor = Math.max(...groupEdges.map((edge) => runwayByEdge.get(edge.id)!))
    for (const edge of groupEdges) runwayByEdge.set(edge.id, sharedFloor)
  }

  return runwayByEdge
}

/** Convert resolved ribbon source pixels back into a scene-only departure
 * clock. Only proven feeder edges whose source actually moved are included. */
export function computeFeederVisualDepartureTimes(
  edges: readonly RibbonRunwayEdge[],
  ribbonInputsByEdge: ReadonlyMap<string, { sx: number }>,
  runwayStartByEdge: ReadonlyMap<string, number>,
  xScale: (time: number) => number,
  invertX: (pixel: number) => number,
): Map<string, number> {
  const visualDepartureByEdge = new Map<string, number>()
  for (const edge of edges) {
    if (!runwayStartByEdge.has(edge.id)) continue
    const input = ribbonInputsByEdge.get(edge.id)
    if (!input || !(input.sx < xScale(edge.startTime) - 1e-9)) continue
    const visualTime = invertX(input.sx)
    if (Number.isFinite(visualTime) && visualTime < edge.startTime) {
      visualDepartureByEdge.set(edge.id, visualTime)
    }
  }
  return visualDepartureByEdge
}

interface FeederSample {
  t: number
  topMass: number
  botMass: number
  boundaryOffset?: number
}

export type FeederVisualDepartureIndex = Map<string, Map<number, number>>

/** Index edge-level visual departures once so band projection stays O(E + S)
 * instead of scanning every edge again for every node. */
export function indexFeederVisualDepartures(
  edges: readonly RibbonRunwayEdge[],
  visualDepartureByEdge: ReadonlyMap<string, number>,
  sourceGroupByNode?: ReadonlyMap<string, string>,
): FeederVisualDepartureIndex {
  const indexed: FeederVisualDepartureIndex = new Map()
  const membersByGroup = new Map<string, string[]>()
  for (const [nodeId, group] of sourceGroupByNode ?? []) {
    const members = membersByGroup.get(group) ?? []
    members.push(nodeId)
    membersByGroup.set(group, members)
  }
  for (const edge of edges) {
    const visualTime = visualDepartureByEdge.get(edge.id)
    if (visualTime == null || !Number.isFinite(visualTime) || !(visualTime < edge.startTime)) continue
    const group = sourceGroupByNode?.get(edge.source)
    const affectedNodes = group == null ? [edge.source] : (membersByGroup.get(group) ?? [edge.source])
    for (const nodeId of affectedNodes) {
      const byTime = indexed.get(nodeId) ?? new Map<number, number>()
      const current = byTime.get(edge.startTime)
      byTime.set(edge.startTime, current == null ? visualTime : Math.min(current, visualTime))
      indexed.set(nodeId, byTime)
    }
  }
  return indexed
}

/**
 * Move only the rendered sample states for eligible source departures. The
 * logical nodeData remains untouched and continues to own inventory, packing,
 * quality metrics, tooltips, and authored dates.
 */
export function projectFeederBandSamples<TSample extends FeederSample>(
  samples: readonly TSample[],
  visualByAuthoredTime: ReadonlyMap<number, number> | undefined,
): readonly TSample[] {
  if (!visualByAuthoredTime || visualByAuthoredTime.size === 0) return samples

  return samples.map((sample) => {
    const visualTime = visualByAuthoredTime.get(sample.t)
    return visualTime == null ? sample : { ...sample, t: visualTime }
  })
}

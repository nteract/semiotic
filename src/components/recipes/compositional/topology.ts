import type { LayoutRequest, Point } from "./types"
import {
  compareIds,
  compositionalEndpointKey,
  endpoint,
  fail
} from "./identity"
import type { Projection } from "./projection"

export function ranks(
  ids: readonly string[],
  links: readonly [string, string][]
): Map<string, number> | null {
  const indegree = new Map(ids.map((id) => [id, 0])),
    outgoing = new Map<string, Set<string>>()
  for (const [a, b] of links) {
    const targets = outgoing.get(a) ?? new Set<string>()
    if (!targets.has(b)) {
      targets.add(b)
      indegree.set(b, (indegree.get(b) ?? 0) + 1)
    }
    outgoing.set(a, targets)
  }
  const ready = ids.filter((id) => !indegree.get(id)).sort(compareIds),
    result = new Map(ids.map((id) => [id, 0]))
  let count = 0
  for (let cursor = 0; cursor < ready.length; cursor++) {
    const id = ready[cursor]
    count++
    for (const target of [...(outgoing.get(id) ?? [])].sort(compareIds)) {
      result.set(target, Math.max(result.get(target) ?? 0, result.get(id)! + 1))
      indegree.set(target, indegree.get(target)! - 1)
      if (!indegree.get(target)) ready.push(target)
    }
  }
  return count === ids.length ? result : null
}

export function validateSemanticTopology(request: LayoutRequest): void {
  const ids = new Set<string>(),
    links: [string, string][] = []
  const add = (a: string, b: string) => {
    ids.add(a)
    ids.add(b)
    links.push([a, b])
  }
  for (const e of request.prepared.graph.edges)
    add(
      compositionalEndpointKey(endpoint(e.source, e.sourceEndpoint)),
      compositionalEndpointKey(endpoint(e.target, e.targetEndpoint))
    )
  for (const t of request.prepared.graph.transfers ?? [])
    for (const s of t.sources)
      add(
        compositionalEndpointKey(endpoint(t.nodeId, s)),
        compositionalEndpointKey(endpoint(t.nodeId, t.target))
      )
  if (!ranks([...ids], links) && request.options.topology === "strict-dag")
    fail(
      "TOPOLOGY_SEMANTIC_CYCLE",
      "Connections and transfers contain a semantic cycle."
    )
}

export function projectedRanks(
  request: LayoutRequest,
  projection: Projection
): Map<string, number> {
  const ids = projection.nodes
    .filter((n) => n.semantic.endpoint.kind === "node")
    .map((n) => n.id)
  const owner = (id: string) => projection.hidden.get(id) ?? id
  const links = request.prepared.graph.edges
    .filter((e) => owner(e.source) !== owner(e.target))
    .map((e) => [owner(e.source), owner(e.target)] as [string, string])
  const result = ranks(ids, links)
  if (
    !result &&
    request.options.topology === "strict-dag" &&
    !allOwnersPinned(request)
  )
    fail(
      "TOPOLOGY_PROJECTION_CYCLE",
      "The display quotient is cyclic; expand the group or explicitly select feedback mode."
    )
  return result ?? new Map(ids.sort(compareIds).map((id, i) => [id, i]))
}

export function initialPositions(request: LayoutRequest): Map<string, Point> {
  const constraints = new Map(
    request.view.constraints?.map((c) => [c.nodeId, c])
  )
  if (constraints.size !== (request.view.constraints?.length ?? 0))
    fail("CONSTRAINT_DUPLICATE", "Duplicate node constraints.")
  const nodeIds = new Set(request.prepared.graph.nodes.map((n) => n.id))
  for (const c of constraints.values()) {
    if (!nodeIds.has(c.nodeId))
      fail("CONSTRAINT_OWNER", "Unknown constrained node.")
    if (
      c.position &&
      (!Number.isFinite(c.position.x) || !Number.isFinite(c.position.y))
    )
      fail("GEOMETRY_POSITION", "Positions must be finite.")
    if (c.pin && !c.position)
      fail("CONSTRAINT_PIN", "Pinned nodes need a position.")
    if (c.rank !== undefined && (!Number.isInteger(c.rank) || c.rank < 0))
      fail("CONSTRAINT_RANK", "Ranks must be nonnegative integers.")
  }
  const positions = new Map<string, Point>()
  for (const node of request.prepared.graph.nodes) {
    const c = constraints.get(node.id)
    if (request.options.mode === "route-only" && !c?.position)
      fail(
        "CONSTRAINT_POSITION",
        "Route-only mode requires authored positions for every owner.",
        { nodeIds: [node.id] }
      )
    positions.set(node.id, c?.position ?? { x: 0, y: 0 })
  }
  return positions
}

export function placeRanks(
  request: LayoutRequest,
  rankMap: Map<string, number>,
  positions: Map<string, Point>
): void {
  const horizontal =
    request.view.direction === "LR" || request.view.direction === "RL"
  const reverse =
    request.view.direction === "RL" || request.view.direction === "BT"
  const constraints = new Map(
    request.view.constraints?.map((c) => [c.nodeId, c])
  )
  const measures = new Map(request.geometry.nodes.map((n) => [n.nodeId, n]))
  for (const [id, rank] of rankMap) {
    const authored = constraints.get(id)?.rank
    if (authored !== undefined) rankMap.set(id, authored)
    else rankMap.set(id, rank)
  }
  // Fixed ranks must obey every inter-owner connection in strict mode.
  if (request.options.topology === "strict-dag")
    for (const e of request.prepared.graph.edges) {
      if (
        e.source !== e.target &&
        rankMap.has(e.source) &&
        rankMap.has(e.target) &&
        rankMap.get(e.source)! >= rankMap.get(e.target)!
      )
        fail(
          "CONSTRAINT_RANK",
          "Authored ranks conflict with graph direction.",
          { edgeIds: [e.id] }
        )
    }
  let along = 0
  for (const rank of [...new Set(rankMap.values())].sort((a, b) => a - b)) {
    const ids = [...rankMap]
      .filter(([, r]) => r === rank)
      .map(([id]) => id)
      .sort(compareIds)
    let across = 0,
      maxAlong = 0
    for (const id of ids) {
      const m = measures.get(id)!
      if (!m)
        fail("GEOMETRY_MISSING", "Missing node measurement.", { nodeIds: [id] })
      const long = horizontal ? m.width : m.height,
        short = horizontal ? m.height : m.width
      maxAlong = Math.max(maxAlong, long)
      const main = reverse ? -along - long : along
      const proposed = horizontal
        ? { x: main, y: across }
        : { x: across, y: main }
      const c = constraints.get(id)
      positions.set(id, {
        x: c?.pin === "x" || c?.pin === "both" ? c.position!.x : proposed.x,
        y: c?.pin === "y" || c?.pin === "both" ? c.position!.y : proposed.y
      })
      across += short + request.options.nodeGap
    }
    along += maxAlong + request.options.rankGap
  }
}

/** Pins constrain owner placement, not the semantic dependency graph. */
export function allOwnersPinned(request: LayoutRequest): boolean {
  const pinned = new Set(
    request.view.constraints
      ?.filter((c) => c.pin === "both" && c.position)
      .map((c) => c.nodeId)
  )
  return request.prepared.graph.nodes.every((n) => pinned.has(n.id))
}

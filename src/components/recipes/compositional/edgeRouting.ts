import type { LayoutRequest, Point, RoutedConnection } from "./types"
import type { Projection } from "./projection"
import { terminal } from "./projection"
import {
  compareIds,
  compositionalEndpointKey,
  endpoint,
  fail
} from "./identity"
import {
  compact,
  orthogonalRoute,
  routeSection,
  segmentBlocked,
  terminalSection
} from "./routing"

/** Request-local indexes and direct-route cache shared by optimization candidates. */
export function createEdgeRouter(request: LayoutRequest) {
  const horizontal =
    request.view.direction === "LR" || request.view.direction === "RL"
  const hints = new Map(request.view.edgeHints?.map((h) => [h.edgeId, h]))
  const sorted = [...request.prepared.graph.edges].sort(
    (a, b) =>
      compareIds(
        hints.get(a.id)?.laneId ?? "",
        hints.get(b.id)?.laneId ?? ""
      ) || compareIds(a.id, b.id)
  )
  const excluded = new Set(
    sorted
      .filter(
        (e) =>
          (hints.get(e.id)?.route ??
            (e.source === e.target ? "none" : "auto")) === "none"
      )
      .map((e) => e.id)
  )
  const pairKeys = new Map(
    sorted.map((e) => [
      e.id,
      JSON.stringify([
        compositionalEndpointKey(endpoint(e.source, e.sourceEndpoint)),
        compositionalEndpointKey(endpoint(e.target, e.targetEndpoint))
      ])
    ])
  )
  const ownerKeys = new Map(
    sorted.map((e) => [e.id, JSON.stringify([e.source, e.target])])
  )
  const duplicateGroups = new Map<string, string[]>()
  for (const e of sorted) {
    if (excluded.has(e.id)) continue
    const k = pairKeys.get(e.id)!,
      group = duplicateGroups.get(k) ?? []
    group.push(e.id)
    duplicateGroups.set(k, group)
  }
  const ownerPairs = new Map<string, string[]>()
  for (const edge of sorted) {
    if (excluded.has(edge.id)) continue
    const key = ownerKeys.get(edge.id)!
    const group = ownerPairs.get(key) ?? []
    group.push(edge.id)
    ownerPairs.set(key, group)
  }
  let previous:
    { projection: Projection; edges: Map<string, RoutedConnection> } | undefined
  return (projection: Projection, rankMap: Map<string, number>) => {
    const edges: RoutedConnection[] = []
    const owners = projection.nodes.filter(
      (n) => n.semantic.endpoint.kind === "node"
    )
    const pad = request.options.obstaclePadding
    const obstacles = owners.map((n) => ({
      x: n.rect.x - pad,
      y: n.rect.y - pad,
      width: n.rect.width + 2 * pad,
      height: n.rect.height + 2 * pad
    }))
    const compound = request.prepared.graph.nodes.some((n) => n.parentId)
    const sameBounds =
      previous &&
      projection.nodes.every((n) => {
        const rect = previous!.projection.byId.get(n.id)?.rect
        return (
          rect &&
          rect.x === n.rect.x &&
          rect.y === n.rect.y &&
          rect.width === n.rect.width &&
          rect.height === n.rect.height
        )
      })
    for (const edge of sorted) {
      const cached = previous?.edges.get(edge.id)
      if (
        request.options.routing === "terminals" &&
        cached &&
        projection.byId.get(cached.source.displayNodeId) ===
          previous!.projection.byId.get(cached.source.displayNodeId) &&
        projection.byId.get(cached.target.displayNodeId) ===
          previous!.projection.byId.get(cached.target.displayNodeId) &&
        sameBounds
      ) {
        edges.push(cached)
        continue
      }
      const source = terminal(
        request,
        projection,
        edge.id,
        endpoint(edge.source, edge.sourceEndpoint),
        "source"
      )
      const target = terminal(
        request,
        projection,
        edge.id,
        endpoint(edge.target, edge.targetEndpoint),
        "target"
      )
      const skip = excluded.has(edge.id)
      const direct =
        skip ||
        request.options.routing === "terminals" ||
        request.options.routing === "bump"
      const group = skip
        ? [edge.id]
        : duplicateGroups.get(pairKeys.get(edge.id)!)!
      const lane =
        (group.indexOf(edge.id) - (group.length - 1) / 2) *
        request.options.laneGap
      if (
        group.length > 1 &&
        request.options.laneGap === 0 &&
        request.options.bundles === "none"
      )
        fail(
          "ROUTING_COINCIDENT",
          "Exact duplicates require lane space or an explicit bundle.",
          { edgeIds: group }
        )
      // Retain common terminal stubs, then fan out perpendicular to the normal.
      const move = (p: Point, normal: Point): Point => ({
        x: p.x - normal.y * lane,
        y: p.y + normal.x * lane
      })
      const start = move(source.escape, source.normal),
        end = move(target.escape, { x: -target.normal.x, y: -target.normal.y })
      if (
        !direct &&
        compound &&
        owners.some(
          (n) =>
            n.id !== source.displayNodeId &&
            n.id !== target.displayNodeId &&
            n.id !== edge.source &&
            n.id !== edge.target &&
            [source.anchor, target.anchor].some(
              (p) =>
                p.x > n.rect.x &&
                p.x < n.rect.x + n.rect.width &&
                p.y > n.rect.y &&
                p.y < n.rect.y + n.rect.height
            )
        )
      )
        fail(
          "CAPABILITY_COMPOUND_ROUTING",
          "Cross-hierarchy routing needs collapsed authored boundary exposures.",
          { edgeIds: [edge.id] }
        )
      const exploded =
        source.displayNodeId !== edge.source ||
        target.displayNodeId !== edge.target
      const routeObstacles = exploded
        ? obstacles.filter(
            (_, i) =>
              !(
                (source.displayNodeId !== edge.source &&
                  owners[i].id === edge.source) ||
                (target.displayNodeId !== edge.target &&
                  owners[i].id === edge.target)
              )
          )
        : obstacles
      if (
        (!direct || group.length > 1) &&
        (segmentBlocked(source.escape, start, routeObstacles) ||
          segmentBlocked(end, target.escape, routeObstacles))
      )
        fail(
          "ROUTING_LANE_SPACE",
          "Pinned terminal lanes have insufficient clearance.",
          { edgeIds: [edge.id] }
        )
      const siblings = skip
        ? [edge.id]
        : ownerPairs.get(ownerKeys.get(edge.id)!)!
      const channel =
        (siblings.indexOf(edge.id) - (siblings.length - 1) / 2) *
        request.options.laneGap
      const middle = direct
        ? [start, end]
        : orthogonalRoute(start, end, routeObstacles, channel, horizontal)
      if (!middle)
        fail(
          "ROUTING_NO_PATH",
          "No route found within the adapter's visibility-grid budget.",
          { edgeIds: [edge.id] }
        )
      const points = compact([
        source.anchor,
        source.escape,
        ...middle,
        target.escape,
        target.anchor
      ])
      const section = direct
        ? terminalSection(
            JSON.stringify([edge.id, "route"]),
            source,
            target,
            start,
            end,
            !skip && request.options.routing === "bump",
            horizontal
          )
        : routeSection(
            JSON.stringify([edge.id, "route"]),
            points,
            request.options.routing === "smooth",
            routeObstacles
          )
      const owner = (id: string) => projection.hidden.get(id) ?? id
      const feedback =
        owner(edge.source) !== owner(edge.target) &&
        rankMap.get(owner(edge.source))! >= rankMap.get(owner(edge.target))!
      edges.push({
        routing: skip ? "none" : request.options.routing,
        edgeId: edge.id,
        source,
        target,
        sections: [section],
        bounds: section.bounds,
        feedback
      })
    }
    previous = { projection, edges: new Map(edges.map((e) => [e.edgeId, e])) }
    return { edges, hints, sorted, excluded }
  }
}

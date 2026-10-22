import type {
  BundleGeometry,
  Diagnostic,
  LayoutOptions,
  LayoutRequest,
  NodeMeasure,
  Point,
  RoutedConnection,
  SolvedCompositionalLayout,
  PlacedNode
} from "./types"
import {
  canonical,
  compareIds,
  CompositionalGraphError,
  compositionalEndpointKey,
  endpoint,
  fail,
  freeze
} from "./identity"
import {
  boundRects,
  finite,
  legalSwap,
  orderIds,
  validateGeometry
} from "./geometry"
import { measureRoutes } from "./metrics"
import { project, terminal, validateView } from "./projection"
import {
  compact,
  distance,
  orthogonalRoute,
  routeSection,
  segmentBlocked
} from "./routing"
import {
  initialPositions,
  placeRanks,
  projectedRanks,
  ranks,
  validateSemanticTopology
} from "./topology"

// Solved layouts are frozen, so one index per previous solution stays valid.
const previousNodeIndexes = /* @__PURE__ */ new WeakMap<
  SolvedCompositionalLayout,
  Map<string, PlacedNode>
>()
function previousNode(
  request: LayoutRequest,
  id: string
): PlacedNode | undefined {
  const previous = request.previous
  if (!previous) return undefined
  let index = previousNodeIndexes.get(previous)
  if (!index) {
    index = new Map(previous.nodes.map((n) => [n.id, n]))
    previousNodeIndexes.set(previous, index)
  }
  return index.get(id)
}

/** Resolve and record the bounded built-in adapter's options. */
export function compositionalLayoutOptions(
  options: Pick<LayoutOptions, "mode"> & Partial<LayoutOptions>
): LayoutOptions {
  return {
    topology: "strict-dag",
    routing: "orthogonal",
    bundles: "none",
    rankGap: 96,
    nodeGap: 32,
    laneGap: 6,
    terminalStub: 12,
    obstaclePadding: 6,
    maxSweeps: 8,
    seed: 0,
    ...options,
    weights: {
      crossings: 8,
      alignment: 2,
      length: 1,
      bends: 1,
      congestion: 4,
      displacement: 4,
      reorder: 3,
      ...options.weights
    }
  }
}
function validateOptions(request: LayoutRequest): void {
  const o = request.options
  if (
    !["route-only", "optimize"].includes(o.mode) ||
    !["strict-dag", "feedback"].includes(o.topology) ||
    !["orthogonal", "polyline", "smooth"].includes(o.routing) ||
    !["none", "parallel", "overview"].includes(o.bundles) ||
    !["LR", "RL", "TB", "BT"].includes(request.view.direction)
  )
    fail(
      "CAPABILITY_OPTIONS",
      "Unknown layout mode, direction, routing or topology."
    )
  for (const name of [
    "rankGap",
    "nodeGap",
    "laneGap",
    "terminalStub",
    "obstaclePadding",
    "maxSweeps"
  ] as const)
    finite(o[name], name)
  if (!Number.isInteger(o.maxSweeps) || o.maxSweeps > 100)
    fail("CONSTRAINT_BUDGET", "maxSweeps must be an integer in [0,100].")
  if (!Number.isSafeInteger(o.seed))
    fail("CONSTRAINT_SEED", "Seed must be a safe integer.")
  Object.entries(o.weights ?? {}).forEach(([name, value]) =>
    finite(value, name)
  )
  if (
    o.mode === "optimize" &&
    request.prepared.graph.nodes.some((n) => n.parentId)
  )
    fail(
      "CAPABILITY_COMPOUND_OPTIMIZE",
      "Compound graphs require authored positions in this adapter."
    )
  const hints = new Set<string>()
  for (const hint of request.view.edgeHints ?? []) {
    if (
      hints.has(hint.edgeId) ||
      !request.prepared.graph.edges.some((e) => e.id === hint.edgeId)
    )
      fail(
        "IDENTITY_EDGE_HINT",
        "Edge hints must refer to unique existing edges."
      )
    hints.add(hint.edgeId)
    if (hint.priority !== undefined) finite(hint.priority, "priority")
  }
}
function baseResult(request: LayoutRequest): SolvedCompositionalLayout {
  return {
    schemaVersion: "semiotic.compositional-layout.v0.1",
    requestId: request.requestId,
    semanticHash: request.prepared.semanticHash,
    graphRevision: request.prepared.graph.revision,
    viewRevision: request.view.revision,
    geometryRevision: request.geometry.revision,
    engineId: "semiotic-compositional",
    engineVersion: "0.1.0",
    optionsHash: canonical(request.options),
    status: "complete",
    nodes: [],
    edges: [],
    bundles: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    metrics: {
      crossings: 0,
      channelCongestion: 0,
      alignmentError: 0,
      totalRouteLength: 0,
      bendCount: 0,
      nodeDisplacement: 0,
      reorderedParts: 0,
      hardConstraintViolations: 0,
      routedEdgeCount: 0,
      omittedEdgeCount: request.prepared.graph.edges.length,
      completedSweeps: 0
    },
    diagnostics: []
  }
}

function solveAt(
  request: LayoutRequest,
  measures: Map<string, NodeMeasure>,
  positions: Map<string, Point>,
  orders: Map<string, string[]>
): SolvedCompositionalLayout {
  const projection = project(request, measures, positions, orders)
  const rankMap = projectedRanks(request, projection)
  const horizontal =
    request.view.direction === "LR" || request.view.direction === "RL"
  const diagnostics: Diagnostic[] = [],
    edges: RoutedConnection[] = []
  const hints = new Map(request.view.edgeHints?.map((h) => [h.edgeId, h]))
  const sorted = [...request.prepared.graph.edges].sort(
    (a, b) =>
      compareIds(
        hints.get(a.id)?.laneId ?? "",
        hints.get(b.id)?.laneId ?? ""
      ) || compareIds(a.id, b.id)
  )
  const pairKey = (e: (typeof sorted)[number]) =>
    JSON.stringify([
      compositionalEndpointKey(endpoint(e.source, e.sourceEndpoint)),
      compositionalEndpointKey(endpoint(e.target, e.targetEndpoint))
    ])
  const duplicateGroups = new Map<string, string[]>()
  for (const e of sorted) {
    const k = pairKey(e),
      group = duplicateGroups.get(k) ?? []
    group.push(e.id)
    duplicateGroups.set(k, group)
  }
  const ownerPairs = new Map<string, string[]>()
  for (const edge of sorted) {
    const key = JSON.stringify([edge.source, edge.target])
    const group = ownerPairs.get(key) ?? []
    group.push(edge.id)
    ownerPairs.set(key, group)
  }
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
  for (const edge of sorted) {
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
    const group = duplicateGroups.get(pairKey(edge))!
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
      segmentBlocked(source.escape, start, routeObstacles) ||
      segmentBlocked(end, target.escape, routeObstacles)
    )
      fail(
        "ROUTING_LANE_SPACE",
        "Pinned terminal lanes have insufficient clearance.",
        { edgeIds: [edge.id] }
      )
    const siblings = ownerPairs.get(JSON.stringify([edge.source, edge.target]))!
    const channel =
      (siblings.indexOf(edge.id) - (siblings.length - 1) / 2) *
      request.options.laneGap
    const middle = orthogonalRoute(
      start,
      end,
      routeObstacles,
      channel,
      horizontal
    )
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
    const section = routeSection(
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
      edgeId: edge.id,
      source,
      target,
      sections: [section],
      bounds: section.bounds,
      feedback
    })
  }
  const aligned = new Set(
    sorted.filter((e) => hints.get(e.id)?.alignment !== "none").map((e) => e.id)
  )
  const { metrics, partial } = measureRoutes(edges, horizontal, aligned)
  if (metrics.channelCongestion > 1e-8)
    diagnostics.push({
      code: "ROUTING_CONGESTION",
      severity: "warning",
      message:
        "Some routes share undeclared segments. Every edge is retained; use the connection table to disambiguate.",
      edgeIds: edges.map((edge) => edge.edgeId)
    })
  if (partial)
    diagnostics.push({
      code: "ROUTING_METRIC_BUDGET",
      severity: "warning",
      message:
        "Crossing count is a lower bound after two million segment comparisons."
    })
  if (request.geometry.basis === "estimated")
    diagnostics.push({
      code: "GEOMETRY_ESTIMATED",
      severity: "warning",
      message: "Attachment geometry is provisional."
    })
  if (request.options.routing === "smooth")
    diagnostics.push({
      code: "ROUTING_CURVE_METRICS",
      severity: "info",
      message:
        "Curve length and crossings use 24 samples per corner; bounds use conservative control envelopes."
    })
  const bundles: BundleGeometry[] = []
  if (request.options.bundles !== "none") {
    const groups = new Map<string, RoutedConnection[]>()
    for (const route of edges) {
      const e = sorted.find((e) => e.id === route.edgeId)!
      const id = JSON.stringify([
        "bundle",
        route.source.displayNodeId,
        route.target.displayNodeId,
        route.source.exposureId ??
          compositionalEndpointKey(route.source.semantic),
        route.target.exposureId ??
          compositionalEndpointKey(route.target.semantic),
        e.kind ?? "unspecified",
        hints.get(e.id)?.bundleGroup ?? null
      ])
      const members = groups.get(id) ?? []
      members.push(route)
      groups.set(id, members)
    }
    for (const [id, members] of groups)
      if (members.length > 1)
        bundles.push({
          id,
          kind: request.options.bundles,
          memberEdgeIds: members.map((e) => e.edgeId),
          path: members[0].sections,
          count: members.length,
          countStatus: "exact",
          semanticKind:
            sorted.find((e) => e.id === members[0].edgeId)?.kind ??
            "unspecified"
        })
  }
  return {
    ...baseResult(request),
    status:
      partial ||
      metrics.channelCongestion > 1e-8 ||
      request.geometry.basis === "estimated"
        ? "degraded"
        : "complete",
    nodes: projection.nodes,
    edges,
    bundles,
    bounds: boundRects([
      ...projection.nodes.map((n) => n.rect),
      ...edges.map((e) => e.bounds)
    ]),
    metrics,
    diagnostics
  }
}

function objective(
  solved: SolvedCompositionalLayout,
  request: LayoutRequest,
  orders: Map<string, string[]>
): number {
  const m = solved.metrics,
    w = compositionalLayoutOptions(request.options).weights!,
    scale = Math.max(1, request.options.rankGap)
  const reorders = request.view.nodes.reduce(
    (sum, n) =>
      n.partLayout?.kind === "rows"
        ? sum +
          orderIds(n.partLayout.order).filter(
            (id, i) => orders.get(n.nodeId)?.[i] !== id
          ).length
        : sum,
    0
  )
  const owners = solved.nodes.filter((n) => n.semantic.endpoint.kind === "node")
  const displacement = owners.reduce((sum, n) => {
    const prior = previousNode(request, n.id)
    return sum + (prior ? distance(prior.rect, n.rect) : 0)
  }, 0)
  // Costs use actual routed attachments, never box-center crossings.
  return (
    w.crossings! * m.crossings +
    (w.alignment! * m.alignmentError) / scale +
    (w.length! * m.totalRouteLength) / scale +
    w.bends! * m.bendCount +
    (w.congestion! * m.channelCongestion) / scale +
    (w.reorder! * reorders) / Math.max(1, owners.length) +
    (w.displacement! * displacement) / scale
  )
}

/** Synchronous deterministic solve. Never call this from a camera or paint callback. */
export function routeCompositionalGraph(
  input: LayoutRequest
): SolvedCompositionalLayout {
  const request = {
    ...input,
    options: compositionalLayoutOptions(input.options)
  }
  try {
    validateOptions(request)
    validateView(request)
    validateSemanticTopology(request)
    const measures = validateGeometry(request.geometry),
      positions = initialPositions(request),
      orders = new Map<string, string[]>()
    for (const n of request.view.nodes)
      if (n.partLayout?.kind === "rows")
        orders.set(n.nodeId, orderIds(n.partLayout.order))
    if (request.options.mode === "optimize") {
      const graph = request.prepared.graph
      const map = ranks(
        graph.nodes.map((n) => n.id),
        graph.edges
          .filter((e) => e.source !== e.target)
          .map((e) => [e.source, e.target])
      )
      if (!map && request.options.topology === "strict-dag")
        fail("TOPOLOGY_PROJECTION_CYCLE", "Owner projection is cyclic.")
      placeRanks(
        request,
        map ??
          new Map(
            [...graph.nodes]
              .sort((a, b) => compareIds(a.id, b.id))
              .map((n, i) => [n.id, i])
          ),
        positions
      )
    }
    let best = solveAt(request, measures, positions, orders),
      score = objective(best, request, orders),
      completedSweeps = 0,
      candidates = 0
    const tryCandidate = () => {
      candidates++
      try {
        const next = solveAt(request, measures, positions, orders),
          value = objective(next, request, orders)
        if (value + 1e-8 < score) {
          best = next
          score = value
          return true
        }
      } catch (error) {
        if (!(error instanceof CompositionalGraphError)) throw error
      }
      return false
    }
    if (request.options.mode === "optimize")
      for (
        let sweep = 0;
        sweep < request.options.maxSweeps && candidates < 256;
        sweep++
      ) {
        let changed = false
        for (const n of [...request.view.nodes].sort((a, b) =>
          compareIds(a.nodeId, b.nodeId)
        )) {
          if (n.partLayout?.kind !== "rows") continue
          const ids = orders.get(n.nodeId)!
          swaps: for (let i = 0; i < ids.length - 1 && candidates < 256; i++)
            for (let j = i + 1; j < ids.length && candidates < 256; j++) {
              if (!legalSwap(n.partLayout.order, ids[i], ids[j])) continue
              const swap = [...ids]
              ;[swap[i], swap[j]] = [swap[j], swap[i]]
              orders.set(n.nodeId, swap)
              if (tryCandidate()) {
                changed = true
                break swaps
              }
              orders.set(n.nodeId, ids)
            }
        }
        const horizontal =
          request.view.direction === "LR" || request.view.direction === "RL"
        const ownerByDisplay = new Map(
          best.nodes.map((n) => [n.id, n.semantic.nodeId])
        )
        for (const n of best.nodes) {
          if (candidates >= 256) break
          // Exploded part boxes derive their position from their owner and rows.
          // They must participate in owner alignment, never move independently.
          if (n.semantic.endpoint.kind !== "node") continue
          const c = request.view.constraints?.find((c) => c.nodeId === n.id)
          if (c?.pin === "both" || c?.pin === (horizontal ? "y" : "x")) continue
          const differences = best.edges
            .filter(
              (e) =>
                request.view.edgeHints?.find((h) => h.edgeId === e.edgeId)
                  ?.alignment !== "none"
            )
            .flatMap((e) =>
              ownerByDisplay.get(e.source.displayNodeId) === n.id
                ? [
                    horizontal
                      ? e.target.anchor.y - e.source.anchor.y
                      : e.target.anchor.x - e.source.anchor.x
                  ]
                : ownerByDisplay.get(e.target.displayNodeId) === n.id
                  ? [
                      horizontal
                        ? e.source.anchor.y - e.target.anchor.y
                        : e.source.anchor.x - e.target.anchor.x
                    ]
                  : []
            )
            .sort((a, b) => a - b)
          if (!differences.length) continue
          const delta = differences[Math.floor(differences.length / 2)],
            previous = positions.get(n.id)!
          if (Math.abs(delta) < 1e-8) continue
          positions.set(n.id, {
            x: previous.x + (horizontal ? 0 : delta),
            y: previous.y + (horizontal ? delta : 0)
          })
          if (tryCandidate()) changed = true
          else positions.set(n.id, previous)
        }
        completedSweeps++
        if (!changed) break
      }
    const reorderedParts = request.view.nodes.reduce(
      (sum, n) =>
        n.partLayout?.kind === "rows"
          ? sum +
            orderIds(n.partLayout.order).filter(
              (id, i) => orders.get(n.nodeId)?.[i] !== id
            ).length
          : sum,
      0
    )
    const diagnostics: Diagnostic[] = [
      ...best.diagnostics,
      {
        code: "LAYOUT_TERMINATION",
        severity: "info",
        message:
          request.options.mode === "route-only"
            ? "Authored positions and order retained."
            : `Bounded local optimization completed ${completedSweeps} sweeps and ${candidates} candidate evaluations${candidates >= 256 ? " (candidate budget reached)" : ""}.`
      }
    ]
    return freeze({
      ...best,
      metrics: {
        ...best.metrics,
        completedSweeps,
        reorderedParts,
        nodeDisplacement: best.nodes.reduce((sum, n) => {
          if (n.semantic.endpoint.kind !== "node") return sum
          const prior = previousNode(request, n.id)
          return sum + (prior ? distance(prior.rect, n.rect) : 0)
        }, 0)
      },
      diagnostics
    })
  } catch (error) {
    if (!(error instanceof CompositionalGraphError)) throw error
    return freeze({
      ...baseResult(request),
      status: "infeasible",
      diagnostics: error.diagnostics,
      metrics: { ...baseResult(request).metrics, hardConstraintViolations: 1 }
    })
  }
}

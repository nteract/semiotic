import type {
  BoundaryExposure,
  CompositionalNode,
  EndpointAnchorSpec,
  LayoutRequest,
  NodeMeasure,
  NodePresentation,
  PlacedNode,
  Point,
  PortOrderConstraint,
  TerminalGeometry,
  EndpointRef
} from "./types"
import { compareIds, endpoint, fail } from "./identity"
import {
  anchorKey,
  bindingPoint,
  compositionalRowGeometry,
  contains,
  defaultSide,
  finite,
  orderIds,
  overlap,
  sidePoint,
  validateOrder
} from "./geometry"
import { resolveEndpoint } from "./prepare"
import { segmentBlocked } from "./routing"

export interface Projection {
  nodes: PlacedNode[]
  hidden: Map<string, string>
  bySemantic: Map<string, PlacedNode>
  measures: Map<string, NodeMeasure>
  semantics: Map<string, CompositionalNode>
  /** Indexed view lookups; terminals run twice per edge per candidate solve. */
  presentations: Map<string, NodePresentation>
  anchors: Map<string, EndpointAnchorSpec>
  exposures: Map<string, BoundaryExposure>
  portOrders: Map<string, PortOrderConstraint>
  byId: Map<string, PlacedNode>
  positions: Map<string, Point>
  orders: Map<string, string[]>
}
/** First item per key, matching the `find` order these lookups replace. */
function firstBy<T>(
  items: readonly T[] | undefined,
  key: (item: T) => string
): Map<string, T> {
  const index = new Map<string, T>()
  for (const item of items ?? []) {
    const k = key(item)
    if (!index.has(k)) index.set(k, item)
  }
  return index
}
const exposureKey = (containerNodeId: string, anchor: string) =>
  JSON.stringify([containerNodeId, anchor])
const portOrderKey = (
  nodeId: string,
  partId: string | undefined,
  use: string,
  side: string
) => JSON.stringify([nodeId, partId ?? null, use, side])
// Solved layouts are deeply frozen. Copy caller-owned measure geometry into
// them so the freeze never reaches application objects.
const copyAnchor = <T extends { point: Point; normal: Point }>(
  anchor: T
): T => ({
  ...anchor,
  point: { ...anchor.point },
  normal: { ...anchor.normal }
})
/** Shared visibility rules for projection and external-engine acceptance. */
export function projectionOwners(request: LayoutRequest) {
  const { graph } = request.prepared
  const semantics = new Map(graph.nodes.map((n) => [n.id, n]))
  const views = new Map(request.view.nodes.map((n) => [n.nodeId, n]))
  if (views.size !== request.view.nodes.length)
    fail("IDENTITY_VIEW", "Duplicate node presentations.")
  for (const id of views.keys())
    if (!semantics.has(id)) fail("IDENTITY_VIEW", "Unknown presentation owner.")
  const hidden = new Map<string, string>()
  for (const n of graph.nodes) {
    let parent = n.parentId
    while (parent) {
      if (views.get(parent)?.mode === "summary") hidden.set(n.id, parent)
      parent = semantics.get(parent)?.parentId
    }
  }
  return { semantics, views, hidden }
}

export function project(
  request: LayoutRequest,
  measurements: Map<string, NodeMeasure>,
  positions: Map<string, Point>,
  orders: Map<string, string[]>,
  previous?: Projection
): Projection {
  const { graph } = request.prepared
  const { semantics, views, hidden } = projectionOwners(request)
  const nodes: PlacedNode[] = [],
    bySemantic = new Map<string, PlacedNode>(),
    measures = new Map<string, NodeMeasure>()
  for (const n of [...graph.nodes].sort((a, b) => compareIds(a.id, b.id))) {
    if (hidden.has(n.id)) continue
    if (
      previous &&
      previous.positions.get(n.id) === positions.get(n.id) &&
      previous.orders.get(n.id) === orders.get(n.id)
    ) {
      const placed = previous.bySemantic.get(n.id)!
      nodes.push(placed)
      if (views.get(n.id)?.mode === "exploded")
        for (const part of placed.parts ?? [])
          nodes.push(
            previous.byId.get(JSON.stringify(["part", n.id, part.partId]))!
          )
      bySemantic.set(n.id, placed)
      measures.set(n.id, previous.measures.get(n.id)!)
      continue
    }
    let measure = measurements.get(n.id)
    if (!measure)
      fail("GEOMETRY_MISSING", "Every visible owner needs geometry.", {
        nodeIds: [n.id]
      })
    const view = views.get(n.id)
    const layout = view?.partLayout
    if (layout?.kind === "rows") {
      validateOrder(
        layout.order,
        (n.parts ?? []).map((p) => p.id)
      )
      const ids = orders.get(n.id) ?? orderIds(layout.order)
      if (
        layout.order.mode !== "fixed" &&
        (measure.markAnchors?.length ||
          measure.slotAnchors?.length ||
          request.view.anchors?.some(
            (a) =>
              a.ref.nodeId === n.id &&
              ["point", "named-mark", "slot"].includes(a.binding.kind)
          ))
      )
        fail(
          "CONSTRAINT_ABSOLUTE_REORDER",
          "Absolute anchors require fixed row order or a custom reflow adapter.",
          { nodeIds: [n.id] }
        )
      measure = compositionalRowGeometry(
        measure,
        layout,
        request.view.direction,
        ids
      )
    }
    if (
      view?.mode !== "summary" &&
      (n.parts ?? []).some((p) => !measure.parts.some((m) => m.partId === p.id))
    )
      fail("GEOMETRY_MISSING_PART", "Every visible part needs a rectangle.", {
        nodeIds: [n.id]
      })
    if (
      measure.parts.some((p) => !n.parts?.some((part) => part.id === p.partId))
    )
      fail("GEOMETRY_UNKNOWN_PART", "Measured part does not exist.")
    const position = positions.get(n.id)!
    const placed: PlacedNode = {
      id: n.id,
      semantic: endpoint(n.id),
      rect: { ...position, width: measure.width, height: measure.height },
      parts: measure.parts.map((p) => ({
        ...p,
        rect: { ...p.rect },
        semantic: endpoint(n.id, { kind: "part", partId: p.partId })
      })),
      partOrder: measure.actualPartOrder && [...measure.actualPartOrder],
      markAnchors: measure.markAnchors?.map(copyAnchor),
      slotAnchors: measure.slotAnchors?.map(copyAnchor)
    }
    nodes.push(placed)
    bySemantic.set(n.id, placed)
    measures.set(n.id, measure)
    if (view?.mode === "exploded")
      for (const part of placed.parts ?? []) {
        const id = JSON.stringify(["part", n.id, part.partId])
        if (semantics.has(id))
          fail(
            "IDENTITY_PROJECTION_COLLISION",
            "A semantic ID collides with an exploded display ID."
          )
        nodes.push({
          id,
          semantic: part.semantic,
          rect: {
            ...part.rect,
            x: position.x + part.rect.x,
            y: position.y + part.rect.y
          }
        })
      }
  }
  // Sweep disjoint owner bounds before checking overlap/containment pairs.
  const compound = graph.nodes.some((n) => n.parentId)
  const owners = nodes
    .filter((n) => n.semantic.endpoint.kind === "node")
    .sort((a, b) => a.rect.y - b.rect.y)
  const sameBounds =
    previous &&
    nodes.length === previous.nodes.length &&
    nodes.every((n) => {
      const rect = previous.byId.get(n.id)?.rect
      return (
        rect &&
        rect.x === n.rect.x &&
        rect.y === n.rect.y &&
        rect.width === n.rect.width &&
        rect.height === n.rect.height
      )
    })
  for (let i = 0; !sameBounds && i < owners.length; i++)
    for (let j = i + 1; j < owners.length; j++) {
      const a = owners[i],
        b = owners[j]
      if (b.rect.y > a.rect.y + a.rect.height && !compound) break
      const ancestor = (child: CompositionalNode, id: string): boolean => {
        let parent = child.parentId
        while (parent) {
          if (parent === id) return true
          parent = semantics.get(parent)?.parentId
        }
        return false
      }
      const aInB = ancestor(semantics.get(a.id)!, b.id),
        bInA = ancestor(semantics.get(b.id)!, a.id)
      if (aInB || bInA) {
        const inner = aInB ? a : b,
          outer = aInB ? b : a
        if (
          !contains(outer.rect, inner.rect) ||
          !contains(outer.rect, {
            x: inner.rect.x + inner.rect.width,
            y: inner.rect.y + inner.rect.height
          })
        )
          fail(
            "CONSTRAINT_CONTAINMENT",
            "Authored child bounds exceed the containing owner.",
            { nodeIds: [inner.id, outer.id] }
          )
      } else if (overlap(a.rect, b.rect))
        fail("CONSTRAINT_OVERLAP", "Node boxes overlap.", {
          nodeIds: [a.id, b.id]
        })
    }
  const { view } = request
  return {
    nodes,
    positions: new Map(positions),
    orders: new Map(orders),
    hidden,
    bySemantic,
    measures,
    semantics,
    presentations: views,
    anchors: firstBy(view.anchors, (a) => anchorKey(a.ref, a.use)),
    exposures: firstBy(view.boundaryExposures, (e) =>
      exposureKey(e.containerNodeId, anchorKey(e.inner, e.use))
    ),
    portOrders: firstBy(view.portOrders, (o) =>
      portOrderKey(o.nodeId, o.partId, o.use, o.side)
    ),
    byId: new Map(nodes.map((n) => [n.id, n]))
  }
}

export function terminal(
  request: LayoutRequest,
  projection: Projection,
  edgeId: string,
  ref: EndpointRef,
  use: "source" | "target"
): TerminalGeometry {
  const { view } = request
  const { semantics } = projection
  const hiddenBy = projection.hidden.get(ref.nodeId)
  const ownerId = hiddenBy ?? ref.nodeId
  let node = projection.bySemantic.get(ownerId)!
  const measure = projection.measures.get(ownerId)!
  const presentation = projection.presentations.get(ownerId)
  const isSummaryPart =
    presentation?.mode === "summary" &&
    (ref.endpoint.kind === "part" || !!ref.endpoint.portId)
  const exposure =
    hiddenBy || isSummaryPart
      ? projection.exposures.get(exposureKey(ownerId, anchorKey(ref, use)))
      : undefined
  if ((hiddenBy || isSummaryPart) && !exposure)
    fail(
      "ENDPOINT_MISSING_EXPOSURE",
      "Collapsed endpoints need explicit boundary exposures.",
      { endpointRefs: [ref] }
    )
  const spec = projection.anchors.get(anchorKey(ref, use))
  let binding = exposure?.binding ?? spec?.binding
  const side = defaultSide(view.direction, use)
  if (!binding) {
    let rect = { x: 0, y: 0, width: node.rect.width, height: node.rect.height }
    if (ref.endpoint.kind === "part") {
      const partId = ref.endpoint.partId
      const part = node.parts?.find((p) => p.partId === partId)
      if (!part)
        fail("GEOMETRY_MISSING_PART", "Endpoint has no solved part geometry.", {
          endpointRefs: [ref]
        })
      rect = part.rect
      if (presentation?.mode === "exploded") {
        node = projection.byId.get(JSON.stringify(["part", ownerId, partId]))!
        rect = { ...rect, x: 0, y: 0 }
      }
    }
    let fraction = 0.5
    if (ref.endpoint.portId) {
      const semantic = semantics.get(ref.nodeId)!
      const partId =
        ref.endpoint.kind === "part" ? ref.endpoint.partId : undefined
      const ports = partId
        ? semantic.parts?.find((p) => p.id === partId)?.ports
        : semantic.ports
      const matching = (ports ?? [])
        .filter(
          (p) =>
            p.direction === "inout" ||
            p.direction === (use === "source" ? "out" : "in")
        )
        .map((p) => p.id)
        .sort(compareIds)
      const policy = projection.portOrders.get(
        portOrderKey(ref.nodeId, partId, use, side)
      )
      if (policy) validateOrder(policy.order, matching)
      const ids = policy ? orderIds(policy.order) : matching
      fraction = (ids.indexOf(ref.endpoint.portId) + 1) / (ids.length + 1)
    }
    const local = sidePoint(rect, side, fraction).point
    // Default row slots lie at the owner boundary at the solved row position.
    fraction =
      side === "west" || side === "east"
        ? local.y / (node.rect.height || 1)
        : local.x / (node.rect.width || 1)
    binding = { kind: "node-side", side, fraction }
  }
  const local = bindingPoint(binding, node, measure)
  finite(local.point.x, "anchor x", false)
  finite(local.point.y, "anchor y", false)
  const normal = { x: local.normal.x, y: local.normal.y }
  if (!(
    (Math.abs(normal.x) === 1 && normal.y === 0) ||
    (Math.abs(normal.y) === 1 && normal.x === 0)
  ))
    fail(
      "CAPABILITY_NORMAL",
      "The built-in orthogonal adapter requires cardinal unit normals."
    )
  const box = { x: 0, y: 0, width: node.rect.width, height: node.rect.height }
  if (!contains(box, local.point))
    fail("GEOMETRY_ANCHOR_BOUNDS", "Anchor is outside the display node.")
  const boundary = {
    x: normal.x > 0 ? box.width : normal.x < 0 ? 0 : local.point.x,
    y: normal.y > 0 ? box.height : normal.y < 0 ? 0 : local.point.y
  }
  if (
    (binding.kind === "point" ||
      binding.kind === "named-mark" ||
      binding.kind === "slot") &&
    (boundary.x !== local.point.x || boundary.y !== local.point.y)
  ) {
    const channels = measure.routingChannels ?? []
    const steps = [
      0,
      1,
      ...channels.flatMap((r) =>
        normal.x
          ? [
              (r.x - local.point.x) / (boundary.x - local.point.x),
              (r.x + r.width - local.point.x) / (boundary.x - local.point.x)
            ]
          : [
              (r.y - local.point.y) / (boundary.y - local.point.y),
              (r.y + r.height - local.point.y) / (boundary.y - local.point.y)
            ]
      )
    ]
      .filter((t) => t >= 0 && t <= 1)
      .sort((a, b) => a - b)
    if (
      steps.slice(1).some(
        (t, i) =>
          !channels.some((r) =>
            contains(r, {
              x:
                local.point.x +
                ((boundary.x - local.point.x) * (t + steps[i])) / 2,
              y:
                local.point.y +
                ((boundary.y - local.point.y) * (t + steps[i])) / 2
            })
          )
      )
    )
      fail(
        "CONSTRAINT_INTERIOR_ESCAPE",
        "Interior mark needs a declared straight escape corridor.",
        { edgeIds: [edgeId] }
      )
  }
  const otherParts = (node.parts ?? [])
    .filter((p) => binding.kind !== "part-side" || p.partId !== binding.partId)
    .map((p) => p.rect)
  if (
    segmentBlocked(local.point, boundary, [
      ...(measure.obstacleRects ?? []),
      ...(binding.kind === "part-side" ? otherParts : [])
    ])
  )
    fail(
      "CONSTRAINT_INTERIOR_ESCAPE",
      "Terminal escape intersects an obstacle.",
      { edgeIds: [edgeId] }
    )
  const stub = Math.max(
    request.options.terminalStub,
    request.options.obstaclePadding
  )
  return {
    edgeId,
    end: use,
    semantic: ref,
    displayNodeId: node.id,
    anchor: { x: node.rect.x + local.point.x, y: node.rect.y + local.point.y },
    escape: {
      x: node.rect.x + boundary.x + normal.x * stub,
      y: node.rect.y + boundary.y + normal.y * stub
    },
    normal,
    precision: exposure ? "proxy" : "exact",
    exposureId: exposure?.id
  }
}

export function validateView(request: LayoutRequest): void {
  if (
    ![
      request.requestId,
      request.view.revision,
      request.geometry.revision
    ].every((id) => typeof id === "string" && id.length > 0)
  )
    fail(
      "REVISION_REQUIRED",
      "Request, view and geometry revisions must be nonempty strings."
    )
  const semantics = new Map(request.prepared.graph.nodes.map((n) => [n.id, n]))
  const keys = new Set<string>()
  for (const a of request.view.anchors ?? []) {
    resolveEndpoint(semantics, a.ref, a.use)
    const key = anchorKey(a.ref, a.use)
    if (keys.has(key)) fail("IDENTITY_ANCHOR", "Duplicate endpoint/use anchor.")
    keys.add(key)
  }
  const exposures = new Set<string>(),
    mappings = new Set<string>()
  for (const e of request.view.boundaryExposures ?? []) {
    resolveEndpoint(semantics, e.inner, e.use)
    let ancestor: string | undefined = e.inner.nodeId
    while (ancestor && ancestor !== e.containerNodeId)
      ancestor = semantics.get(ancestor)?.parentId
    if (!ancestor)
      fail(
        "ENDPOINT_EXPOSURE_OWNER",
        "Exposure must refer to an endpoint inside its container."
      )
    const key = JSON.stringify([e.containerNodeId, anchorKey(e.inner, e.use)])
    if (exposures.has(e.id) || mappings.has(key))
      fail("IDENTITY_EXPOSURE", "Duplicate boundary exposure.")
    exposures.add(e.id)
    mappings.add(key)
  }
  const portKeys = new Set<string>()
  for (const order of request.view.portOrders ?? []) {
    const local = order.partId
      ? { kind: "part" as const, partId: order.partId }
      : { kind: "node" as const }
    resolveEndpoint(semantics, endpoint(order.nodeId, local))
    const owner = semantics.get(order.nodeId)!
    const ports = order.partId
      ? owner.parts?.find((p) => p.id === order.partId)?.ports
      : owner.ports
    const compatible = (ports ?? []).filter(
      (p) =>
        p.direction === "inout" ||
        p.direction === (order.use === "source" ? "out" : "in")
    )
    validateOrder(
      order.order,
      compatible.map((p) => p.id)
    )
    const key = JSON.stringify([
      order.nodeId,
      order.partId ?? null,
      order.side,
      order.use
    ])
    if (portKeys.has(key))
      fail("ORDER_PORT_DUPLICATE", "Repeated port order constraint.")
    portKeys.add(key)
    if (order.order.mode !== "fixed")
      fail(
        "CAPABILITY_PORT_ORDER",
        "This adapter supports fixed port order; port permutation needs another adapter."
      )
  }
}

import type {
  AnchorBinding,
  CompositionalView,
  EndpointRef,
  GeometrySnapshot,
  NodeMeasure,
  OrderPolicy,
  PartLayout,
  PlacedNode,
  Point,
  Rect,
  Side
} from "./types"
import { compositionalEndpointKey, fail } from "./identity"

export function finite(
  value: number,
  label: string,
  nonnegative = true
): number {
  if (!Number.isFinite(value) || (nonnegative && value < 0))
    fail(
      "GEOMETRY_NUMBER",
      `${label} must be finite${nonnegative ? " and nonnegative" : ""}.`
    )
  return value
}
export function validateRect(rect: Rect): void {
  finite(rect.x, "x", false)
  finite(rect.y, "y", false)
  finite(rect.width, "width")
  finite(rect.height, "height")
}
export function orderIds(policy: OrderPolicy): string[] {
  return [
    ...(policy.mode === "within-groups"
      ? policy.groups.flatMap((g) => [...g.ids])
      : policy.mode === "optimize"
        ? policy.initialIds
        : policy.ids)
  ]
}
export function validateOrder(
  policy: OrderPolicy,
  members: readonly string[]
): void {
  const ids = orderIds(policy)
  if (
    ids.length !== members.length ||
    new Set(ids).size !== ids.length ||
    members.some((id) => !ids.includes(id))
  )
    fail(
      "ORDER_MEMBERS",
      "An order must contain every participating member exactly once."
    )
  if (
    policy.mode === "within-groups" &&
    new Set(policy.groups.map((g) => g.id)).size !== policy.groups.length
  )
    fail("ORDER_GROUPS", "Order group IDs must be unique.")
}
export function legalSwap(policy: OrderPolicy, a: string, b: string): boolean {
  return (
    policy.mode === "optimize" ||
    (policy.mode === "within-groups" &&
      policy.groups.some(
        (g) => !g.fixed && g.ids.includes(a) && g.ids.includes(b)
      ))
  )
}

/** Pure variable-size row/column geometry; all rects are local to the owner. */
export function compositionalRowGeometry(
  measure: NodeMeasure,
  layout: Extract<PartLayout, { kind: "rows" }>,
  direction: CompositionalView["direction"],
  order = orderIds(layout.order)
): NodeMeasure {
  const horizontal = direction === "LR" || direction === "RL"
  const p = layout.padding
  Object.entries(p).forEach(([name, value]) => finite(value, name))
  finite(layout.headerHeight, "headerHeight")
  finite(layout.rowGap, "rowGap")
  finite(layout.defaultRowHeight, "defaultRowHeight")
  const sizes = new Map<string, number>()
  for (const row of layout.rowHeights ?? []) {
    if (sizes.has(row.partId) || !order.includes(row.partId))
      fail(
        "ORDER_ROW_HEIGHT",
        "Row size IDs must be unique participating parts."
      )
    sizes.set(row.partId, finite(row.height, "rowHeight"))
  }
  let offset = layout.headerHeight + (horizontal ? p.top : p.left)
  const breadth = horizontal
    ? measure.width - p.left - p.right
    : measure.height - p.top - p.bottom
  finite(breadth, "available row breadth")
  const parts = order.map((partId) => {
    const size = sizes.get(partId) ?? layout.defaultRowHeight
    const rect = horizontal
      ? { x: p.left, y: offset, width: breadth, height: size }
      : { x: offset, y: p.top, width: size, height: breadth }
    offset += size + layout.rowGap
    return { partId, rect }
  })
  const needed =
    offset -
    (parts.length ? layout.rowGap : 0) +
    (horizontal ? p.bottom : p.right)
  if (needed > (horizontal ? measure.height : measure.width) + 1e-8)
    fail("GEOMETRY_FOOTPRINT", "Rows exceed the supplied node footprint.", {
      nodeIds: [measure.nodeId]
    })
  return { ...measure, parts, actualPartOrder: order }
}

export function sidePoint(
  rect: Rect,
  side: Side,
  fraction = 0.5
): { point: Point; normal: Point } {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
    fail("GEOMETRY_FRACTION", "Anchor fraction must be in [0,1].")
  switch (side) {
    case "north":
      return {
        point: { x: rect.x + rect.width * fraction, y: rect.y },
        normal: { x: 0, y: -1 }
      }
    case "south":
      return {
        point: { x: rect.x + rect.width * fraction, y: rect.y + rect.height },
        normal: { x: 0, y: 1 }
      }
    case "east":
      return {
        point: { x: rect.x + rect.width, y: rect.y + rect.height * fraction },
        normal: { x: 1, y: 0 }
      }
    case "west":
      return {
        point: { x: rect.x, y: rect.y + rect.height * fraction },
        normal: { x: -1, y: 0 }
      }
    default:
      return fail("GEOMETRY_SIDE", "Unknown anchor side.")
  }
}
export function defaultSide(
  direction: CompositionalView["direction"],
  use: "source" | "target"
): Side {
  const sides: Record<CompositionalView["direction"], [Side, Side]> = {
    LR: ["east", "west"],
    RL: ["west", "east"],
    TB: ["south", "north"],
    BT: ["north", "south"]
  }
  return sides[direction][use === "source" ? 0 : 1]
}
export function boundRects(rects: readonly Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 }
  // A loop, not Math.min(...spread): large graphs exceed the argument limit.
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const r of rects) {
    x = Math.min(x, r.x)
    y = Math.min(y, r.y)
    right = Math.max(right, r.x + r.width)
    bottom = Math.max(bottom, r.y + r.height)
  }
  return { x, y, width: right - x, height: bottom - y }
}
export function pointBounds(points: readonly Point[]): Rect {
  return boundRects(points.map((p) => ({ ...p, width: 0, height: 0 })))
}
export function overlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - 1e-8 &&
    a.x + a.width > b.x + 1e-8 &&
    a.y < b.y + b.height - 1e-8 &&
    a.y + a.height > b.y + 1e-8
  )
}
export function contains(r: Rect, p: Point): boolean {
  return (
    p.x >= r.x - 1e-8 &&
    p.x <= r.x + r.width + 1e-8 &&
    p.y >= r.y - 1e-8 &&
    p.y <= r.y + r.height + 1e-8
  )
}

export function validateGeometry(
  snapshot: GeometrySnapshot
): Map<string, NodeMeasure> {
  const map = new Map<string, NodeMeasure>()
  for (const m of snapshot.nodes) {
    if (map.has(m.nodeId))
      fail("GEOMETRY_DUPLICATE", "Duplicate node measurement.")
    finite(m.width, "width")
    finite(m.height, "height")
    const ids = new Set<string>()
    for (const p of m.parts) {
      if (ids.has(p.partId))
        fail("GEOMETRY_DUPLICATE", "Duplicate part measurement.")
      ids.add(p.partId)
      validateRect(p.rect)
      if (
        !contains({ x: 0, y: 0, width: m.width, height: m.height }, p.rect) ||
        !contains(
          { x: 0, y: 0, width: m.width, height: m.height },
          { x: p.rect.x + p.rect.width, y: p.rect.y + p.rect.height }
        )
      )
        fail("GEOMETRY_PART_BOUNDS", "Part measurement exceeds its owner.")
    }
    const anchors = new Set<string>()
    for (const a of [
      ...(m.markAnchors ?? []).map((a) => ({
        ...a,
        key: JSON.stringify(["mark", a.markId, a.anchorName])
      })),
      ...(m.slotAnchors ?? []).map((a) => ({
        ...a,
        key: JSON.stringify(["slot", a.groupId, a.slotId])
      }))
    ]) {
      if (anchors.has(a.key))
        fail("GEOMETRY_DUPLICATE", "Duplicate named anchor.")
      anchors.add(a.key)
      finite(a.point.x, "anchor x", false)
      finite(a.point.y, "anchor y", false)
      finite(a.normal.x, "normal x", false)
      finite(a.normal.y, "normal y", false)
    }
    for (const r of [...(m.routingChannels ?? []), ...(m.obstacleRects ?? [])])
      validateRect(r)
    map.set(m.nodeId, m)
  }
  return map
}

export function bindingPoint(
  binding: AnchorBinding,
  node: PlacedNode,
  measure: NodeMeasure
): { point: Point; normal: Point } {
  switch (binding.kind) {
    case "node-side":
      return sidePoint(
        { x: 0, y: 0, width: node.rect.width, height: node.rect.height },
        binding.side,
        binding.fraction
      )
    case "part-side": {
      const part = node.parts?.find((p) => p.partId === binding.partId)
      if (!part)
        return fail(
          "GEOMETRY_UNKNOWN_PART",
          "Anchor has no solved part rectangle."
        )
      return sidePoint(part.rect, binding.side, binding.fraction)
    }
    case "point":
      return binding
    case "named-mark": {
      const anchor = measure.markAnchors?.find(
        (a) =>
          a.markId === binding.markId && a.anchorName === binding.anchorName
      )
      if (!anchor)
        return fail("GEOMETRY_UNKNOWN_MARK", "Named mark anchor is unresolved.")
      return anchor
    }
    case "slot": {
      const anchor = measure.slotAnchors?.find(
        (a) => a.groupId === binding.groupId && a.slotId === binding.slotId
      )
      if (!anchor)
        return fail("GEOMETRY_UNKNOWN_SLOT", "Named slot is unresolved.")
      return anchor
    }
  }
}
export function anchorKey(ref: EndpointRef, use: "source" | "target"): string {
  return JSON.stringify([compositionalEndpointKey(ref), use])
}

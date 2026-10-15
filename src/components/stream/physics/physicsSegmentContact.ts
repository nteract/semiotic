import type { PhysicsBodyState, PhysicsColliderShape } from "./PhysicsKernel"

import {
  nearestBoundary,
  sweepRoundedPolygon,
  type ContactPoint,
  type PhysicsContact
} from "./physicsRoundedPolygonContact"

type Segment = Extract<PhysicsColliderShape, { type: "segment" }>

/** The Minkowski sum of a segment and an axis-aligned box, counterclockwise.
 * Testing its rounded boundary against the body center gives exact box/capsule
 * contacts, including end caps, without substituting a bounding circle. */
function expandedSegment(
  body: PhysicsBodyState,
  segment: Segment
): ContactPoint[] {
  let { x1, y1, x2, y2 } = segment
  if (body.shape.type === "circle")
    return [
      [x1, y1],
      [x2, y2]
    ]
  if (x1 > x2 || (x1 === x2 && y1 > y2)) {
    x1 = segment.x2
    y1 = segment.y2
    x2 = segment.x1
    y2 = segment.y1
  }
  const hw = body.shape.width / 2
  const hh = (body.shape.height / 2) * (y2 >= y1 ? 1 : -1)
  const points: ContactPoint[] = [
    [x1 - hw, y1 - hh],
    [x1 + hw, y1 - hh],
    [x2 + hw, y2 - hh],
    [x2 + hw, y2 + hh],
    [x2 - hw, y2 + hh],
    [x1 - hw, y1 + hh]
  ]
  // Reflecting a descending segment also reverses the winding.
  return hh < 0 ? points.reverse() : points
}

/** Solid contacts preserve the first entry side, even when a step crosses the
 * entire wall. Sensors use only current overlap, as with AABB sensors. Segment
 * thickness is a capsule diameter; boxes remain axis-aligned at every angle. */
export function segmentContact(
  body: PhysicsBodyState,
  segment: Segment,
  slop = 0,
  swept = false
): PhysicsContact | null {
  const points = expandedSegment(body, segment)
  const radius =
    (segment.thickness ?? 0) / 2 +
    (body.shape.type === "circle" ? body.shape.radius : 0)
  if (swept) {
    const contact = sweepRoundedPolygon(body, points, radius, slop)
    if (contact) return contact
  }
  const boundary = nearestBoundary(body.x, body.y, points)
  const penetration = radius - boundary.distance
  return penetration > 0
    ? { nx: boundary.nx, ny: boundary.ny, penetration }
    : null
}

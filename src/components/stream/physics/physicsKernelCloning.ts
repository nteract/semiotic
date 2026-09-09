import type {
  PhysicsBodyShape,
  PhysicsColliderShape,
  PhysicsColliderBodyFilter,
  PhysicsKernelSnapshotBody,
  PhysicsKernelSnapshotCollider
} from "./PhysicsKernel"
import { cloneFixedPosition } from "./physicsFixedPosition"

export function cloneShape(shape: PhysicsBodyShape): PhysicsBodyShape {
  return shape.type === "circle"
    ? { type: "circle", radius: shape.radius }
    : { type: "aabb", width: shape.width, height: shape.height }
}

export function cloneColliderShape(
  shape: PhysicsColliderShape
): PhysicsColliderShape {
  return shape.type === "aabb"
    ? {
        type: "aabb",
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height
      }
    : {
        type: "segment",
        x1: shape.x1,
        y1: shape.y1,
        x2: shape.x2,
        y2: shape.y2,
        thickness: shape.thickness
      }
}

export function cloneBody(
  body: PhysicsKernelSnapshotBody
): PhysicsKernelSnapshotBody {
  return {
    id: body.id,
    x: body.x,
    y: body.y,
    prevX: body.prevX,
    prevY: body.prevY,
    vx: body.vx,
    vy: body.vy,
    angle: body.angle,
    mass: body.mass,
    bodyCollisions: body.bodyCollisions,
    ...(body.fixedPosition
      ? { fixedPosition: cloneFixedPosition(body.fixedPosition) }
      : {}),
    shape: cloneShape(body.shape),
    sleeping: body.sleeping,
    datum: body.datum,
    index: body.index,
    sleepTime: body.sleepTime,
    restitution: body.restitution,
    friction: body.friction
  }
}

export function cloneColliderBodyFilter(
  filter: PhysicsColliderBodyFilter | undefined
): PhysicsColliderBodyFilter | undefined {
  if (!filter || typeof filter === "function") return filter
  return {
    property: filter.property,
    equals: filter.equals,
    notEquals: filter.notEquals,
    oneOf: filter.oneOf?.slice(),
    notOneOf: filter.notOneOf?.slice()
  }
}

export function cloneCollider(
  collider: PhysicsKernelSnapshotCollider
): PhysicsKernelSnapshotCollider {
  return {
    id: collider.id,
    shape: cloneColliderShape(collider.shape),
    sensor: collider.sensor,
    restitution: collider.restitution,
    friction: collider.friction,
    bodyFilter: cloneColliderBodyFilter(collider.bodyFilter),
    index: collider.index
  }
}

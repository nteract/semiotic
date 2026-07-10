import { mulberry32 } from "../../recipes/random"

export type PhysicsBodyShape =
  | { type: "circle"; radius: number }
  | { type: "aabb"; width: number; height: number }

export type PhysicsColliderShape =
  | { type: "aabb"; x: number; y: number; width: number; height: number }
  | {
      type: "segment"
      x1: number
      y1: number
      x2: number
      y2: number
      thickness?: number
    }

export interface PhysicsKernelOptions {
  seed?: number
  gravity?: { x: number; y: number }
  fixedDt?: number
  cellSize?: number
  collisionIterations?: number
  velocityDamping?: number
  sleepSpeed?: number
  sleepAfter?: number
  restitution?: number
  friction?: number
  /** Speed cap (px/s) applied each substep to prevent tunneling through thin walls. */
  maxVelocity?: number
  /**
   * Contact impact speed (px/s) above which a resting/sleeping body is woken.
   * Higher than `sleepSpeed` so a settled pile is not churned by every arrival —
   * a sleeping body acts as a static anchor until something hits it hard enough.
   */
  contactWakeSpeed?: number
}

export interface PhysicsBodySpec {
  id: string
  x: number
  y: number
  vx?: number
  vy?: number
  angle?: number
  mass?: number
  restitution?: number
  friction?: number
  /**
   * Whether this body resolves dynamic body-to-body contacts. Static colliders
   * still apply. Useful for compound chart glyphs whose satellites should be
   * visual/tethered marks, not load-bearing rigid bodies.
   */
  bodyCollisions?: boolean
  shape: PhysicsBodyShape
  datum?: unknown
}

export interface PhysicsBodyState {
  id: string
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
  angle: number
  mass: number
  bodyCollisions?: boolean
  shape: PhysicsBodyShape
  sleeping: boolean
  datum?: unknown
}

export interface PhysicsColliderBodyFilterSpec {
  property: string
  equals?: unknown
  notEquals?: unknown
  oneOf?: unknown[]
  notOneOf?: unknown[]
}

export type PhysicsColliderBodyFilter =
  | PhysicsColliderBodyFilterSpec
  | ((body: PhysicsBodyState) => boolean)

export interface PhysicsColliderSpec {
  id: string
  shape: PhysicsColliderShape
  sensor?: boolean
  restitution?: number
  friction?: number
  /**
   * Optional body filter for permeable colliders. Bodies that do not match the
   * filter ignore this collider or sensor entirely. Object filters are worker
   * serializable; function filters require sync execution.
   */
  bodyFilter?: PhysicsColliderBodyFilter
}

export interface PhysicsSpringSpec {
  id?: string
  bodyId: string
  target:
    { type: "point"; x: number; y: number } | { type: "body"; bodyId: string }
  restLength?: number
  stiffness?: number
  damping?: number
}

export interface PhysicsKernelSnapshotBody extends PhysicsBodyState {
  bodyCollisions: boolean
  index: number
  sleepTime: number
  restitution?: number
  friction?: number
}

export interface PhysicsKernelSnapshotCollider extends PhysicsColliderSpec {
  index: number
}

export interface PhysicsKernelSnapshotSpring extends Required<
  Omit<PhysicsSpringSpec, "target">
> {
  target: PhysicsSpringSpec["target"]
}

export type PhysicsKernelEvent =
  | { type: "contact"; bodyId: string; otherId: string; sensor: false }
  | { type: "sensor-enter"; bodyId: string; sensorId: string }
  | { type: "sensor-exit"; bodyId: string; sensorId: string }
  | { type: "sleep"; bodyId: string }
  | { type: "wake"; bodyId: string }

export interface PhysicsActiveSensorPair {
  sensorId: string
  bodyId: string
}

type MutableBody = PhysicsKernelSnapshotBody

type MutableCollider = PhysicsKernelSnapshotCollider

type MutableSpring = PhysicsKernelSnapshotSpring

interface AabbBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface Collision {
  nx: number
  ny: number
  penetration: number
}

export interface PhysicsKernelSnapshot {
  options: Required<PhysicsKernelOptions>
  bodies: PhysicsKernelSnapshotBody[]
  colliders: PhysicsKernelSnapshotCollider[]
  springs: PhysicsKernelSnapshotSpring[]
  activeSensors: string[]
}

const DEFAULT_OPTIONS: Required<PhysicsKernelOptions> = {
  seed: 1,
  gravity: { x: 0, y: 980 },
  fixedDt: 1 / 120,
  cellSize: 64,
  collisionIterations: 6,
  velocityDamping: 0.995,
  sleepSpeed: 8,
  sleepAfter: 0.35,
  restitution: 0.1,
  friction: 0.35,
  maxVelocity: 1600,
  contactWakeSpeed: 200
}

const EPSILON = 1e-9

/**
 * Residual penetration (px) left after position correction. Kept tiny — resting
 * jitter is handled by sleeping bodies becoming static anchors, not by slop.
 */
const POSITION_SLOP = 0.005

function cloneShape(shape: PhysicsBodyShape): PhysicsBodyShape {
  return shape.type === "circle"
    ? { type: "circle", radius: shape.radius }
    : { type: "aabb", width: shape.width, height: shape.height }
}

function cloneColliderShape(shape: PhysicsColliderShape): PhysicsColliderShape {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function signOrOne(value: number): number {
  return value < 0 ? -1 : 1
}

function bodyBounds(body: MutableBody): AabbBounds {
  if (body.shape.type === "circle") {
    const r = body.shape.radius
    return {
      minX: body.x - r,
      minY: body.y - r,
      maxX: body.x + r,
      maxY: body.y + r
    }
  }
  const hw = body.shape.width / 2
  const hh = body.shape.height / 2
  return {
    minX: body.x - hw,
    minY: body.y - hh,
    maxX: body.x + hw,
    maxY: body.y + hh
  }
}

function colliderBounds(collider: MutableCollider): AabbBounds {
  const shape = collider.shape
  if (shape.type === "aabb") {
    const hw = shape.width / 2
    const hh = shape.height / 2
    return {
      minX: shape.x - hw,
      minY: shape.y - hh,
      maxX: shape.x + hw,
      maxY: shape.y + hh
    }
  }
  const half = (shape.thickness ?? 0) / 2
  return {
    minX: Math.min(shape.x1, shape.x2) - half,
    minY: Math.min(shape.y1, shape.y2) - half,
    maxX: Math.max(shape.x1, shape.x2) + half,
    maxY: Math.max(shape.y1, shape.y2) + half
  }
}

function aabbOverlap(a: AabbBounds, b: AabbBounds): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  )
}

function circleCircleCollision(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): Collision | null {
  const dx = bx - ax
  const dy = by - ay
  const minDistance = ar + br
  const distanceSquared = dx * dx + dy * dy
  if (distanceSquared >= minDistance * minDistance) return null
  if (distanceSquared <= EPSILON) {
    return { nx: 1, ny: 0, penetration: minDistance }
  }
  const distance = Math.sqrt(distanceSquared)
  return {
    nx: dx / distance,
    ny: dy / distance,
    penetration: minDistance - distance
  }
}

function aabbAabbCollision(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): Collision | null {
  const dx = bx - ax
  const px = (aw + bw) / 2 - Math.abs(dx)
  if (px <= 0) return null
  const dy = by - ay
  const py = (ah + bh) / 2 - Math.abs(dy)
  if (py <= 0) return null
  if (px < py) {
    return { nx: signOrOne(dx), ny: 0, penetration: px }
  }
  return { nx: 0, ny: signOrOne(dy), penetration: py }
}

function circleAabbCollision(
  cx: number,
  cy: number,
  radius: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): Collision | null {
  const halfWidth = bw / 2
  const halfHeight = bh / 2
  const closestX = clamp(cx, bx - halfWidth, bx + halfWidth)
  const closestY = clamp(cy, by - halfHeight, by + halfHeight)
  let dx = cx - closestX
  let dy = cy - closestY
  const distanceSquared = dx * dx + dy * dy

  if (distanceSquared > radius * radius) return null

  if (distanceSquared <= EPSILON) {
    const left = Math.abs(cx - (bx - halfWidth))
    const right = Math.abs(cx - (bx + halfWidth))
    const top = Math.abs(cy - (by - halfHeight))
    const bottom = Math.abs(cy - (by + halfHeight))
    const min = Math.min(left, right, top, bottom)
    if (min === left) {
      dx = -1
      dy = 0
      return { nx: dx, ny: dy, penetration: radius + left }
    }
    if (min === right) {
      dx = 1
      dy = 0
      return { nx: dx, ny: dy, penetration: radius + right }
    }
    if (min === top) {
      dx = 0
      dy = -1
      return { nx: dx, ny: dy, penetration: radius + top }
    }
    dx = 0
    dy = 1
    return { nx: dx, ny: dy, penetration: radius + bottom }
  }

  const distance = Math.sqrt(distanceSquared)
  return {
    nx: dx / distance,
    ny: dy / distance,
    penetration: radius - distance
  }
}

function circleSegmentCollision(
  cx: number,
  cy: number,
  radius: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness = 0
): Collision | null {
  const sx = x2 - x1
  const sy = y2 - y1
  const lengthSquared = sx * sx + sy * sy
  const t =
    lengthSquared <= EPSILON
      ? 0
      : clamp(((cx - x1) * sx + (cy - y1) * sy) / lengthSquared, 0, 1)
  const px = x1 + sx * t
  const py = y1 + sy * t
  const effectiveRadius = radius + thickness / 2
  const dx = cx - px
  const dy = cy - py
  const distanceSquared = dx * dx + dy * dy
  if (distanceSquared >= effectiveRadius * effectiveRadius) return null
  if (distanceSquared <= EPSILON) {
    const length = Math.sqrt(lengthSquared)
    if (length <= EPSILON) {
      return { nx: 1, ny: 0, penetration: effectiveRadius }
    }
    return {
      nx: -sy / length,
      ny: sx / length,
      penetration: effectiveRadius
    }
  }
  const distance = Math.sqrt(distanceSquared)
  return {
    nx: dx / distance,
    ny: dy / distance,
    penetration: effectiveRadius - distance
  }
}

function bodyBodyCollision(a: MutableBody, b: MutableBody): Collision | null {
  if (a.shape.type === "circle" && b.shape.type === "circle") {
    return circleCircleCollision(
      a.x,
      a.y,
      a.shape.radius,
      b.x,
      b.y,
      b.shape.radius
    )
  }
  if (a.shape.type === "aabb" && b.shape.type === "aabb") {
    return aabbAabbCollision(
      a.x,
      a.y,
      a.shape.width,
      a.shape.height,
      b.x,
      b.y,
      b.shape.width,
      b.shape.height
    )
  }
  if (a.shape.type === "circle" && b.shape.type === "aabb") {
    const collision = circleAabbCollision(
      a.x,
      a.y,
      a.shape.radius,
      b.x,
      b.y,
      b.shape.width,
      b.shape.height
    )
    return collision
      ? {
          nx: -collision.nx,
          ny: -collision.ny,
          penetration: collision.penetration
        }
      : null
  }
  if (a.shape.type === "aabb" && b.shape.type === "circle") {
    return circleAabbCollision(
      b.x,
      b.y,
      b.shape.radius,
      a.x,
      a.y,
      a.shape.width,
      a.shape.height
    )
  }
  return null
}

function bodyColliderCollision(
  body: MutableBody,
  collider: MutableCollider
): Collision | null {
  const shape = collider.shape
  if (shape.type === "aabb") {
    if (body.shape.type === "circle") {
      return circleAabbCollision(
        body.x,
        body.y,
        body.shape.radius,
        shape.x,
        shape.y,
        shape.width,
        shape.height
      )
    }
    const collision = aabbAabbCollision(
      shape.x,
      shape.y,
      shape.width,
      shape.height,
      body.x,
      body.y,
      body.shape.width,
      body.shape.height
    )
    return collision
  }

  const radius =
    body.shape.type === "circle"
      ? body.shape.radius
      : Math.sqrt(
          body.shape.width * body.shape.width +
            body.shape.height * body.shape.height
        ) / 2
  return circleSegmentCollision(
    body.x,
    body.y,
    radius,
    shape.x1,
    shape.y1,
    shape.x2,
    shape.y2,
    shape.thickness ?? 0
  )
}

function sensorKey(sensorId: string, bodyId: string): string {
  return `${sensorId}\u0000${bodyId}`
}

function parseSensorKey(key: string): { sensorId: string; bodyId: string } {
  const index = key.indexOf("\u0000")
  return {
    sensorId: key.slice(0, index),
    bodyId: key.slice(index + 1)
  }
}

function cloneBody(body: MutableBody): MutableBody {
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
    shape: cloneShape(body.shape),
    sleeping: body.sleeping,
    datum: body.datum,
    index: body.index,
    sleepTime: body.sleepTime,
    restitution: body.restitution,
    friction: body.friction
  }
}

function cloneColliderBodyFilter(
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

function cloneCollider(collider: MutableCollider): MutableCollider {
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

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function valueIn(value: unknown, options: unknown[] | undefined): boolean {
  return Boolean(options?.some((candidate) => Object.is(value, candidate)))
}

function colliderAppliesToBody(
  collider: MutableCollider,
  body: MutableBody
): boolean {
  const filter = collider.bodyFilter
  if (!filter) return true
  if (typeof filter === "function") return filter(body)

  const value = valueAtPath(body, filter.property)
  if ("equals" in filter && !Object.is(value, filter.equals)) return false
  if ("notEquals" in filter && Object.is(value, filter.notEquals)) return false
  if (filter.oneOf && !valueIn(value, filter.oneOf)) return false
  if (filter.notOneOf && valueIn(value, filter.notOneOf)) return false
  return true
}

export class PhysicsKernelWorld {
  readonly capabilities = {
    determinism: "strict" as const,
    sensors: true,
    joints: false,
    ccd: false,
    maxBodiesHint: 5000,
    worker: false
  }

  private options: Required<PhysicsKernelOptions>
  private bodies = new Map<string, MutableBody>()
  private colliders = new Map<string, MutableCollider>()
  private springs = new Map<string, MutableSpring>()
  private activeSensors = new Set<string>()
  // Bodies that had a resting contact with a static collider or a sleeping body
  // this step. Only supported bodies may sleep, so nothing anchors mid-air.
  private supportedThisStep = new Set<string>()
  private lastEvents: PhysicsKernelEvent[] = []
  private nextBodyIndex = 0
  private nextColliderIndex = 0
  private nextSpringIndex = 0
  private random: () => number

  constructor(options: PhysicsKernelOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.random = mulberry32(this.options.seed)
  }

  init(options: PhysicsKernelOptions = {}): void {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.random = mulberry32(this.options.seed)
    this.bodies.clear()
    this.colliders.clear()
    this.springs.clear()
    this.activeSensors.clear()
    this.lastEvents = []
    this.nextBodyIndex = 0
    this.nextColliderIndex = 0
    this.nextSpringIndex = 0
  }

  spawn(spec: PhysicsBodySpec): void {
    const body: MutableBody = {
      id: spec.id,
      x: spec.x,
      y: spec.y,
      prevX: spec.x,
      prevY: spec.y,
      vx: spec.vx ?? 0,
      vy: spec.vy ?? 0,
      angle: spec.angle ?? 0,
      mass: Math.max(EPSILON, spec.mass ?? 1),
      bodyCollisions: spec.bodyCollisions ?? true,
      shape: cloneShape(spec.shape),
      sleeping: false,
      datum: spec.datum,
      restitution: spec.restitution,
      friction: spec.friction,
      index: this.nextBodyIndex,
      sleepTime: 0
    }
    this.nextBodyIndex += 1
    this.bodies.set(spec.id, body)
  }

  remove(ids: string[]): void {
    for (const id of ids) {
      this.bodies.delete(id)
      for (const key of Array.from(this.activeSensors)) {
        if (parseSensorKey(key).bodyId === id) this.activeSensors.delete(key)
      }
    }
  }

  setColliders(colliders: PhysicsColliderSpec[]): void {
    this.colliders.clear()
    this.activeSensors.clear()
    this.nextColliderIndex = 0
    for (const collider of colliders) {
      this.colliders.set(collider.id, {
        ...collider,
        shape: cloneColliderShape(collider.shape),
        bodyFilter: cloneColliderBodyFilter(collider.bodyFilter),
        index: this.nextColliderIndex
      })
      this.nextColliderIndex += 1
    }
  }

  setConstraint(spec: PhysicsSpringSpec): string {
    const id = spec.id ?? `spring-${this.nextSpringIndex}`
    this.springs.set(id, {
      id,
      bodyId: spec.bodyId,
      target: spec.target,
      restLength: spec.restLength ?? 0,
      stiffness: spec.stiffness ?? 40,
      damping: spec.damping ?? 3
    })
    this.nextSpringIndex += 1
    return id
  }

  removeConstraint(id: string): void {
    this.springs.delete(id)
  }

  applyImpulse(id: string, ix: number, iy: number): void {
    const body = this.bodies.get(id)
    if (!body) return
    body.vx += ix / body.mass
    body.vy += iy / body.mass
    this.wake(body)
  }

  step(dtSeconds = this.options.fixedDt): void {
    const dt = Math.max(0, dtSeconds)
    this.lastEvents = []
    if (dt === 0) return

    const bodies = this.sortedBodies()
    for (const body of bodies) {
      body.prevX = body.x
      body.prevY = body.y
    }

    this.applySprings(dt)

    const maxVelocity = this.options.maxVelocity
    for (const body of bodies) {
      if (body.sleeping) continue
      body.vx += this.options.gravity.x * dt
      body.vy += this.options.gravity.y * dt
      body.vx *= this.options.velocityDamping
      body.vy *= this.options.velocityDamping
      if (maxVelocity > 0) {
        const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy)
        if (speed > maxVelocity) {
          const scale = maxVelocity / speed
          body.vx *= scale
          body.vy *= scale
        }
      }
      body.x += body.vx * dt
      body.y += body.vy * dt
    }

    this.supportedThisStep.clear()

    // Broadphase pairs and solid colliders are computed once per step and reused
    // across relaxation iterations — narrowphase re-tests exact overlap each pass.
    const pairKeys = this.bodyPairKeys(bodies)
    const solidColliders = this.sortedColliders().filter(
      (collider) => !collider.sensor
    )
    for (let i = 0; i < this.options.collisionIterations; i += 1) {
      this.resolveBodyPairs(bodies, pairKeys, i === 0)
      this.resolveColliders(bodies, solidColliders, i === 0)
    }

    this.updateSensors(bodies)
    this.updateSleeping(bodies, dt)
  }

  settle(maxSteps = 1200, dtSeconds = this.options.fixedDt): number {
    let steps = 0
    while (steps < maxSteps && !this.allSleeping()) {
      this.step(dtSeconds)
      steps += 1
    }
    return steps
  }

  readState(out: PhysicsBodyState[] = []): PhysicsBodyState[] {
    out.length = 0
    for (const body of this.sortedBodies()) {
      out.push({
        id: body.id,
        x: body.x,
        y: body.y,
        prevX: body.prevX,
        prevY: body.prevY,
        vx: body.vx,
        vy: body.vy,
        angle: body.angle,
        mass: body.mass,
        shape: cloneShape(body.shape),
        sleeping: body.sleeping,
        datum: body.datum
      })
    }
    return out
  }

  events(): PhysicsKernelEvent[] {
    return this.lastEvents.slice()
  }

  activeSensorPairs(): PhysicsActiveSensorPair[] {
    return Array.from(this.activeSensors).sort().map(parseSensorKey)
  }

  allSleeping(): boolean {
    for (const body of this.bodies.values()) {
      if (!body.sleeping) return false
    }
    return true
  }

  snapshot(): PhysicsKernelSnapshot {
    return {
      options: {
        ...this.options,
        gravity: { ...this.options.gravity }
      },
      bodies: this.sortedBodies().map(cloneBody),
      colliders: this.sortedColliders().map(cloneCollider),
      springs: Array.from(this.springs.values()).map((spring) => ({
        ...spring,
        target: { ...spring.target }
      })),
      activeSensors: Array.from(this.activeSensors).sort()
    }
  }

  restore(snapshot: PhysicsKernelSnapshot): void {
    this.options = {
      ...snapshot.options,
      gravity: { ...snapshot.options.gravity }
    }
    this.random = mulberry32(this.options.seed)
    this.bodies.clear()
    this.colliders.clear()
    this.springs.clear()
    this.activeSensors = new Set(snapshot.activeSensors)
    this.lastEvents = []

    this.nextBodyIndex = 0
    for (const body of snapshot.bodies) {
      const cloned = cloneBody(body)
      this.bodies.set(cloned.id, cloned)
      this.nextBodyIndex = Math.max(this.nextBodyIndex, cloned.index + 1)
    }

    this.nextColliderIndex = 0
    for (const collider of snapshot.colliders) {
      const cloned = cloneCollider(collider)
      this.colliders.set(cloned.id, cloned)
      this.nextColliderIndex = Math.max(
        this.nextColliderIndex,
        cloned.index + 1
      )
    }

    this.nextSpringIndex = 0
    for (const spring of snapshot.springs) {
      this.springs.set(spring.id, {
        ...spring,
        target: { ...spring.target }
      })
      const match = /^spring-(\d+)$/.exec(spring.id)
      if (match) {
        this.nextSpringIndex = Math.max(
          this.nextSpringIndex,
          Number(match[1]) + 1
        )
      }
    }
  }

  dispose(): void {
    this.bodies.clear()
    this.colliders.clear()
    this.springs.clear()
    this.activeSensors.clear()
    this.lastEvents = []
  }

  private sortedBodies(): MutableBody[] {
    return Array.from(this.bodies.values()).sort((a, b) => a.index - b.index)
  }

  private sortedColliders(): MutableCollider[] {
    return Array.from(this.colliders.values()).sort((a, b) => a.index - b.index)
  }

  private applySprings(dt: number): void {
    for (const spring of Array.from(this.springs.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      const body = this.bodies.get(spring.bodyId)
      if (!body || body.sleeping) continue
      const target =
        spring.target.type === "point"
          ? spring.target
          : this.bodies.get(spring.target.bodyId)
      if (!target) continue

      const dx = target.x - body.x
      const dy = target.y - body.y
      const distanceSquared = dx * dx + dy * dy
      const distance = Math.sqrt(distanceSquared)
      if (distance <= EPSILON) continue
      const nx = dx / distance
      const ny = dy / distance
      const targetVx = "vx" in target ? target.vx : 0
      const targetVy = "vy" in target ? target.vy : 0
      const relativeVelocity =
        (targetVx - body.vx) * nx + (targetVy - body.vy) * ny
      const force =
        (distance - spring.restLength) * spring.stiffness +
        relativeVelocity * spring.damping
      body.vx += (force * nx * dt) / body.mass
      body.vy += (force * ny * dt) / body.mass
    }
  }

  private resolveBodyPairs(
    bodies: MutableBody[],
    pairKeys: string[],
    emitEvents: boolean
  ): void {
    for (const key of pairKeys) {
      const [aIndex, bIndex] = key.split(":").map(Number)
      const a = bodies[aIndex]
      const b = bodies[bIndex]
      if (!a || !b) continue
      const collision = bodyBodyCollision(a, b)
      if (!collision) continue
      this.resolveDynamicCollision(a, b, collision)
      if (emitEvents) {
        this.lastEvents.push({
          type: "contact",
          bodyId: a.id,
          otherId: b.id,
          sensor: false
        })
      }
    }
  }

  private bodyPairKeys(bodies: MutableBody[]): string[] {
    const cellSize = Math.max(1, this.options.cellSize)
    const cells = new Map<string, number[]>()
    for (let i = 0; i < bodies.length; i += 1) {
      if (!bodies[i].bodyCollisions) continue
      const bounds = bodyBounds(bodies[i])
      const minX = Math.floor(bounds.minX / cellSize)
      const maxX = Math.floor(bounds.maxX / cellSize)
      const minY = Math.floor(bounds.minY / cellSize)
      const maxY = Math.floor(bounds.maxY / cellSize)
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const key = `${x}:${y}`
          const cell = cells.get(key)
          if (cell) cell.push(i)
          else cells.set(key, [i])
        }
      }
    }

    const pairSet = new Set<string>()
    for (const key of Array.from(cells.keys()).sort()) {
      const indexes = cells.get(key) ?? []
      indexes.sort((a, b) => a - b)
      for (let i = 0; i < indexes.length; i += 1) {
        for (let j = i + 1; j < indexes.length; j += 1) {
          const a = indexes[i]
          const b = indexes[j]
          if (!bodies[a].bodyCollisions || !bodies[b].bodyCollisions) continue
          if (aabbOverlap(bodyBounds(bodies[a]), bodyBounds(bodies[b]))) {
            pairSet.add(`${a}:${b}`)
          }
        }
      }
    }
    return Array.from(pairSet).sort((a, b) => {
      const [a0, a1] = a.split(":").map(Number)
      const [b0, b1] = b.split(":").map(Number)
      return a0 === b0 ? a1 - b1 : a0 - b0
    })
  }

  private resolveDynamicCollision(
    a: MutableBody,
    b: MutableBody,
    collision: Collision
  ): void {
    // A sleeping body is a static anchor: zero inverse mass so it is neither
    // shoved out of position nor spread sideways by arrivals landing on it.
    // This is what lets piles grow and hold their shape instead of churning flat.
    // Contact with an anchored neighbor also confers support (marked before the
    // both-sleeping early return so a settled stack stays asleep).
    if (a.sleeping) this.supportedThisStep.add(b.id)
    if (b.sleeping) this.supportedThisStep.add(a.id)
    const invA = a.sleeping ? 0 : 1 / a.mass
    const invB = b.sleeping ? 0 : 1 / b.mass
    const invTotal = invA + invB
    if (invTotal <= EPSILON) return

    const correction =
      Math.max(0, collision.penetration - POSITION_SLOP) / invTotal
    a.x -= collision.nx * correction * invA
    a.y -= collision.ny * correction * invA
    b.x += collision.nx * correction * invB
    b.y += collision.ny * correction * invB

    const rvx = b.vx - a.vx
    const rvy = b.vy - a.vy
    const velocityAlongNormal = rvx * collision.nx + rvy * collision.ny
    if (velocityAlongNormal > 0) return
    const impactSpeed = Math.abs(velocityAlongNormal)

    const restitution = Math.min(
      a.restitution ?? this.options.restitution,
      b.restitution ?? this.options.restitution
    )
    const impulse = (-(1 + restitution) * velocityAlongNormal) / invTotal
    const ix = impulse * collision.nx
    const iy = impulse * collision.ny
    a.vx -= ix * invA
    a.vy -= iy * invA
    b.vx += ix * invB
    b.vy += iy * invB
    this.applyFriction(a, b, collision, impulse, invA, invB)
    if (impactSpeed > this.options.contactWakeSpeed) {
      this.wake(a)
      this.wake(b)
    }
  }

  private applyFriction(
    a: MutableBody,
    b: MutableBody,
    collision: Collision,
    normalImpulse: number,
    invA: number,
    invB: number
  ): void {
    const tx = -collision.ny
    const ty = collision.nx
    const rvx = b.vx - a.vx
    const rvy = b.vy - a.vy
    const tangentVelocity = rvx * tx + rvy * ty
    const invTotal = invA + invB
    if (Math.abs(tangentVelocity) <= EPSILON || invTotal <= EPSILON) return
    const friction = Math.max(
      0,
      Math.min(
        1,
        Math.max(
          a.friction ?? this.options.friction,
          b.friction ?? this.options.friction
        )
      )
    )
    const frictionImpulse = clamp(
      -tangentVelocity / invTotal,
      -normalImpulse * friction,
      normalImpulse * friction
    )
    const ix = frictionImpulse * tx
    const iy = frictionImpulse * ty
    a.vx -= ix * invA
    a.vy -= iy * invA
    b.vx += ix * invB
    b.vy += iy * invB
  }

  private resolveColliders(
    bodies: MutableBody[],
    colliders: MutableCollider[],
    emitEvents: boolean
  ): void {
    for (const body of bodies) {
      for (const collider of colliders) {
        if (!colliderAppliesToBody(collider, body)) continue
        if (!aabbOverlap(bodyBounds(body), colliderBounds(collider))) continue
        const collision = bodyColliderCollision(body, collider)
        if (!collision) continue
        this.resolveStaticCollision(body, collider, collision)
        this.supportedThisStep.add(body.id)
        if (emitEvents) {
          this.lastEvents.push({
            type: "contact",
            bodyId: body.id,
            otherId: collider.id,
            sensor: false
          })
        }
      }
    }
  }

  private resolveStaticCollision(
    body: MutableBody,
    collider: MutableCollider,
    collision: Collision
  ): void {
    body.x += collision.nx * Math.max(0, collision.penetration - POSITION_SLOP)
    body.y += collision.ny * Math.max(0, collision.penetration - POSITION_SLOP)

    const velocityAlongNormal = body.vx * collision.nx + body.vy * collision.ny
    if (velocityAlongNormal < 0) {
      const restitution = Math.min(
        body.restitution ?? this.options.restitution,
        collider.restitution ?? this.options.restitution
      )
      body.vx -= (1 + restitution) * velocityAlongNormal * collision.nx
      body.vy -= (1 + restitution) * velocityAlongNormal * collision.ny

      const tx = -collision.ny
      const ty = collision.nx
      const tangentVelocity = body.vx * tx + body.vy * ty
      const friction = Math.max(
        0,
        Math.min(
          1,
          Math.max(
            body.friction ?? this.options.friction,
            collider.friction ?? this.options.friction
          )
        )
      )
      body.vx -= tangentVelocity * tx * friction
      body.vy -= tangentVelocity * ty * friction
    }
  }

  private updateSensors(bodies: MutableBody[]): void {
    const current = new Set<string>()
    const sensors = this.sortedColliders().filter((collider) => collider.sensor)
    for (const body of bodies) {
      const bounds = bodyBounds(body)
      for (const sensor of sensors) {
        if (!colliderAppliesToBody(sensor, body)) continue
        if (!aabbOverlap(bounds, colliderBounds(sensor))) continue
        if (!bodyColliderCollision(body, sensor)) continue
        const key = sensorKey(sensor.id, body.id)
        current.add(key)
        if (!this.activeSensors.has(key)) {
          this.lastEvents.push({
            type: "sensor-enter",
            bodyId: body.id,
            sensorId: sensor.id
          })
        }
      }
    }
    for (const key of Array.from(this.activeSensors).sort()) {
      if (current.has(key)) continue
      const { sensorId, bodyId } = parseSensorKey(key)
      this.lastEvents.push({ type: "sensor-exit", bodyId, sensorId })
    }
    this.activeSensors = current
  }

  private updateSleeping(bodies: MutableBody[], dt: number): void {
    // Support is only required to sleep when gravity would otherwise accelerate
    // an unsupported body. In a gravity-free world a slow body is genuinely at
    // rest (springs/collisions aside) and may sleep on its own.
    const gravityMagnitude = Math.hypot(
      this.options.gravity.x,
      this.options.gravity.y
    )
    const requireSupport = gravityMagnitude > 1
    for (const body of bodies) {
      const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy)
      const moved = Math.sqrt(
        (body.x - body.prevX) * (body.x - body.prevX) +
          (body.y - body.prevY) * (body.y - body.prevY)
      )
      const slow =
        speed < this.options.sleepSpeed &&
        moved < this.options.sleepSpeed * dt
      // Under gravity a body may only sleep while supported by the ground or an
      // anchored neighbor — a body merely held still by a falling crowd keeps
      // ticking so it can never freeze in mid-air once the crowd clears.
      if (slow && (!requireSupport || this.supportedThisStep.has(body.id))) {
        body.sleepTime += dt
        if (!body.sleeping && body.sleepTime >= this.options.sleepAfter) {
          body.sleeping = true
          body.vx = 0
          body.vy = 0
          this.lastEvents.push({ type: "sleep", bodyId: body.id })
        }
      } else if (body.sleeping) {
        this.wake(body)
      } else {
        body.sleepTime = 0
      }
    }
  }

  private wake(body: MutableBody): void {
    if (body.sleeping) {
      this.lastEvents.push({ type: "wake", bodyId: body.id })
    }
    body.sleeping = false
    body.sleepTime = 0
  }

  /** Uses the deterministic PRNG for future jittered spawn helpers. */
  nextRandom(): number {
    return this.random()
  }
}

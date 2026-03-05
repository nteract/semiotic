import type { Particle, RealtimeEdge, BezierCache, BezierPoint } from "./networkTypes"

/**
 * Object-pool particle manager for high-performance canvas rendering.
 *
 * Pre-allocates a fixed-size array to avoid GC pressure.
 * Particles travel along bezier paths within link bands.
 */
export class ParticlePool {
  particles: Particle[]
  private capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.particles = new Array(capacity)
    for (let i = 0; i < capacity; i++) {
      this.particles[i] = {
        t: 0,
        offset: 0,
        edgeIndex: 0,
        active: false,
        x: 0,
        y: 0
      }
    }
  }

  /**
   * Spawn a new particle on the given edge.
   * Returns the particle if a free slot was found, null otherwise.
   */
  spawn(edgeIndex: number): Particle | null {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i]
      if (!p.active) {
        p.active = true
        p.t = 0
        p.offset = Math.random() - 0.5 // [-0.5, 0.5]
        p.edgeIndex = edgeIndex
        p.x = 0
        p.y = 0
        return p
      }
    }
    return null // Pool exhausted
  }

  /**
   * Advance all active particles by deltaTime.
   * Recycles particles that have completed their journey (t >= 1).
   * @param edgeSpeedMultipliers - optional per-edge speed scaling (for proportional flow rate)
   */
  step(deltaTime: number, speed: number, edges: RealtimeEdge[], edgeSpeedMultipliers?: number[]): void {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      const edge = edges[p.edgeIndex]
      if (!edge || !edge.bezier) {
        p.active = false
        continue
      }

      // Advance t — speed is normalized so 1.0 = traverse full path in 1 second
      const edgeSpeed = edgeSpeedMultipliers ? (edgeSpeedMultipliers[p.edgeIndex] ?? 1) : 1
      p.t += deltaTime * speed * edgeSpeed

      if (p.t >= 1) {
        p.active = false
        continue
      }

      // Evaluate position along the bezier path
      const pos = evaluateBezier(edge.bezier, p.t, p.offset)
      p.x = pos.x
      p.y = pos.y
    }
  }

  /** Count active particles for a specific edge index */
  countForEdge(edgeIndex: number): number {
    let count = 0
    for (let i = 0; i < this.capacity; i++) {
      if (this.particles[i].active && this.particles[i].edgeIndex === edgeIndex) {
        count++
      }
    }
    return count
  }

  /** Deactivate all particles */
  clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.particles[i].active = false
    }
  }

  /** Resize the pool (creates a new array) */
  resize(newCapacity: number): void {
    if (newCapacity <= this.capacity) return
    const oldParticles = this.particles
    this.particles = new Array(newCapacity)
    for (let i = 0; i < newCapacity; i++) {
      if (i < oldParticles.length) {
        this.particles[i] = oldParticles[i]
      } else {
        this.particles[i] = {
          t: 0,
          offset: 0,
          edgeIndex: 0,
          active: false,
          x: 0,
          y: 0
        }
      }
    }
    this.capacity = newCapacity
  }
}

/**
 * Evaluate a point along a bezier path at parameter t with perpendicular offset.
 *
 * Uses the chord direction (P0→P3) for perpendicular offset instead of the
 * local tangent. This gives a stable perpendicular across the entire curve,
 * eliminating the pivot/rotation artifact visible on short curves.
 */
function evaluateBezier(
  cache: BezierCache,
  t: number,
  offset: number
): BezierPoint {
  if (cache.circular && cache.segments) {
    return evaluateMultiSegment(cache.segments, t, offset, cache.halfWidth)
  }

  if (!cache.points) return { x: 0, y: 0 }

  const [p0, p1, p2, p3] = cache.points
  const pos = cubicBezier(p0, p1, p2, p3, t)

  // Use chord direction (P0→P3) for stable perpendicular offset
  const dx = p3.x - p0.x
  const dy = p3.y - p0.y
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len > 0.001) {
    // Perpendicular to the chord (rotated 90 degrees)
    const nx = -dy / len
    const ny = dx / len
    pos.x += nx * offset * cache.halfWidth * 2
    pos.y += ny * offset * cache.halfWidth * 2
  }

  return pos
}

/**
 * Evaluate position along a multi-segment bezier path.
 * Maps global t [0,1] to the appropriate segment.
 * Uses segment chord direction for stable perpendicular offset.
 */
function evaluateMultiSegment(
  segments: Array<[BezierPoint, BezierPoint, BezierPoint, BezierPoint]>,
  t: number,
  offset: number,
  halfWidth: number
): BezierPoint {
  const n = segments.length
  const globalT = t * n
  const segIndex = Math.min(Math.floor(globalT), n - 1)
  const localT = globalT - segIndex

  const [p0, p1, p2, p3] = segments[segIndex]
  const pos = cubicBezier(p0, p1, p2, p3, localT)

  // Use segment chord direction for stable perpendicular
  const dx = p3.x - p0.x
  const dy = p3.y - p0.y
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len > 0.001) {
    const nx = -dy / len
    const ny = dx / len
    pos.x += nx * offset * halfWidth * 2
    pos.y += ny * offset * halfWidth * 2
  }

  return pos
}

/** Cubic bezier evaluation: B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3*P3 */
function cubicBezier(
  p0: BezierPoint,
  p1: BezierPoint,
  p2: BezierPoint,
  p3: BezierPoint,
  t: number
): BezierPoint {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  }
}


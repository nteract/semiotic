/**
 * GeoParticlePool — particle system for geo line paths.
 *
 * Unlike the network ParticlePool (which uses bezier curves), this
 * travels particles along polyline paths (arrays of screen-space points).
 * Used by StreamGeoFrame to animate flow lines on maps.
 */

export interface GeoParticle {
  /** Progress along the polyline [0, 1] */
  t: number
  /** Perpendicular offset from path centerline [-0.5, 0.5] */
  offset: number
  /** Which line index this particle travels */
  lineIndex: number
  active: boolean
  x: number
  y: number
}

export interface GeoParticleStyle {
  /** Particle radius @default 2 */
  radius?: number
  /** Particle color: a CSS color string, "source" to inherit from line stroke, or a function `(datum) => string` */
  color?: string | ((datum: any) => string)
  /** Particle opacity @default 0.7 */
  opacity?: number
  /** Speed multiplier @default 1 */
  speedMultiplier?: number
  /** Max particles per line @default 30 */
  maxPerLine?: number
  /** Spawn rate (probability per frame per line) @default 0.15 */
  spawnRate?: number
}

export class GeoParticlePool {
  particles: GeoParticle[]
  private capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.particles = new Array(capacity)
    for (let i = 0; i < capacity; i++) {
      this.particles[i] = {
        t: 0,
        offset: 0,
        lineIndex: 0,
        active: false,
        x: 0,
        y: 0
      }
    }
  }

  spawn(lineIndex: number): GeoParticle | null {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i]
      if (!p.active) {
        p.active = true
        p.t = 0
        p.offset = (Math.random() - 0.5) * 0.6
        p.lineIndex = lineIndex
        p.x = 0
        p.y = 0
        return p
      }
    }
    return null
  }

  /**
   * Advance all active particles.
   * @param paths - array of polyline paths, one per line index
   * @param lineWidths - strokeWidth per line (for perpendicular offset scaling)
   */
  step(
    deltaTime: number,
    speed: number,
    paths: [number, number][][],
    lineWidths: number[]
  ): void {
    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      const path = paths[p.lineIndex]
      if (!path || path.length < 2) {
        p.active = false
        continue
      }

      p.t += deltaTime * speed

      if (p.t >= 1) {
        p.active = false
        continue
      }

      // Evaluate position along polyline
      const totalLen = polylineLength(path)
      const targetDist = p.t * totalLen
      const pos = evaluatePolyline(path, targetDist)
      const halfWidth = (lineWidths[p.lineIndex] || 2) / 2

      p.x = pos.x + pos.nx * p.offset * halfWidth * 2
      p.y = pos.y + pos.ny * p.offset * halfWidth * 2
    }
  }

  countForLine(lineIndex: number): number {
    let count = 0
    for (let i = 0; i < this.capacity; i++) {
      if (this.particles[i].active && this.particles[i].lineIndex === lineIndex) {
        count++
      }
    }
    return count
  }

  clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.particles[i].active = false
    }
  }
}

// ── Polyline helpers ──────────────────────────────────────────────────

interface PolylinePoint {
  x: number
  y: number
  /** Perpendicular unit normal x */
  nx: number
  /** Perpendicular unit normal y */
  ny: number
}

function polylineLength(path: [number, number][]): number {
  let len = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0]
    const dy = path[i][1] - path[i - 1][1]
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

function evaluatePolyline(path: [number, number][], dist: number): PolylinePoint {
  let accumulated = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0]
    const dy = path[i][1] - path[i - 1][1]
    const segLen = Math.sqrt(dx * dx + dy * dy)

    if (accumulated + segLen >= dist || i === path.length - 1) {
      const segT = segLen > 0 ? (dist - accumulated) / segLen : 0
      const x = path[i - 1][0] + dx * segT
      const y = path[i - 1][1] + dy * segT
      // Perpendicular normal (rotated 90° from segment direction)
      const len = segLen > 0.001 ? segLen : 1
      const nx = -dy / len
      const ny = dx / len
      return { x, y, nx, ny }
    }
    accumulated += segLen
  }

  // Fallback: last point
  const last = path[path.length - 1]
  return { x: last[0], y: last[1], nx: 0, ny: 0 }
}

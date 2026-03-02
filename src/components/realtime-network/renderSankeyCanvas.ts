import type { ParticlePool } from "./ParticlePool"
import type { RealtimeEdge, ParticleStyle } from "./types"
import { DEFAULT_PARTICLE_STYLE } from "./types"

/**
 * Canvas particle renderer — called each rAF frame.
 *
 * Iterates the particle pool and draws circles at each active particle's
 * computed position. This is the hot path, so it avoids allocations.
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  pool: ParticlePool,
  edges: RealtimeEdge[],
  style: ParticleStyle,
  edgeColorFn: (edge: RealtimeEdge) => string
): void {
  const radius = style.radius ?? DEFAULT_PARTICLE_STYLE.radius
  const opacity = style.opacity ?? DEFAULT_PARTICLE_STYLE.opacity

  ctx.globalAlpha = opacity

  for (let i = 0; i < pool.particles.length; i++) {
    const p = pool.particles[i]
    if (!p.active) continue

    const edge = edges[p.edgeIndex]
    if (!edge) continue

    // Resolve color
    if (typeof style.color === "function") {
      const sourceNode = typeof edge.source === "object" ? edge.source : null
      ctx.fillStyle = sourceNode ? style.color(edge, sourceNode) : "#666"
    } else if (style.color && style.color !== "inherit") {
      ctx.fillStyle = style.color
    } else {
      ctx.fillStyle = edgeColorFn(edge)
    }

    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

/**
 * Spawn particles for all edges proportional to their value.
 */
export function spawnParticles(
  pool: ParticlePool,
  edges: RealtimeEdge[],
  deltaTime: number,
  style: ParticleStyle
): void {
  const spawnRate = style.spawnRate ?? DEFAULT_PARTICLE_STYLE.spawnRate
  const maxPerEdge = style.maxPerEdge ?? DEFAULT_PARTICLE_STYLE.maxPerEdge

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    if (!edge.bezier) continue

    const currentCount = pool.countForEdge(i)
    if (currentCount >= maxPerEdge) continue

    // Rate proportional to edge value
    const rate = edge.value * spawnRate * deltaTime
    // Use fractional probability for sub-1 rates
    const whole = Math.floor(rate)
    const frac = rate - whole

    let toSpawn = whole
    if (Math.random() < frac) toSpawn++

    for (let j = 0; j < toSpawn; j++) {
      if (pool.countForEdge(i) >= maxPerEdge) break
      pool.spawn(i)
    }
  }
}

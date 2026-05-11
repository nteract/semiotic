import type { ParticlePool } from "../ParticlePool"
import type { RealtimeEdge, ParticleStyle } from "../networkTypes"
import { DEFAULT_PARTICLE_STYLE } from "../networkTypes"

/**
 * Canvas particle renderer for sankey — ported directly from realtime-network.
 * Called each rAF frame.
 */
export function renderNetworkParticles(
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

    // Resolve color.
    //
    // Functional `style.color` is resolved upstream in `getParticleColor`
    // (the supplied `edgeColorFn`) — it has access to the node map and
    // can hand the user-supplied function a real node even when
    // `edge.source` is a string id (the case for `customNetworkLayout`
    // charts like ProcessSankey). Previously this renderer tried to
    // invoke `style.color` directly and only succeeded when
    // `edge.source` happened to already be an object reference, which
    // silently dropped the user's color function for any custom layout.
    if (typeof style.color === "string" && style.color !== "inherit") {
      ctx.fillStyle = style.color
    } else {
      // Covers undefined, "inherit", and function — `edgeColorFn`
      // handles each variant correctly.
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
export function spawnNetworkParticles(
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

    // Reduce spawn rate on circular edges — they're visual indicators, not highways
    const circularDampen = edge.bezier.circular ? 0.3 : 1
    const rate = edge.value * spawnRate * deltaTime * circularDampen
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

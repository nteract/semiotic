/**
 * Seeded, deterministic force layout for custom network charts.
 *
 * `ForceDirectedGraph` runs a force simulation internally, but `NetworkCustomChart`
 * expects pre-computed positions — and there was no reproducible positioner to
 * feed it. This is a compact spring/repulsion/gravity sim with a seeded PRNG, so
 * the same graph + seed always produces the same layout (change the seed to get a
 * different one — useful for "re-run the layout" interactions). Positions are
 * returned normalized to [0, 1], so you map them into the plot yourself.
 *
 * Pure and dependency-free.
 */

import type { GraphNode, GraphEdge, Point } from "./networkAnalysis"

/** Deterministic PRNG (mulberry32). Returns a function yielding [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ForceLayoutOptions {
  /** PRNG seed — same seed ⇒ same layout. @default 1 */
  seed?: number
  /** Simulation iterations. @default 260 */
  iterations?: number
  /** Repulsion strength between every pair of nodes. @default 5200 */
  repulsion?: number
  /** Target edge length in the virtual (pre-normalization) space. @default 165 */
  linkDistance?: number
  /** Spring stiffness pulling connected nodes to `linkDistance`. @default 0.045 */
  linkStrength?: number
  /** Gravity toward the center (keeps disconnected pieces on screen). @default 0.018 */
  centerStrength?: number
  /** Per-step velocity damping. @default 0.84 */
  damping?: number
  /** Inset kept clear at the edges of the normalized box. @default 0.06 */
  inset?: number
}

const SIM_SIZE = 1000

interface SimNode {
  x: number
  y: number
  vx: number
  vy: number
}

/**
 * Lay a graph out with a seeded force simulation. Returns node id → {x, y} with
 * both in [0, 1].
 *
 * @example
 * ```ts
 * const pos = forceLayout(nodes, edges, { seed: 7 })
 * // in a NetworkCustomChart layout: cx = plot.x + pos[node.id].x * plot.width
 * ```
 */
export function forceLayout(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  options: ForceLayoutOptions = {}
): Record<string, Point> {
  const seed = options.seed ?? 1
  const iterations = options.iterations ?? 260
  const repulsion = options.repulsion ?? 5200
  const linkDistance = options.linkDistance ?? 165
  const linkStrength = options.linkStrength ?? 0.045
  const centerStrength = options.centerStrength ?? 0.018
  const damping = options.damping ?? 0.84
  const inset = options.inset ?? 0.06

  const rand = mulberry32(seed)
  const pos = new Map<string, SimNode>()
  for (const n of nodes) {
    pos.set(n.id, { x: 200 + rand() * 600, y: 200 + rand() * 600, vx: 0, vy: 0 })
  }
  const center = SIM_SIZE / 2
  const list = nodes.map((n) => pos.get(n.id)!)

  for (let it = 0; it < iterations; it += 1) {
    const alpha = 1 - it / iterations
    // pairwise repulsion
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i]
        const b = list[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let d = Math.sqrt(dx * dx + dy * dy)
        if (d < 1) {
          d = 1
          dx = rand() - 0.5
          dy = rand() - 0.5
        }
        const rep = repulsion / (d * d)
        const fx = (dx / d) * rep
        const fy = (dy / d) * rep
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
    }
    // link springs
    for (const e of edges) {
      const a = pos.get(e.source)
      const b = pos.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - linkDistance) * linkStrength
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
    // gravity + integrate
    for (const p of list) {
      p.vx += (center - p.x) * centerStrength
      p.vy += (center - p.y) * centerStrength
      p.x += p.vx * alpha
      p.y += p.vy * alpha
      p.vx *= damping
      p.vy *= damping
    }
  }

  // normalize to [0, 1] over the actual bounding box, with an inset
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of list) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const out: Record<string, Point> = {}
  for (const n of nodes) {
    const p = pos.get(n.id)!
    out[n.id] = {
      x: inset + ((p.x - minX) / spanX) * (1 - 2 * inset),
      y: inset + ((p.y - minY) / spanY) * (1 - 2 * inset),
    }
  }
  return out
}

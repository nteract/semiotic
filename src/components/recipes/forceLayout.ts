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
 * Synchronous and deterministic: it settles before returning, so consumers get
 * stable coordinates without running an interactive simulation.
 */

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force"
import type { GraphNode, GraphEdge, Point } from "./networkAnalysis"
export { mulberry32 } from "./random"
import { mulberry32 } from "./random"

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
  /** Node collision radius in virtual layout units. @default 12 */
  nodeRadius?: number | ((node: GraphNode) => number)
  /** Extra collision spacing in virtual layout units. @default 3 */
  nodePadding?: number
  /** Inset kept clear at the edges of the normalized box. @default 0.06 */
  inset?: number
}

const SIM_SIZE = 1000

interface SimNode extends SimulationNodeDatum {
  id: string
  data: GraphNode
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
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
  const nodeRadiusOption = options.nodeRadius ?? 12
  const nodePadding = options.nodePadding ?? 3
  const inset = options.inset ?? 0.06

  const rand = mulberry32(seed)
  const degreeById = new Map<string, number>()
  for (const node of nodes) degreeById.set(node.id, 0)
  for (const edge of edges) {
    degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1)
    degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1)
  }

  const center = SIM_SIZE / 2
  const list: SimNode[] = nodes.map((node) => ({
    id: node.id,
    data: node,
    x: 200 + rand() * 600,
    y: 200 + rand() * 600,
  }))
  const nodeRadius = (node: SimNode): number =>
    typeof nodeRadiusOption === "function"
      ? nodeRadiusOption(node.data)
      : nodeRadiusOption
  const validIds = new Set(nodes.map((node) => node.id))
  const links: SimEdge[] = edges
    .filter((edge) => validIds.has(edge.source) && validIds.has(edge.target))
    .map((edge) => ({ source: edge.source, target: edge.target }))

  if (iterations > 0) {
    const simulation = forceSimulation<SimNode>(list)
      .randomSource(rand)
      .alphaDecay(1 - Math.pow(0.001, 1 / iterations))
      .velocityDecay(Math.max(0, Math.min(1, 1 - damping)))
      .force(
        "charge",
        forceManyBody<SimNode>().strength((node) => {
          const degree = degreeById.get(node.id) ?? 0
          return -Math.sqrt(repulsion) * 2.5 * Math.sqrt(degree + 1)
        })
      )
      .force(
        "collide",
        forceCollide<SimNode>((node) => nodeRadius(node) + nodePadding)
          .strength(0.9)
          .iterations(2)
      )
      .force("center", forceCenter(center, center).strength(0.8))
      .force("x", forceX<SimNode>(center).strength(centerStrength))
      .force("y", forceY<SimNode>(center).strength(centerStrength))

    if (links.length > 0) {
      simulation.force(
        "link",
        forceLink<SimNode, SimEdge>(links)
          .id((node) => node.id)
          .distance(linkDistance)
          .strength((edge) => {
            const sourceId =
              typeof edge.source === "string" ? edge.source : edge.source.id
            const targetId =
              typeof edge.target === "string" ? edge.target : edge.target.id
            const endpointDegree = Math.max(
              1,
              Math.min(
                degreeById.get(sourceId) ?? 1,
                degreeById.get(targetId) ?? 1
              )
            )
            return (linkStrength / 0.045) / endpointDegree
          })
      )
    }

    simulation.stop()
    for (let i = 0; i < iterations; i += 1) simulation.tick()
  }

  // normalize to [0, 1] over the actual bounding box, with an inset
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of list) {
    const x = p.x ?? center
    const y = p.y ?? center
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const spanX = maxX - minX
  const spanY = maxY - minY
  const out: Record<string, Point> = {}
  for (const node of list) {
    out[node.id] = {
      x:
        spanX === 0
          ? 0.5
          : inset + (((node.x ?? center) - minX) / spanX) * (1 - 2 * inset),
      y:
        spanY === 0
          ? 0.5
          : inset + (((node.y ?? center) - minY) / spanY) * (1 - 2 * inset),
    }
  }
  return out
}

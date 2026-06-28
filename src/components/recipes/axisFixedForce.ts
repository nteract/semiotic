import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkSceneNode, NetworkSceneEdge, NetworkLabel } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { readField, unwrapDatum } from "./recipeUtils"
import { boxEdgeAnchors, curvedEdgePath, fanOutBend } from "./edgeRouter"

/**
 * Axis-fixed force layout — "one axis is data, relax the other." Pins each
 * node's position on one axis from a data field (e.g. year → y) and settles the
 * free axis with edge attraction, an anchor spring, and **rectangular**
 * (label-box-aware) collision. The distinct, reusable layout family none of the
 * hierarchical recipes (`flextree`, `dagre`, `lineageDag`, `mermaidDag`) cover —
 * a chronological influence/genealogy network where time is structural and the
 * graph determines the cross-axis arrangement.
 *
 * Rectangular collision ({@link rectCollide}) is the differentiator over plain
 * d3-force, whose `forceCollide` only separates circles — text labels are boxes.
 *
 * Two entry points:
 *  - {@link axisFixedForcePositions} — the pure positioner. Returns positioned
 *    boxes; pair with art-directed `overlays` + `networkHitTarget` for full
 *    control over how nodes/edges look.
 *  - {@link axisFixedForceLayout} — a ready `NetworkCustomLayout` that emits
 *    default rect nodes, curved edges, and labels (sibling to `dagreLayout`).
 */

export interface CollisionBox {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface RectCollideOptions {
  /** Free axis to separate boxes along. @default "x" */
  axis?: "x" | "y"
  /** Minimum gap to maintain between box edges, px. @default 0 */
  padding?: number
  /** Fraction of each overlap resolved in this pass (0..1). @default 0.5 */
  strength?: number
}

/**
 * One pass of rectangular collision separation. Returns the per-box displacement
 * along the free axis — add it to a force accumulator (as the axis-fixed settle
 * does) or apply it directly. Two boxes interact only when they overlap on the
 * cross axis *and* the free axis, so distant rows never push each other. The
 * box-aware separation every text-heavy network needs (labels are rectangles,
 * not points). Pure / deterministic (symmetric ties broken by id order).
 */
export function rectCollide(boxes: readonly CollisionBox[], opts?: RectCollideOptions): Map<string, number> {
  const axis = opts?.axis ?? "x"
  const padding = opts?.padding ?? 0
  const strength = opts?.strength ?? 0.5
  const cross = axis === "x" ? "y" : "x"
  const freeSize = axis === "x" ? "width" : "height"
  const crossSize = axis === "x" ? "height" : "width"

  const forces = new Map<string, number>()
  for (const b of boxes) forces.set(b.id, 0)

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const crossGap = Math.abs(a[cross] - b[cross])
      const crossLimit = (a[crossSize] + b[crossSize]) / 2 + padding
      if (crossGap > crossLimit) continue
      const minGap = (a[freeSize] + b[freeSize]) / 2 + padding
      // Break exact ties deterministically by id so the pass is stable.
      const delta = b[axis] - a[axis] || (a.id < b.id ? -0.5 : 0.5)
      const overlap = minGap - Math.abs(delta)
      if (overlap <= 0) continue
      const push = overlap * strength * Math.sign(delta)
      forces.set(a.id, (forces.get(a.id) ?? 0) - push)
      forces.set(b.id, (forces.get(b.id) ?? 0) + push)
    }
  }
  return forces
}

export interface AxisFixedForceConfig {
  /** Field (or fn) giving the fixed-axis data value, e.g. a year. */
  fixedAccessor: string | ((d: Datum) => number)
  /** `[min, max]` of the fixed value, mapped to the pinned pixel axis. */
  fixedDomain: [number, number]
  /** Which axis is pinned from data. @default "y" (year → y, relax x). */
  fixedAxis?: "x" | "y"
  /** Node id accessor. @default "id" */
  idAccessor?: string | ((d: Datum) => string)
  /** Edge source-id accessor. @default "source" */
  sourceAccessor?: string | ((e: Datum) => string)
  /** Edge target-id accessor. @default "target" */
  targetAccessor?: string | ((e: Datum) => string)
  /** Box size per node (label-aware). @default `{ width: 60, height: 34 }` */
  size?: (d: Datum) => { width: number; height: number }
  /** Settle iterations. @default 180 */
  iterations?: number
  /** Edge attraction along the free axis. @default 0.012 */
  attraction?: number
  /** Spring strength pulling each node back to its initial spread. @default 0.003 */
  anchorStrength?: number
  /** Collision separation strength. @default 0.12 */
  collisionStrength?: number
  /** Gap maintained between boxes, px. @default 15 */
  collisionPadding?: number
  /** Inset from the plot edges on the free axis, px. @default 42 */
  edgePadding?: number
  /** Inset from the plot edges on the fixed axis, px. @default 16 */
  fixedPadding?: number
  /** Per-iteration force damping. @default 0.72 */
  damping?: number
  /** Widen the settled solution about its center (1 = leave as-is). @default 1 */
  spread?: number
}

export interface PositionedNode {
  /** The raw user datum (unwrapped from any frame node wrapper). */
  data: Datum
  id: string
  /** Center x in plot coordinates. */
  x: number
  /** Center y in plot coordinates. */
  y: number
  width: number
  height: number
  /** The fixed-axis data value used (e.g. the year). */
  fixedValue: number
}

export interface AxisFixedForceResult {
  positioned: PositionedNode[]
  byId: Map<string, PositionedNode>
}

interface PlotRect {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_SIZE = { width: 60, height: 34 }

/** Deterministic [0,1) hash of a string (FNV-1a) — stable initial spread + tie-break. */
function hashUnit(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function accessorFn(a: string | ((d: Datum) => unknown) | undefined, key: string): (d: Datum) => unknown {
  if (typeof a === "function") return a
  const field = a ?? key
  return (d: Datum) => readField(d, field, undefined)
}

/**
 * The pure positioner. Settles `nodes` against `edges` with one axis pinned from
 * data, returning centered boxes. Deterministic for a given input + config.
 */
export function axisFixedForcePositions(
  nodes: readonly Datum[],
  edges: readonly Datum[],
  plot: PlotRect,
  config: AxisFixedForceConfig,
): AxisFixedForceResult {
  const fixedAxis = config.fixedAxis ?? "y"
  const getFixed = (d: Datum) => Number(accessorFn(config.fixedAccessor, "fixed")(d))
  const getId = (d: Datum) => String(accessorFn(config.idAccessor, "id")(d))
  const getSource = (e: Datum) => String(accessorFn(config.sourceAccessor, "source")(e))
  const getTarget = (e: Datum) => String(accessorFn(config.targetAccessor, "target")(e))
  const sizeOf = config.size ?? (() => DEFAULT_SIZE)

  const iterations = config.iterations ?? 180
  const attraction = config.attraction ?? 0.012
  const anchorStrength = config.anchorStrength ?? 0.003
  const collisionStrength = config.collisionStrength ?? 0.12
  const collisionPadding = config.collisionPadding ?? 15
  const edgePadding = config.edgePadding ?? 42
  const fixedPadding = config.fixedPadding ?? 16
  const damping = config.damping ?? 0.72
  const spread = config.spread ?? 1

  // Pixel ranges for the two axes.
  const [f0, f1] = config.fixedDomain
  const fixedSpan = f1 - f0 || 1
  const fixedStart = (fixedAxis === "y" ? plot.y : plot.x) + fixedPadding
  const fixedEnd = (fixedAxis === "y" ? plot.y + plot.height : plot.x + plot.width) - fixedPadding
  const fixedScale = (v: number) => fixedStart + ((v - f0) / fixedSpan) * (fixedEnd - fixedStart)

  const freeStart = (fixedAxis === "y" ? plot.x : plot.y) + edgePadding
  const freeEnd = (fixedAxis === "y" ? plot.x + plot.width : plot.y + plot.height) - edgePadding
  const freeSpan = Math.max(1, freeEnd - freeStart)

  interface Particle {
    data: Datum
    id: string
    width: number
    height: number
    fixedValue: number
    fixed: number
    free: number
    anchor: number
  }

  const particles: Particle[] = nodes.map((node) => {
    const data = unwrapDatum<Datum>(node) ?? (node as Datum)
    const id = getId(node)
    const { width, height } = sizeOf(data)
    const fixedValue = getFixed(node)
    const free = freeStart + hashUnit(id) * freeSpan
    return { data, id, width, height, fixedValue, fixed: fixedScale(fixedValue), free, anchor: free }
  })
  const byId = new Map(particles.map((p) => [p.id, p]))

  const freeSizeOf = (p: Particle) => (fixedAxis === "y" ? p.width : p.height)

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, number>()
    for (const p of particles) forces.set(p.id, 0)

    // Edge attraction along the free axis.
    for (const edge of edges) {
      const s = byId.get(getSource(edge))
      const t = byId.get(getTarget(edge))
      if (!s || !t) continue
      const pull = (t.free - s.free) * attraction
      forces.set(s.id, (forces.get(s.id) ?? 0) + pull)
      forces.set(t.id, (forces.get(t.id) ?? 0) - pull)
    }

    // Anchor spring toward the initial spread (keeps the graph from collapsing).
    for (const p of particles) {
      forces.set(p.id, (forces.get(p.id) ?? 0) + (p.anchor - p.free) * anchorStrength)
    }

    // Rectangular collision along the free axis.
    const boxes: CollisionBox[] = particles.map((p) => ({
      id: p.id,
      x: fixedAxis === "y" ? p.free : p.fixed,
      y: fixedAxis === "y" ? p.fixed : p.free,
      width: p.width,
      height: p.height,
    }))
    const collide = rectCollide(boxes, {
      axis: fixedAxis === "y" ? "x" : "y",
      padding: collisionPadding,
      strength: collisionStrength,
    })
    for (const p of particles) {
      forces.set(p.id, (forces.get(p.id) ?? 0) + (collide.get(p.id) ?? 0))
    }

    // Integrate + clamp inside the free range.
    for (const p of particles) {
      p.free += (forces.get(p.id) ?? 0) * damping
      const half = freeSizeOf(p) / 2
      p.free = Math.max(freeStart + half, Math.min(freeEnd - half, p.free))
    }
  }

  // Normalize the spread about the center (use more of the field).
  if (spread !== 1) {
    const center = (freeStart + freeEnd) / 2
    for (const p of particles) {
      const half = freeSizeOf(p) / 2
      p.free = Math.max(freeStart + half, Math.min(freeEnd - half, center + (p.free - center) * spread))
    }
  }

  const positioned: PositionedNode[] = particles.map((p) => ({
    data: p.data,
    id: p.id,
    x: fixedAxis === "y" ? p.free : p.fixed,
    y: fixedAxis === "y" ? p.fixed : p.free,
    width: p.width,
    height: p.height,
    fixedValue: p.fixedValue,
  }))
  return { positioned, byId: new Map(positioned.map((p) => [p.id, p])) }
}

/**
 * A ready-to-use `NetworkCustomLayout` wrapping {@link axisFixedForcePositions}:
 * emits a rect node per node, a curved edge per edge ({@link curvedEdgePath},
 * fanned by index), and a centered label. Hand it straight to a
 * `NetworkCustomChart`'s `layout` for a quick chronological force graph; reach
 * for the positioner directly when you want art-directed overlays.
 */
export const axisFixedForceLayout: NetworkCustomLayout<AxisFixedForceConfig> = (ctx) => {
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0 || ctx.nodes.length === 0 || !ctx.config?.fixedDomain) {
    return { sceneNodes: [] }
  }
  const fixedAxis = ctx.config.fixedAxis ?? "y"
  const { positioned, byId } = axisFixedForcePositions(
    ctx.nodes as unknown as Datum[],
    ctx.edges as unknown as Datum[],
    plot,
    ctx.config,
  )

  const sceneNodes: NetworkSceneNode[] = positioned.map((p) => ({
    type: "rect",
    x: p.x - p.width / 2,
    y: p.y - p.height / 2,
    w: p.width,
    h: p.height,
    style: { fill: ctx.resolveColor(p.id), stroke: "none" },
    datum: p.data,
    id: p.id,
    label: p.id,
  }))

  const sceneEdges: NetworkSceneEdge[] = []
  const getSource = (e: Datum) =>
    String(typeof ctx.config.sourceAccessor === "function" ? ctx.config.sourceAccessor(e) : readField(e, (ctx.config.sourceAccessor as string) ?? "source", undefined))
  const getTarget = (e: Datum) =>
    String(typeof ctx.config.targetAccessor === "function" ? ctx.config.targetAccessor(e) : readField(e, (ctx.config.targetAccessor as string) ?? "target", undefined))
  ;(ctx.edges as unknown as Datum[]).forEach((edge, index) => {
    const s = byId.get(getSource(edge))
    const t = byId.get(getTarget(edge))
    if (!s || !t) return
    const { from, to } = boxEdgeAnchors(
      { cx: s.x, cy: s.y, width: s.width, height: s.height },
      { cx: t.x, cy: t.y, width: t.width, height: t.height },
      { orientation: fixedAxis === "y" ? "vertical" : "horizontal" },
    )
    sceneEdges.push({
      type: "curved",
      pathD: curvedEdgePath(from, to, {
        orientation: fixedAxis === "y" ? "vertical" : "horizontal",
        bend: fanOutBend(index, { modulo: 5, spread: 5 }),
      }),
      style: { stroke: `var(--semiotic-border, #888)`, fill: "none", strokeWidth: 1.4 },
      datum: unwrapDatum<Datum>(edge) ?? (edge as Datum),
    })
  })

  const labels: NetworkLabel[] = positioned.map((p) => ({
    x: p.x,
    y: p.y,
    text: p.id,
  }))

  return { sceneNodes, sceneEdges, labels }
}

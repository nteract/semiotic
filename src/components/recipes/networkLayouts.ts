/**
 * Deterministic, physics-free network layouts — the classic static forms that
 * predate (and often out-read) the force-directed hairball: the arc diagram,
 * the adjacency matrix, and the circular layout.
 *
 * These are composable positioner / structure helpers (not full scene layouts):
 * they return normalized positions or a matrix structure that you render inside
 * a `NetworkCustomChart` layout, so you keep full control of styling. Pure and
 * dependency-free.
 */

import type { GraphNode, GraphEdge, Point } from "./networkAnalysis"
import { degree } from "./networkAnalysis"
import { setOwnValue } from "./atlas/ids"

/**
 * Order node ids by community/group then descending degree, so related nodes sit
 * together and hubs lead — the ordering that makes arc diagrams and adjacency
 * matrices legible. Pass `groupAccessor` to read the grouping field (default
 * `"group"`); nodes without one are ordered by degree alone.
 */
export function orderByGroupDegree<N extends GraphNode>(
  nodes: ReadonlyArray<N>,
  edges: ReadonlyArray<GraphEdge>,
  groupAccessor: keyof N | ((n: N) => number | string) = "group" as keyof N
): string[] {
  const deg = degree(nodes, edges)
  const groupOf = (n: N): number | string => {
    if (typeof groupAccessor === "function") return groupAccessor(n)
    const v = n[groupAccessor]
    return (v as unknown as number | string) ?? 0
  }
  return nodes
    .slice()
    .sort((a, b) => {
      const ga = groupOf(a)
      const gb = groupOf(b)
      if (ga < gb) return -1
      if (ga > gb) return 1
      return (deg[b.id] || 0) - (deg[a.id] || 0)
    })
    .map((n) => n.id)
}

export interface ArcLayoutOptions {
  /** Baseline y position in [0, 1]. @default 0.62 */
  baseline?: number
  /** Horizontal inset kept clear at each end, in [0, 0.5). @default 0.06 */
  inset?: number
}

/**
 * Arc diagram: lay the ordered ids out along a horizontal baseline. Draw each
 * edge as an arc with {@link arcPath}. Returns id → {x, y} in [0, 1].
 */
export function arcLayout(
  ids: ReadonlyArray<string>,
  options: ArcLayoutOptions = {}
): Record<string, Point> {
  const baseline = options.baseline ?? 0.62
  const inset = options.inset ?? 0.06
  const out: Record<string, Point> = {}
  const n = ids.length
  ids.forEach((id, i) => {
    setOwnValue(out, id, {
      x: n > 1 ? inset + (i / (n - 1)) * (1 - 2 * inset) : 0.5,
      y: baseline
    })
  })
  return out
}

/**
 * An SVG path string for an arc between two points that share a baseline (as in
 * an arc diagram). The arc bows away from the baseline by `heightRatio` of the
 * span. Coordinates are whatever space you pass (typically already projected
 * into the plot).
 */
export function arcPath(a: Point, b: Point, heightRatio = 0.55): string {
  const span = Math.abs(b.x - a.x)
  const cx = (a.x + b.x) / 2
  const cy = a.y - span * heightRatio
  return `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`
}

export interface CircularLayoutOptions {
  /** Ring radius in [0, 0.5]. @default 0.42 */
  radius?: number
  /** Center point in [0, 1]. @default { x: 0.5, y: 0.5 } */
  center?: Point
  /** Start angle in radians (0 = up). @default 0 */
  startAngle?: number
}

/**
 * Circular layout: place the ordered ids evenly around a ring. Position carries
 * no meaning (edges cross the interior) — offered mainly as a labeled, stable
 * arrangement. Returns id → {x, y} in [0, 1].
 */
export function circularLayout(
  ids: ReadonlyArray<string>,
  options: CircularLayoutOptions = {}
): Record<string, Point> {
  const radius = options.radius ?? 0.42
  const cx = options.center?.x ?? 0.5
  const cy = options.center?.y ?? 0.5
  const start = options.startAngle ?? 0
  const out: Record<string, Point> = {}
  const n = ids.length
  ids.forEach((id, i) => {
    const angle = start + (i / n) * Math.PI * 2 - Math.PI / 2
    setOwnValue(out, id, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    })
  })
  return out
}

export interface MatrixCell {
  /** Row index (into the ordered id list). */
  row: number
  /** Column index. */
  col: number
  source: string
  target: string
  /** Summed edge value between the pair (defaults to 1 per edge). */
  value: number
}

export interface AdjacencyMatrix {
  /** The ordered ids used for rows and columns. */
  order: string[]
  /** One cell per connected (i, j) pair, both triangles (symmetric). */
  cells: MatrixCell[]
  /** Number of rows/columns (`order.length`). */
  size: number
  /** Maximum cell value (for opacity/intensity encoding). */
  maxValue: number
}

export interface AdjacencyMatrixOptions {
  /** Explicit row/column order; defaults to {@link orderByGroupDegree}. */
  order?: ReadonlyArray<string>
  /** Group accessor used when computing the default order. @default "group" */
  groupAccessor?: keyof GraphNode | ((n: GraphNode) => number | string)
}

/** Joins an unordered node-id pair into one map key (escaped NUL, not a literal byte). */
const PAIR_KEY_SEPARATOR = "\u0000"

/**
 * Adjacency matrix structure: every connection becomes a filled cell, so nothing
 * overlaps and dense graphs stay legible. Returns the ordered ids plus the cell
 * list; render each cell at `(col, row)` in your layout. Symmetric (both
 * triangles filled); the diagonal is omitted.
 */
export function adjacencyMatrix(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  options: AdjacencyMatrixOptions = {}
): AdjacencyMatrix {
  const order = (
    options.order ?? orderByGroupDegree(nodes, edges, options.groupAccessor ?? ("group" as keyof GraphNode))
  ).slice()
  const index = new Map(order.map((id, i) => [id, i]))

  // Sum undirected edge values per unordered pair.
  const pairValue = new Map<string, number>()
  for (const e of edges) {
    if (!index.has(e.source) || !index.has(e.target) || e.source === e.target) continue
    const key = e.source < e.target ? `${e.source}${PAIR_KEY_SEPARATOR}${e.target}` : `${e.target}${PAIR_KEY_SEPARATOR}${e.source}`
    pairValue.set(key, (pairValue.get(key) || 0) + (e.value ?? 1))
  }

  const cells: MatrixCell[] = []
  let maxValue = 0
  for (const [key, value] of pairValue) {
    const [a, b] = key.split(PAIR_KEY_SEPARATOR)
    const ia = index.get(a)!
    const ib = index.get(b)!
    if (value > maxValue) maxValue = value
    // both triangles → symmetric matrix
    cells.push({ row: ia, col: ib, source: a, target: b, value })
    cells.push({ row: ib, col: ia, source: b, target: a, value })
  }

  return { order, cells, size: order.length, maxValue }
}

import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkCurvedEdge, NetworkLineEdge } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { positionedNetworkNodes } from "./positionedNetworkNodes"

export interface DagreConfig {
  /** Default node width when nodes don't carry a `width` field. @default 100 */
  nodeWidth?: number
  /** Default node height when nodes don't carry a `height` field. @default 36 */
  nodeHeight?: number
  /** Center and uniformly shrink the layout into the plot; "none" preserves authored pixels. @default "contain" */
  fit?: "none" | "contain"
  /** Edge style — straight polyline through waypoints, or smoothed bezier. @default "polyline" */
  edgeStyle?: "polyline" | "smooth"
  /** Render text labels at node centers. @default true */
  showLabels?: boolean
  /** Field name (or function) yielding the label string per node. @default "label" */
  labelAccessor?: string | ((d: Datum) => string)
  /** Per-node fill style override. */
  nodeFill?: string
  /** Stroke for edges. */
  edgeStroke?: string
}

/**
 * Dagre layout recipe — renders a pre-positioned directed acyclic graph
 * (e.g. output of `dagre`).
 *
 * The user runs `dagre.layout(g)` themselves and flattens the result into
 * `nodes` (each with `x`, `y`, `width`, `height`, `label`) and `edges`
 * (each with `source`, `target`, optional `points` waypoint array). The
 * recipe handles scene emission only.
 *
 * @example
 * ```ts
 * import dagre from "dagre"
 * import { NetworkCustomChart } from "semiotic/network"
 * import { dagreLayout } from "semiotic/recipes"
 *
 * const g = new dagre.graphlib.Graph()
 * g.setGraph({ rankdir: "TB" })
 * g.setDefaultEdgeLabel(() => ({}))
 * for (const n of myNodes) g.setNode(n.id, { width: 120, height: 40, label: n.label })
 * for (const e of myEdges) g.setEdge(e.source, e.target)
 * dagre.layout(g)
 *
 * const nodes = g.nodes().map((id) => {
 *   const n = g.node(id)
 *   return { id, x: n.x, y: n.y, width: n.width, height: n.height, label: n.label }
 * })
 * const edges = g.edges().map((e) => {
 *   const ed = g.edge(e)
 *   return { source: e.v, target: e.w, points: ed.points }
 * })
 *
 * <NetworkCustomChart
 *   nodes={nodes} edges={edges}
 *   width={640} height={400}
 *   title="Directed graph"
 *   layout={dagreLayout}
 * />
 * ```
 */
export const dagreLayout: NetworkCustomLayout<DagreConfig> = (ctx) => {
  const cfg = ctx.config ?? {}
  const edgeStyle = cfg.edgeStyle ?? "polyline"
  const waypoints = new Map(
    ctx.edges.map((edge) => {
      const raw = (edge.data ?? edge) as Datum
      const points = Array.isArray(raw.points)
        ? raw.points
        : (edge as { points?: unknown }).points
      return [
        edge,
        Array.isArray(points) &&
        points.length >= 2 &&
        points.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
          ? (points as { x: number; y: number }[])
          : []
      ] as const
    })
  )
  const { positions, sceneNodes, labels, project } = positionedNetworkNodes(
    ctx,
    {
      ...cfg,
      nodeWidth: cfg.nodeWidth ?? 100,
      nodeHeight: cfg.nodeHeight ?? 36,
      labelAccessor: cfg.labelAccessor ?? "label"
    },
    `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#888"})`,
    [...waypoints.values()].flat()
  )
  const stroke =
    cfg.edgeStroke ??
    `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#666"})`
  const sceneEdges: (NetworkCurvedEdge | NetworkLineEdge)[] = []
  for (const edge of ctx.edges) {
    const sId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tId = typeof edge.target === "string" ? edge.target : edge.target.id
    const s = positions.get(sId)
    const t = positions.get(tId)
    if (!s || !t) continue

    const points = waypoints.get(edge)!.map(project)

    if (!points || points.length < 2) {
      sceneEdges.push({
        type: "line",
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y,
        style: { stroke, strokeWidth: 1 },
        datum: edge.data ?? edge
      })
      continue
    }

    if (edgeStyle === "smooth" && points.length >= 3) {
      // Quadratic-curve smoothing through waypoints.
      let d = `M${points[0].x},${points[0].y}`
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        d += ` Q${points[i].x},${points[i].y} ${xc},${yc}`
      }
      const last = points[points.length - 1]
      d += ` T${last.x},${last.y}`
      sceneEdges.push({
        type: "curved",
        pathD: d,
        style: { stroke, strokeWidth: 1, fill: "none" },
        datum: edge.data ?? edge
      })
    } else {
      // Polyline through waypoints.
      const d = "M" + points.map((p) => `${p.x},${p.y}`).join(" L ")
      sceneEdges.push({
        type: "curved",
        pathD: d,
        style: { stroke, strokeWidth: 1, fill: "none" },
        datum: edge.data ?? edge
      })
    }
  }

  return { sceneNodes, sceneEdges, labels }
}

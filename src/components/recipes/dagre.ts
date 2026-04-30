import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkRectNode,
  NetworkCurvedEdge,
  NetworkLineEdge,
  NetworkLabel,
  RealtimeNode,
} from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

export interface DagreConfig {
  /** Default node width when nodes don't carry a `width` field. @default 100 */
  nodeWidth?: number
  /** Default node height when nodes don't carry a `height` field. @default 36 */
  nodeHeight?: number
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
 * <StreamNetworkFrame
 *   chartType="force"
 *   nodes={nodes} edges={edges}
 *   customNetworkLayout={dagreLayout}
 * />
 * ```
 */
export const dagreLayout: NetworkCustomLayout<DagreConfig> = (ctx) => {
  const cfg = ctx.config
  const defaultW = cfg.nodeWidth ?? 100
  const defaultH = cfg.nodeHeight ?? 36
  const edgeStyle = cfg.edgeStyle ?? "polyline"
  const showLabels = cfg.showLabels !== false
  // Read labels from `node.data[labelAcc]` first (ingest-wrapper shape),
  // falling back to `node[labelAcc]` and finally `node.id`.
  const labelAcc = cfg.labelAccessor ?? "label"
  const getLabel = typeof labelAcc === "function"
    ? labelAcc
    : (d: Datum) => {
        const wrapped = (d as { data?: Record<string, unknown> }).data
        const fromData = wrapped ? wrapped[labelAcc] : undefined
        return String(fromData ?? d[labelAcc] ?? d.id ?? "")
      }

  const positions = new Map<string, { x: number; y: number; w: number; h: number }>()
  const sceneNodes: NetworkRectNode[] = []
  const labels: NetworkLabel[] = []

  // Network ingest wraps user data on `node.data`. Read positions from
  // `node.data.{x,y,width,height}` first, fall back to the wrapper.
  const readPos = (node: RealtimeNode) => {
    const d = (node.data ?? {}) as Record<string, unknown>
    const x = (typeof d.x === "number" ? d.x : node.x)
    const y = (typeof d.y === "number" ? d.y : node.y)
    const w = (typeof d.width === "number" ? d.width : (node as RealtimeNode & { width?: number }).width) ?? defaultW
    const h = (typeof d.height === "number" ? d.height : (node as RealtimeNode & { height?: number }).height) ?? defaultH
    return { x, y, w, h }
  }

  for (const node of ctx.nodes) {
    const { x, y, w, h } = readPos(node)
    if (x == null || y == null) continue
    positions.set(node.id, { x, y, w, h })
    sceneNodes.push({
      type: "rect",
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      style: {
        fill: cfg.nodeFill ?? ctx.resolveColor(node.id),
        stroke: `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#888"})`,
        strokeWidth: 1.5,
      },
      datum: node,
      id: node.id,
      label: String(getLabel(node)),
    })
    if (showLabels) {
      labels.push({
        x,
        y,
        text: String(getLabel(node)),
        anchor: "middle",
        baseline: "middle",
        fontSize: 11,
      })
    }
  }

  const stroke = cfg.edgeStroke ?? `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#666"})`
  const sceneEdges: (NetworkCurvedEdge | NetworkLineEdge)[] = []
  for (const edge of ctx.edges) {
    const sId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tId = typeof edge.target === "string" ? edge.target : edge.target.id
    const s = positions.get(sId)
    const t = positions.get(tId)
    if (!s || !t) continue

    // dagre populates an edge's `points: [{x, y}, ...]` waypoint array.
    // Network ingest wraps user data on `edge.data` — read points from there
    // first, fall back to the wrapper for callers that mutate it directly.
    const edgeData = (edge.data ?? {}) as Record<string, unknown>
    const points = (Array.isArray(edgeData.points)
      ? edgeData.points
      : (edge as { points?: { x: number; y: number }[] }).points
    ) as { x: number; y: number }[] | undefined

    if (!points || points.length < 2) {
      sceneEdges.push({
        type: "line",
        x1: s.x, y1: s.y, x2: t.x, y2: t.y,
        style: { stroke, strokeWidth: 1 },
        datum: edge,
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
        datum: edge,
      })
    } else {
      // Polyline through waypoints.
      const d = "M" + points.map((p) => `${p.x},${p.y}`).join(" L ")
      sceneEdges.push({
        type: "curved",
        pathD: d,
        style: { stroke, strokeWidth: 1, fill: "none" },
        datum: edge,
      })
    }
  }

  return { sceneNodes, sceneEdges, labels }
}

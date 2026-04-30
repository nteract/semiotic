import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkRectNode,
  NetworkCurvedEdge,
  NetworkLineEdge,
  NetworkLabel,
  RealtimeNode,
} from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

export interface FlextreeConfig {
  /** Default node width when nodes don't carry a `width` field. @default 80 */
  nodeWidth?: number
  /** Default node height when nodes don't carry a `height` field. @default 30 */
  nodeHeight?: number
  /** Edge style — curved (cubic-bezier path) or straight lines. @default "curved" */
  edgeCurve?: "line" | "curved"
  /** Tree orientation. Affects bezier control-point placement. @default "vertical" */
  orientation?: "vertical" | "horizontal"
  /** Render text labels at node centers. @default true */
  showLabels?: boolean
  /** Field name (or function) yielding the label string per node. @default "id" */
  labelAccessor?: string | ((d: Datum) => string)
  /** Per-node fill style override. */
  nodeFill?: string
}

/**
 * Flextree layout recipe — renders a pre-positioned variable-width tree
 * (e.g. output of `d3-flextree`).
 *
 * The user runs `d3-flextree` themselves and passes the laid-out nodes
 * as data. Each node should carry `x`, `y`, optional `width`/`height`.
 * Edges should be parent → child links (no waypoints needed).
 *
 * @example
 * ```ts
 * import flextree from "d3-flextree"
 * import { flextreeLayout } from "semiotic/recipes"
 *
 * const layout = flextree({ nodeSize: (n) => [n.data.size, 40] })
 * const tree = layout.hierarchy(rootData)
 * layout(tree)
 *
 * const nodes = tree.descendants().map((n) => ({
 *   id: n.data.id,
 *   x: n.x, y: n.y,
 *   width: n.size[0], height: n.size[1],
 *   label: n.data.name,
 * }))
 * const edges = tree.links().map((l) => ({
 *   source: l.source.data.id,
 *   target: l.target.data.id,
 * }))
 *
 * <StreamNetworkFrame
 *   chartType="force"
 *   nodes={nodes} edges={edges}
 *   customNetworkLayout={flextreeLayout}
 *   layoutConfig={{ orientation: "vertical" }}
 * />
 * ```
 */
export const flextreeLayout: NetworkCustomLayout<FlextreeConfig> = (ctx) => {
  const cfg = ctx.config
  const defaultW = cfg.nodeWidth ?? 80
  const defaultH = cfg.nodeHeight ?? 30
  const orientation = cfg.orientation ?? "vertical"
  const curve = cfg.edgeCurve ?? "curved"
  const showLabels = cfg.showLabels !== false
  // Read labels from `node.data[labelAcc]` first (the ingest-wrapper shape),
  // falling back to `node[labelAcc]` and finally `node.id`. Matches the
  // position-reading logic — same wrapper, same fallback rules.
  const labelAcc = cfg.labelAccessor ?? "id"
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

  // Network ingest wraps user data: positions live on `node.data.{x,y,...}`
  // when the user passes pre-positioned data through the `nodes` prop.
  // Fall back to `node.{x,y,...}` for callers that mutate the wrapper directly.
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
        // Halo stroke against neighbor overlap. Use the active theme's
        // surface (chart background) so the rect outline matches the page
        // even in dark mode.
        stroke: `var(--semiotic-surface, ${ctx.theme.semantic.surface ?? "#fff"})`,
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

  const sceneEdges: (NetworkCurvedEdge | NetworkLineEdge)[] = []
  for (const edge of ctx.edges) {
    const sId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tId = typeof edge.target === "string" ? edge.target : edge.target.id
    const s = positions.get(sId)
    const t = positions.get(tId)
    if (!s || !t) continue

    // Edges emerge from the parent's exit edge and land on the child's
    // entry edge — bottom-center → top-center for vertical layouts,
    // right-center → left-center for horizontal. Center-to-center lines
    // bisect tall rects in d3-flextree-style trees, which is the bug
    // anyone showing variable heights immediately notices.
    const sExit = orientation === "vertical"
      ? { x: s.x, y: s.y + s.h / 2 }
      : { x: s.x + s.w / 2, y: s.y }
    const tEntry = orientation === "vertical"
      ? { x: t.x, y: t.y - t.h / 2 }
      : { x: t.x - t.w / 2, y: t.y }

    if (curve === "line") {
      sceneEdges.push({
        type: "line",
        x1: sExit.x, y1: sExit.y, x2: tEntry.x, y2: tEntry.y,
        style: { stroke: `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#999"})`, strokeWidth: 1 },
        datum: edge,
      })
    } else {
      // Cubic-bezier with control points at the midline along the major
      // axis — the classic d3-tree elbow curve.
      const midY = (sExit.y + tEntry.y) / 2
      const midX = (sExit.x + tEntry.x) / 2
      const pathD = orientation === "vertical"
        ? `M${sExit.x},${sExit.y} C${sExit.x},${midY} ${tEntry.x},${midY} ${tEntry.x},${tEntry.y}`
        : `M${sExit.x},${sExit.y} C${midX},${sExit.y} ${midX},${tEntry.y} ${tEntry.x},${tEntry.y}`
      sceneEdges.push({
        type: "curved",
        pathD,
        style: { stroke: `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#999"})`, strokeWidth: 1, fill: "none" },
        datum: edge,
      })
    }
  }

  return { sceneNodes, sceneEdges, labels }
}

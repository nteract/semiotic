import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { NetworkCurvedEdge, NetworkLineEdge } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { positionedNetworkNodes } from "./positionedNetworkNodes"

export interface FlextreeConfig {
  /** Default node width when nodes don't carry a `width` field. @default 80 */
  nodeWidth?: number
  /** Default node height when nodes don't carry a `height` field. @default 30 */
  nodeHeight?: number
  /** Center and uniformly shrink the layout into the plot; "none" preserves authored pixels. @default "contain" */
  fit?: "none" | "contain"
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
 * import { NetworkCustomChart } from "semiotic/network"
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
 * <NetworkCustomChart
 *   nodes={nodes} edges={edges}
 *   width={640} height={400}
 *   title="Variable-size tree"
 *   layout={flextreeLayout}
 *   layoutConfig={{ orientation: "vertical" }}
 * />
 * ```
 */
export const flextreeLayout: NetworkCustomLayout<FlextreeConfig> = (ctx) => {
  const cfg = ctx.config ?? {}
  const orientation = cfg.orientation ?? "vertical"
  const curve = cfg.edgeCurve ?? "curved"
  const { positions, sceneNodes, labels } = positionedNetworkNodes(
    ctx,
    {
      ...cfg,
      nodeWidth: cfg.nodeWidth ?? 80,
      nodeHeight: cfg.nodeHeight ?? 30
    },
    `var(--semiotic-surface, ${ctx.theme.semantic.surface ?? "#fff"})`
  )

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
    const sExit =
      orientation === "vertical"
        ? { x: s.x, y: s.y + s.h / 2 }
        : { x: s.x + s.w / 2, y: s.y }
    const tEntry =
      orientation === "vertical"
        ? { x: t.x, y: t.y - t.h / 2 }
        : { x: t.x - t.w / 2, y: t.y }

    if (curve === "line") {
      sceneEdges.push({
        type: "line",
        x1: sExit.x,
        y1: sExit.y,
        x2: tEntry.x,
        y2: tEntry.y,
        style: {
          stroke: `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#999"})`,
          strokeWidth: 1
        },
        datum: edge.data ?? edge
      })
    } else {
      // Cubic-bezier with control points at the midline along the major
      // axis — the classic d3-tree elbow curve.
      const midY = (sExit.y + tEntry.y) / 2
      const midX = (sExit.x + tEntry.x) / 2
      const pathD =
        orientation === "vertical"
          ? `M${sExit.x},${sExit.y} C${sExit.x},${midY} ${tEntry.x},${midY} ${tEntry.x},${tEntry.y}`
          : `M${sExit.x},${sExit.y} C${midX},${sExit.y} ${midX},${tEntry.y} ${tEntry.x},${tEntry.y}`
      sceneEdges.push({
        type: "curved",
        pathD,
        style: {
          stroke: `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#999"})`,
          strokeWidth: 1,
          fill: "none"
        },
        datum: edge.data ?? edge
      })
    }
  }

  return { sceneNodes, sceneEdges, labels }
}

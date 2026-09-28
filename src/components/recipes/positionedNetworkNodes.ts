import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkLabel, NetworkRectNode } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { createPositionedNetworkFit } from "./positionedNetworkFit"

interface PositionedConfig {
  nodeWidth: number
  nodeHeight: number
  fit?: "none" | "contain"
  labelAccessor?: string | ((datum: Datum) => string)
  nodeFill?: string
  showLabels?: boolean
}

/** Shared scene construction for externally positioned rectangular networks. */
export function positionedNetworkNodes(
  ctx: NetworkLayoutContext<object>,
  cfg: PositionedConfig,
  stroke: string,
  waypoints: { x: number; y: number }[] = []
) {
  const fit = createPositionedNetworkFit(ctx.nodes, ctx.dimensions.plot, {
    nodeWidth: cfg.nodeWidth,
    nodeHeight: cfg.nodeHeight,
    fit: cfg.fit,
    waypoints
  })
  const positions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  const sceneNodes: NetworkRectNode[] = []
  const labels: NetworkLabel[] = []
  for (const node of ctx.nodes) {
    const box = fit.nodeBounds(node)
    if (!box) continue
    const { cx: x, cy: y, width: w, height: h } = box
    positions.set(node.id, { x, y, w, h })
    // Exactly one unwrap: a user's own `data` field is still user data.
    const datum = (node.data ?? node) as Datum
    const accessor = cfg.labelAccessor ?? "id"
    const label = String(
      typeof accessor === "function"
        ? accessor(datum)
        : (datum[accessor] ?? node.id)
    )
    sceneNodes.push({
      type: "rect",
      x: box.x,
      y: box.y,
      w,
      h,
      style: {
        fill: cfg.nodeFill ?? ctx.resolveColor(node.id),
        stroke,
        strokeWidth: Math.min(1.5, w / 2, h / 2)
      },
      datum,
      id: node.id,
      label
    })
    if (cfg.showLabels !== false) {
      labels.push({
        x,
        y,
        text: label,
        anchor: "middle",
        baseline: "middle",
        fontSize: 11 * fit.scale
      })
    }
  }
  return { positions, sceneNodes, labels, project: fit.project }
}

import type { NetworkLayoutContext } from "../stream/networkCustomLayout"
import type { NetworkLabel, NetworkRectNode } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

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
  const positions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const node of ctx.nodes) {
    const raw = node.data ?? node
    const x = raw.x ?? node.x,
      y = raw.y ?? node.y
    const w = raw.width ?? cfg.nodeWidth,
      h = raw.height ?? cfg.nodeHeight
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof w !== "number" ||
      typeof h !== "number" ||
      ![x, y, w, h].every(Number.isFinite) ||
      w <= 0 ||
      h <= 0
    )
      continue
    positions.set(node.id, { x, y, w, h })
    include(x - w / 2, y - h / 2)
    include(x + w / 2, y + h / 2)
  }
  for (const point of waypoints) include(point.x, point.y)
  let scale = 1,
    dx = 0,
    dy = 0
  if (cfg.fit !== "none" && positions.size) {
    const plot = ctx.dimensions.plot
    const width = maxX - minX,
      height = maxY - minY
    if (
      ![width, height, plot.x, plot.y, plot.width, plot.height].every(
        Number.isFinite
      ) ||
      width <= 0 ||
      height <= 0 ||
      plot.width <= 0 ||
      plot.height <= 0
    ) {
      positions.clear()
    } else {
      // Reserve room for the outline, including on very small plots.
      const padding = Math.min(1, plot.width / 4, plot.height / 4)
      scale = Math.min(
        1,
        (plot.width - 2 * padding) / width,
        (plot.height - 2 * padding) / height
      )
      dx = plot.x + (plot.width - width * scale) / 2 - minX * scale
      dy = plot.y + (plot.height - height * scale) / 2 - minY * scale
    }
  }
  const project = ({ x, y }: { x: number; y: number }) => ({
    x: x * scale + dx,
    y: y * scale + dy
  })
  const sceneNodes: NetworkRectNode[] = []
  const labels: NetworkLabel[] = []
  for (const node of ctx.nodes) {
    const position = positions.get(node.id)
    if (!position) continue
    const { x, y } = project(position)
    const w = position.w * scale,
      h = position.h * scale
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
      x: x - w / 2,
      y: y - h / 2,
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
        fontSize: 11 * scale
      })
    }
  }
  return { positions, sceneNodes, labels, project }
}

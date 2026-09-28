import type { Datum } from "../charts/shared/datumTypes"

/** Plot-relative box, the same space as network scene nodes. */
export interface PositionedNetworkFitRect {
  x: number
  y: number
  width: number
  height: number
}

/** The exact fit `dagreLayout` and `flextreeLayout` apply to authored positions. */
export interface PositionedNetworkFit {
  /** "none" keeps authored pixels; "contain" centers and uniformly shrinks (never enlarges) into the plot. */
  fit: "none" | "contain"
  scale: number
  dx: number
  dy: number
  /** Authored-space bounds of the drawable nodes (and waypoints); null when nothing is drawn. */
  bounds: PositionedNetworkFitRect | null
  /** Map an authored point to plot coordinates. */
  project(point: { x: number; y: number }): { x: number; y: number }
  /** Map a plot point back to authored coordinates. */
  invert(point: { x: number; y: number }): { x: number; y: number }
  /**
   * A node's fitted box and center, reading it the way the layout does (raw
   * nodes or the frame's `node.data` wrappers). Undefined when not drawn.
   */
  nodeBounds(node: Datum): (PositionedNetworkFitRect & { cx: number; cy: number }) | undefined
}

interface PositionedBox {
  x: number
  y: number
  w: number
  h: number
}

/** Authored center and size of a node, or undefined when it cannot be drawn. */
function readPositionedNode(node: Datum, nodeWidth: number, nodeHeight: number): PositionedBox | undefined {
  const raw = node.data ?? node
  const x = raw.x ?? node.x,
    y = raw.y ?? node.y
  // Composed layouts may write geometry on wrappers while retaining raw data.
  // Only the frame's zero placeholders are unset; authored invalid sizes
  // still reach validation below instead of silently taking the defaults.
  const wrapperW = node.createdByFrame && node.width === 0 ? undefined : node.width
  const wrapperH = node.createdByFrame && node.height === 0 ? undefined : node.height
  const w = raw.width ?? wrapperW ?? nodeWidth,
    h = raw.height ?? wrapperH ?? nodeHeight
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof w !== "number" ||
    typeof h !== "number" ||
    ![x, y, w, h].every(Number.isFinite) ||
    w <= 0 ||
    h <= 0
  )
    return undefined
  return { x, y, w, h }
}

/**
 * Fit authored node boxes (and edge waypoints) into a plot. The plot's
 * numbers are read once, so later mutation of `plot` does not change the fit.
 */
export function createPositionedNetworkFit(
  nodes: readonly Datum[],
  plot: PositionedNetworkFitRect,
  options: {
    nodeWidth: number
    nodeHeight: number
    fit?: "none" | "contain"
    waypoints?: readonly { x: number; y: number }[]
  }
): PositionedNetworkFit {
  const { nodeWidth, nodeHeight, waypoints = [] } = options
  const fit = options.fit === "none" ? "none" : "contain"
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
  let drawable = false
  for (const node of nodes) {
    const box = readPositionedNode(node, nodeWidth, nodeHeight)
    if (!box) continue
    drawable = true
    include(box.x - box.w / 2, box.y - box.h / 2)
    include(box.x + box.w / 2, box.y + box.h / 2)
  }
  for (const point of waypoints) include(point.x, point.y)
  let scale = 1,
    dx = 0,
    dy = 0
  if (fit === "contain" && drawable) {
    const width = maxX - minX,
      height = maxY - minY
    if (
      ![width, height, plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) ||
      width <= 0 ||
      height <= 0 ||
      plot.width <= 0 ||
      plot.height <= 0
    ) {
      drawable = false
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
  return {
    fit,
    scale,
    dx,
    dy,
    bounds: drawable ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null,
    project,
    invert: ({ x, y }) => ({ x: (x - dx) / scale, y: (y - dy) / scale }),
    nodeBounds: (node) => {
      const box = drawable ? readPositionedNode(node, nodeWidth, nodeHeight) : undefined
      if (!box) return undefined
      const { x, y } = project(box)
      const w = box.w * scale,
        h = box.h * scale
      return { x: x - w / 2, y: y - h / 2, width: w, height: h, cx: x, cy: y }
    }
  }
}

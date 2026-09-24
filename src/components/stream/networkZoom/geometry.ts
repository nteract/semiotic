import type { NetworkLayoutResult } from "../networkCustomLayout"
import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type { NetworkZoomOptions } from "./types"
import { normalizeNetworkView } from "../networkViewTransform"
import { glyphExtent } from "../glyphDef"

export const DEFAULT_ZOOM = { x: 0, y: 0, k: 1 }
export const EMPTY_PLOT = { x: 0, y: 0, width: 0, height: 0 }

export function zoomLimits(options: NetworkZoomOptions): [number, number] {
  const min =
    Number.isFinite(options.minZoom) && options.minZoom! > 0
      ? options.minZoom!
      : 0.1
  const max =
    Number.isFinite(options.maxZoom) && options.maxZoom! > 0
      ? options.maxZoom!
      : 8
  return [min, Math.max(min, max)]
}

export function sameZoom(
  a: NetworkViewTransform,
  b: NetworkViewTransform
): boolean {
  return a.x === b.x && a.y === b.y && a.k === b.k
}

/** Clamp all paths through the camera, including controlled values and fit. */
export function constrainZoom(
  view: NetworkViewTransform,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): NetworkViewTransform {
  const valid = normalizeNetworkView(view)
  const [min, max] = zoomLimits(options)
  const k = Math.min(max, Math.max(min, valid.k))
  const bounds = options.panBounds
  if (!bounds || !validBounds(bounds)) return { ...valid, k }
  const axis = (
    pan: number,
    start: number,
    length: number,
    viewport: number
  ) => {
    if (length * k <= viewport) return (viewport - length * k) / 2 - start * k
    return Math.min(-start * k, Math.max(viewport - (start + length) * k, pan))
  }
  return {
    k,
    x: axis(valid.x, bounds.x, bounds.width, plot.width),
    y: axis(valid.y, bounds.y, bounds.height, plot.height)
  }
}

export function canPan(options: NetworkZoomOptions, axis: "x" | "y"): boolean {
  return (
    !options.locked &&
    options.pan !== false &&
    (options.pan === undefined || options.pan === true || options.pan === axis)
  )
}

export function zoomAt(
  view: NetworkViewTransform,
  scale: number,
  point: { x: number; y: number },
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): NetworkViewTransform {
  if (options.locked || options.zoomEnabled === false) return view
  const [min, max] = zoomLimits(options)
  const k = Math.min(max, Math.max(min, scale))
  const x = canPan(options, "x") ? point.x : plot.width / 2
  const y = canPan(options, "y") ? point.y : plot.height / 2
  return constrainZoom(
    {
      k,
      x: x - ((x - view.x) * k) / view.k,
      y: y - ((y - view.y) * k) / view.k
    },
    plot,
    options
  )
}

export function panZoom(
  view: NetworkViewTransform,
  x: number,
  y: number,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): NetworkViewTransform {
  return constrainZoom(
    {
      ...view,
      x: view.x + (canPan(options, "x") ? x : 0),
      y: view.y + (canPan(options, "y") ? y : 0)
    },
    plot,
    options
  )
}

export function validBounds(bounds: NetworkViewportRect): boolean {
  return (
    [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
    bounds.width > 0 &&
    bounds.height > 0
  )
}

export function fitZoom(
  bounds: NetworkViewportRect,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): NetworkViewTransform | null {
  if (!validBounds(bounds) || plot.width <= 0 || plot.height <= 0) return null
  const padding = Number.isFinite(options.fitPadding)
    ? Math.max(0, options.fitPadding!)
    : 24
  const [min, max] = zoomLimits(options)
  const k = Math.max(
    min,
    Math.min(
      max,
      Math.max(1, plot.width - padding * 2) / bounds.width,
      Math.max(1, plot.height - padding * 2) / bounds.height
    )
  )
  return constrainZoom(
    {
      k,
      x: plot.width / 2 - (bounds.x + bounds.width / 2) * k,
      y: plot.height / 2 - (bounds.y + bounds.height / 2) * k
    },
    plot,
    options
  )
}

/** Fit helper for retained nodes and HTML card boxes. Arbitrary SVG decorations
 * and curved edge excursions require consumer-supplied bounds. */
export function getNetworkContentBounds(
  layout: NetworkLayoutResult | null | undefined
): NetworkViewportRect | null {
  if (!layout) return null
  const boxes: NetworkViewportRect[] = [...(layout.htmlMarks ?? [])]
  for (const node of layout.sceneNodes ?? []) {
    if (node.type === "rect")
      boxes.push({ x: node.x, y: node.y, width: node.w, height: node.h })
    else if (node.type === "glyph") {
      const radius = glyphExtent(node.glyph, node.size)
      boxes.push({
        x: node.cx - radius,
        y: node.cy - radius,
        width: radius * 2,
        height: radius * 2
      })
    } else {
      const radius =
        node.type === "circle"
          ? node.r
          : node.type === "arc"
            ? node.outerR
            : Math.sqrt(node.size / Math.PI)
      const cx = node.cx
      const cy = node.cy
      boxes.push({
        x: cx - radius,
        y: cy - radius,
        width: radius * 2,
        height: radius * 2
      })
    }
  }
  const finite = boxes.filter(validBounds)
  if (!finite.length) return null
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const box of finite) {
    x = Math.min(x, box.x)
    y = Math.min(y, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }
  return { x, y, width: right - x, height: bottom - y }
}

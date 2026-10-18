import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type { NetworkZoomOptions } from "./types"
import { normalizeNetworkView } from "../networkViewTransform"
import { fitNetworkView, validBounds } from "../networkViewGeometry"
export { getNetworkContentBounds, validBounds } from "../networkViewGeometry"

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

export function fitZoom(
  bounds: NetworkViewportRect,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): NetworkViewTransform | null {
  const view = fitNetworkView(bounds, plot, options.fitPadding, zoomLimits(options))
  return view && constrainZoom(view, plot, options)
}

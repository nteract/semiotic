import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "../networkViewportTypes"
import type { NetworkLayoutResult } from "../networkCustomLayout"
import type {
  NetworkZoomCenterOptions,
  NetworkZoomFitOptions,
  NetworkZoomInsets,
  NetworkZoomOptions
} from "./types"
import { normalizeNetworkView } from "../networkViewTransform"
import {
  fitNetworkView,
  getNetworkContentBounds,
  networkViewSides,
  unionNetworkBounds,
  validBounds
} from "../networkViewGeometry"
export {
  getNetworkContentBounds,
  unionNetworkBounds,
  validBounds
} from "../networkViewGeometry"

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

/** The plot area not covered by insets, in plot coordinates. */
export function usableViewport(
  plot: NetworkViewportRect,
  insets?: NetworkZoomInsets
): NetworkViewportRect {
  const { top, right, bottom, left } = networkViewSides(insets ?? {})
  return {
    x: left,
    y: top,
    width: Math.max(0, plot.width - (left + right)),
    height: Math.max(0, plot.height - (top + bottom))
  }
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
  const usable = usableViewport(plot, options.insets)
  const axis = (
    pan: number,
    start: number,
    length: number,
    offset: number,
    viewport: number
  ) => {
    if (length * k <= viewport)
      return offset + (viewport - length * k) / 2 - start * k
    return Math.min(
      offset - start * k,
      Math.max(offset + viewport - (start + length) * k, pan)
    )
  }
  return {
    k,
    x: axis(valid.x, bounds.x, bounds.width, usable.x, usable.width),
    y: axis(valid.y, bounds.y, bounds.height, usable.y, usable.height)
  }
}

/** Center of the usable viewport, where centered zoom and locked axes pivot. */
export function usableCenter(
  plot: NetworkViewportRect,
  options: NetworkZoomOptions
): { x: number; y: number } {
  const usable = usableViewport(plot, options.insets)
  return { x: usable.x + usable.width / 2, y: usable.y + usable.height / 2 }
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

/** Fit `bounds` into the usable viewport minus padding, centered there. */
export function fitZoom(
  bounds: NetworkViewportRect,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions,
  fit: NetworkZoomFitOptions = {}
): NetworkViewTransform | null {
  const [low, high] = zoomLimits(options)
  const limit = (value: number | undefined, fallback: number) =>
    Math.min(high, Math.max(low, Number.isFinite(value) ? value! : fallback))
  const min = limit(fit.minZoom, low)
  // Per-side padding keeps `fitPadding` (24 by default) on unspecified sides.
  const padding = networkViewSides(
    fit.padding,
    networkViewSides(options.fitPadding, 24).top
  )
  const view = fitNetworkView(
    bounds,
    usableViewport(plot, options.insets),
    padding,
    [min, Math.max(min, limit(fit.maxZoom, high))]
  )
  return view && constrainZoom(view, plot, options)
}

/** Put the center of a rect or point at the usable viewport's center. */
export function centerZoom(
  target: NetworkViewportRect | { x: number; y: number },
  view: NetworkViewTransform,
  plot: NetworkViewportRect,
  options: NetworkZoomOptions,
  center: NetworkZoomCenterOptions = {}
): NetworkViewTransform | null {
  const width = "width" in target ? target.width : 0
  const height = "height" in target ? target.height : 0
  const cx = target.x + width / 2
  const cy = target.y + height / 2
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
  const scoped = center.insets ? { ...options, insets: center.insets } : options
  const [min, max] = zoomLimits(options)
  const requested =
    Number.isFinite(center.k) && center.k! > 0 ? center.k! : view.k
  const k = Math.min(max, Math.max(min, requested))
  const pivot = usableCenter(plot, scoped)
  return constrainZoom(
    { k, x: pivot.x - cx * k, y: pivot.y - cy * k },
    plot,
    scoped
  )
}

/** Translate `view` so a mark's center keeps its screen position after it moved. */
export function anchorZoom(
  view: NetworkViewTransform,
  before: NetworkViewportRect,
  after: NetworkViewportRect
): NetworkViewTransform {
  return {
    k: view.k,
    x:
      view.x -
      view.k * (after.x + after.width / 2 - (before.x + before.width / 2)),
    y:
      view.y -
      view.k * (after.y + after.height / 2 - (before.y + before.height / 2))
  }
}

/**
 * Layout bounds of the HTML mark with `id`, else of the scene node with that
 * id, read from the layout's current geometry. Layouts may reuse and update
 * their mark objects between runs, so nothing is cached per result.
 */
export function getNetworkMarkBounds(
  layout: NetworkLayoutResult | null | undefined,
  id: string
): NetworkViewportRect | null {
  return getNetworkMarksBounds(layout, [id])
}

/** Union of the listed marks' bounds in one pass; ids without a mark are skipped. */
export function getNetworkMarksBounds(
  layout: NetworkLayoutResult | null | undefined,
  ids: readonly string[]
): NetworkViewportRect | null {
  if (!layout || !ids.length) return null
  const wanted = new Set(ids)
  const boxes: NetworkViewportRect[] = []
  for (const mark of layout.htmlMarks ?? [])
    if (wanted.has(mark.id) && validBounds(mark)) {
      boxes.push({
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height
      })
      wanted.delete(mark.id)
    }
  const nodes = wanted.size
    ? (layout.sceneNodes ?? []).filter(
        (node) => node.id != null && wanted.has(String(node.id))
      )
    : []
  const nodeBounds = nodes.length
    ? getNetworkContentBounds({ sceneNodes: nodes })
    : null
  return unionNetworkBounds(nodeBounds ? [...boxes, nodeBounds] : boxes)
}

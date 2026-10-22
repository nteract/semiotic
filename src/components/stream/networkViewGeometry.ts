import type { NetworkLayoutResult } from "./networkCustomLayout"
import type {
  NetworkViewTransform,
  NetworkViewportRect
} from "./networkViewportTypes"
import { glyphExtent } from "./glyphDef"
import { symbolPathString, symbolRadius } from "./symbolPath"
import { svgPathBounds } from "../geometry/svgPathBounds"

export function validBounds(bounds: NetworkViewportRect): boolean {
  return (
    [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
    bounds.width > 0 &&
    bounds.height > 0
  )
}

/** Screen-pixel space at each side of a rectangle. */
export interface NetworkViewSides {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

/**
 * Non-negative sides. A number applies to all four; an unspecified or
 * non-finite value, on any side, uses `fallback`; a negative value is 0.
 */
export function networkViewSides(
  sides: number | NetworkViewSides | null | undefined,
  fallback = 0
): Required<NetworkViewSides> {
  const side = (value: number | undefined) =>
    Number.isFinite(value) ? Math.max(0, value!) : fallback
  if (typeof sides !== "object" || sides === null) {
    const all = side(sides ?? undefined)
    return { top: all, right: all, bottom: all, left: all }
  }
  return {
    top: side(sides.top),
    right: side(sides.right),
    bottom: side(sides.bottom),
    left: side(sides.left)
  }
}

/**
 * Pure fit shared by static export and the optional interactive camera. The
 * content is centered in `area`, whose x/y offset the result in plot
 * coordinates, with `fitPadding` (24 by default) kept free at each side.
 */
export function fitNetworkView(
  bounds: NetworkViewportRect,
  area: NetworkViewportRect,
  fitPadding?: number | NetworkViewSides | null,
  limits: readonly [number, number] = [Number.MIN_VALUE, Number.MAX_VALUE]
): NetworkViewTransform | null {
  if (!validBounds(bounds) || area.width <= 0 || area.height <= 0) return null
  const { top, right, bottom, left } = networkViewSides(fitPadding, 24)
  const k = Math.max(
    limits[0],
    Math.min(
      limits[1],
      Math.max(1, area.width - (left + right)) / bounds.width,
      Math.max(1, area.height - (top + bottom)) / bounds.height
    )
  )
  return {
    k,
    x:
      area.x +
      (area.width + (left - right)) / 2 -
      (bounds.x + bounds.width / 2) * k,
    y:
      area.y +
      (area.height + (top - bottom)) / 2 -
      (bounds.y + bounds.height / 2) * k
  }
}

/** Union of finite, non-empty boxes; null when there are none. */
export function unionNetworkBounds(
  boxes: Iterable<NetworkViewportRect | null>
): NetworkViewportRect | null {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const box of boxes) {
    if (!box || !validBounds(box)) continue
    x = Math.min(x, box.x)
    y = Math.min(y, box.y)
    right = Math.max(right, box.x + box.width)
    bottom = Math.max(bottom, box.y + box.height)
  }
  return x < Infinity ? { x, y, width: right - x, height: bottom - y } : null
}

/** Fit helper for retained nodes and HTML card boxes. Arbitrary SVG decorations
 * and curved edge excursions require consumer-supplied bounds. Symbol path
 * bounds use a conservative radius so rotations cannot clip pointed marks. */
export function getNetworkContentBounds(
  layout: NetworkLayoutResult | null | undefined
): NetworkViewportRect | null {
  if (!layout) return null
  const boxes: NetworkViewportRect[] = [...(layout.htmlMarks ?? [])]
  for (const node of layout.sceneNodes ?? []) {
    if (node.type === "rect") {
      boxes.push({ x: node.x, y: node.y, width: node.w, height: node.h })
      continue
    }
    let radius: number
    if (node.type === "glyph") radius = glyphExtent(node.glyph, node.size)
    else if (node.type === "circle") radius = node.r
    else if (node.type === "arc") radius = node.outerR
    else if (!node.path && (!node.symbolType || node.symbolType === "circle"))
      radius = symbolRadius(node.size)
    else {
      const box = svgPathBounds(
        symbolPathString(node.symbolType, node.size, node.path)
      )
      radius = box
        ? Math.hypot(
            Math.max(Math.abs(box.x), Math.abs(box.x + box.w)),
            Math.max(Math.abs(box.y), Math.abs(box.y + box.h))
          )
        : symbolRadius(node.size)
    }
    boxes.push({
      x: node.cx - radius,
      y: node.cy - radius,
      width: radius * 2,
      height: radius * 2
    })
  }
  return unionNetworkBounds(boxes)
}

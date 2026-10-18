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

/** Pure fit shared by static export and the optional interactive camera. */
export function fitNetworkView(
  bounds: NetworkViewportRect,
  plot: NetworkViewportRect,
  fitPadding?: number,
  limits: readonly [number, number] = [Number.MIN_VALUE, Number.MAX_VALUE]
): NetworkViewTransform | null {
  if (!validBounds(bounds) || plot.width <= 0 || plot.height <= 0) return null
  const padding = Number.isFinite(fitPadding) ? Math.max(0, fitPadding!) : 24
  const k = Math.max(
    limits[0],
    Math.min(
      limits[1],
      Math.max(1, plot.width - padding * 2) / bounds.width,
      Math.max(1, plot.height - padding * 2) / bounds.height
    )
  )
  return {
    k,
    x: plot.width / 2 - (bounds.x + bounds.width / 2) * k,
    y: plot.height / 2 - (bounds.y + bounds.height / 2) * k
  }
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

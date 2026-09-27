import { createElement } from "react"

interface Point {
  x: number
  y: number
}

/** Ray from a rectangular node's center to its perimeter. */
export function rectBoundary(
  box: Point & { w: number; h: number },
  toward: Point
): Point {
  const dx = toward.x - box.x,
    dy = toward.y - box.y
  const ratio = Math.min(
    dx === 0 ? Infinity : box.w / 2 / Math.abs(dx),
    dy === 0 ? Infinity : box.h / 2 / Math.abs(dy)
  )
  return Number.isFinite(ratio)
    ? { x: box.x + dx * ratio, y: box.y + dy * ratio }
    : { x: box.x, y: box.y }
}

/** Decorative direction marker, separate from the edge's single hit target. */
export function edgeArrow(
  key: number,
  tip: Point,
  from: Point,
  fill: string | undefined,
  size: number,
  opacity = 1
) {
  const dx = tip.x - from.x,
    dy = tip.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0 || size <= 0) return null
  const scale = Math.min(size, length) / length
  const ux = dx * scale,
    uy = dy * scale
  return createElement("polygon", {
    key,
    className: "recipe-edge-arrow",
    points: `${tip.x},${tip.y} ${tip.x - ux - uy / 2},${tip.y - uy + ux / 2} ${tip.x - ux + uy / 2},${tip.y - uy - ux / 2}`,
    fill,
    opacity,
    "aria-hidden": true,
    style: { pointerEvents: "none" }
  })
}

/**
 * Per-corner radius utilities shared between the canvas (`barCanvasRenderer`)
 * and SVG (`SceneToSVG`) paint paths.
 *
 * Both paths previously carried the same `hasAnyCornerRadius` predicate
 * and the same `min(radius, w/2, h/2)` clamp inline. Splitting them by
 * renderer left two near-identical implementations that drifted in
 * comments more than once; centralizing here keeps the swimlane rounding
 * contract — and any future per-corner shape (cards, tab corners,
 * partial-stack rounding) — in one place.
 *
 * The actual path-tracing primitives (canvas `arcTo` vs SVG `A`) stay in
 * each renderer because their output formats differ — this module owns
 * the geometry, the renderers own the drawing language.
 */
import type { RectSceneNode } from "../types"

/** True when at least one corner has a positive radius. */
export function hasAnyCornerRadius(c: NonNullable<RectSceneNode["cornerRadii"]>): boolean {
  return (c.tl ?? 0) > 0 || (c.tr ?? 0) > 0 || (c.br ?? 0) > 0 || (c.bl ?? 0) > 0
}

export interface ClampedCornerRadii {
  tl: number
  tr: number
  br: number
  bl: number
}

/**
 * Read each corner's radius and clamp to `min(w, h) / 2` so a corner
 * never overdraws past the rect's center on thin lanes. Missing corners
 * collapse to 0 (square).
 */
export function clampCornerRadii(node: RectSceneNode): ClampedCornerRadii {
  const c = node.cornerRadii
  if (!c) return { tl: 0, tr: 0, br: 0, bl: 0 }
  const limit = Math.min(node.w, node.h) / 2
  return {
    tl: Math.min(c.tl ?? 0, limit),
    tr: Math.min(c.tr ?? 0, limit),
    br: Math.min(c.br ?? 0, limit),
    bl: Math.min(c.bl ?? 0, limit),
  }
}

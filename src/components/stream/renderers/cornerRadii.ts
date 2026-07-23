/**
 * Per-corner radius geometry shared between the canvas
 * (`barCanvasRenderer`) and SVG (`SceneToSVG`) paint paths.
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
 * Read each corner's radius and clamp to `[0, min(w, h) / 2]` so a
 * corner never overdraws past the rect's center on thin lanes AND a
 * negative input never leaks into the `moveTo` / `lineTo` math (where
 * a negative radius would offset the start point into invalid space,
 * producing visibly bent or escaping paths even though the `arcTo`
 * is gated on `> 0`). Missing corners collapse to 0 (square).
 */
export function clampCornerRadii(node: RectSceneNode): ClampedCornerRadii {
  const c = node.cornerRadii
  if (!c) return { tl: 0, tr: 0, br: 0, bl: 0 }
  const limit = Math.min(node.w, node.h) / 2
  const clamp = (v: number | undefined): number =>
    Math.max(0, Math.min(v ?? 0, limit))
  return {
    tl: clamp(c.tl),
    tr: clamp(c.tr),
    br: clamp(c.br),
    bl: clamp(c.bl),
  }
}

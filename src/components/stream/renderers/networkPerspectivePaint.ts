/** Canvas helpers for perspective-projected network marks. */
import type { Style } from "../types"
import { resolveCanvasFill } from "./canvasRenderHelpers"
import { shadeColor } from "../colorShade"

// Projected perspective outlines repeat across paints of a settled scene.
let SCENE_PATH_CACHE: Map<string, Path2D> | null = null

/** Parse (and cache) a scene path string for canvas painting. */
export function cachedScenePath2D(d: string): Path2D | null {
  if (typeof Path2D === "undefined" || !d) return null
  if (!SCENE_PATH_CACHE) SCENE_PATH_CACHE = new Map()
  let path = SCENE_PATH_CACHE.get(d)
  if (!path) {
    path = new Path2D(d)
    if (SCENE_PATH_CACHE.size > 2048) SCENE_PATH_CACHE.clear()
    SCENE_PATH_CACHE.set(d, path)
  }
  return path
}

/**
 * Paint extruded perspective faces under a mark, each mixed toward black or
 * white from the mark's resolved fill. Patterns and gradients keep their fill.
 */
export function paintPerspectiveFaces(
  ctx: CanvasRenderingContext2D,
  style: Style,
  faces: ReadonlyArray<{ pathD: string; shade: number }> | undefined,
  fallback: string
): void {
  if (!faces?.length || !style.fill) return
  const priorAlpha = ctx.globalAlpha
  const alpha = (style.opacity ?? priorAlpha) * (style.fillOpacity ?? 1)
  if (!(alpha > 0)) return
  const resolved = resolveCanvasFill(ctx, style.fill, fallback)
  let base: string | CanvasPattern | CanvasGradient = resolved
  if (typeof resolved === "string") {
    // Invisible pieces (hit targets) have no walls.
    if (/^\s*(none|transparent)\s*$/i.test(resolved)) return
    // Normalize named colors to #rrggbb/rgba() so they can be shaded.
    ctx.fillStyle = resolved
    base = ctx.fillStyle
    if (/^rgba\(.*,\s*0(\.0+)?\s*\)$/.test(base)) return
  }
  ctx.globalAlpha = alpha
  for (const face of faces) {
    const path = cachedScenePath2D(face.pathD)
    if (!path) continue
    ctx.fillStyle = typeof base === "string" ? shadeColor(base, face.shade) : base
    ctx.fill(path)
  }
  ctx.globalAlpha = priorAlpha
}

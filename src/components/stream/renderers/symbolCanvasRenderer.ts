import type { SymbolSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { resolveCanvasFill } from "./canvasRenderHelpers"
import { symbolPathString } from "../symbolPath"

/**
 * Canvas painter for `SymbolSceneNode` — the per-datum shape channel for the XY
 * and ordinal pipelines (the sibling of `networkSymbolRenderer`). Both delegate
 * glyph-path generation to the shared `symbolPathString`, so a glyph looks
 * identical across canvas, SVG/SSR, and every chart family — there is no second
 * path implementation.
 *
 * Named shapes are cached as `Path2D` by `symbolType:size`, so a scene of
 * thousands of marks parses only a handful of distinct paths. Honors the
 * incoming canvas alpha (chart-wide staleness dim) multiplied by each node's
 * own opacity / decay.
 */
const PATH_CACHE = new Map<string, Path2D>()

function getSymbolPath2D(node: SymbolSceneNode): Path2D | null {
  try {
    if (node.path) return new Path2D(node.path)
    const key = `${node.symbolType ?? "circle"}:${Math.round(node.size)}`
    let p = PATH_CACHE.get(key)
    if (!p) {
      p = new Path2D(symbolPathString(node.symbolType, node.size))
      if (PATH_CACHE.size > 256) PATH_CACHE.clear()
      PATH_CACHE.set(key, p)
    }
    return p
  } catch {
    return null
  }
}

export const symbolCanvasRenderer: StreamRendererFn = (ctx, nodes) => {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "symbol") continue
    const s = node as SymbolSceneNode
    if (s.size <= 0) continue
    const path = getSymbolPath2D(s)
    if (!path) continue

    ctx.save()
    ctx.translate(s.x, s.y)
    if (s.rotation) ctx.rotate(s.rotation)

    const nodeAlpha = (s.style.opacity ?? 1) * (s._decayOpacity ?? 1)

    if (s.style.fill) {
      ctx.globalAlpha = baseAlpha * nodeAlpha * (s.style.fillOpacity ?? 1)
      ctx.fillStyle = resolveCanvasFill(ctx, s.style.fill, "#4e79a7")
      ctx.fill(path)
    }

    if (s.style.stroke && s.style.stroke !== "none") {
      ctx.globalAlpha = baseAlpha * nodeAlpha
      ctx.strokeStyle = resolveCanvasFill(ctx, s.style.stroke, s.style.stroke)
      ctx.lineWidth = s.style.strokeWidth ?? 1
      ctx.stroke(path)
    }

    ctx.restore()
  }
  ctx.globalAlpha = baseAlpha
}

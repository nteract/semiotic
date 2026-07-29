import type { SymbolSceneNode } from "../types"
import type { NetworkSceneNode, NetworkSymbolNode } from "../networkTypes"
import type { StreamRendererFn } from "./types"
import { resolveCSSColor } from "./resolveCSSColor"
import { resolveCanvasFill } from "./canvasRenderHelpers"
import { symbolPathString } from "../symbolPath"

/**
 * Canvas painter for the per-datum shape ("symbol") channel — one `paintSymbol`
 * plus two thin exported wrappers, mirroring `glyphCanvasRenderer`'s shape for
 * its sibling composite-pictogram channel. `symbolCanvasRenderer` covers the
 * XY/ordinal pipeline (x/y-positioned nodes); `networkSymbolRenderer` covers
 * network (cx/cy-positioned nodes). Both delegate glyph-path generation to
 * `symbolPathString`, so a glyph looks identical across canvas, SVG/SSR, and
 * every chart family — there is no second path implementation.
 *
 * Named shapes are cached as `Path2D` by `symbolType:size` in one shared
 * cache, so a scene of thousands of marks across both pipelines parses only
 * a handful of distinct paths.
 */
const PATH_CACHE = new Map<string, Path2D>()

function getSymbolPath2D(
  symbolType: string | undefined,
  size: number,
  path: string | undefined
): Path2D | null {
  try {
    if (path) return new Path2D(path)
    const key = `${symbolType ?? "circle"}:${Math.round(size)}`
    let p = PATH_CACHE.get(key)
    if (!p) {
      p = new Path2D(symbolPathString(symbolType, size))
      if (PATH_CACHE.size > 256) PATH_CACHE.clear()
      PATH_CACHE.set(key, p)
    }
    return p
  } catch {
    return null
  }
}

/** Honors the incoming canvas alpha (chart-wide staleness dim) times each node's own opacity / decay. */
function paintSymbol(
  ctx: CanvasRenderingContext2D,
  node: SymbolSceneNode | NetworkSymbolNode,
  x: number,
  y: number,
  baseAlpha: number,
  defaultFill: string
): void {
  if (node.size <= 0) return
  const path = getSymbolPath2D(node.symbolType, node.size, node.path)
  if (!path) return

  ctx.save()
  ctx.translate(x, y)
  if (node.rotation) ctx.rotate(node.rotation)

  const decay = (node as SymbolSceneNode)._decayOpacity ?? 1
  const nodeAlpha = (node.style.opacity ?? 1) * decay

  if (node.style.fill) {
    ctx.globalAlpha = baseAlpha * nodeAlpha * (node.style.fillOpacity ?? 1)
    ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, defaultFill)
    ctx.fill(path)
  }

  if (node.style.stroke && node.style.stroke !== "none") {
    ctx.globalAlpha = baseAlpha * nodeAlpha
    ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
    ctx.lineWidth = node.style.strokeWidth ?? 1
    ctx.stroke(path)
  }

  ctx.restore()
}

/** XY / ordinal painter (x/y-positioned symbol nodes). */
export const symbolCanvasRenderer: StreamRendererFn = (ctx, nodes) => {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "symbol") continue
    const s = node as SymbolSceneNode
    paintSymbol(ctx, s, s.x, s.y, baseAlpha, "#4e79a7")
  }
  ctx.globalAlpha = baseAlpha
}

/** Network painter (cx/cy-positioned symbol nodes). */
export function networkSymbolRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "symbol") continue
    const s = node as NetworkSymbolNode
    paintSymbol(ctx, s, s.cx, s.cy, baseAlpha, "#007bff")
  }
  ctx.globalAlpha = baseAlpha
}

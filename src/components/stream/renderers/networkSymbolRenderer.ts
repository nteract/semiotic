import type { NetworkSceneNode, NetworkSymbolNode } from "../networkTypes"
import { resolveCSSColor } from "./resolveCSSColor"
import { symbolPathString } from "../symbolPath"

/**
 * Canvas painter for `NetworkSymbolNode` — the per-datum shape channel.
 *
 * Each glyph is a `Path2D` translated to the node center (and optionally
 * rotated), filled/stroked from `style`. Named shapes are cached by
 * `symbolType:size`, so a scene of thousands of marks parses only a handful of
 * distinct paths. Mirrors the violin renderer's `Path2D` approach.
 */
const PATH_CACHE = new Map<string, Path2D>()

function getSymbolPath2D(node: NetworkSymbolNode): Path2D | null {
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

export function networkSymbolRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "symbol") continue
    const s = node as NetworkSymbolNode
    if (s.size <= 0) continue
    const path = getSymbolPath2D(s)
    if (!path) continue

    ctx.save()
    ctx.translate(s.cx, s.cy)
    if (s.rotation) ctx.rotate(s.rotation)

    const nodeAlpha = s.style.opacity ?? 1

    if (s.style.fill) {
      ctx.globalAlpha = baseAlpha * nodeAlpha * (s.style.fillOpacity ?? 1)
      ctx.fillStyle =
        typeof s.style.fill === "string"
          ? resolveCSSColor(ctx, s.style.fill) || s.style.fill
          : s.style.fill
      ctx.fill(path)
    }

    if (s.style.stroke && s.style.stroke !== "none") {
      ctx.globalAlpha = baseAlpha * nodeAlpha
      ctx.strokeStyle = resolveCSSColor(ctx, s.style.stroke) || s.style.stroke
      ctx.lineWidth = s.style.strokeWidth ?? 1
      ctx.stroke(path)
    }

    ctx.restore()
  }
}

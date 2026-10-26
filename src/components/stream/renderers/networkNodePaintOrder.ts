import type { NetworkSceneNode } from "../networkTypes"
import { paintNetworkPrimitives } from "./networkPrimitiveRenderer"
import { networkSymbolRenderer } from "./symbolCanvasRenderer"
import { networkGlyphRenderer } from "./glyphCanvasRenderer"
import { paintPerspectiveFaces } from "./networkPerspectivePaint"

/**
 * Symbols with perspective side walls (tokens): each symbol's walls, then the
 * symbol. Kept here, not in the shared symbol renderer, so XY/ordinal bundles
 * never pull in perspective paint code.
 */
function networkSymbolTokenRenderer(ctx: CanvasRenderingContext2D, nodes: NetworkSceneNode[]): void {
  if (!nodes.some((n) => n.type === "symbol" && n.faces)) {
    networkSymbolRenderer(ctx, nodes)
    return
  }
  const alpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "symbol") continue
    if (node.faces) {
      paintPerspectiveFaces(ctx, node.style, node.faces, "#007bff")
      ctx.globalAlpha = alpha
    }
    networkSymbolRenderer(ctx, [node])
  }
}

/**
 * Paint network nodes strictly in array order, batching contiguous runs of
 * one mark type through its renderer. Matches SVG/SSR order exactly, which
 * depth-sorted (perspective) scenes rely on.
 */
export function paintNetworkNodesInOrder(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  let start = 0
  for (let i = 1; i <= nodes.length; i++) {
    if (i < nodes.length && nodes[i].type === nodes[start].type) continue
    const type = nodes[start].type
    const batch = start === 0 && i === nodes.length ? nodes : nodes.slice(start, i)
    if (type === "symbol") networkSymbolTokenRenderer(ctx, batch)
    else if (type === "glyph") networkGlyphRenderer(ctx, batch)
    else if (type === "circle" || type === "rect" || type === "arc")
      paintNetworkPrimitives(ctx, batch, type)
    start = i
  }
}

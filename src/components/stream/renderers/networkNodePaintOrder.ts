import type { NetworkSceneNode } from "../networkTypes"
import { networkRectRenderer } from "./networkRectRenderer"
import { networkCircleRenderer } from "./networkCircleRenderer"
import { networkArcRenderer } from "./networkArcRenderer"
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

const RENDERERS: Record<
  NetworkSceneNode["type"],
  (ctx: CanvasRenderingContext2D, nodes: NetworkSceneNode[]) => void
> = {
  rect: networkRectRenderer,
  circle: networkCircleRenderer,
  arc: networkArcRenderer,
  symbol: networkSymbolTokenRenderer,
  glyph: networkGlyphRenderer
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
    const render = RENDERERS[nodes[start]?.type]
    if (render) render(ctx, start === 0 && i === nodes.length ? nodes : nodes.slice(start, i))
    start = i
  }
}

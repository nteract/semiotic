import type { NetworkSceneNode } from "../networkTypes"
import { paintNetworkPrimitives } from "./networkPrimitiveRenderer"

/** Canvas painter for NetworkRectNode. */
export function networkRectRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  paintNetworkPrimitives(ctx, nodes, "rect")
}

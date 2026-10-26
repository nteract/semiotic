import type { NetworkSceneNode } from "../networkTypes"
import { paintNetworkPrimitives } from "./networkPrimitiveRenderer"

/** Canvas painter for NetworkCircleNode. */
export function networkCircleRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  paintNetworkPrimitives(ctx, nodes, "circle")
}

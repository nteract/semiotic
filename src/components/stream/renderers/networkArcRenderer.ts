import type { NetworkSceneNode } from "../networkTypes"
import { paintNetworkPrimitives } from "./networkPrimitiveRenderer"

/** Canvas painter for NetworkArcNode. */
export function networkArcRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  paintNetworkPrimitives(ctx, nodes, "arc")
}

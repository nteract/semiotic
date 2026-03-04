import type { SceneNode, StreamScales, StreamLayout } from "../types"

/**
 * A canvas renderer function takes pre-computed SceneNodes and paints them.
 * Unlike the realtime RendererFn which receives raw data + scales,
 * the StreamXYFrame renderers receive already-projected scene graph nodes.
 */
export type StreamRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  scales: StreamScales,
  layout: StreamLayout
) => void

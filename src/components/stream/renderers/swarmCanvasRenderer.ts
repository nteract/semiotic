import type { StreamRendererFn } from "./types"
import { pointCanvasRenderer } from "./pointCanvasRenderer"

/**
 * Canvas swarm renderer.
 * Identical to point renderer — swarm data points are pre-computed as PointSceneNodes.
 * Separated for semantic clarity and potential future swarm-specific logic.
 */
export const swarmCanvasRenderer: StreamRendererFn = pointCanvasRenderer

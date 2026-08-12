import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import type { NetworkSceneEdge, NetworkSceneNode } from "./networkTypes"
import {
  rehitCanvasMarkCursor,
  sceneHasAuthoredCursor,
  sceneMarkCursor
} from "./sceneCursor"

export interface NetworkCursorInventory {
  nodes: boolean
  edges: boolean
}

export function refreshNetworkCursorInventory(
  inventory: NetworkCursorInventory,
  nodes: ReadonlyArray<NetworkSceneNode>,
  edges: ReadonlyArray<NetworkSceneEdge>
): boolean {
  inventory.nodes = sceneHasAuthoredCursor(nodes)
  inventory.edges = sceneHasAuthoredCursor(edges)
  return inventory.nodes || inventory.edges
}

export function rehitNetworkFrameCursor(
  options: CursorFrameGeometry & {
    store: NetworkPipelineStore
    cursorInventory: Readonly<NetworkCursorInventory>
  }
): void {
  rehitCanvasMarkCursor(options.canvas, options.pointer, (current) => {
    const result = resolveNetworkPointerHit({
      clientX: current.clientX,
      clientY: current.clientY,
      canvasRect: options.canvas.getBoundingClientRect(),
      margin: options.margin,
      adjustedWidth: options.width,
      adjustedHeight: options.height,
      sceneNodes: options.store.sceneNodes,
      sceneEdges: options.store.sceneEdges,
      // Rebuilding the lazy index on every moving frame costs another O(n)
      // pass. Cursor-enabled motion takes one direct hit scan instead.
      nodeQuadtree: options.geometryMoved ? null : options.store.nodeQuadtree,
      maxNodeRadius: options.geometryMoved ? 0 : options.store.maxNodeRadius,
      includeEdges: options.cursorInventory.edges
    })
    return result.kind === "hit" ? sceneMarkCursor(result.mark) : undefined
  })
}

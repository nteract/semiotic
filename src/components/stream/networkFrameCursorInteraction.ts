import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkViewTransform } from "./networkViewportTypes"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import type { NetworkSceneEdge, NetworkSceneNode } from "./networkTypes"
import {
  buildNetworkEdgeHitIndex,
  type NetworkEdgeHitIndex
} from "./networkEdgeHitIndex"
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

/** Keep custom-layout hit preparation off the pointer and camera-only paths. */
const prepared = new WeakMap<
  NetworkPipelineStore,
  { index: NetworkEdgeHitIndex; geometry: number; style: number }
>()

export function prepareNetworkCustomEdgeHits(
  store: NetworkPipelineStore
): void {
  if (
    store.lastCustomLayoutResult &&
    store.lastCustomLayoutResult.edgeHitTesting !== false
  ) {
    const revisions = store.getUpdateSnapshot().revisions
    prepared.set(store, {
      index: buildNetworkEdgeHitIndex(store.sceneEdges),
      geometry: revisions.sceneGeometry,
      style: revisions.sceneStyle
    })
  } else prepared.delete(store)
}

/** A mutation awaiting paint must use live records, never a stale snapshot. */
export function preparedNetworkCustomEdgeHits(
  store: NetworkPipelineStore
): NetworkEdgeHitIndex | undefined {
  const cached = prepared.get(store)
  if (!cached) return undefined
  const revisions = store.getUpdateSnapshot().revisions
  return cached.geometry === revisions.sceneGeometry &&
    cached.style === revisions.sceneStyle &&
    cached.index.edges === store.sceneEdges
    ? cached.index
    : undefined
}

export function rehitNetworkFrameCursor(
  options: CursorFrameGeometry & {
    store: NetworkPipelineStore
    cursorInventory: Readonly<NetworkCursorInventory>
    viewTransform?: NetworkViewTransform
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
      edgeIndex: preparedNetworkCustomEdgeHits(options.store),
      // Rebuilding the lazy index on every moving frame costs another O(n)
      // pass. Cursor-enabled motion takes one direct hit scan instead.
      nodeQuadtree: options.geometryMoved ? null : options.store.nodeQuadtree,
      maxNodeRadius: options.geometryMoved ? 0 : options.store.maxNodeRadius,
      includeEdges:
        options.cursorInventory.edges &&
        options.store.lastCustomLayoutResult?.edgeHitTesting !== false,
      viewTransform: options.viewTransform
    })
    return result.kind === "hit" ? sceneMarkCursor(result.mark) : undefined
  })
}

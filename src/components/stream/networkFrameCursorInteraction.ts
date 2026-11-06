import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkViewTransform } from "./networkViewportTypes"
import type { CursorFrameGeometry } from "./frameCursorInteraction"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import type { NetworkSceneEdge, NetworkSceneNode } from "./networkTypes"
import {
  buildNetworkRectHitIndex,
  type NetworkRectHitIndex
} from "./networkRectHitIndex"
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
  {
    hits: { edgeIndex?: NetworkEdgeHitIndex; rectIndex?: NetworkRectHitIndex }
    nodes: NetworkSceneNode[]
    edges: NetworkSceneEdge[]
    paint: number
    version: number
  }
>()

export function prepareNetworkCustomHits(store: NetworkPipelineStore): void {
  const result = store.lastCustomLayoutResult
  if (!result) {
    prepared.delete(store)
    return
  }
  const previous = prepared.get(store)
  const { sceneNodes: nodes, sceneEdges: edges, sceneVersion } = store
  prepared.set(store, {
    hits: {
      edgeIndex:
        result.edgeHitTesting === false
          ? undefined
          : buildNetworkEdgeHitIndex(edges),
      // Scene commits also cover retained-array relayouts/resizes, which need
      // no config/data invalidation. Restyles preserve committed geometry;
      // edge indexes still refresh their stroke radii.
      rectIndex:
        previous?.nodes === nodes && previous.version === sceneVersion
          ? previous.hits.rectIndex
          : buildNetworkRectHitIndex(nodes)
    },
    nodes,
    edges,
    paint: store.getUpdateSnapshot().revisions.dataPaint,
    version: sceneVersion
  })
}

/** Pending mutations fall back to live geometry until the next commit. */
export function preparedNetworkCustomHits(store: NetworkPipelineStore) {
  const cached = prepared.get(store)
  if (!cached) return
  // Network geometry/style invalidations both advance dataPaint. Camera-only
  // changes leave it unchanged, so pending edits fall back without rescanning
  // or retaining an entire revision snapshot on each prepared scene.
  if (
    cached.version === store.sceneVersion &&
    cached.paint === store.getUpdateSnapshot().revisions.dataPaint &&
    cached.nodes === store.sceneNodes &&
    cached.edges === store.sceneEdges
  )
    return cached.hits
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
      ...preparedNetworkCustomHits(options.store),
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

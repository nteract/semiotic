import type { Datum } from "../charts/shared/datumTypes"
import type {
  EdgePush,
  RealtimeEdge,
  RealtimeNode
} from "./networkTypes"
import type { CustomLayoutFailureDiagnostic } from "./customLayoutFailure"
import type { NetworkLayoutResult } from "./networkCustomLayout"

/** Imperative API exposed by `StreamNetworkFrame` refs. */
export interface StreamNetworkFrameHandle {
  /** Ingest one edge immediately and coalesce its expensive layout with other
   * pushes at the next animation frame. Geometry getters commit first. */
  push(edge: EdgePush): void
  /** Ingest and lay out an explicit edge batch synchronously, absorbing any
   * layout pending from prior single-edge pushes. */
  pushMany(edges: EdgePush[]): void
  /** Remove a node by ID. Also removes connected edges. */
  removeNode(id: string): boolean
  /** Remove edges by source+target, or by edge ID when edgeIdAccessor is configured. */
  removeEdge(sourceIdOrEdgeId: string, targetId?: string): boolean
  /** Update a node's data by ID. Returns previous data. */
  updateNode(id: string, updater: (data: Datum) => Datum): Datum | null
  /** Update all edges between source+target. Returns array of previous data. */
  updateEdge(sourceId: string, targetId: string, updater: (data: Datum) => Datum): Datum[]
  clear(): void
  getTopology(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] }
  getTopologyDiff(): { addedNodes: string[]; removedNodes: string[]; addedEdges: string[]; removedEdges: string[] }
  relayout(): void
  getTension(): number
  /** The most recent custom layout result (sceneNodes/sceneEdges/overlays as
   *  returned by `customNetworkLayout`) - host readback so pages that need the
   *  computed placement do not re-run the layout. Null before the first layout
   *  or when no custom layout is configured. A failed retry retains the prior
   *  good result; inspect `getLayoutFailure()` to distinguish recovery. */
  getCustomLayout(): NetworkLayoutResult | null
  /** The latest custom-layout failure, if any. Cleared by a successful layout,
   * removing the custom layout, or `clear()`. */
  getLayoutFailure(): CustomLayoutFailureDiagnostic | null
}

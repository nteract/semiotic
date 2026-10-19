import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkPipelineConfig, RealtimeEdge } from "./networkTypes"
import {
  explicitNetworkEdgeKey,
  resolveNetworkEdgeDatum
} from "./networkDataNormalization"

/** Validate replacement data before mutating any retained edge. Identity is immutable. */
export function validateNetworkEdgeUpdate(
  edge: RealtimeEdge,
  data: Datum,
  config: NetworkPipelineConfig
): void {
  if (config.edgeIdentity !== "id") return
  const resolved = resolveNetworkEdgeDatum(data, config)
  const source = typeof edge.source === "string" ? edge.source : edge.source.id
  const target = typeof edge.target === "string" ? edge.target : edge.target.id
  if (
    explicitNetworkEdgeKey(data, config) !== edge._edgeKey ||
    !resolved ||
    resolved.source !== source ||
    resolved.target !== target
  )
    throw new Error(
      "IDENTITY_EDGE_UPDATE: update cannot change edge ID or owners; remove and reinsert the edge."
    )
}

export { explicitNetworkEdgeKey } from "./networkDataNormalization"

export function networkEdgeIdentityChanged(
  previous: NetworkPipelineConfig,
  next: NetworkPipelineConfig
): boolean {
  return (
    (previous.edgeIdentity ?? "pair") !== (next.edgeIdentity ?? "pair") ||
    (next.edgeIdentity === "id" &&
      previous.edgeIdAccessor !== next.edgeIdAccessor)
  )
}

/** Validate a mode/accessor change before mutating retained topology. */
export function rekeyNetworkEdges(
  edges: Map<string, RealtimeEdge>,
  config: NetworkPipelineConfig
): Array<{ previous: string; key: string; edge: RealtimeEdge }> {
  const keys = new Set<string>()
  return [...edges].map(([previous, edge]) => {
    const key = explicitNetworkEdgeKey(edge.data ?? {}, config)
    if (keys.has(key))
      throw new Error(
        "IDENTITY_DUPLICATE_EDGE: cannot adopt an accessor that repeats existing IDs."
      )
    keys.add(key)
    return { previous, key, edge }
  })
}

import type { RealtimeEdge } from "../networkTypes"

/** Resolve the same authored weight on the main thread and in worker snapshots. */
export function resolveForceEdgeWeight(edge: RealtimeEdge): number {
  const explicit = edge.data?.weight ?? (edge as RealtimeEdge & { weight?: unknown }).weight
  return typeof explicit === "number" && Number.isFinite(explicit)
    ? explicit
    : Number.isFinite(edge.value) ? edge.value : 1
}

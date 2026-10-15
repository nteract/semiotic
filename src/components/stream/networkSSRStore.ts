import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig } from "./networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"

/** Normalize frame data and build isolated server geometry. */
export function buildNetworkSSRStore(
  config: NetworkPipelineConfig,
  {
    nodes,
    edges,
    hierarchy
  }: {
    nodes?: Datum[]
    edges?: Datum[]
    hierarchy?: Datum
  },
  size: [number, number]
): NetworkPipelineStore {
  const store = new NetworkPipelineStore(config)
  if (hierarchy) store.ingestHierarchy(hierarchy, size)
  else store.ingestBounded(filterSparseArray(nodes), filterSparseArray(edges), size)
  store.cancelIntroAnimation()
  store.buildScene(size)
  return store
}

import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type {
  NetworkPipelineConfig,
  StreamNetworkFrameProps
} from "./networkTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { HIERARCHICAL_NETWORK_LAYOUTS } from "./networkLayoutCapabilities"

/** An isolated store makes render retries independent of the mounted live store. */
export function buildNetworkSSRStore(
  config: NetworkPipelineConfig,
  props: StreamNetworkFrameProps,
  size: [number, number]
): NetworkPipelineStore {
  const store = new NetworkPipelineStore(config)
  const hierarchy = HIERARCHICAL_NETWORK_LAYOUTS.has(props.chartType)
    ? props.data || (!Array.isArray(props.edges) ? props.edges : undefined)
    : undefined
  if (hierarchy) store.ingestHierarchy(hierarchy, size)
  else {
    const nodes = filterSparseArray(props.nodes)
    const edges = Array.isArray(props.edges)
      ? filterSparseArray(props.edges)
      : []
    if (nodes.length || edges.length) store.ingestBounded(nodes, edges, size)
  }
  store.cancelIntroAnimation()
  store.buildScene(size)
  return store
}

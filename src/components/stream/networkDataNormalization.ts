import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkPipelineConfig } from "./networkTypes"

type NetworkAccessor = string | ((datum: Datum) => unknown) | undefined
type NetworkAccessors = Pick<
  NetworkPipelineConfig,
  "nodeIDAccessor" | "sourceAccessor" | "targetAccessor" | "valueAccessor"
>

export function readNetworkAccessor(
  datum: Datum,
  accessor: NetworkAccessor,
  fallback: string
): unknown {
  return typeof accessor === "function"
    ? accessor(datum)
    : datum[accessor ?? fallback]
}

export function normalizeNetworkValue(value: unknown): number {
  const numeric = value == null ? NaN : Number(value)
  return Number.isFinite(numeric) ? numeric : 1
}

export function normalizeNetworkId(
  value: unknown,
  kind: string
): string | null {
  if (value != null) return String(value)
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[Semiotic] Missing network ${kind} ID; skipping this datum.`)
  }
  return null
}

interface ResolvedNetworkEdge {
  source: string
  target: string
  value: number
  data: Datum
}

export function resolveNetworkEdgeDatum(
  raw: Datum,
  config: NetworkAccessors
): ResolvedNetworkEdge | null {
  const source = normalizeNetworkId(
    readNetworkAccessor(raw, config.sourceAccessor, "source"),
    "source"
  )
  const target = normalizeNetworkId(
    readNetworkAccessor(raw, config.targetAccessor, "target"),
    "target"
  )
  if (source === null || target === null) return null
  return {
    source,
    target,
    value: normalizeNetworkValue(
      readNetworkAccessor(raw, config.valueAccessor, "value")
    ),
    data: raw
  }
}

/** Normalize one bounded graph, including endpoints absent from a partial node list. */
export function normalizeNetworkData(
  rawNodes: Datum[],
  rawEdges: Datum[],
  config: NetworkAccessors
): {
  nodes: Map<string, Datum>
  edges: Array<ResolvedNetworkEdge & { _edgeKey: string }>
} {
  const nodes = new Map<string, Datum>()
  for (const raw of rawNodes) {
    const id = normalizeNetworkId(
      readNetworkAccessor(raw, config.nodeIDAccessor, "id"),
      "node"
    )
    if (id === null) continue
    if (nodes.has(id) && process.env.NODE_ENV !== "production") {
      console.warn(
        `[Semiotic] Duplicate network node ID "${id}"; using the last datum.`
      )
    }
    nodes.set(id, raw)
  }
  const edges: Array<ResolvedNetworkEdge & { _edgeKey: string }> = []
  rawEdges.forEach((raw, index) => {
    const edge = resolveNetworkEdgeDatum(raw, config)
    if (!edge) return
    for (const id of [edge.source, edge.target]) {
      if (!nodes.has(id)) nodes.set(id, { id })
    }
    edges.push({
      ...edge,
      _edgeKey: `${edge.source}\0${edge.target}\0${index}`
    })
  })
  return { nodes, edges }
}

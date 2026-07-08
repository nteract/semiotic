import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import { inferNodesFromEdges } from "../shared/networkUtils"

export interface NetworkHOPsSample<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
> {
  id?: string | number
  label?: string
  nodes?: TNode[]
  edges: TEdge[]
}

export interface NetworkHOPsModel {
  nodes: Datum[]
  aggregateEdges: Datum[]
  activeEdgeIds: Set<string>
  sampleIndex: number
  sampleLabel: string
  sampleCount: number
  projectionRows: Array<{ label: string; value: number; secondary?: number }>
}

export interface NetworkHOPsModelOptions<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
> {
  nodes?: TNode[]
  edges?: TEdge[]
  samples?: NetworkHOPsSample<TNode, TEdge>[]
  nodeIdAccessor?: ChartAccessor<TNode, string>
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  edgeProbabilityAccessor?: ChartAccessor<TEdge, number>
  sampleIndex?: number
  seed?: number
}

export const NETWORK_HOPS_EDGE_ID = "__networkHopsEdgeId"
export const NETWORK_HOPS_PROBABILITY = "__networkHopsProbability"

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue> | undefined,
  fallback: string
): TValue {
  if (typeof accessor === "function") return accessor(datum, index)
  return datum[(accessor ?? fallback) as string] as TValue
}

function finiteProbability(value: unknown, fallback = 0.5): number {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.min(1, numeric))
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function networkHOPsEdgeId<TEdge extends Datum>(
  edge: TEdge,
  index: number,
  sourceAccessor: ChartAccessor<TEdge, string> | undefined = "source",
  targetAccessor: ChartAccessor<TEdge, string> | undefined = "target"
): string {
  const explicit = edge.id ?? edge[NETWORK_HOPS_EDGE_ID]
  if (explicit != null && explicit !== "") return String(explicit)
  const source = readAccessor(edge, index, sourceAccessor, "source")
  const target = readAccessor(edge, index, targetAccessor, "target")
  if (source != null && target != null) return `${source}->${target}`
  return `edge-${index}`
}

function addNodes(nodes: Datum[], next: readonly Datum[] | undefined): void {
  if (!next) return
  for (const node of next) {
    if (node && typeof node === "object") nodes.push(node)
  }
}

function uniqueNodes<TNode extends Datum, TEdge extends Datum>(
  nodes: TNode[] | undefined,
  aggregateEdges: Datum[],
  nodeIdAccessor: ChartAccessor<TNode, string> | undefined,
  sourceAccessor: ChartAccessor<TEdge, string> | undefined,
  targetAccessor: ChartAccessor<TEdge, string> | undefined
): Datum[] {
  const inferred = inferNodesFromEdges(
    nodes as Datum[] | undefined,
    aggregateEdges,
    sourceAccessor as ChartAccessor<Datum, string>,
    targetAccessor as ChartAccessor<Datum, string>
  )
  const seen = new Set<string>()
  const result: Datum[] = []
  inferred.forEach((node, index) => {
    const id = readAccessor(
      node as TNode,
      index,
      nodeIdAccessor,
      "id"
    )
    const key = String(id ?? node.id ?? index)
    if (seen.has(key)) return
    seen.add(key)
    result.push(node)
  })
  return result
}

export function buildNetworkHOPsModel<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
>(options: NetworkHOPsModelOptions<TNode, TEdge>): NetworkHOPsModel {
  const {
    edgeProbabilityAccessor = "p" as ChartAccessor<TEdge, number>,
    edges,
    nodeIdAccessor = "id" as ChartAccessor<TNode, string>,
    nodes,
    sampleIndex = 0,
    samples,
    seed = 1,
    sourceAccessor = "source" as ChartAccessor<TEdge, string>,
    targetAccessor = "target" as ChartAccessor<TEdge, string>
  } = options

  const resolvedIndex = Math.max(0, Math.floor(sampleIndex))
  const aggregate = new Map<string, Datum & Record<string, unknown>>()
  const activeEdgeIds = new Set<string>()
  const sampledNodes: Datum[] = []

  if (samples?.length) {
    const sampleCount = samples.length
    const activeSample = samples[resolvedIndex % sampleCount]
    const counts = new Map<string, number>()

    samples.forEach((sample) => {
      addNodes(sampledNodes, sample.nodes)
      sample.edges.forEach((edge, edgeIndex) => {
        const id = networkHOPsEdgeId(edge, edgeIndex, sourceAccessor, targetAccessor)
        counts.set(id, (counts.get(id) ?? 0) + 1)
        if (!aggregate.has(id)) {
          aggregate.set(id, {
            ...edge,
            [NETWORK_HOPS_EDGE_ID]: id
          })
        }
      })
    })

    activeSample.edges.forEach((edge, edgeIndex) => {
      activeEdgeIds.add(networkHOPsEdgeId(edge, edgeIndex, sourceAccessor, targetAccessor))
    })

    for (const [id, edge] of aggregate) {
      edge[NETWORK_HOPS_PROBABILITY] = (counts.get(id) ?? 0) / sampleCount
    }

    const aggregateEdges = Array.from(aggregate.values())
    return {
      nodes: uniqueNodes(
        (nodes?.length ? nodes : sampledNodes) as TNode[] | undefined,
        aggregateEdges,
        nodeIdAccessor,
        sourceAccessor,
        targetAccessor
      ),
      aggregateEdges,
      activeEdgeIds,
      sampleIndex: resolvedIndex % sampleCount,
      sampleLabel: String(activeSample.label ?? activeSample.id ?? `sample ${resolvedIndex % sampleCount + 1}`),
      sampleCount,
      projectionRows: [
        { label: "active edges", value: activeEdgeIds.size },
        { label: "aggregate edges", value: aggregateEdges.length },
        { label: "samples", value: sampleCount }
      ]
    }
  }

  const random = seededRandom(seed + resolvedIndex * 4099)
  const aggregateEdges = (edges ?? []).map((edge, edgeIndex) => {
    const id = networkHOPsEdgeId(edge, edgeIndex, sourceAccessor, targetAccessor)
    const probability = finiteProbability(
      readAccessor(edge, edgeIndex, edgeProbabilityAccessor, "p")
    )
    if (random() <= probability) activeEdgeIds.add(id)
    return {
      ...edge,
      [NETWORK_HOPS_EDGE_ID]: id,
      [NETWORK_HOPS_PROBABILITY]: probability
    }
  })

  const meanProbability =
    aggregateEdges.reduce(
      (sum, edge) => sum + Number(edge[NETWORK_HOPS_PROBABILITY] ?? 0),
      0
    ) / Math.max(1, aggregateEdges.length)

  return {
    nodes: uniqueNodes(
      nodes,
      aggregateEdges,
      nodeIdAccessor,
      sourceAccessor,
      targetAccessor
    ),
    aggregateEdges,
    activeEdgeIds,
    sampleIndex: resolvedIndex,
    sampleLabel: `sample ${resolvedIndex + 1}`,
    sampleCount: 0,
    projectionRows: [
      { label: "active edges", value: activeEdgeIds.size },
      { label: "possible edges", value: aggregateEdges.length },
      { label: "mean p", value: Math.round(meanProbability * 100) }
    ]
  }
}

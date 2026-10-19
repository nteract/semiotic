import type {
  CompositionalGraph,
  CompositionalNode,
  EndpointRef,
  GraphPatch,
  Port,
  PreparedCompositionalGraph,
  Transfer,
  Connection
} from "./types"
import {
  canonical,
  compareIds,
  compositionalEndpointKey,
  endpoint,
  fail,
  freeze
} from "./identity"

export interface GraphIndex {
  nodes: Map<string, CompositionalNode>
  endpoints: Map<string, EndpointRef>
  ownerEndpoints: Map<string, EndpointRef[]>
  tracePolicies: Map<string, NonNullable<CompositionalNode["tracePolicy"]>>
  incoming: Map<string, Connection[]>
  outgoing: Map<string, Connection[]>
  transferIn: Map<string, Transfer[]>
  transferOut: Map<string, Transfer[]>
}
const indexes = new WeakMap<PreparedCompositionalGraph, GraphIndex>()

function unique<T extends { readonly id: string }>(
  items: readonly T[],
  scope: string
): Map<string, T> {
  const result = new Map<string, T>()
  for (const item of items) {
    if (typeof item.id !== "string" || !item.id || result.has(item.id))
      fail(
        "IDENTITY_DUPLICATE_OR_EMPTY",
        `IDs must be nonempty and unique in ${scope}.`
      )
    result.set(item.id, item)
  }
  return result
}

function containment<T>(
  items: Map<string, T>,
  parent: (item: T) => string | undefined
): void {
  const done = new Set<string>()
  for (const id of items.keys()) {
    const active = new Set<string>()
    let cursor: string | undefined = id
    while (cursor !== undefined && !done.has(cursor)) {
      if (active.has(cursor))
        fail("IDENTITY_CONTAINMENT_CYCLE", "Containment must be acyclic.")
      const item = items.get(cursor)
      if (!item)
        fail(
          "IDENTITY_UNKNOWN_PARENT",
          "Containment references an unknown parent."
        )
      active.add(cursor)
      cursor = parent(item)
    }
    active.forEach((key) => done.add(key))
  }
}

export function resolveEndpoint(
  nodes: Map<string, CompositionalNode>,
  ref: EndpointRef,
  use?: "source" | "target" | "transfer-source" | "transfer-target"
): Port | undefined {
  const owner = nodes.get(ref.nodeId)
  if (!owner)
    fail("ENDPOINT_UNKNOWN_OWNER", "Endpoint owner does not exist.", {
      endpointRefs: [ref]
    })
  const local = ref.endpoint
  if (local.kind !== "node" && local.kind !== "part")
    fail("ENDPOINT_KIND", "Unknown endpoint kind.")
  const part =
    local.kind === "part"
      ? owner.parts?.find((p) => p.id === local.partId)
      : undefined
  if (local.kind === "part" && !part)
    fail("ENDPOINT_UNKNOWN_PART", "Endpoint part does not exist.", {
      endpointRefs: [ref]
    })
  if (local.portId === undefined) return undefined
  const port = (part ? part.ports : owner.ports)?.find(
    (p) => p.id === local.portId
  )
  if (!port)
    fail("ENDPOINT_UNKNOWN_PORT", "Endpoint port does not exist.", {
      endpointRefs: [ref]
    })
  const expected = use === "source" || use === "transfer-target" ? "out" : "in"
  if (use && port.direction !== expected && port.direction !== "inout")
    fail("ENDPOINT_DIRECTION", "Port direction is incompatible with its use.", {
      endpointRefs: [ref]
    })
  return port
}

function add<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key) ?? []
  list.push(value)
  map.set(key, list)
}

export function graphIndex(prepared: PreparedCompositionalGraph): GraphIndex {
  const cached = indexes.get(prepared)
  if (cached) return cached
  const graph = prepared.graph
  const index: GraphIndex = {
    nodes: new Map(graph.nodes.map((n) => [n.id, n])),
    endpoints: new Map(),
    ownerEndpoints: new Map(),
    tracePolicies: new Map(),
    incoming: new Map(),
    outgoing: new Map(),
    transferIn: new Map(),
    transferOut: new Map()
  }
  const key = (ref: EndpointRef) => {
    const id = compositionalEndpointKey(ref)
    if (!index.endpoints.has(id)) add(index.ownerEndpoints, ref.nodeId, ref)
    index.endpoints.set(id, ref)
    return id
  }
  const transferOwners = new Set(graph.transfers?.map((t) => t.nodeId))
  for (const n of [...graph.nodes].sort((a, b) => compareIds(a.id, b.id))) {
    index.tracePolicies.set(
      n.id,
      n.tracePolicy ??
        (n.parts?.length || n.ports?.length || transferOwners.has(n.id)
          ? "explicit"
          : "atomic")
    )
    key(endpoint(n.id))
    for (const p of n.ports ?? [])
      key(endpoint(n.id, { kind: "node", portId: p.id }))
    for (const p of n.parts ?? []) {
      key(endpoint(n.id, { kind: "part", partId: p.id }))
      for (const port of p.ports ?? [])
        key(endpoint(n.id, { kind: "part", partId: p.id, portId: port.id }))
    }
  }
  for (const e of [...graph.edges].sort((a, b) => compareIds(a.id, b.id))) {
    add(index.outgoing, key(endpoint(e.source, e.sourceEndpoint)), e)
    add(index.incoming, key(endpoint(e.target, e.targetEndpoint)), e)
  }
  for (const t of [...(graph.transfers ?? [])].sort((a, b) =>
    compareIds(a.id, b.id)
  )) {
    add(index.transferIn, key(endpoint(t.nodeId, t.target)), t)
    for (const s of t.sources)
      add(index.transferOut, key(endpoint(t.nodeId, s)), t)
  }
  for (const endpoints of index.ownerEndpoints.values())
    endpoints.sort((a, b) =>
      compareIds(compositionalEndpointKey(a), compositionalEndpointKey(b))
    )
  indexes.set(prepared, index)
  return index
}

/** Validate the complete transaction before returning an immutable, portable snapshot. */
export function prepareCompositionalGraph(
  input: CompositionalGraph
): PreparedCompositionalGraph {
  if (input.schemaVersion !== "semiotic.compositional-graph.v0.1")
    fail("IDENTITY_SCHEMA", "Unknown graph schema.")
  if (
    typeof input.graphId !== "string" ||
    !input.graphId ||
    typeof input.revision !== "string" ||
    !input.revision
  )
    fail("IDENTITY_REVISION", "Graph ID and revision are required.")
  const nodes = unique(input.nodes, "nodes")
  unique(input.edges, "edges")
  unique(input.transfers ?? [], "transfers")
  containment(nodes, (n) => n.parentId)
  const validatePorts = (ports: readonly Port[] = []) => {
    unique(ports, "ports")
    for (const port of ports)
      if (!["in", "out", "inout"].includes(port.direction))
        fail("ENDPOINT_DIRECTION", "Unknown port direction.")
  }
  for (const node of nodes.values()) {
    if (
      node.tracePolicy &&
      !["atomic", "explicit", "opaque"].includes(node.tracePolicy)
    )
      fail("TRACE_POLICY", "Unknown trace policy.")
    validatePorts(node.ports)
    const parts = unique(node.parts ?? [], "owner parts")
    containment(parts, (p) => p.parentPartId)
    for (const part of parts.values()) validatePorts(part.ports)
  }
  for (const e of input.edges) {
    resolveEndpoint(nodes, endpoint(e.source, e.sourceEndpoint), "source")
    resolveEndpoint(nodes, endpoint(e.target, e.targetEndpoint), "target")
  }
  for (const t of input.transfers ?? []) {
    if (
      !t.sources.length ||
      !["identity", "all", "any", "unspecified"].includes(t.combination) ||
      (t.combination === "identity" && t.sources.length !== 1)
    )
      fail(
        "ENDPOINT_TRANSFER",
        "Transfers need inputs and a valid combination; identity needs one input."
      )
    const sourceKeys = new Set(
      t.sources.map((s) => compositionalEndpointKey(endpoint(t.nodeId, s)))
    )
    if (sourceKeys.size !== t.sources.length)
      fail("ENDPOINT_TRANSFER", "Transfer inputs must be distinct.")
    t.sources.forEach((s) =>
      resolveEndpoint(nodes, endpoint(t.nodeId, s), "transfer-source")
    )
    resolveEndpoint(nodes, endpoint(t.nodeId, t.target), "transfer-target")
  }
  // Snapshot through JSON keeps application objects unfrozen and rejects nonportable payloads.
  let graph: CompositionalGraph
  try {
    graph = JSON.parse(
      JSON.stringify(input, (_key, value: unknown) => {
        if (
          typeof value === "function" ||
          typeof value === "symbol" ||
          typeof value === "bigint" ||
          (typeof value === "number" && !Number.isFinite(value))
        )
          throw new Error("Non-JSON value")
        return value
      })
    ) as CompositionalGraph
  } catch {
    fail("IDENTITY_NONPORTABLE", "Graph must be serializable JSON.")
  }
  const byId = <T extends { id: string }>(items: readonly T[]) =>
    [...items].sort((a, b) => compareIds(a.id, b.id))
  // Full canonical content is the collision-free semantic key. Payload/labels are deliberately excluded.
  const semanticHash = canonical({
    graphId: graph.graphId,
    nodes: byId(graph.nodes).map(
      ({ id, parentId, tracePolicy, ports, parts }) => ({
        id,
        parentId,
        tracePolicy,
        ports: byId(ports ?? []).map(({ id, direction }) => ({
          id,
          direction
        })),
        parts: byId(parts ?? []).map(({ id, parentPartId, ports }) => ({
          id,
          parentPartId,
          ports: byId(ports ?? []).map(({ id, direction }) => ({
            id,
            direction
          }))
        }))
      })
    ),
    edges: byId(graph.edges).map(({ data: _data, ...edge }) => edge),
    transfers: byId(graph.transfers ?? [])
  })
  const prepared: PreparedCompositionalGraph = freeze({
    schemaVersion: "semiotic.prepared-compositional-graph.v0.1",
    graph,
    semanticHash,
    diagnostics: []
  })
  graphIndex(prepared)
  return prepared
}

/** Atomic patch: dangling endpoints or a stale base reject the entire result. */
export function patchCompositionalGraph(
  prepared: PreparedCompositionalGraph,
  patch: GraphPatch
): PreparedCompositionalGraph {
  if (
    patch.baseRevision !== prepared.graph.revision ||
    patch.revision === patch.baseRevision
  )
    fail(
      "REVISION_PATCH_BASE",
      "Patch requires the current base and a new revision."
    )
  const apply = <T extends { readonly id: string }>(
    items: readonly T[],
    remove: readonly string[] = [],
    upsert: readonly T[] = []
  ) => {
    unique(upsert, "patch upserts")
    const result = new Map(items.map((item) => [item.id, item]))
    remove.forEach((id) => result.delete(id))
    upsert.forEach((item) => result.set(item.id, item))
    return [...result.values()]
  }
  return prepareCompositionalGraph({
    ...prepared.graph,
    revision: patch.revision,
    nodes: apply(prepared.graph.nodes, patch.removeNodeIds, patch.upsertNodes),
    edges: apply(prepared.graph.edges, patch.removeEdgeIds, patch.upsertEdges),
    transfers: apply(
      prepared.graph.transfers ?? [],
      patch.removeTransferIds,
      patch.upsertTransfers
    )
  })
}

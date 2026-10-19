import type {
  Diagnostic,
  EndpointRef,
  PreparedCompositionalGraph,
  TraceRequest,
  TraceResult
} from "./types"
import {
  compareIds,
  compositionalEndpointKey as key,
  endpoint,
  fail,
  freeze
} from "./identity"
import { graphIndex, resolveEndpoint } from "./prepare"

/** Dependency reachability. `all` inputs are dependencies, never a sufficiency claim. */
export function traceCompositionalGraph(
  prepared: PreparedCompositionalGraph,
  request: TraceRequest
): TraceResult {
  if (
    !Number.isInteger(request.maxVisited) ||
    request.maxVisited < 1 ||
    !Number.isInteger(request.maxDepth) ||
    request.maxDepth < 0
  )
    fail(
      "TRACE_BUDGET",
      "Trace budgets must be finite nonnegative integers, with at least one visit."
    )
  const index = graphIndex(prepared)
  resolveEndpoint(index.nodes, request.start)
  const upstream = request.direction === "upstream"
  const queue: Array<{ ref: EndpointRef; depth: number }> = [
    { ref: request.start, depth: 0 }
  ]
  const queued = new Set([key(request.start)])
  const visited = new Map<string, EndpointRef>(),
    boundaries = new Map<string, EndpointRef>()
  const edges = new Set<string>(),
    transfers = new Set<string>(),
    diagnostics: Diagnostic[] = []
  let completeness: TraceResult["completeness"] = "complete"
  const accepts = (kind?: string) =>
    !request.kinds || request.kinds.includes(kind ?? "unspecified")
  const boundary = (ref: EndpointRef, code: string, message: string) => {
    if (!boundaries.has(key(ref)))
      diagnostics.push({
        code,
        severity: "warning",
        message,
        endpointRefs: [ref]
      })
    boundaries.set(key(ref), ref)
    if (code === "TRACE_BUDGET") completeness = "partial"
    else if (completeness === "complete") completeness = "unknown"
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { ref, depth } = queue[cursor]
    visited.set(key(ref), ref)
    const policy = index.tracePolicies.get(ref.nodeId)!
    const coarse =
      ref.endpoint.kind === "node" &&
      !ref.endpoint.portId &&
      policy !== "atomic"
    // The starting boundary can reveal its own supplied edges. Arriving through an
    // unresolved whole-node boundary cannot manufacture a through relationship.
    const stopped =
      coarse && depth > 0 && request.boundaryPolicy !== "conservative-node"
    if (coarse)
      boundary(
        ref,
        "TRACE_COARSE_BOUNDARY",
        "Whole-node boundary does not establish exact interface provenance."
      )
    const enqueue = (next: EndpointRef): boolean => {
      const id = key(next)
      if (queued.has(id)) return true
      if (depth >= request.maxDepth || queued.size >= request.maxVisited) {
        boundary(
          ref,
          "TRACE_BUDGET",
          "Trace is partial within the supplied graph: visit or depth budget reached."
        )
        return false
      }
      queued.add(id)
      queue.push({ ref: next, depth: depth + 1 })
      return true
    }
    if (!stopped)
      for (const e of (upstream ? index.incoming : index.outgoing).get(
        key(ref)
      ) ?? []) {
        if (!accepts(e.kind)) continue
        if (
          enqueue(
            upstream
              ? endpoint(e.source, e.sourceEndpoint)
              : endpoint(e.target, e.targetEndpoint)
          )
        )
          edges.add(e.id)
      }
    for (const t of (upstream ? index.transferIn : index.transferOut).get(
      key(ref)
    ) ?? []) {
      if (!accepts(t.kind)) continue
      transfers.add(t.id)
      for (const local of upstream ? t.sources : [t.target])
        enqueue(endpoint(t.nodeId, local))
    }
    if (coarse && request.boundaryPolicy === "conservative-node") {
      for (const other of index.ownerEndpoints.get(ref.nodeId) ?? [])
        enqueue(other)
    }
  }
  return freeze({
    endpoints: [...visited.values()],
    edgeIds: [...edges].sort(compareIds),
    transferIds: [...transfers].sort(compareIds),
    completeness,
    boundaryRefs: [...boundaries.values()],
    diagnostics
  })
}

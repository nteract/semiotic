import { explainGroup, getCycleLedger, getEdgeHistory } from "./queries"
import { sourceSetValues } from "./sets"
import { traceComponentPort } from "./ports"
import type { PreparedNetworkResolution, SemanticTarget } from "./types"

/** A portable packet of the selected claim and its exact source records, not scene coordinates. */
export function exportResolutionEvidence(
  resolution: PreparedNetworkResolution,
  target: SemanticTarget,
  authorize: (target: SemanticTarget) => boolean = () => true
) {
  if (!authorize(target)) throw new Error("Evidence access denied")
  const common = {
    schemaVersion: "0.1" as const,
    revision: resolution.revision,
    analysisRevision: resolution.analysisRevision,
    scopeId: resolution.spec.relationScopeId,
    target,
    limitations: [
      "Synthetic or admitted source evidence only; summary adjacency is not route support"
    ]
  }
  if (target.kind === "support-cell") {
    const evidence = traceComponentPort(resolution, target.query)
    if (
      evidence.verdict === "yes" &&
      (evidence.witness.nodeIds.some(
        (nodeId) => !authorize({ kind: "original-node", nodeId })
      ) ||
        evidence.witness.edgeIds?.some(
          (edgeId) => !authorize({ kind: "original-edge", edgeId })
        ))
    )
      throw new Error("Evidence access denied for witness source records")
    return { ...common, evidence }
  }
  if (target.kind === "group") {
    const explanation = explainGroup(resolution, target.pageId, target.groupId)
    const nodeIds = sourceSetValues(
      resolution.sets,
      explanation.value.group.sourceNodes
    )
    const edgeIds = sourceSetValues(
      resolution.sets,
      explanation.value.group.internalEdges
    )
    const boundary = explanation.value.ports.flatMap((port) =>
      sourceSetValues(resolution.sets, port.incidentEdges)
    )
    const required: SemanticTarget[] = [
      ...nodeIds.map((nodeId) => ({ kind: "original-node" as const, nodeId })),
      ...[...new Set([...edgeIds, ...boundary])].map((edgeId) => ({
        kind: "original-edge" as const,
        edgeId
      }))
    ]
    if (required.some((item) => !authorize(item)))
      throw new Error("Evidence access denied for component source records")
    return {
      ...common,
      evidence: explanation,
      nodes: nodeIds,
      edges: resolution.source.edges.filter(
        (e) => edgeIds.includes(e.id) || boundary.includes(e.id)
      ),
      cycles: getCycleLedger(resolution, target.pageId)
    }
  }
  if (target.kind === "original-edge") {
    const edge = resolution.source.edges.find((e) => e.id === target.edgeId)
    if (!edge) throw new Error("Unknown source edge")
    if (
      ![edge.source, edge.target].every((nodeId) =>
        authorize({ kind: "original-node", nodeId })
      )
    )
      throw new Error("Evidence access denied for endpoints")
    return {
      ...common,
      evidence: getEdgeHistory(resolution, target.edgeId),
      edge
    }
  }
  throw new Error(
    "Select a group, original edge, or support cell to export evidence"
  )
}

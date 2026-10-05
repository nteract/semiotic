import { envelope, getEdgeHistory } from "./queries"
import { sourceSetValues } from "./sets"
import { getEdgeAlternative } from "./witnesses"
import type { PreparedNetworkResolution } from "./types"

/** Owner quantities stay attached to their owner, rather than becoming node scores. */
export function projectNodeResolutionStrip(
  resolution: PreparedNetworkResolution,
  nodeId: string
) {
  if (!resolution.source.nodes.some((node) => node.id === nodeId))
    throw new Error("Unknown source node")
  return envelope(resolution, {
    nodeId,
    pins: resolution.spec.pins.filter((pin) => pin.nodeId === nodeId),
    pages: resolution.pages.map((page) => {
      const groupId = page.nodeOwner[nodeId],
        group = resolution.groups.find((group) => group.id === groupId)!
      return {
        pageId: page.id,
        ordinal: page.ordinal,
        groupId,
        label: group.label,
        ownerMemberCount: sourceSetValues(resolution.sets, group.sourceNodes)
          .length,
        ownerBoundaryEdges: resolution.ports
          .filter((port) => port.groupId === groupId)
          .reduce(
            (sum, port) =>
              sum + sourceSetValues(resolution.sets, port.incidentEdges).length,
            0
          )
      }
    })
  })
}

export function projectEdgeWitnessGlyph(
  resolution: PreparedNetworkResolution,
  edgeId: string
) {
  const history = getEdgeHistory(resolution, edgeId)
  const edge = resolution.source.edges.find((edge) => edge.id === edgeId)!
  return envelope(resolution, {
    direct: edge,
    history: history.value,
    alternative: getEdgeAlternative(resolution, edgeId)
  })
}

/** Policy branches are compared through the same original IDs, never treated as a transition. */
export function compareResolutionPolicies(
  left: PreparedNetworkResolution,
  right: PreparedNetworkResolution,
  originalNodeIds: string[] = left.source.nodes.map((n) => n.id)
) {
  if (
    left.sourceFingerprint !== right.sourceFingerprint ||
    left.spec.relationScopeId !== right.spec.relationScopeId
  )
    throw new Error(
      "Policy comparison requires the same admitted source and scope"
    )
  const leftPage = left.pages.at(-1)!,
    rightPage = right.pages.at(-1)!
  const rows = originalNodeIds.map((nodeId) => {
    if (!Object.hasOwn(leftPage.nodeOwner, nodeId))
      throw new Error("Selection contains an unknown source node")
    const a = left.groups.find(
        (group) => group.id === leftPage.nodeOwner[nodeId]
      )!,
      b = right.groups.find(
        (group) => group.id === rightPage.nodeOwner[nodeId]
      )!
    const leftMembers = sourceSetValues(left.sets, a.sourceNodes),
      rightMembers = sourceSetValues(right.sets, b.sourceNodes)
    return {
      nodeId,
      leftOwner: a.id,
      rightOwner: b.id,
      leftMembers,
      rightMembers,
      membershipChanged:
        JSON.stringify(leftMembers) !== JSON.stringify(rightMembers)
    }
  })
  return {
    revision: left.revision,
    leftAnalysisRevision: left.analysisRevision,
    rightAnalysisRevision: right.analysisRevision,
    sourceNodeCount: left.source.nodes.length,
    sourceEdgeCount: left.source.edges.length,
    sourceCycleRank: leftPage.cycles.sourceRank,
    rows
  }
}

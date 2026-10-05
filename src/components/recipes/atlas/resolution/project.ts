import { contentId, compareIds } from "./identity"
import { getEdgeHistory } from "./queries"
import { sourceSetValues } from "./sets"
import type {
  CanonicalSelection,
  EdgeHistory,
  PreparedNetworkResolution,
  ResolutionPage,
  ResolutionViewSpec,
  SemanticTarget
} from "./types"

export interface ResolutionMark {
  /** Ownership on the page represented by this mark, when applicable. */
  connectionType?: "internal" | "boundary"
  id: string
  target: SemanticTarget
  description: string
  label: string
  nodeIds: string[]
  edgeIds: string[]
  selection: CanonicalSelection
}
export interface ProjectedGroup extends ResolutionMark {
  pageId: string
  groupId: string
  rows: number[]
  internalEdges: number
  boundaryEdges: number
  kind: string
  labelPortals: string[]
}
export interface ProjectedEdge extends ResolutionMark {
  source: string
  targetNode: string
  history: EdgeHistory
  subdued: boolean
  subduedPageIds: string[]
}
export interface ResolutionProjection {
  /** Full analysis domain, retained when only some generations are displayed. */
  generationCount: number
  analysisRevision: string
  revision: PreparedNetworkResolution["revision"]
  mode: ResolutionViewSpec["mode"]
  view: ResolutionViewSpec
  pages: ResolutionPage[]
  rowOrder: string[]
  sections: { nodeId: string; sectionId: string }[]
  groups: ProjectedGroup[]
  edges: ProjectedEdge[]
  memberships: (ResolutionMark & {
    fromPageId: string
    toPageId: string
    fromGroupId: string
    toGroupId: string
  })[]
  disclosure: {
    totalGroups: number
    displayedGroups: number
    totalEdges: number
    displayedEdges: number
    totalRails: number
    displayedRails: number
  }
  caption: string
  edgeCoverageByPage: {
    pageId: string
    literalEdgeIds: string[]
    componentEdgeIds: string[]
    omittedEdgeIds: string[]
  }[]
}

/** One reference leaf order for the whole sequence. Section order remains ordinal. */
export function resolutionRowOrder(
  resolution: PreparedNetworkResolution
): string[] {
  const groups = new Map(resolution.groups.map((g) => [g.id, g]))
  const stack = [...resolution.pages.at(-1)!.groupIds].reverse(),
    order: string[] = []
  while (stack.length) {
    const group = groups.get(stack.pop()!)!
    if (group.childGroupIds.length)
      stack.push(
        ...[...group.childGroupIds].sort((a, b) =>
          compareIds(groups.get(b)!.label, groups.get(a)!.label)
        )
      )
    else order.push(...sourceSetValues(resolution.sets, group.sourceNodes))
  }
  const ranks = new Map(order.map((id, i) => [id, i]))
  const section = new Map(
    resolution.source.nodes.map((n) => [
      n.id,
      resolution.sectionOrder.indexOf(n.sectionId ?? "")
    ])
  )
  return order.sort(
    (a, b) => section.get(a)! - section.get(b)! || ranks.get(a)! - ranks.get(b)!
  )
}

export function defaultResolutionView(
  resolution: PreparedNetworkResolution,
  mode: ResolutionViewSpec["mode"]
): ResolutionViewSpec {
  return {
    mode,
    pageIds: resolution.pages.slice(-4).map((p) => p.id),
    referenceOrderId: "hierarchy-sections/v1",
    budget: {
      maxGroups: 80,
      maxLiteralEdges: 180,
      maxRails: 80,
      maxColumns: 180
    }
  }
}

/** Display budgets limit projection only. Prepared pages, source counts and queries remain intact. */
export function projectResolutionView(
  resolution: PreparedNetworkResolution,
  view: ResolutionViewSpec
): ResolutionProjection {
  for (const value of Object.values(view.budget))
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error("Invalid display budget")
  if (view.referenceOrderId !== "hierarchy-sections/v1")
    throw new Error("Unknown reference order")
  const pages = view.pageIds
    .map((id) => {
      const page = resolution.pages.find((p) => p.id === id)
      if (!page) throw new Error("Unknown or stale page selection")
      return page
    })
    .sort((a, b) => a.ordinal - b.ordinal)
  if (!pages.length || new Set(pages).size !== pages.length)
    throw new Error("A view requires distinct pages")
  const allRows = resolutionRowOrder(resolution),
    railOffset = view.railOffset ?? 0,
    edgeOffset = view.edgeOffset ?? 0
  if (![railOffset, edgeOffset].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new Error("Invalid display cursor")
  const rowOrder = allRows.slice(railOffset, railOffset + view.budget.maxRails)
  const row = new Map(rowOrder.map((id, index) => [id, index]))
  const byGroup = new Map(resolution.groups.map((g) => [g.id, g]))
  const selection = (
    set: CanonicalSelection["target"]
  ): CanonicalSelection => ({
    revision: resolution.revision,
    analysisRevision: resolution.analysisRevision,
    target: set
  })
  const groups: ProjectedGroup[] = []
  const allGroupCount = pages.reduce(
    (count, page) => count + page.groupIds.length,
    0
  )
  const allocations = pages.map((page) => ({
    page,
    ids: page.groupIds.filter((id) =>
      sourceSetValues(resolution.sets, byGroup.get(id)!.sourceNodes).some(
        (node) => row.has(node)
      )
    ),
    count: 0
  }))
  // Share the total budget across visible pages. Give remainder slots to newer
  // pages and reuse slots from pages with fewer eligible groups.
  const newestFirst = [...allocations].reverse()
  let remaining = view.budget.maxGroups
  while (remaining > 0) {
    let allocated = false
    for (const allocation of newestFirst) {
      if (remaining === 0) break
      if (allocation.count >= allocation.ids.length) continue
      allocation.count++
      remaining--
      allocated = true
    }
    if (!allocated) break
  }
  for (const { page, ids, count } of allocations)
    for (const id of ids.slice(0, count)) {
      const group = byGroup.get(id)!,
        nodeIds = sourceSetValues(resolution.sets, group.sourceNodes)
      const rows = nodeIds
        .filter((n) => row.has(n))
        .map((n) => row.get(n)!)
        .sort((a, b) => a - b)
      const edgeIds = sourceSetValues(resolution.sets, group.internalEdges)
      const boundaryEdges = resolution.ports
        .filter((p) => p.groupId === id)
        .reduce(
          (sum, p) =>
            sum + sourceSetValues(resolution.sets, p.incidentEdges).length,
          0
        )
      groups.push({
        id: contentId("mark", [page.id, id]),
        pageId: page.id,
        groupId: id,
        kind: group.kind,
        labelPortals: resolution.spec.pins
          .filter(
            (pin) => pin.kind === "keep-label" && nodeIds.includes(pin.nodeId)
          )
          .map((pin) => pin.nodeId),
        target:
          group.kind === "singleton"
            ? { kind: "original-node", nodeId: nodeIds[0] }
            : { kind: "group", pageId: page.id, groupId: id },
        description: `${group.label}; ${nodeIds.length} original nodes; ${edgeIds.length} internal edges; ${boundaryEdges} boundary edges; rule ${group.kind}`,
        label: group.label,
        nodeIds,
        edgeIds,
        rows,
        internalEdges: edgeIds.length,
        boundaryEdges,
        selection: selection({ kind: "source-set", set: group.sourceNodes })
      })
    }
  const selectedPage = pages.at(-1)!
  const selectedOwners = new Set(
    groups.filter((g) => g.pageId === selectedPage.id).map((g) => g.groupId)
  )
  if (
    view.selectedGroupId &&
    !selectedPage.groupIds.includes(view.selectedGroupId)
  )
    throw new Error("Focus group does not belong to the selected page")
  const subdued = new Set(
    selectedPage.presentation
      .filter((p) => p.subduedForReachability)
      .flatMap((p) => sourceSetValues(resolution.sets, p.edges))
  )
  const candidates = resolution.source.edges
    .filter(
      (edge) =>
        !view.selectedGroupId ||
        ((selectedPage.nodeOwner[edge.source] === view.selectedGroupId ||
          selectedPage.nodeOwner[edge.target] === view.selectedGroupId) &&
          selectedPage.nodeOwner[edge.source] !==
            selectedPage.nodeOwner[edge.target])
    )
    .map((edge) => ({
      edge,
      history: getEdgeHistory(resolution, edge.id).value
    }))
    .sort(
      (a, b) =>
        (a.history.firstInternalPage ?? Infinity) -
          (b.history.firstInternalPage ?? Infinity) ||
        compareIds(a.edge.id, b.edge.id)
    )
  const edges: ProjectedEdge[] = candidates
    .filter(
      ({ edge }) =>
        row.has(edge.source) &&
        row.has(edge.target) &&
        (view.mode !== "boundary-loom" ||
          !view.collapseGroups ||
          (selectedOwners.has(selectedPage.nodeOwner[edge.source]) &&
            selectedOwners.has(selectedPage.nodeOwner[edge.target])))
    )
    .slice(
      edgeOffset,
      edgeOffset +
        (view.mode === "boundary-loom"
          ? view.budget.maxColumns
          : view.budget.maxLiteralEdges)
    )
    .map(({ edge, history }) => {
      const ref = resolution.sets.find(
        (set) =>
          set.ref.domain === "edge" &&
          set.codec === "sorted-string-ids/v1" &&
          set.values.length === 1 &&
          set.values[0] === edge.id
      )?.ref
      // Exact singleton references are supplied at preparation, even for bundled edges.
      if (!ref)
        throw new Error("Prepared resolution is missing an original-edge set")
      return {
        id: contentId("mark", [resolution.analysisRevision, "edge", edge.id]),
        target: { kind: "original-edge", edgeId: edge.id },
        label: edge.id,
        source: edge.source,
        targetNode: edge.target,
        nodeIds: [edge.source, edge.target],
        edgeIds: [edge.id],
        history,
        subdued: subdued.has(edge.id),
        subduedPageIds: pages
          .filter((page) =>
            page.presentation.some(
              (p) =>
                p.subduedForReachability &&
                sourceSetValues(resolution.sets, p.edges).includes(edge.id)
            )
          )
          .map((p) => p.id),
        selection: selection({ kind: "source-set", set: ref }),
        description: `Edge ${edge.id}: ${edge.source} to ${edge.target}; ${history.firstInternalPage === null ? "boundary on all configured pages" : `first internal on page ${history.firstInternalPage}`}${subdued.has(edge.id) ? "; direct relation also has an indirect structural path" : ""}`
      }
    })
  const memberships: ResolutionProjection["memberships"] = []
  for (const transition of resolution.transitions) {
    if (
      !pages.some((p) => p.id === transition.fromPageId) ||
      !pages.some((p) => p.id === transition.toPageId)
    )
      continue
    for (const [fromGroupId, toGroupId] of Object.entries(
      transition.groupMap
    )) {
      if (fromGroupId === toGroupId) continue
      const destination = groups.find(
        (g) => g.groupId === toGroupId && g.pageId === transition.toPageId
      )
      if (
        !destination ||
        !groups.some(
          (g) => g.groupId === fromGroupId && g.pageId === transition.fromPageId
        )
      )
        continue
      const event = resolution.events.find(
        (e) =>
          e.toPageId === transition.toPageId &&
          e.action === "grouped" &&
          e.afterGroupIds.includes(toGroupId)
      )
      if (!event) continue
      memberships.push({
        ...destination,
        id: contentId("membership", [
          transition.fromPageId,
          fromGroupId,
          toGroupId
        ]),
        target: { kind: "membership", transitionEventId: event.id },
        fromPageId: transition.fromPageId,
        toPageId: transition.toPageId,
        fromGroupId,
        toGroupId,
        description: `Membership correspondence: ${byGroup.get(fromGroupId)!.label} became part of ${destination.label}; not a graph edge`
      })
    }
  }
  const disclosure = {
    totalGroups: allGroupCount,
    displayedGroups: groups.length,
    totalEdges: candidates.length,
    displayedEdges: edges.length,
    totalRails:
      view.mode === "boundary-loom" && view.collapseGroups
        ? selectedPage.groupIds.length
        : allRows.length,
    displayedRails:
      view.mode === "boundary-loom" && view.collapseGroups
        ? selectedOwners.size
        : rowOrder.length
  }
  const projectedEdges = new Set(edges.flatMap((edge) => edge.edgeIds))
  const edgeCoverageByPage = pages.map((page) => {
    const visibleGroups = new Set(
      groups
        .filter((group) => group.pageId === page.id)
        .map((group) => group.groupId)
    )
    const literalEdgeIds: string[] = [],
      componentEdgeIds: string[] = [],
      omittedEdgeIds: string[] = []
    for (const edge of resolution.source.edges) {
      const from = page.nodeOwner[edge.source],
        to = page.nodeOwner[edge.target]
      const literal =
        projectedEdges.has(edge.id) &&
        (view.mode === "boundary-loom" ||
          (visibleGroups.has(from) &&
            visibleGroups.has(to) &&
            (from !== to || edge.source === edge.target)))
      if (literal) literalEdgeIds.push(edge.id)
      else if (
        view.mode === "resolution-atlas" &&
        from === to &&
        visibleGroups.has(from)
      )
        componentEdgeIds.push(edge.id)
      else omittedEdgeIds.push(edge.id)
    }
    return { pageId: page.id, literalEdgeIds, componentEdgeIds, omittedEdgeIds }
  })
  return {
    generationCount: resolution.pages.length,
    analysisRevision: resolution.analysisRevision,
    revision: resolution.revision,
    mode: view.mode,
    view,
    pages,
    rowOrder,
    sections: resolution.source.nodes.map((n) => ({
      nodeId: n.id,
      sectionId: n.sectionId ?? "Unspecified"
    })),
    groups,
    edges,
    memberships,
    disclosure,
    edgeCoverageByPage,
    caption: `${resolution.source.nodes.length} original nodes; ${resolution.source.edges.length} original edge records. Projected ${edges.length} of ${candidates.length} edge columns/records, ${groups.length} of ${allGroupCount} page groups, ${disclosure.displayedRails} of ${disclosure.totalRails} rails. Cycle rank uses the undirected multigraph retaining edge IDs. Pages are representations, not time. Stop: ${resolution.stoppedBecause}. Analysis coverage: ${selectedPage.coverage.status}. Source revision: ${resolution.revision.sourceRevision}.`
  }
}

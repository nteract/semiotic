import { idDictionary } from "../ids"
import { cycleLedger, cycleRank } from "./cycles"
import { compareIds, contentId, sortedIds } from "./identity"
import { connectedParts, type GraphIndex, type SourceEdge } from "./indexGraph"
import { SourceSetStore } from "./sets"
import type {
  BoundaryBundle,
  BoundaryPort,
  Coverage,
  EdgeSemantics,
  ResolutionGroup,
  ResolutionPage
} from "./types"

export interface GroupSeed {
  id: string
  members: string[]
  label: string
  kind: ResolutionGroup["kind"]
  childGroupIds: string[]
  explanationEventIds: string[]
}

/** Owns each edge once. Stable groups and sets are reused across pages. */
export class OwnershipBuilder {
  readonly sets = new SourceSetStore()
  readonly groups = new Map<string, ResolutionGroup>()
  readonly bundles = new Map<string, BoundaryBundle>()
  readonly ports = new Map<string, BoundaryPort>()
  private semantics: Map<string, EdgeSemantics>
  readonly sourceRank: number

  constructor(
    readonly graph: GraphIndex,
    readonly contextId: string,
    semantics: EdgeSemantics[]
  ) {
    this.semantics = new Map(semantics.map((s) => [s.edgeId, s]))
    this.sourceRank = cycleRank(
      graph.nodes.map((n) => n.id),
      graph.edges
    )
  }

  relationKey(edgeId: string): string {
    const semantic = this.semantics.get(edgeId)
    // Missing semantics never assert compatibility between distinct edge records.
    return semantic
      ? JSON.stringify([
          semantic.relationClass,
          semantic.measurePolicyId ?? null,
          semantic.reachabilitySubduingAllowed
        ])
      : JSON.stringify(["unspecified", edgeId])
  }

  page(
    id: string,
    ordinal: number,
    label: string,
    seeds: GroupSeed[],
    coverage: Coverage
  ): ResolutionPage {
    const nodeOwner = idDictionary<string>()
    const originals = new Set(this.graph.nodes.map((node) => node.id))
    for (const seed of seeds) {
      if (
        !seed.members.length ||
        connectedParts(seed.members, this.graph).length !== 1
      )
        throw new Error(
          "Ownership blocks must be nonempty and weakly connected"
        )
      for (const node of seed.members) {
        if (!originals.has(node) || nodeOwner[node] !== undefined)
          throw new Error("Ownership must partition source nodes")
        nodeOwner[node] = seed.id
      }
    }
    if (Object.keys(nodeOwner).length !== originals.size)
      throw new Error("Ownership omits source nodes")
    const internal = new Map(seeds.map((s) => [s.id, [] as SourceEdge[]]))
    const boundary = new Map<string, SourceEdge[]>()
    const portEdges = new Map<
      string,
      {
        groupId: string
        direction: "in" | "out"
        internalNodeId: string
        edges: string[]
      }
    >()
    const boundaryEdges: SourceEdge[] = []
    for (const edge of this.graph.edges) {
      const from = nodeOwner[edge.source],
        to = nodeOwner[edge.target]
      if (from === to) internal.get(from)!.push(edge)
      else {
        boundaryEdges.push(edge)
        const key = JSON.stringify([from, to, this.relationKey(edge.id)])
        const list = boundary.get(key) ?? []
        list.push(edge)
        boundary.set(key, list)
        for (const [groupId, direction, endpoint] of [
          [from, "out", edge.source],
          [to, "in", edge.target]
        ] as const) {
          const portId = contentId("port", [
            this.contextId,
            groupId,
            direction,
            endpoint
          ])
          const port = portEdges.get(portId) ?? {
            groupId,
            direction,
            internalNodeId: endpoint,
            edges: []
          }
          port.edges.push(edge.id)
          portEdges.set(portId, port)
        }
      }
    }
    const groupPorts = new Map(seeds.map((s) => [s.id, [] as string[]]))
    for (const [portId, port] of portEdges) {
      groupPorts.get(port.groupId)!.push(portId)
      if (!this.ports.has(portId))
        this.ports.set(portId, {
          id: portId,
          groupId: port.groupId,
          direction: port.direction,
          internalNodeId: port.internalNodeId,
          incidentEdges: this.sets.add("edge", port.edges)
        })
    }
    for (const seed of seeds) {
      if (this.groups.has(seed.id)) continue
      const edges = internal.get(seed.id)!
      const sourceNodes = seed.childGroupIds.length
        ? this.sets.union(
            "node",
            seed.childGroupIds.map(
              (child) => this.groups.get(child)!.sourceNodes
            )
          )
        : this.sets.add("node", seed.members)
      this.groups.set(seed.id, {
        id: seed.id,
        kind: seed.kind,
        label: seed.label,
        sourceNodes,
        internalEdges: this.sets.add(
          "edge",
          edges.map((edge) => edge.id)
        ),
        childGroupIds: seed.childGroupIds,
        weaklyConnected: true,
        portIds: groupPorts.get(seed.id)!.sort(compareIds),
        explanationEventIds: seed.explanationEventIds,
        internalCycleRank: edges.length - seed.members.length + 1
      })
    }
    const bundleIds: string[] = []
    for (const [key, edges] of boundary) {
      const [sourceGroupId, targetGroupId, relationKey] = JSON.parse(
        key
      ) as string[]
      const bundleId = contentId("bundle", [
        this.contextId,
        key,
        edges.map((e) => e.id)
      ])
      bundleIds.push(bundleId)
      if (this.bundles.has(bundleId)) continue
      const pairs = new Map<string, SourceEdge[]>()
      for (const edge of edges) {
        const pair = JSON.stringify([edge.source, edge.target])
        const list = pairs.get(pair) ?? []
        list.push(edge)
        pairs.set(pair, list)
      }
      this.bundles.set(bundleId, {
        id: bundleId,
        sourceGroupId,
        targetGroupId,
        relationKey,
        originalEdges: this.sets.add(
          "edge",
          edges.map((e) => e.id)
        ),
        endpointPairs: [...pairs.values()].map((records) => ({
          sourceNodeId: records[0].source,
          targetNodeId: records[0].target,
          originalEdges: this.sets.add(
            "edge",
            records.map((e) => e.id)
          )
        }))
      })
    }
    const groupIds = seeds.map((s) => s.id)
    const internalRank = groupIds.reduce(
      (sum, group) => sum + this.groups.get(group)!.internalCycleRank,
      0
    )
    const boundaryRank = cycleRank(
      groupIds,
      boundaryEdges.map((e) => ({
        source: nodeOwner[e.source],
        target: nodeOwner[e.target]
      }))
    )
    return {
      id,
      ordinal,
      label,
      groupIds,
      bundleIds: sortedIds(bundleIds),
      nodeOwner,
      internalEdgeCount: this.graph.edges.length - boundaryEdges.length,
      boundaryEdgeCount: boundaryEdges.length,
      originalNodeCount: originals.size,
      originalEdgeCount: this.graph.edges.length,
      cycles: cycleLedger(this.sourceRank, internalRank, boundaryRank),
      annotationIds: [],
      coverage,
      presentation: [
        ...seeds
          .filter((seed) => internal.get(seed.id)!.length > 0)
          .map((seed) => ({
            edges: this.groups.get(seed.id)!.internalEdges,
            representation: "component-internal" as const,
            protected: false,
            subduedForReachability: false,
            witnessIds: [],
            viewport: "not-in-current-view" as const
          })),
        ...bundleIds.map((bundleId) => ({
          edges: this.bundles.get(bundleId)!.originalEdges,
          representation: "bundle" as const,
          protected: false,
          subduedForReachability: false,
          witnessIds: [],
          viewport: "not-in-current-view" as const
        }))
      ]
    }
  }
}

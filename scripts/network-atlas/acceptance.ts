import type { PreparedNetworkAtlas } from "semiotic/atlas/core"

function isExactPartition(originalIds: string[], ...partitions: string[][]) {
  const original = new Set(originalIds)
  if (original.size !== originalIds.length) return false
  const seen = new Set<string>()
  for (const ids of partitions) {
    for (const id of ids) {
      if (!original.has(id) || seen.has(id)) return false
      seen.add(id)
    }
  }
  return seen.size === original.size
}

export function atlasAcceptanceFacts(atlas: PreparedNetworkAtlas) {
  const original = atlas.source.edges.map((edge) => edge.id)
  const nodeInventory = atlas.ledger.entries.filter(
    (row) => row.subjectKind === "node" && row.measureId === "inventory"
  )
  const sectionInventory = atlas.ledger.entries.filter(
    (row) => row.subjectKind === "section" && row.measureId === "inventory"
  )
  const stock = nodeInventory.reduce((sum, row) => sum + row.value, 0)
  const checks = [
    {
      name: "Every original edge is in exactly one edge ledger",
      passed: isExactPartition(
        original,
        atlas.forest.backboneEdgeIds,
        atlas.residualEdges.residualEdgeIds
      )
    },
    {
      name: "Node and section stock agree",
      passed:
        stock === atlas.source.nodes.length &&
        sectionInventory.reduce((sum, row) => sum + row.value, 0) === stock
    },
    {
      name: "Every vertex has a declared-root reachability result",
      passed:
        atlas.requiredPaths !== undefined &&
        isExactPartition(
          atlas.source.nodes.map((node) => node.id),
          atlas.requiredPaths.reachableNodeIds,
          atlas.requiredPaths.unreachableNodeIds
        )
    },
    {
      name: "Fan witness truncation is disclosed",
      passed: atlas.motifs.matches.every(
        (match) =>
          !match.truncation ||
          (match.truncation.disclosed &&
            match.truncation.fullCount ===
              match.nodePath.length - 1 + match.truncation.omitted)
      )
    }
  ]
  return {
    nodes: atlas.source.nodes.length,
    edges: original.length,
    sections: atlas.sections.sectionIds.length,
    stock,
    matches: atlas.motifs.matches.length,
    truncatedMatches: atlas.motifs.matches.filter((match) => match.truncation)
      .length,
    checks
  }
}

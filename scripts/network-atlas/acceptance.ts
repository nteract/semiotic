import type { PreparedNetworkAtlas } from "semiotic/atlas/core"

export function atlasAcceptanceFacts(atlas: PreparedNetworkAtlas) {
  const original = new Set(atlas.source.edges.map((edge) => edge.id))
  const backbone = new Set(atlas.forest.backboneEdgeIds)
  const residual = new Set(atlas.residualEdges.residualEdgeIds)
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
      passed:
        original.size === backbone.size + residual.size &&
        [...original].every((id) => backbone.has(id) !== residual.has(id))
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
        (atlas.requiredPaths?.reachableNodeIds.length ?? 0) +
          (atlas.requiredPaths?.unreachableNodeIds.length ?? 0) ===
        atlas.source.nodes.length
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
    edges: original.size,
    sections: atlas.sections.sectionIds.length,
    stock,
    matches: atlas.motifs.matches.length,
    truncatedMatches: atlas.motifs.matches.filter((match) => match.truncation)
      .length,
    checks
  }
}

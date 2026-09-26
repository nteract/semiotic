import type { NetworkTableElement } from "./networkAccessibleDataTableModel"

/** Count topology without importing semantic extraction or computing degrees. */
export function countNetworkTableRows(
  nodes: NetworkTableElement[],
  edges: NetworkTableElement[]
) {
  let nodeCount = 0
  let edgeCount = 0
  for (const node of nodes) {
    if (node && typeof node === "object" && node.datum !== null) nodeCount++
  }
  for (const edge of edges) {
    if (!edge || typeof edge !== "object") continue
    const raw = edge.datum
    const contributors =
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      "__chordEdges" in raw
        ? raw.__chordEdges
        : undefined
    edgeCount += Array.isArray(contributors) ? contributors.length : 1
  }
  return { nodeCount, edgeCount }
}

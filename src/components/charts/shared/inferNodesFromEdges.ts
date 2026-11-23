import type { Datum } from "./datumTypes"

/**
 * Infer nodes from edges when a nodes array is not provided.
 * Extracts unique source/target IDs and returns `{ id }` objects.
 * Returns the provided nodes array if it's non-empty.
 */
export function inferNodesFromEdges(
  nodes: Datum[] | undefined,
  edges: Datum[],
  sourceAccessor: string | ((d: Datum) => string),
  targetAccessor: string | ((d: Datum) => string)
): Datum[] {
  if (nodes && nodes.length > 0) return nodes

  const nodeSet = new Set<string>()
  edges.forEach((edge) => {
    const sourceId =
      typeof sourceAccessor === "function"
        ? sourceAccessor(edge)
        : edge[sourceAccessor]
    const targetId =
      typeof targetAccessor === "function"
        ? targetAccessor(edge)
        : edge[targetAccessor]
    nodeSet.add(sourceId)
    nodeSet.add(targetId)
  })

  return Array.from(nodeSet).map((id) => ({ id }))
}

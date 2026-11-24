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
  if (nodes?.length) return nodes

  const ids = new Set<string>()
  const endpoints = [sourceAccessor, targetAccessor]
  edges.forEach(edge => {
    for (const accessor of endpoints) {
      ids.add(typeof accessor === "function" ? accessor(edge) : edge[accessor])
    }
  })
  return Array.from(ids, id => ({ id }))
}

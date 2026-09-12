import type {
  NetworkAtlasSource,
  RouteSupportIndex,
  SupportedHop
} from "./types"

function isSubsequence(path: readonly string[], route: readonly string[]): boolean {
  if (route.length === 0) return true
  let index = 0
  for (const nodeId of path) {
    if (nodeId !== route[index]) continue
    index += 1
    if (index === route.length) return true
  }
  return false
}

export function buildRouteSupportIndex(source: NetworkAtlasSource): RouteSupportIndex {
  const hops: SupportedHop[] = []
  for (const occurrence of source.occurrences ?? []) {
    if (occurrence.missingPrehistory) continue
    const path = occurrence.nodePath
    for (let i = 0; i < path.length - 1; i++) {
      hops.push({
        from: path[i],
        to: path[i + 1],
        via: i > 0 ? path[i - 1] : undefined,
        occurrenceIds: [occurrence.id]
      })
    }
  }
  return {
    hops,
    graphAdjacency: source.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      edgeId: edge.id
    }))
  }
}

export function graphWalkExists(
  source: NetworkAtlasSource,
  route: readonly string[]
): boolean {
  for (let i = 0; i < route.length - 1; i++) {
    const ok = source.edges.some(
      (edge) => edge.source === route[i] && edge.target === route[i + 1]
    )
    if (!ok) return false
  }
  return route.length > 0
}

export function isSupportedRoute(
  source: NetworkAtlasSource,
  route: readonly string[]
): boolean {
  if (route.length < 2) return false
  return (source.occurrences ?? []).some(
    (occurrence) =>
      !occurrence.missingPrehistory && isSubsequence(occurrence.nodePath, route)
  )
}

export function nextSupportedNodes(
  source: NetworkAtlasSource,
  fromNode: string,
  viaNode?: string
): string[] {
  const next = new Set<string>()
  for (const occurrence of source.occurrences ?? []) {
    if (occurrence.missingPrehistory) continue
    const path = occurrence.nodePath
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] !== fromNode) continue
      if (viaNode != null && (i === 0 || path[i - 1] !== viaNode)) continue
      next.add(path[i + 1])
    }
  }
  return [...next]
}

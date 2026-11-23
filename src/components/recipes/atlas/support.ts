import type {
  NetworkAtlasSource,
  RouteSupportIndex,
  SupportedHop
} from "./types"

/** Whether an observed path contains every route hop consecutively. */
export function containsRoute(
  path: readonly string[],
  route: readonly string[]
): boolean {
  return (
    route.length > 0 &&
    path.some((_, start) =>
      route.every((state, offset) => path[start + offset] === state)
    )
  )
}

function* observedHops(source: NetworkAtlasSource): Generator<SupportedHop> {
  for (const occurrence of source.occurrences ?? []) {
    if (occurrence.missingPrehistory) continue
    const path = occurrence.nodePath
    for (let i = 0; i + 1 < path.length; i++) {
      yield { from: path[i], to: path[i + 1], via: path[i - 1], occurrenceIds: [occurrence.id] }
    }
  }
}

export function buildRouteSupportIndex(source: NetworkAtlasSource): RouteSupportIndex {
  return {
    hops: Array.from(observedHops(source)),
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
  for (let index = 1; index < route.length; index++) {
    if (!source.edges.some(edge => edge.source === route[index - 1] && edge.target === route[index])) return false
  }
  return route.length > 0
}

export function isSupportedRoute(
  source: NetworkAtlasSource,
  route: readonly string[]
): boolean {
  return !supportedRouteOccurrences(source, route).next().done
}

export function* supportedRouteOccurrences(
  source: NetworkAtlasSource,
  route: readonly string[]
) {
  if (route.length < 2) return
  for (const occurrence of source.occurrences ?? []) {
    if (
      !occurrence.missingPrehistory &&
      containsRoute(occurrence.nodePath, route)
    )
      yield occurrence
  }
}

export function* supportedNextHops(
  source: NetworkAtlasSource,
  fromNode: string,
  viaNode?: string
) {
  for (const hop of observedHops(source)) {
    if (hop.from === fromNode && (viaNode == null || hop.via === viaNode)) {
      yield { nodeId: hop.to, occurrenceId: hop.occurrenceIds[0] }
    }
  }
}

export function nextSupportedNodes(
  source: NetworkAtlasSource,
  fromNode: string,
  viaNode?: string
): string[] {
  const next = new Set<string>()
  for (const hop of supportedNextHops(source, fromNode, viaNode))
    next.add(hop.nodeId)
  return [...next]
}

/** Retain one parsed path for both edge painting and hit testing. */
export function getEdgePath2D(
  edge: { pathD: string; _cachedPath2D?: Path2D; _cachedPath2DSource?: string }
): Path2D | null {
  if (edge._cachedPath2D && edge._cachedPath2DSource === edge.pathD) {
    return edge._cachedPath2D
  }
  try {
    edge._cachedPath2D = new Path2D(edge.pathD)
    edge._cachedPath2DSource = edge.pathD
    return edge._cachedPath2D
  } catch {
    return null
  }
}

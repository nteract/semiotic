/**
 * Coordinate resolution helpers for annotations.
 *
 * Resolves data coordinates to pixel positions, respecting anchor modes
 * (fixed, latest, sticky), pointId matching, and bounds checking for
 * streaming charts where data scrolls off-screen.
 *
 * Dependencies: types (AnnotationContext)
 * Consumed by: annotationRules.tsx (all annotation type renderers)
 */
import type { AnnotationContext } from "../../realtime/types"

export function resolveX(
  ann: Record<string, any>,
  context: AnnotationContext
): number | null {
  const scaleX = context.scales?.x ?? context.scales?.time
  if (!scaleX) return null

  if (ann.x != null) return scaleX(ann.x)
  if (context.xAccessor && ann[context.xAccessor] != null) {
    return scaleX(ann[context.xAccessor])
  }
  return null
}

export function resolveY(
  ann: Record<string, any>,
  context: AnnotationContext
): number | null {
  const scaleY = context.scales?.y ?? context.scales?.value
  if (!scaleY) return null

  if (ann.y != null) return scaleY(ann.y)
  if (context.yAccessor && ann[context.yAccessor] != null) {
    return scaleY(ann[context.yAccessor])
  }
  return null
}

/**
 * For "latest" anchor mode, resolve coordinates from the most recent datum
 * in the buffer rather than from the annotation's own coordinate fields.
 */
function resolveLatest(
  context: AnnotationContext
): { x: number; y: number } | null {
  const data = context.data
  if (!data || data.length === 0) return null

  const latestDatum = data[data.length - 1]
  const scaleX = context.scales?.x ?? context.scales?.time
  const scaleY = context.scales?.y ?? context.scales?.value
  if (!scaleX || !scaleY) return null

  const xAcc = context.xAccessor || "x"
  const yAcc = context.yAccessor || "y"

  const xVal = latestDatum[xAcc]
  const yVal = latestDatum[yAcc]
  if (xVal == null || yVal == null) return null

  return { x: scaleX(xVal), y: scaleY(yVal) }
}

/**
 * Resolve annotation position respecting anchor mode.
 * - "fixed" (default): resolve from annotation's own fields
 * - "latest": resolve from the most recent datum in the buffer
 * - "sticky": resolve from annotation fields; if not found, use cached position
 */
export function resolveAnchoredPosition(
  ann: Record<string, any>,
  index: number,
  context: AnnotationContext
): { x: number; y: number } | null {
  const anchor = ann.anchor || "fixed"

  if (anchor === "latest") {
    if (ann.pointId != null && context.pointNodes && context.pointNodes.length > 0) {
      for (let i = context.pointNodes.length - 1; i >= 0; i--) {
        const node = context.pointNodes[i]
        if (node.pointId === ann.pointId) {
          const pos = { x: node.x, y: node.y }
          context.stickyPositionCache?.set(index, pos)
          return pos
        }
      }
    }
    const pos = resolveLatest(context)
    if (pos) {
      context.stickyPositionCache?.set(index, pos)
    }
    return pos
  }

  let px: number | null = null
  let py: number | null = null

  if (ann.pointId != null && context.pointNodes) {
    const match = context.pointNodes.find(p => p.pointId === ann.pointId)
    if (match) {
      px = match.x
      py = match.y
    }
  }

  if (px == null || py == null) {
    px = resolveX(ann, context)
    py = resolveY(ann, context)
  }

  if (px != null && py != null) {
    context.stickyPositionCache?.set(index, { x: px, y: py })
    return { x: px, y: py }
  }

  if (anchor === "sticky") {
    const cached = context.stickyPositionCache?.get(index)
    if (cached) return cached
  }

  return null
}

/**
 * Returns true if a point annotation is within the visible chart area.
 * Used to hide data-anchored annotations that have scrolled off-screen.
 */
export function isInBounds(
  px: number,
  py: number,
  context: AnnotationContext,
  margin: number = 50
): boolean {
  const w = context.width || 0
  const h = context.height || 0
  return px >= -margin && px <= w + margin && py >= -margin && py <= h + margin
}

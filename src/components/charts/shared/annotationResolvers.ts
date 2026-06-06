import type { Datum } from "./datumTypes"
/**
 * Coordinate resolution helpers for annotations.
 *
 * Resolves data coordinates to pixel positions, respecting anchor modes
 * (fixed, latest, sticky, semantic), pointId / stableId matching, and
 * bounds checking for streaming charts where data scrolls off-screen.
 *
 * Dependencies: types (AnnotationContext)
 * Consumed by: annotationRules.tsx (all annotation type renderers)
 */
import type { AnnotationContext } from "../../realtime/types"

export function resolveX(
  ann: Datum,
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
  ann: Datum,
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

function stableId(value: unknown): string | null {
  if (value == null) return null
  return String(value)
}

function annotationStableId(ann: Datum): string | null {
  return stableId(ann.provenance?.stableId ?? ann.stableId)
}

function datumStableId(datum: Datum): string | null {
  return stableId(datum.stableId ?? datum.id ?? datum.provenance?.stableId)
}

function cachePosition(
  index: number,
  context: AnnotationContext,
  pos: { x: number; y: number }
): { x: number; y: number } {
  context.stickyPositionCache?.set(index, pos)
  return pos
}

/**
 * For "semantic" anchor mode, use provenance.stableId as a semantic target
 * key. A chart with pointIdAccessor can resolve directly from point scene
 * nodes; otherwise we look for a current data row carrying the same stableId.
 */
function resolveSemantic(
  ann: Datum,
  index: number,
  context: AnnotationContext
): { x: number; y: number } | null {
  const targetId = annotationStableId(ann)
  if (!targetId) return null

  const pointMatch = context.pointNodes?.find(
    (node) => stableId(node.pointId) === targetId
  )
  if (pointMatch) {
    return cachePosition(index, context, { x: pointMatch.x, y: pointMatch.y })
  }

  const datumMatch = context.data?.find((datum) => datumStableId(datum) === targetId)
  if (!datumMatch) return null

  const px = resolveX(datumMatch, context)
  const py = resolveY(datumMatch, context)
  if (px == null || py == null) return null

  return cachePosition(index, context, { x: px, y: py })
}

/**
 * Resolve annotation position respecting anchor mode.
 * - "fixed" (default): resolve from annotation's own fields
 * - "latest": resolve from the most recent datum in the buffer
 * - "sticky": resolve from annotation fields; if not found, use cached position
 * - "semantic": resolve from provenance.stableId; if not found, use recorded fields
 */
export function resolveAnchoredPosition(
  ann: Datum,
  index: number,
  context: AnnotationContext
): { x: number; y: number } | null {
  const anchor = ann.anchor || ann.lifecycle?.anchor || "fixed"

  if (anchor === "latest") {
    if (ann.pointId != null && context.pointNodes && context.pointNodes.length > 0) {
      for (let i = context.pointNodes.length - 1; i >= 0; i--) {
        const node = context.pointNodes[i]
        if (node.pointId === ann.pointId) {
          return cachePosition(index, context, { x: node.x, y: node.y })
        }
      }
    }
    const pos = resolveLatest(context)
    return pos ? cachePosition(index, context, pos) : null
  }

  if (anchor === "semantic") {
    const pos = resolveSemantic(ann, index, context)
    if (pos) return pos
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
    return cachePosition(index, context, { x: px, y: py })
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

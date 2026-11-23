import type { Datum } from "./datumTypes"
import { projectHeatmapBandValue } from "../../stream/heatmapBandTicks"
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

/** Project the explicit axis field first, then the chart's named accessor. */
export function resolveAnnotationCoordinate(
  ann: Datum,
  axis: "x" | "y",
  scale: ((value: number) => number) | undefined,
  accessor: string | undefined,
  pixelFallback = false
): number | null {
  if (!scale) return pixelFallback && typeof ann[axis] === "number" ? ann[axis] : null
  const value = ann[axis] ?? (accessor ? ann[accessor] : undefined)
  return value == null ? null : projectHeatmapBandValue(scale, value)
}

export function resolveX(ann: Datum, context: AnnotationContext): number | null {
  return resolveAnnotationCoordinate(ann, "x", context.scales?.x ?? context.scales?.time, context.xAccessor)
}

export function resolveY(ann: Datum, context: AnnotationContext): number | null {
  return resolveAnnotationCoordinate(ann, "y", context.scales?.y ?? context.scales?.value, context.yAccessor)
}

/**
 * For "latest" anchor mode, resolve coordinates from the most recent datum
 * in the buffer rather than from the annotation's own coordinate fields.
 */
function projectedPosition(x: number | null, y: number | null) {
  return x == null || y == null ? null : { x, y }
}

function resolvePoint(row: Datum, context: AnnotationContext) {
  return projectedPosition(resolveX(row, context), resolveY(row, context))
}

function resolveLatest(context: AnnotationContext) {
  const latest = context.data?.at(-1)
  if (!latest) return null
  return projectedPosition(
    resolveX({ x: latest[context.xAccessor || "x"] }, context),
    resolveY({ y: latest[context.yAccessor || "y"] }, context)
  )
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

/**
 * For "semantic" anchor mode, use provenance.stableId as a semantic target
 * key. A chart with pointIdAccessor can resolve directly from point scene
 * nodes; otherwise we look for a current data row carrying the same stableId.
 */
function resolveSemantic(ann: Datum, context: AnnotationContext) {
  const targetId = annotationStableId(ann)
  if (!targetId) return null
  const point = context.pointNodes?.find(node => stableId(node.pointId) === targetId)
  if (point) return { x: point.x, y: point.y }
  const row = context.data?.find(datum => datumStableId(datum) === targetId)
  return row ? resolvePoint(row, context) : null
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

  let position = anchor === "semantic" ? resolveSemantic(ann, context) : null
  if (!position && ann.pointId != null && context.pointNodes) {
    const nodes = context.pointNodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[anchor === "latest" ? nodes.length - i - 1 : i]
      if (node.pointId === ann.pointId) {
        position = { x: node.x, y: node.y }
        break
      }
    }
  }
  position ??= anchor === "latest" ? resolveLatest(context) : resolvePoint(ann, context)
  if (position) context.stickyPositionCache?.set(index, position)
  return position ?? (anchor === "sticky" ? context.stickyPositionCache?.get(index) ?? null : null)
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

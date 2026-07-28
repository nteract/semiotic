import type { Datum } from "../charts/shared/datumTypes"
import {
  mergeShapeStyle,
  type PrimitiveStyleOverrides,
} from "../charts/shared/mergeShapeStyle"

/**
 * Compose user/frame node styling over a hierarchy HOC's built-in encoding,
 * then apply chart-level primitives with their documented final precedence.
 */
export function composeHierarchyNodeStyle(
  baseNodeStyle: (d: Datum) => Record<string, unknown>,
  userNodeStyle:
    | ((d: Datum) => Record<string, unknown> | undefined | null)
    | Record<string, unknown>
    | undefined
    | null,
  primitives: PrimitiveStyleOverrides = {},
): (d: Datum) => Record<string, unknown> {
  const composed = !userNodeStyle
    ? baseNodeStyle
    : typeof userNodeStyle === "function"
      ? (d: Datum) => ({ ...baseNodeStyle(d), ...(userNodeStyle(d) ?? {}) })
      : (d: Datum) => ({ ...baseNodeStyle(d), ...userNodeStyle })
  return mergeShapeStyle(composed, primitives) as (
    d: Datum,
  ) => Record<string, unknown>
}

/**
 * Mirror ForceDirectedGraph's edge primitive resolution on the static path.
 * An explicit edgeStyle remains the final escape hatch.
 */
export function resolveForceEdgeStyle(rest: Datum) {
  if (rest.edgeStyle !== undefined) return rest.edgeStyle

  const { edgeWidth, edgeColor, edgeOpacity } = rest
  const fallbackWidth =
    (rest.strokeWidth as number | undefined) ?? 1
  const hasPrimitives =
    edgeWidth !== undefined ||
    edgeColor !== undefined ||
    edgeOpacity !== undefined ||
    rest.stroke !== undefined ||
    rest.strokeWidth !== undefined ||
    rest.opacity !== undefined
  if (!hasPrimitives) return undefined

  return (d: Datum) => {
    const edge = (d?.data as Datum) || d
    let strokeWidth = fallbackWidth
    if (typeof edgeWidth === "number") {
      strokeWidth = edgeWidth
    } else if (typeof edgeWidth === "function") {
      strokeWidth = edgeWidth(edge)
    } else if (typeof edgeWidth === "string") {
      const raw = edge?.[edgeWidth]
      const width = typeof raw === "number" ? raw : Number(raw)
      strokeWidth =
        Number.isFinite(width) && width > 0 ? width : fallbackWidth
    }
    return {
      stroke: edgeColor ?? rest.stroke ?? "#999",
      strokeWidth,
      opacity: edgeOpacity ?? rest.opacity ?? 0.6,
    }
  }
}

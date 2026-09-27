import type { Datum } from "../charts/shared/datumTypes"
import {
  type ChartConfig,
  primitiveStyleOverrides
} from "./serverChartConfigShared"
import { flattenHierarchy } from "../charts/shared/networkUtils"
import {
  createColorScale,
  resolveDefaultFill,
  getColor,
  DEPTH_PALETTE_COLORS
} from "../charts/shared/colorUtils"
import { resolveTheme } from "./themeResolver"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import {
  composeStyleRules,
  makeNodeRuleContext,
  type StyleRule
} from "../charts/shared/styleRules"

/** Keep hierarchy accessor and frame overrides identical across static HOCs. */
export const hierarchyFrameProps: ChartConfig["buildProps"] = (
  data,
  colorBy,
  colorScheme,
  common,
  rest
) => ({
  data,
  nodeIDAccessor: rest.nodeIdAccessor ?? rest.nodeIDAccessor ?? "name",
  childrenAccessor: rest.childrenAccessor,
  hierarchySum: rest.valueAccessor,
  colorBy,
  colorByDepth: rest.colorByDepth,
  showLabels: rest.showLabels,
  colorScheme,
  ...common,
  showLegend:
    (common.showLegend ?? Boolean(colorBy && !rest.colorByDepth)) &&
    Boolean(colorBy && !rest.colorByDepth)
})

/** Share the hierarchy HOCs' category/depth fill resolution across static layouts. */
export const createHierarchyNodeFill: (
  ...args: Parameters<ChartConfig["buildProps"]>
) => (d: Datum) => string = (data, colorBy, colorScheme, common, rest) => {
  const themeCategorical = resolveTheme(common.theme).colors.categorical
  const categoryIndexMap = new Map<string, number>()
  const nodes = flattenHierarchy(
    (data ?? null) as Datum | null,
    rest.childrenAccessor ?? "children"
  )
  const colorByFn = typeof colorBy === "function" ? colorBy : null
  const key = colorByFn
    ? "__hierarchyColor"
    : typeof colorBy === "string"
      ? colorBy
      : undefined
  const source = colorByFn
    ? nodes.map((node) => ({ __hierarchyColor: colorByFn(node) }))
    : nodes
  const scale =
    colorBy && key
      ? createColorScale(
          source,
          key,
          colorScheme ?? common.colorScheme ?? themeCategorical
        )
      : undefined
  return (d) => {
    if (rest.colorByDepth)
      return DEPTH_PALETTE_COLORS[
        Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length
      ]
    const raw = (d?.data as Datum) || d
    return colorBy
      ? getColor(
          colorByFn ? { __hierarchyColor: colorByFn(raw) } : raw,
          key!,
          scale ?? undefined
        )
      : resolveDefaultFill(
          undefined,
          themeCategorical,
          colorScheme,
          undefined,
          categoryIndexMap
        )
  }
}

/**
 * Compose user/frame node styling over a hierarchy HOC's built-in encoding,
 * then apply chart-level primitives with their documented final precedence.
 */
export function composeHierarchyNodeStyle(
  baseNodeStyle: (d: Datum) => Record<string, unknown>,
  colorBy: Parameters<ChartConfig["buildProps"]>[1],
  common: Datum,
  rest: Datum
): (d: Datum) => Record<string, unknown> {
  const ruledStyle = composeStyleRules(
    baseNodeStyle,
    rest.styleRules as StyleRule[] | undefined,
    makeNodeRuleContext(colorBy, rest.valueAccessor),
    (d) => (d?.data as Datum) || d
  )
  const userNodeStyle = common.nodeStyle || rest.nodeStyle
  const composed = !userNodeStyle
    ? ruledStyle
    : typeof userNodeStyle === "function"
      ? (d: Datum) => ({ ...ruledStyle(d), ...(userNodeStyle(d) ?? {}) })
      : (d: Datum) => ({ ...ruledStyle(d), ...userNodeStyle })
  return mergeShapeStyle(composed, primitiveStyleOverrides(rest)) as (
    d: Datum
  ) => Record<string, unknown>
}

/**
 * Mirror ForceDirectedGraph's edge primitive resolution on the static path.
 * An explicit edgeStyle remains the final escape hatch.
 */
export function resolveForceEdgeStyle(rest: Datum) {
  if (rest.edgeStyle !== undefined) return rest.edgeStyle

  const { edgeWidth, edgeColor, edgeOpacity } = rest
  const fallbackWidth = (rest.strokeWidth as number | undefined) ?? 1
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
      strokeWidth = Number.isFinite(width) && width > 0 ? width : fallbackWidth
    }
    return {
      stroke: edgeColor ?? rest.stroke ?? "#999",
      strokeWidth,
      opacity: edgeOpacity ?? rest.opacity ?? 0.6
    }
  }
}

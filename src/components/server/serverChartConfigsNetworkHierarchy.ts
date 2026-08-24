import type { Datum } from "../charts/shared/datumTypes"
import { flattenHierarchy } from "../charts/shared/networkUtils"
import {
  createColorScale,
  DEPTH_PALETTE_COLORS,
  getColor,
  resolveCategoricalPalette
} from "../charts/shared/colorUtils"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import {
  type ChartConfig,
  primitiveStyleOverrides
} from "./serverChartConfigShared"
import { composeHierarchyNodeStyle } from "./serverChartConfigNetworkStyles"
import { resolveTheme } from "./themeResolver"
import {
  composeStyleRules,
  makeNodeRuleContext,
  type StyleRule,
} from "../charts/shared/styleRules"

export const circlePack: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Mirror Treemap: hierarchy scene builder never applies colorBy itself;
    // HOC builds fill in nodeStyle over flattened nodes. SSR must match or
    // every circle is monochrome and labels never emit.
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const allNodes = flattenHierarchy(
      (data ?? null) as Datum | null,
      rest.childrenAccessor as string | ((d: Datum) => Datum[])
    )
    const colorByFn =
      typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const scaleSource: Datum[] = colorByFn
      ? allNodes.map((n) => ({ __ssrCirclePackColorBy: colorByFn(n) }))
      : allNodes
    const scaleColorKey = colorByFn
      ? "__ssrCirclePackColorBy"
      : typeof colorBy === "string"
        ? colorBy
        : undefined
    const colorScale =
      colorBy && scaleColorKey
        ? createColorScale(
            scaleSource,
            scaleColorKey,
            (colorScheme ?? common.colorScheme ?? themeCategorical) as
              string | string[] | Record<string, string>
          )
        : undefined
    const baseNodeStyle = (d: Datum) => {
      const raw = (d?.data as Datum) || d
      const fill = rest.colorByDepth
        ? DEPTH_PALETTE_COLORS[
            Number(d?.depth || 0) % DEPTH_PALETTE_COLORS.length
          ]
        : colorBy
          ? colorByFn
            ? getColor(
                { __ssrCirclePackColorBy: colorByFn(raw) },
                "__ssrCirclePackColorBy",
                colorScale ?? undefined
              )
            : getColor(raw, colorBy as string, colorScale ?? undefined)
          : resolveDefaultFill(
              undefined,
              themeCategorical,
              colorScheme as
                string | string[] | Record<string, string> | undefined,
              undefined,
              categoryIndexMap
            )
      return {
        fill,
        fillOpacity: rest.circleOpacity ?? 0.7,
        // CirclePack's client style deliberately uses currentColor for the
        // subtle dark outline; hierarchy's generic fallback uses the theme
        // surface (white), which made SSR visibly diverge.
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3
      }
    }
    const effectiveShowLabels = (rest.showLabels ?? common.showLabels) as
      boolean | undefined
    const userNodeStyle = (common.nodeStyle || rest.nodeStyle) as
      | ((d: Datum) => Record<string, unknown> | undefined | null)
      | Record<string, unknown>
      | undefined
    const ruledNodeStyle = composeStyleRules(
      baseNodeStyle,
      rest.styleRules as StyleRule[] | undefined,
      makeNodeRuleContext(
        colorBy as string | ((d: Datum) => unknown) | undefined,
        rest.valueAccessor as string | ((d: Datum) => unknown) | undefined,
      ),
      (d) => (d?.data as Datum) || d,
    )
    return {
      chartType: "circlepack",
      data,
      childrenAccessor: rest.childrenAccessor,
      hierarchySum: rest.valueAccessor,
      colorBy,
      colorByDepth: rest.colorByDepth,
      showLabels: rest.showLabels,
      nodeLabel: effectiveShowLabels
        ? rest.nodeLabel || rest.nodeIdAccessor
        : undefined,
      ...(rest.padding != null && { padding: rest.padding }),
      colorScheme,
      ...common,
      showLegend:
        (common.showLegend ?? Boolean(colorBy && !rest.colorByDepth)) &&
        Boolean(colorBy && !rest.colorByDepth),
      nodeStyle: composeHierarchyNodeStyle(
        ruledNodeStyle,
        userNodeStyle,
        primitiveStyleOverrides(rest)
      )
    }
  }
}

export const orbitDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const hierarchyRoot = (data ?? rest.data) as Datum
    const childrenAccessor = rest.childrenAccessor || "children"
    const nodeIdAccessor = rest.nodeIdAccessor || rest.nodeIDAccessor || "name"
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const effectiveScheme = (colorScheme ??
      common.colorScheme ??
      themeCategorical) as string | string[] | Record<string, string>
    const palette = resolveCategoricalPalette(effectiveScheme, themeCategorical)
    const allNodes = flattenHierarchy(
      hierarchyRoot,
      childrenAccessor as string | ((d: Datum) => Datum[])
    )

    const functionColorKey = "__ssrOrbitColorBy"
    const functionColorBy =
      typeof colorBy === "function" ? (colorBy as (d: Datum) => string) : null
    const colorScale = colorBy
      ? createColorScale(
          functionColorBy
            ? allNodes.map((node) => ({
                [functionColorKey]: functionColorBy(node)
              }))
            : allNodes,
          functionColorBy ? functionColorKey : (colorBy as string),
          effectiveScheme
        )
      : undefined

    const baseNodeStyle = (node: Datum) => {
      const raw = (node.data as Datum) || node
      const depth = Number(node.depth ?? 0)
      const fill = rest.colorByDepth
        ? depth === 0
          ? palette[0]
          : DEPTH_PALETTE_COLORS[depth % DEPTH_PALETTE_COLORS.length]
        : colorBy
          ? functionColorBy
            ? getColor(
                { [functionColorKey]: functionColorBy(raw) },
                functionColorKey,
                colorScale
              )
            : getColor(raw, colorBy as string, colorScale)
          : palette[0]
      return {
        fill,
        stroke: "#fff",
        strokeWidth: 1,
        opacity: depth === 0 ? 1 : 0.85
      }
    }
    const ruledNodeStyle = composeStyleRules(
      baseNodeStyle,
      rest.styleRules as StyleRule[] | undefined,
      makeNodeRuleContext(
        colorBy as string | ((d: Datum) => unknown) | undefined,
        "value",
      ),
      (d) => (d?.data as Datum) || d,
    )

    return {
      chartType: "orbit",
      data: hierarchyRoot,
      childrenAccessor,
      nodeIDAccessor: nodeIdAccessor,
      colorBy,
      colorScheme: effectiveScheme,
      colorByDepth: rest.colorByDepth ?? false,
      nodeSize: rest.nodeRadius ?? 6,
      nodeLabel: rest.showLabels ? nodeIdAccessor : undefined,
      showLabels: rest.showLabels ?? false,
      orbitMode: rest.orbitMode ?? "flat",
      orbitSize: rest.orbitSize ?? 2.95,
      orbitSpeed: rest.speed ?? 0.25,
      orbitRevolution: rest.revolution,
      orbitRevolutionStyle: rest.revolutionStyle,
      orbitEccentricity: rest.eccentricity ?? 1,
      orbitShowRings: rest.showRings ?? true,
      // Static rendering captures the deterministic initial orbit layout.
      orbitAnimated: false,
      nodeStyle: mergeShapeStyle(ruledNodeStyle, primitiveStyleOverrides(rest)),
      edgeStyle: () => ({
        stroke: "rgba(128,128,128,0.35)",
        strokeWidth: 0.5,
        opacity: 1
      }),
      ...common,
      showLegend:
        (common.showLegend ?? Boolean(colorBy && !rest.colorByDepth)) &&
        Boolean(colorBy && !rest.colorByDepth)
    }
  }
}

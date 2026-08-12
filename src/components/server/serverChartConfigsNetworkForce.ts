import type { Datum } from "../charts/shared/datumTypes"
import { getColor } from "../charts/shared/colorUtils"
import { resolveDefaultFill } from "../charts/shared/hooks"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import { styleRulesToNodeStyle } from "../charts/shared/styleRules"
import type { ChartConfig } from "./serverChartConfigShared"
import { resolveForceEdgeStyle } from "./serverChartConfigNetworkStyles"
import { resolveTheme } from "./themeResolver"

export const forceDirectedGraph: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const edgeStyle = resolveForceEdgeStyle(rest)
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const categoryIndexMap = new Map<string, number>()
    const baseNodeStyle =
      rest.nodeStyle ??
      ((d: Datum) => {
        const raw = (d?.data as Datum) || d
        return {
          // ForceDirectedGraph is intentionally monocolor until colorBy is
          // requested; the network layout's palette fallback would otherwise
          // assign a different color to each node on SSR.
          fill: colorBy
            ? getColor(
                raw,
                colorBy as string | ((node: Datum) => string),
                undefined
              )
            : resolveDefaultFill(
                undefined,
                themeCategorical,
                colorScheme,
                undefined,
                categoryIndexMap
              ),
          ...(typeof rest.nodeSize === "number" && { r: rest.nodeSize })
        }
      })
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules,
      colorBy as string | ((d: Datum) => unknown) | undefined,
      typeof rest.nodeSize === "number" ? undefined : rest.nodeSize
    )
    const ruledNodeStyle = ruleNodeStyle
      ? (d: Datum, index?: number) => ({
          ...baseNodeStyle(d),
          ...ruleNodeStyle(d, index)
        })
      : baseNodeStyle
    // Node-only props win over the generic primitives, matching the HOC's
    // documented `nodeStroke ?? stroke` precedence.
    const configuredNodeStyle = mergeShapeStyle(ruledNodeStyle, {
      stroke: (rest.nodeStroke ?? rest.stroke) as string | undefined,
      strokeWidth: (rest.nodeStrokeWidth ?? rest.strokeWidth) as
        number | undefined,
      opacity: rest.opacity as number | undefined
    })
    return {
      chartType: "force",
      nodes: rest.nodes,
      edges: rest.edges,
      // Accept the canonical `nodeIdAccessor` (and the legacy `nodeIDAccessor`
      // alias), matching the HOC and the other network SSR configs.
      nodeIDAccessor: rest.nodeIdAccessor || rest.nodeIDAccessor,
      sourceAccessor: rest.sourceAccessor,
      targetAccessor: rest.targetAccessor,
      colorBy,
      colorScheme,
      iterations: rest.iterations,
      forceStrength: rest.forceStrength,
      showLabels: rest.showLabels ?? false,
      nodeLabel: rest.nodeLabel,
      nodeSize: rest.nodeSize ?? 8,
      nodeSizeRange: rest.nodeSizeRange,
      nodeStyle: configuredNodeStyle,
      edgeStyle,
      // `...common` last, mirroring the HOC's trailing `{...frameProps}`: an
      // explicit frameProps nodeStyle/edgeStyle is the documented escape hatch
      // and outranks the primitive overlay on both paths.
      ...common
    }
  }
}

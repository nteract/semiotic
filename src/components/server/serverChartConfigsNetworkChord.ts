import type { Datum } from "../charts/shared/datumTypes"
import { inferNodesFromEdges } from "../charts/shared/networkUtils"
import {
  createColorScale,
  getColor,
  resolveCategoricalPalette
} from "../charts/shared/colorUtils"
import {
  hasPrimitiveOverrides,
  mergeShapeStyle
} from "../charts/shared/mergeShapeStyle"
import { styleRulesToNodeStyle } from "../charts/shared/styleRules"
import {
  type ChartConfig,
  primitiveStyleOverrides
} from "./serverChartConfigShared"
import { resolveTheme } from "./themeResolver"

export const chordDiagram: ChartConfig = {
  frameType: "network",
  layout: { primarySize: { width: 600, height: 600 } },
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Match ChordDiagram HOC coloring:
    //  - colorBy → categorical scale fill
    //  - else → stable per-node palette slot
    //  - styleRules layer on top when present
    // Use the layout plugin's default style when no override is needed.
    const hasStyleRules =
      Array.isArray(rest.styleRules) &&
      (rest.styleRules as unknown[]).length > 0
    // Top-level primitive overrides require a nodeStyle callback too.
    const needsNodeStyle = Boolean(
      colorBy ||
      hasStyleRules ||
      common.nodeStyle ||
      rest.nodeStyle ||
      hasPrimitiveOverrides(primitiveStyleOverrides(rest))
    )
    if (!needsNodeStyle) {
      return {
        chartType: "chord",
        nodes: rest.nodes,
        edges: rest.edges,
        valueAccessor: rest.valueAccessor,
        padAngle: rest.padAngle,
        groupWidth: rest.groupWidth,
        showLabels: rest.showLabels,
        colorBy,
        edgeColorBy: rest.edgeColorBy,
        colorScheme,
        ...common,
        showLegend: (common.showLegend ?? Boolean(colorBy)) && Boolean(colorBy)
      }
    }

    const edges = Array.isArray(rest.edges) ? (rest.edges as Datum[]) : []
    const nodes =
      Array.isArray(rest.nodes) && (rest.nodes as Datum[]).length > 0
        ? (rest.nodes as Datum[])
        : (inferNodesFromEdges(
            [],
            edges,
            (rest.sourceAccessor || "source") as
              string | ((d: Datum) => string),
            (rest.targetAccessor || "target") as string | ((d: Datum) => string)
          ) as Datum[])
    const themeCategorical = resolveTheme(
      common.theme as Parameters<typeof resolveTheme>[0]
    ).colors.categorical
    const palette = resolveCategoricalPalette(
      colorScheme as string | string[] | Record<string, string> | undefined,
      themeCategorical as string[]
    )
    const colorKey = typeof colorBy === "string" ? colorBy : "__ssrChordColorBy"
    const colorRows =
      typeof colorBy === "function"
        ? nodes.map((d) => ({ ...d, __ssrChordColorBy: colorBy(d) }))
        : nodes
    const colorScale = colorBy
      ? createColorScale(
          colorRows,
          colorKey,
          (colorScheme ?? common.colorScheme ?? themeCategorical) as
            string | string[] | Record<string, string>
        )
      : undefined
    const nodeIndexMap = new Map<string, number>()
    const nodeIdAccessor = (rest.nodeIdAccessor ||
      rest.nodeIDAccessor ||
      "id") as string
    const baseNodeStyle = (d: Datum, i?: number) => {
      const raw = (d?.data as Datum) || d
      let fill: string
      if (colorBy) {
        fill = getColor(
          raw,
          colorBy as string | ((node: Datum) => string),
          colorScale
        ) as string
      } else {
        const id = String(
          (d as { id?: unknown }).id ?? raw?.[nodeIdAccessor] ?? ""
        )
        if (!nodeIndexMap.has(id)) nodeIndexMap.set(id, nodeIndexMap.size)
        const index =
          (d as { index?: number }).index ?? i ?? nodeIndexMap.get(id)!
        fill = palette[index % palette.length]
      }
      return {
        fill,
        // Top-level primitive styling lives in rest, outside COMMON_FRAME_PROP_KEYS.
        stroke: (rest.stroke as string | undefined) ?? "black",
        strokeWidth: (rest.strokeWidth as number | undefined) ?? 1,
        ...(rest.opacity !== undefined && { opacity: rest.opacity })
      }
    }
    const ruleNodeStyle = styleRulesToNodeStyle(
      rest.styleRules as Parameters<typeof styleRulesToNodeStyle>[0],
      colorBy as string | ((d: Datum) => unknown) | undefined,
      rest.valueAccessor as string | ((d: Datum) => unknown) | undefined
    )
    // The shared server helper preserves an explicitly authored nodeStyle by
    // placing it over rules. Here the first layer is only Chord's generated
    // palette/base style, so declarative rules must win just as they do in the
    // client HOC's composeStyleRules(base, rules) path.
    const configuredNodeStyle = ruleNodeStyle
      ? (d: Datum, i?: number) => ({
          ...baseNodeStyle(d, i),
          ...ruleNodeStyle(d, i)
        })
      : baseNodeStyle
    return {
      chartType: "chord",
      nodes: rest.nodes,
      edges: rest.edges,
      valueAccessor: rest.valueAccessor,
      padAngle: rest.padAngle,
      groupWidth: rest.groupWidth,
      showLabels: rest.showLabels,
      colorBy,
      edgeColorBy: rest.edgeColorBy,
      colorScheme,
      nodeStyle: mergeShapeStyle(
        (rest.nodeStyle || configuredNodeStyle) as (d: Datum) => Datum,
        primitiveStyleOverrides(rest)
      ),
      // `...common` last, mirroring the HOC's trailing `{...frameProps}`.
      ...common,
      showLegend: (common.showLegend ?? Boolean(colorBy)) && Boolean(colorBy)
    }
  }
}

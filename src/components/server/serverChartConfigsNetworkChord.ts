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
    //  - else → stable per-node palette slot (NOT monochrome resolveDefaultFill,
    //    which painted every SSR arc the same and broke ssr-csr-chord parity)
    //  - styleRules layer on top when present
    // When nothing needs a custom nodeStyle, omit it so the layout plugin's
    // built-in path stays identical to the pre-styleRules SSR config.
    const hasStyleRules =
      Array.isArray(rest.styleRules) &&
      (rest.styleRules as unknown[]).length > 0
    // Top-level primitives need a nodeStyle too — without them in this gate,
    // `renderChart("ChordDiagram", { stroke })` took the built-in path below
    // and the arcs kept their default black outline.
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
        // Read the top-level primitives off `rest`: they are deliberately not
        // in COMMON_FRAME_PROP_KEYS, so `common.stroke` is always undefined
        // and this used to collapse to the hardcoded default every time.
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

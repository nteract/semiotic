"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo } from "react"
import { hierarchyLayoutPlugin } from "../../stream/layouts/hierarchyLayoutPlugin"
import { registerLayoutPlugin } from "../../stream/layouts/registry"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import {
  flattenHierarchy,
  resolveHierarchySum,
  wrapNetworkEdgeStyleWithSelection,
  wrapNetworkNodeStyleWithSelection,
} from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import {
  composeStyleRules,
  makeNodeRuleContext,
  type StyleRule,
} from "../shared/styleRules"

registerLayoutPlugin("tree", hierarchyLayoutPlugin)
registerLayoutPlugin("cluster", hierarchyLayoutPlugin)
registerLayoutPlugin("treemap", hierarchyLayoutPlugin)
registerLayoutPlugin("circlepack", hierarchyLayoutPlugin)
registerLayoutPlugin("partition", hierarchyLayoutPlugin)

/**
 * TreeDiagram component props
 */
export interface TreeDiagramProps<TNode extends Datum = Datum> extends BaseChartProps {
  data: TNode
  layout?: "tree" | "cluster" | "partition" | "treemap" | "circlepack"
  orientation?: "vertical" | "horizontal" | "radial"
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[] | Record<string, string>
  colorByDepth?: boolean
  /** Ordered data-aware node styling. Rules see the authored hierarchy node. */
  styleRules?: StyleRule[]
  edgeStyle?: "line" | "curve"
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  nodeSize?: number
  enableHover?: boolean
  /** Show a swatch + label legend. Defaults to `true` when `colorBy` is set. */
  showLegend?: boolean
  /** Legend position. Default `"right"`. */
  legendPosition?: LegendPosition
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * TreeDiagram - Visualize a hierarchy as connected node-link diagram.
 *
 * `data` is a single root object whose children are walked via
 * `childrenAccessor`. `layout` chooses between classic tidy-tree
 * (`"tree"`), partition (`"partition"`), or radial (`"radial"`)
 * arrangements; `orientation` flips horizontal/vertical for the linear
 * layouts.
 *
 * For nested-rectangle encodings of the same data shape use
 * {@link Treemap}; for nested circles use {@link CirclePack}; for
 * concentric-orbit encodings use {@link OrbitDiagram}.
 *
 * @example
 * ```tsx
 * // Org chart
 * <TreeDiagram
 *   data={{
 *     name: "CEO",
 *     reports: [
 *       { name: "VP Eng", reports: [{ name: "EM 1" }, { name: "EM 2" }] },
 *       { name: "VP Product" },
 *     ],
 *   }}
 *   childrenAccessor="reports"
 *   orientation="vertical"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Radial layout colored by depth
 * <TreeDiagram
 *   data={hierarchyRoot}
 *   childrenAccessor="children"
 *   layout="radial"
 *   colorByDepth
 * />
 * ```
 */
export function TreeDiagram<TNode extends Datum = Datum>(props: TreeDiagramProps<TNode>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    showLabels: props.showLabels,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
}, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    layout = "tree",
    orientation = "vertical",
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme,
    colorByDepth = false,
    styleRules,
    edgeStyle = "curve",
    nodeLabel,
    nodeSize = 5,
    tooltip,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    loadingContent,
    legendInteraction,
    legendPosition,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLegend, showLabels = true, title, description, summary, accessibleTable } = resolved

  // Node style function
  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: Datum) => Datum[]))
  }, [data, childrenAccessor])

  // Consolidated network setup — same hierarchy-shape pattern as
  // Treemap/CirclePack: flattened descendants flow into the hook,
  // node inference off. `showLegend` auto-on when `colorBy` is set.
  const setup = useNetworkChartSetup({
    nodes: allNodes,
    edges: undefined,
    inferNodes: false,
    colorBy: colorByDepth ? undefined : (colorBy as string | ((d: Datum) => string) | undefined),
    colorScheme,
    showLegend,
    legendPosition,
    legendInteraction,
    frameLegend: frameProps,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "TreeDiagram",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    hasTitle: !!title,
    loading,
    loadingContent,
  })
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // d is a RealtimeNode — user data on d.data, depth on d.depth
  const baseNodeStyleFn = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = { stroke: "black", strokeWidth: 1 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: Datum) => string), setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, setup.themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, setup.colorScale, setup.themeCategorical, colorScheme, categoryIndexMap])

  const nodeRuleContext = useMemo(
    () => makeNodeRuleContext(
      colorBy as string | ((d: Datum) => unknown) | undefined,
      valueAccessor as string | ((d: Datum) => unknown) | undefined,
    ),
    [colorBy, valueAccessor],
  )
  const ruledNodeStyleFn = useMemo(
    () => composeStyleRules(
      baseNodeStyleFn,
      styleRules,
      nodeRuleContext,
      (d) => d.data || d,
    ),
    [baseNodeStyleFn, styleRules, nodeRuleContext],
  )

  const nodeStyleFn = useMemo(
    () => mergeShapeStyle(ruledNodeStyleFn, { stroke, strokeWidth, opacity }),
    [ruledNodeStyleFn, stroke, strokeWidth, opacity]
  )
  const selectedNodeStyleFn = useMemo(
    () => wrapNetworkNodeStyleWithSelection(
      nodeStyleFn,
      setup.effectiveSelectionHook,
      setup.resolvedSelection,
    ),
    [nodeStyleFn, setup.effectiveSelectionHook, setup.resolvedSelection],
  )

  const baseEdgeStyleFn = useMemo(() => {
    return () => ({ stroke: "#999", strokeWidth: 1, fill: "none" })
  }, [])

  const edgeStyleFn = useMemo(
    () => mergeShapeStyle(baseEdgeStyleFn, { stroke, strokeWidth, opacity }),
    [baseEdgeStyleFn, stroke, strokeWidth, opacity]
  )
  const selectedEdgeStyleFn = useMemo(
    () => wrapNetworkEdgeStyleWithSelection(
      edgeStyleFn,
      setup.effectiveSelectionHook,
      setup.resolvedSelection,
    ),
    [edgeStyleFn, setup.effectiveSelectionHook, setup.resolvedSelection],
  )

  const hierarchySumFn = useMemo(() => {
    if (layout === "treemap" || layout === "circlepack" || layout === "partition") {
      return resolveHierarchySum(valueAccessor)
    }
    return undefined
  }, [layout, valueAccessor])

  // Validate
  const error = validateObjectData({ componentName: "TreeDiagram", data })
  if (error) return <ChartError componentName="TreeDiagram" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (setup.loadingEl) return setup.loadingEl

  return (<SafeRender componentName="TreeDiagram" width={width} height={height}>
    <StreamNetworkFrame
      chartType={layout}
      {...(data != null && { data })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={setup.margin}
      {...setup.legendBehaviorProps}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      treeOrientation={orientation}
      edgeType={edgeStyle}
      nodeStyle={selectedNodeStyleFn}
      edgeStyle={selectedEdgeStyleFn}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      colorByDepth={colorByDepth}
      nodeSize={nodeSize}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        onClick,
        mobileInteraction: setup.mobileInteraction,
        customHoverBehavior: setup.customHoverBehavior,
        customClickBehavior: setup.customClickBehavior,
        linkedHoverInClickPredicate: false,
      })}
      legend={setup.legend}
      legendPosition={setup.legendPosition}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: setup.legendState.onLegendHover,
        legendClickBehavior: setup.legendState.onLegendClick,
        legendHighlightedCategory: setup.legendState.highlightedCategory,
        legendIsolatedCategories: setup.legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      description={description}
      summary={summary}
      accessibleTable={accessibleTable}
      {...(props.animate != null && { animate: props.animate })}
      {...frameProps}
    />
  </SafeRender>)
}
TreeDiagram.displayName = "TreeDiagram"

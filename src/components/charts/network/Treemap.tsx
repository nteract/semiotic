"use client"
import type { Datum } from "../shared/datumTypes"
import type { NetworkMarkStyle } from "../../stream/networkTypes"
import * as React from "react"
import { useMemo, useCallback } from "react"
import { hierarchyLayoutPlugin } from "../../stream/layouts/hierarchyLayoutPlugin"
import { registerLayoutPlugin } from "../../stream/layouts/registry"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import {
  flattenHierarchy,
  resolveHierarchySum,
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

registerLayoutPlugin("treemap", hierarchyLayoutPlugin)

/**
 * Treemap component props
 */
export interface TreemapProps<TNode extends Datum = Datum> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[] | Record<string, string>
  colorByDepth?: boolean
  /** Ordered data-aware node styling. Rules see the authored hierarchy node. */
  styleRules?: StyleRule[]
  showLabels?: boolean
  labelMode?: "leaf" | "parent" | "all"
  nodeLabel?: ChartAccessor<TNode, string>
  padding?: number
  paddingTop?: number
  /**
   * Per-node style overlay. The returned style is merged on top of
   * Treemap's built-in colorBy/colorByDepth/default fill, then primitive
   * props and selection state are applied. Use this for root hiding,
   * custom borders, or per-depth opacity without re-implementing color
   * encoding.
   */
  nodeStyle?: (d: Datum) => NetworkMarkStyle
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
 * Treemap - Visualize a hierarchy as nested rectangles sized by value.
 *
 * Each leaf becomes a rectangle whose area is proportional to
 * `valueAccessor`; ancestors enclose their descendants. Better than
 * {@link CirclePack} when precise area comparison matters; better than
 * {@link TreeDiagram} when leaf count is large.
 *
 * @example
 * ```tsx
 * // Department budgets
 * <Treemap
 *   data={{
 *     name: "Total",
 *     children: [
 *       { name: "Eng", children: [
 *         { name: "Frontend", value: 120 },
 *         { name: "Platform", value: 90 },
 *       ]},
 *       { name: "Sales", value: 200 },
 *       { name: "Marketing", value: 60 },
 *     ],
 *   }}
 *   valueAccessor="value"
 *   childrenAccessor="children"
 *   showLabels
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color leaves by their parent (each top-level branch gets its own color)
 * <Treemap
 *   data={hierarchyRoot}
 *   valueAccessor="size"
 *   colorBy="parent"
 * />
 * ```
 */
export function Treemap<TNode extends Datum = Datum>(props: TreemapProps<TNode>) {

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
    linkedHover: props.linkedHover,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
}, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme,
    colorByDepth = false,
    styleRules,
    labelMode = "leaf",
    nodeLabel,
    padding: paddingProp = 4,
    paddingTop: paddingTopProp,
    nodeStyle: userNodeStyle,
    tooltip,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    loadingContent,
    legendInteraction,
    legendPosition,
    stroke,
    strokeWidth,
    opacity,
  } = props
  const { nodeStyle: frameNodeStyle, ...framePropsRest } = frameProps

  const { width, height, enableHover, showLegend, showLabels = true, title, description, summary, accessibleTable } = resolved

  // Flatten the hierarchy once so the consolidated setup hook can
  // build its color scale + categories off the same node array
  // node-style/legend logic uses below.
  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: Datum) => Datum[]))
  }, [data, childrenAccessor])

  // Consolidated network setup. Treemap's data shape is a hierarchy
  // root, not nodes/edges, so we feed `allNodes` (the flattened
  // descendants) and turn off node inference. `colorByDepth` paints
  // by tree depth instead of a categorical accessor — pass undefined
  // for `colorBy` in that case so the color scale + categories don't
  // try to extract categories that wouldn't drive the styling.
  const setup = useNetworkChartSetup({
    nodes: allNodes,
    edges: undefined,
    inferNodes: false,
    colorBy: colorByDepth ? undefined : (colorBy as string | ((d: Datum) => string) | undefined),
    colorScheme,
    showLegend,
    legendPosition,
    legendInteraction,
    frameLegend: framePropsRest,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "Treemap",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    hasTitle: !!title,
    loading,
    loadingContent,
    // No emptyContent gate — `data` is a hierarchy root validated
    // separately by validateObjectData, not the array-empty path.
  })

  const baseHoverBehavior = setup.customHoverBehavior

  // Network frame hover: { type, data: sceneNode, x, y }
  // sceneNode.data = original datum for this hierarchy node.
  // Pass it as { data: originalDatum } so useChartSelection unwraps correctly.
  const customHoverBehavior = useCallback(
    (d: Datum | null) => {
      if (!d) return baseHoverBehavior(null)
      const sceneNode = d.data || d
      const originalDatum = sceneNode?.data || sceneNode
      baseHoverBehavior({ data: originalDatum })
    },
    [baseHoverBehavior]
  )

  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const nodeStyleFn = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "var(--semiotic-cell-border, var(--semiotic-border, #fff))",
        strokeWidth: 1,
        strokeOpacity: 0.8
      }
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
      nodeStyleFn,
      styleRules,
      nodeRuleContext,
      (d) => d.data || d,
    ),
    [nodeStyleFn, styleRules, nodeRuleContext],
  )

  // Compose frame and user nodeStyle overlays with the HOC's built-in style
  // so callers can hide the root or customize borders without losing
  // colorBy/colorByDepth/default fill resolution. Public top-level
  // `nodeStyle` wins over `frameProps.nodeStyle` on overlapping keys, matching
  // the primitive-style precedence used elsewhere in the codebase.
  const nodeStyleFnWithUser = useMemo(() => {
    if (!userNodeStyle && !frameNodeStyle) return ruledNodeStyleFn
    return (d: Datum) => ({
      ...ruledNodeStyleFn(d),
      ...(frameNodeStyle ? frameNodeStyle(d) ?? {} : {}),
      ...(userNodeStyle ? userNodeStyle(d) ?? {} : {}),
    })
  }, [ruledNodeStyleFn, userNodeStyle, frameNodeStyle])

  // Overlay top-level primitive props after user nodeStyle, before selection
  // wrapping, so explicit primitive props land on every node.
  const nodeStyleFnWithPrimitives = useMemo(
    () => mergeShapeStyle(nodeStyleFnWithUser, { stroke, strokeWidth, opacity }),
    [nodeStyleFnWithUser, stroke, strokeWidth, opacity]
  )

  // Network layout callbacks receive a wrapper whose `.data` is the original
  // hierarchy datum. The shared wrapper unwraps it before legend/selection
  // predicates run, so interactions visibly update the cells.
  const nodeStyle = useMemo(
    () => wrapNetworkNodeStyleWithSelection(
      nodeStyleFnWithPrimitives,
      setup.effectiveSelectionHook,
      setup.resolvedSelection,
    ),
    [nodeStyleFnWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection],
  )

  const hierarchySumFn = useMemo(() => {
    return resolveHierarchySum(valueAccessor)
  }, [valueAccessor])

  const resolvedPaddingTop = paddingTopProp !== undefined
    ? paddingTopProp
    : (showLabels && (labelMode === "parent" || labelMode === "all") ? 18 : undefined)

  // Validate
  const error = validateObjectData({ componentName: "Treemap", data })
  if (error) return <ChartError componentName="Treemap" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (setup.loadingEl) return setup.loadingEl

  return (<SafeRender componentName="Treemap" width={width} height={height}>
    <StreamNetworkFrame
      chartType="treemap"
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
      padding={paddingProp}
      paddingTop={resolvedPaddingTop}
      nodeStyle={nodeStyle}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      labelMode={labelMode}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        onClick,
        mobileInteraction: setup.mobileInteraction,
        customHoverBehavior,
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
      {...framePropsRest}
    />
  </SafeRender>)
}
Treemap.displayName = "Treemap"

"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"
import { useResolvedSelection } from "../shared/useResolvedSelection"
import { DEFAULT_SELECTION_OPACITY } from "../shared/selectionUtils"

/**
 * Treemap component props
 */
export interface TreemapProps<TNode extends Datum = Datum> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
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
  nodeStyle?: (d: Datum) => Datum
  enableHover?: boolean
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
    showLabels: props.showLabels,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    linkedHover: props.linkedHover,
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
    stroke,
    strokeWidth,
    opacity,
  } = props
  const { nodeStyle: frameNodeStyle, ...framePropsRest } = frameProps

  const { width, height, enableHover, showLabels = true, title, description, summary, accessibleTable } = resolved

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
    showLegend: false,             // Treemap has no top-level legend prop
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartType: "Treemap",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    loading,
    loadingContent,
    // No emptyContent gate — `data` is a hierarchy root validated
    // separately by validateObjectData, not the array-empty path.
  })

  const resolvedSelection = useResolvedSelection(selection)
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
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1, strokeOpacity: 0.8 }
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

  // Compose user nodeStyle overlays with the HOC's built-in style so
  // callers can hide the root or customize borders without losing
  // colorBy/colorByDepth/default fill resolution.
  const nodeStyleFnWithUser = useMemo(() => {
    if (!userNodeStyle && !frameNodeStyle) return nodeStyleFn
    return (d: Datum) => ({
      ...nodeStyleFn(d),
      ...(userNodeStyle ? userNodeStyle(d) : {}),
      ...(frameNodeStyle ? frameNodeStyle(d) : {}),
    })
  }, [nodeStyleFn, userNodeStyle, frameNodeStyle])

  // Overlay top-level primitive props after user nodeStyle, before selection
  // wrapping, so explicit primitive props land on every node.
  const nodeStyleFnWithPrimitives = useMemo(
    () => mergeShapeStyle(nodeStyleFnWithUser, { stroke, strokeWidth, opacity }),
    [nodeStyleFnWithUser, stroke, strokeWidth, opacity]
  )

  // Wrap node style with selection — unwrap hierarchy .data for predicate matching
  const nodeStyle = useMemo(() => {
    if (!setup.activeSelectionHook) return nodeStyleFnWithPrimitives
    return (d: Datum) => {
      const style = { ...nodeStyleFnWithPrimitives(d) }
      if (setup.activeSelectionHook!.isActive) {
        const datum = d.data || d
        const matches = setup.activeSelectionHook!.predicate(datum)
        if (matches) {
          if (resolvedSelection?.selectedStyle) Object.assign(style, resolvedSelection.selectedStyle)
        } else {
          const dimOpacity = resolvedSelection?.unselectedOpacity ?? DEFAULT_SELECTION_OPACITY
          style.opacity = dimOpacity
          style.fillOpacity = dimOpacity
          style.strokeOpacity = dimOpacity
          if (resolvedSelection?.unselectedStyle) Object.assign(style, resolvedSelection.unselectedStyle)
        }
      }
      return style
    }
  }, [nodeStyleFnWithPrimitives, setup.activeSelectionHook, resolvedSelection])

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
      margin={setup.margin}
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
      {...((linkedHover || onObservation || onClick) && { customHoverBehavior })}
      {...((onObservation || onClick) && { customClickBehavior: setup.customClickBehavior })}
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

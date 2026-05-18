"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo } from "react"
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

/**
 * CirclePack component props
 */
export interface CirclePackProps<TNode extends Datum = Datum> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  showLabels?: boolean
  nodeLabel?: ChartAccessor<TNode, string>
  circleOpacity?: number
  padding?: number
  enableHover?: boolean
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * CirclePack - Visualize hierarchical data as nested circles.
 *
 * Each leaf becomes a circle sized by `valueAccessor`; parents enclose
 * their children. Best for hierarchies where size encoding matters more
 * than precise comparisons.
 *
 * For rectangular tiling of the same data shape use {@link Treemap}; for
 * radial parent→child connections use {@link TreeDiagram}.
 *
 * @example
 * ```tsx
 * // Filesystem-style hierarchy sized by file size
 * <CirclePack
 *   data={{
 *     name: "src",
 *     children: [
 *       { name: "components", children: [
 *         { name: "Chart.tsx", value: 1200 },
 *         { name: "Frame.tsx", value: 800 },
 *       ]},
 *       { name: "utils", children: [{ name: "color.ts", value: 400 }] },
 *     ],
 *   }}
 *   valueAccessor="value"
 *   childrenAccessor="children"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by depth instead of by leaf identity
 * <CirclePack
 *   data={hierarchyRoot}
 *   valueAccessor="size"
 *   colorByDepth
 *   showLabels
 * />
 * ```
 */
export function CirclePack<TNode extends Datum = Datum>(props: CirclePackProps<TNode>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
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
    nodeLabel,
    circleOpacity = 0.7,
    padding: paddingProp = 4,
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
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLabels = true, title, description, summary, accessibleTable } = resolved

  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: Datum) => Datum[]))
  }, [data, childrenAccessor])

  // Consolidated network setup. Same shape as Treemap's migration —
  // hierarchy charts feed flattened descendants into the hook with
  // node inference off, so colorScale / categories / legend state /
  // selection wiring all funnel through one call.
  const setup = useNetworkChartSetup({
    nodes: allNodes,
    edges: undefined,
    inferNodes: false,
    colorBy: colorByDepth ? undefined : (colorBy as string | ((d: Datum) => string) | undefined),
    colorScheme,
    showLegend: false,
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartType: "CirclePack",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    loading,
    loadingContent,
  })
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const baseNodeStyleFn = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3,
        fillOpacity: circleOpacity
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
  }, [colorBy, colorByDepth, setup.colorScale, circleOpacity, setup.themeCategorical, colorScheme, categoryIndexMap])

  const nodeStyleFn = useMemo(
    () => mergeShapeStyle(baseNodeStyleFn, { stroke, strokeWidth, opacity }),
    [baseNodeStyleFn, stroke, strokeWidth, opacity]
  )

  const hierarchySumFn = useMemo(() => {
    return resolveHierarchySum(valueAccessor)
  }, [valueAccessor])

  // Validate
  const error = validateObjectData({ componentName: "CirclePack", data })
  if (error) return <ChartError componentName="CirclePack" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (setup.loadingEl) return setup.loadingEl

  return (
    <SafeRender componentName="CirclePack" width={width} height={height}>
    <StreamNetworkFrame
      chartType="circlepack"
      {...(data != null && { data })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={setup.margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      nodeStyle={nodeStyleFn}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      customHoverBehavior={(linkedHover || onObservation || onClick) ? setup.customHoverBehavior : undefined}
      customClickBehavior={(onObservation || onClick) ? setup.customClickBehavior : undefined}
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
CirclePack.displayName = "CirclePack"

"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, createColorScale, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, useChartSelection, useColorScale, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderLoadingState } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"

/**
 * CirclePack component props
 */
export interface CirclePackProps<TNode extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
 * Wraps StreamNetworkFrame (canvas-first) for circle-pack visualization.
 */
export function CirclePack<TNode extends Record<string, any> = Record<string, any>>(props: CirclePackProps<TNode>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
  }, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    nodeLabel,
    circleOpacity = 0.7,
    padding: paddingProp = 4,
    tooltip,
    frameProps = {},
    onObservation,
    chartId,
    selection,
    linkedHover,
    loading,
    legendInteraction,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLabels = resolved.showLabels ?? true
  const title = resolved.title

  // ── Loading state ───────────────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl

  const allNodes = useMemo(() => {
    return flattenHierarchy(data, childrenAccessor as string | ((d: any) => any[]))
  }, [data, childrenAccessor])

  const colorScale = useColorScale(allNodes, colorByDepth ? undefined : colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy || colorByDepth) return []
    const vals = new Set<string>()
    for (const d of allNodes as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [allNodes, colorBy, colorByDepth])

  const legendState = useLegendInteraction(legendInteraction, colorByDepth ? undefined : colorBy as string | ((d: any) => string) | undefined, allCategories)

  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3,
        fillOpacity: circleOpacity
      }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale, circleOpacity])

  const hierarchySumFn = useMemo(() => {
    return resolveHierarchySum(valueAccessor)
  }, [valueAccessor])

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  const { customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true, onObservation, chartType: "CirclePack", chartId,
  })

  // Validate
  const error = validateObjectData({ componentName: "CirclePack", data })
  if (error) return <ChartError componentName="CirclePack" message={error} width={width} height={height} />

  return (
    <SafeRender componentName="CirclePack" width={width} height={height}>
    <StreamNetworkFrame
      chartType="circlepack"
      data={data}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      nodeStyle={nodeStyleFn}
      colorBy={colorBy}
      colorScheme={colorScheme}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      customHoverBehavior={(linkedHover || onObservation) ? customHoverBehavior : undefined}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: legendState.onLegendHover,
        legendClickBehavior: legendState.onLegendClick,
        legendHighlightedCategory: legendState.highlightedCategory,
        legendIsolatedCategories: legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      {...frameProps}
    />
  </SafeRender>)
}
CirclePack.displayName = "CirclePack"

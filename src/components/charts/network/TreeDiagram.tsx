"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, createColorScale, DEPTH_PALETTE_COLORS, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, useChartSelection, useColorScale, useLegendInteraction, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderLoadingState } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"

/**
 * TreeDiagram component props
 */
export interface TreeDiagramProps<TNode extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TNode
  layout?: "tree" | "cluster" | "partition" | "treemap" | "circlepack"
  orientation?: "vertical" | "horizontal" | "radial"
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  edgeStyle?: "line" | "curve"
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  nodeSize?: number
  enableHover?: boolean
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * TreeDiagram - Visualize hierarchical data structures
 *
 * Wraps StreamNetworkFrame (canvas-first) for hierarchical tree visualization.
 */
export function TreeDiagram<TNode extends Record<string, any> = Record<string, any>>(props: TreeDiagramProps<TNode>) {

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
    layout = "tree",
    orientation = "vertical",
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    edgeStyle = "curve",
    nodeLabel,
    nodeSize = 5,
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

  // Node style function
  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: any) => any[]))
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

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const effectivePalette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  // d is a RealtimeNode — user data on d.data, depth on d.depth
  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "black", strokeWidth: 1 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale, themeCategorical, colorScheme, categoryIndexMap])

  const edgeStyleFn = useMemo(() => {
    return () => ({ stroke: "#999", strokeWidth: 1, fill: "none" })
  }, [])

  const hierarchySumFn = useMemo(() => {
    if (layout === "treemap" || layout === "circlepack" || layout === "partition") {
      return resolveHierarchySum(valueAccessor)
    }
    return undefined
  }, [layout, valueAccessor])

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  const { customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true, onObservation, chartType: "TreeDiagram", chartId,
  })

  // Validate
  const error = validateObjectData({ componentName: "TreeDiagram", data })
  if (error) return <ChartError componentName="TreeDiagram" message={error} width={width} height={height} />

  return (<SafeRender componentName="TreeDiagram" width={width} height={height}>
    <StreamNetworkFrame
      chartType={layout}
      {...(data != null && { data })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      treeOrientation={orientation}
      edgeType={edgeStyle}
      nodeStyle={nodeStyleFn}
      edgeStyle={edgeStyleFn}
      colorBy={colorBy}
      colorScheme={effectivePalette}
      colorByDepth={colorByDepth}
      nodeSize={nodeSize}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
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
TreeDiagram.displayName = "TreeDiagram"

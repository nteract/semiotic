"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, getSize } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, useChartLegendAndMargin, useChartMode, useChartSelection, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * ForceDirectedGraph component props
 */
export interface ForceDirectedGraphProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  nodes: TNode[]
  edges: TEdge[]
  nodeIDAccessor?: ChartAccessor<TNode, string>
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  nodeLabel?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
  nodeSize?: number | ChartAccessor<TNode, number>
  nodeSizeRange?: [number, number]
  edgeWidth?: number | ChartAccessor<TEdge, number>
  edgeColor?: string
  edgeOpacity?: number
  iterations?: number
  forceStrength?: number
  showLabels?: boolean
  enableHover?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "nodes" | "edges" | "size">>
}

/**
 * ForceDirectedGraph - Visualize network relationships with force-directed layout
 *
 * Wraps StreamNetworkFrame (canvas-first) for force-directed network visualization.
 */
export function ForceDirectedGraph<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: ForceDirectedGraphProps<TNode, TEdge>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    showLabels: props.showLabels,
    title: props.title,
  }, { width: 600, height: 600 })

  const {
    nodes,
    edges,
    margin: userMargin,
    className,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    nodeLabel,
    colorBy,
    colorScheme = "category10",
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    edgeWidth = 1,
    edgeColor = "#999",
    edgeOpacity = 0.6,
    iterations = 300,
    forceStrength = 0.1,
    tooltip,
    frameProps = {},
    onObservation,
    chartId,
    selection,
    linkedHover,
    loading,
    emptyContent,
    legendInteraction,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const showLabels = resolved.showLabels ?? false
  const title = resolved.title

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(edges, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeNodes = nodes || []
  const safeEdges = edges || []

  const colorScale = useColorScale(safeNodes, colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeNodes as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeNodes, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Node style function — d is a RealtimeNode, user data on d.data
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      if (typeof nodeSize === "number") {
        baseStyle.r = nodeSize
      }
      return baseStyle
    }
  }, [colorBy, colorScale, nodeSize])

  // Edge style function
  const edgeStyle = useMemo(() => {
    return (d: Record<string, any>) => ({
      stroke: edgeColor,
      strokeWidth: typeof edgeWidth === "number" ? edgeWidth : typeof edgeWidth === "function" ? edgeWidth(d as TEdge) : d[edgeWidth] || 1,
      opacity: edgeOpacity
    })
  }, [edgeWidth, edgeColor, edgeOpacity])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels || !nodeLabel) return undefined
    if (typeof nodeLabel === "function") return nodeLabel
    return (d: Record<string, any>) => d[nodeLabel]
  }, [showLabels, nodeLabel])

  // Legend & margin
  const { legend, margin } = useChartLegendAndMargin({
    data: safeNodes,
    colorBy,
    colorScale,
    showLegend,
    userMargin,
    defaults: resolved.marginDefaults
  })

  const { customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation, chartType: "ForceDirectedGraph", chartId,
  })

  // Validate
  const error = validateNetworkData({
    componentName: "ForceDirectedGraph",
    nodes,
    edges,
    nodesRequired: true,
    edgesRequired: true,
    accessors: { nodeIDAccessor },
  })
  if (error) return <ChartError componentName="ForceDirectedGraph" message={error} width={width} height={height} />

  return (
    <SafeRender componentName="ForceDirectedGraph" width={width} height={height}>
    <StreamNetworkFrame
      chartType="force"
      nodes={safeNodes}
      edges={safeEdges}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIDAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      iterations={iterations}
      forceStrength={forceStrength}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={colorScheme}
      nodeSize={nodeSize}
      nodeSizeRange={nodeSizeRange}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      customHoverBehavior={(linkedHover || onObservation) ? customHoverBehavior : undefined}
      legend={legend}
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
ForceDirectedGraph.displayName = "ForceDirectedGraph"

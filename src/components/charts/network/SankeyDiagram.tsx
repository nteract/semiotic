"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import { inferNodesFromEdges, createEdgeStyleFn } from "../shared/networkUtils"
import { useColorScale, useChartMode, useChartLegendAndMargin, useChartSelection, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * SankeyDiagram component props
 */
export interface SankeyDiagramProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  nodes?: TNode[]
  edges?: TEdge[]
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
  edgeColorBy?: "source" | "target" | "gradient" | ((d: any) => string)
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  enableHover?: boolean
  legendInteraction?: LegendInteractionMode
  edgeOpacity?: number
  edgeSort?: (a: any, b: any) => number
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * SankeyDiagram - Visualize flow and magnitude of movement between nodes
 *
 * Wraps StreamNetworkFrame (canvas-first) for Sankey flow visualization.
 */
export const SankeyDiagram = forwardRef<RealtimeFrameHandle, SankeyDiagramProps>(function SankeyDiagram(props, ref) {
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point as any),
    pushMany: (points) => frameRef.current?.pushMany(points as any),
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getTopology()?.nodes?.map((n: any) => n.data) ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
  }, { width: 800, height: 600 })

  const {
    nodes,
    edges,
    margin: userMargin,
    className,
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    nodeIdAccessor = "id",
    colorBy,
    colorScheme = "category10",
    edgeColorBy = "source",
    orientation = "horizontal",
    nodeAlign = "justify",
    nodePaddingRatio = 0.05,
    nodeWidth = 15,
    nodeLabel,
    edgeOpacity = 0.5,
    edgeSort,
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
  const showLabels = resolved.showLabels ?? true
  const title = resolved.title

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(edges, width, height, emptyContent)
  if (emptyEl) return emptyEl

  // Safe data defaults (hooks must always run)
  const safeEdges = edges || []

  // Infer nodes from edges if not provided
  const inferredNodes = useMemo(
    () => inferNodesFromEdges(nodes, safeEdges, sourceAccessor, targetAccessor),
    [nodes, safeEdges, sourceAccessor, targetAccessor]
  )

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(inferredNodes, colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of inferredNodes as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [inferredNodes, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Node style function
  // d is a RealtimeNode — user data lives on d.data
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }

      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#4d430c"
      }

      return baseStyle
    }
  }, [colorBy, colorScale])

  // Edge style function
  // d is a RealtimeEdge — d.source/d.target are RealtimeNode objects
  const edgeStyle = useMemo(() => createEdgeStyleFn({
    edgeColorBy,
    colorBy,
    colorScale,
    nodeStyleFn: nodeStyle,
    edgeOpacity,
    baseStyle: { stroke: "none", strokeWidth: 0 }
  }), [edgeColorBy, colorBy, colorScale, nodeStyle, edgeOpacity])

  // Node label accessor
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined
    const accessor = nodeLabel || nodeIdAccessor
    if (typeof accessor === "function") return accessor
    // d is a RealtimeNode — user data lives at d.data, fall back to d.id
    return (d: Record<string, any>) => d.data?.[accessor] ?? d[accessor] ?? d.id
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  const { customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation,
    chartType: "SankeyDiagram",
    chartId,
  })

  // Validate data (after all hooks)
  const error = validateNetworkData({
    componentName: "SankeyDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="SankeyDiagram" message={error} width={width} height={height} />

  return (
    <SafeRender componentName="SankeyDiagram" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="sankey"
      {...(nodes != null && { nodes: inferredNodes })}
      {...(edges != null && { edges: safeEdges })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      valueAccessor={valueAccessor}
      orientation={orientation}
      nodeAlign={nodeAlign}
      nodePaddingRatio={nodePaddingRatio}
      nodeWidth={nodeWidth}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={colorScheme}
      edgeColorBy={edgeColorBy}
      edgeOpacity={edgeOpacity}
      edgeSort={edgeSort}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d: any) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      customHoverBehavior={(linkedHover || onObservation) ? customHoverBehavior : undefined}
      customClickBehavior={onObservation ? customClickBehavior : undefined}
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
})
SankeyDiagram.displayName = "SankeyDiagram"

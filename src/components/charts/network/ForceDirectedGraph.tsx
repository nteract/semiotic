"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle, EdgePush } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, useChartLegendAndMargin, useChartMode, useChartSelection, useLegendInteraction, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * ForceDirectedGraph component props
 */
export interface ForceDirectedGraphProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  nodes?: TNode[]
  edges?: TEdge[]
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
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "nodes" | "edges" | "size">>
}

/**
 * ForceDirectedGraph - Visualize network relationships with force-directed layout
 *
 * Wraps StreamNetworkFrame (canvas-first) for force-directed network visualization.
 */
export const ForceDirectedGraph = forwardRef(function ForceDirectedGraph<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: ForceDirectedGraphProps<TNode, TEdge>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point as EdgePush),
    pushMany: (points) => frameRef.current?.pushMany(points as EdgePush[]),
    remove: (id) => {
      const ids = Array.isArray(id) ? id : [id]
      const nodes = frameRef.current?.getTopology()?.nodes ?? []
      const results: Record<string, any>[] = []
      for (const nodeId of ids) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) results.push({ ...(node.data ?? {}), id: nodeId })
        frameRef.current?.removeNode(nodeId)
      }
      return results
    },
    update: (id, updater) => {
      const ids = Array.isArray(id) ? id : [id]
      return ids.flatMap(nodeId => {
        const prev = frameRef.current?.updateNode(nodeId, updater)
        return prev ? [{ ...prev, id: nodeId }] : []
      })
    },
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getTopology()?.nodes?.map((n: any) => n.data) ?? []
  }))

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
    colorScheme,
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
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const showLabels = resolved.showLabels ?? false
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(nodes, width, height, emptyContent) : null

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

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const effectivePalette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  // Node style function — d is a RealtimeNode, user data on d.data
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      if (typeof nodeSize === "number") {
        baseStyle.r = nodeSize
      }
      return baseStyle
    }
  }, [colorBy, colorScale, nodeSize, themeCategorical, colorScheme, categoryIndexMap])

  // Edge style function
  const edgeStyle = useMemo(() => {
    return (d: Record<string, any>) => ({
      stroke: edgeColor,
      strokeWidth: typeof edgeWidth === "number" ? edgeWidth : typeof edgeWidth === "function" ? edgeWidth(d) : d[edgeWidth] || 1,
      opacity: edgeOpacity
    })
  }, [edgeWidth, edgeColor, edgeOpacity])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels || !nodeLabel) return undefined
    if (typeof nodeLabel === "function") return nodeLabel
    // d is a RealtimeNode — user data lives at d.data, fall back to d.id
    return (d: Record<string, any>) => d.data?.[nodeLabel] ?? d[nodeLabel] ?? d.id
  }, [showLabels, nodeLabel])

  // Legend & margin
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeNodes,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults
  })

  const { customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation, onClick, chartType: "ForceDirectedGraph", chartId,
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

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="ForceDirectedGraph" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="force"
      {...(nodes != null && { nodes: safeNodes })}
      {...(edges != null && { edges: safeEdges })}
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
      colorScheme={effectivePalette}
      nodeSize={nodeSize}
      nodeSizeRange={nodeSizeRange}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      customHoverBehavior={(linkedHover || onObservation || onClick) ? customHoverBehavior : undefined}
      customClickBehavior={(onObservation || onClick) ? customClickBehavior : undefined}
      legend={legend}
      legendPosition={legendPosition}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: legendState.onLegendHover,
        legendClickBehavior: legendState.onLegendClick,
        legendHighlightedCategory: legendState.highlightedCategory,
        legendIsolatedCategories: legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      description={description}
      summary={summary}
      accessibleTable={accessibleTable}
      {...frameProps}
    />
  </SafeRender>)
}) as unknown as {
  <TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: ForceDirectedGraphProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ForceDirectedGraph.displayName = "ForceDirectedGraph"

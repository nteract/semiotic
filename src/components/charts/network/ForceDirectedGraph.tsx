"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, getSize } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
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
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "nodes" | "edges" | "size">>
}

/**
 * ForceDirectedGraph - Visualize network relationships with force-directed layout
 *
 * Now wraps StreamNetworkFrame (canvas-first) instead of legacy NetworkFrame.
 */
export function ForceDirectedGraph<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: ForceDirectedGraphProps<TNode, TEdge>) {
  const {
    nodes,
    edges,
    width = 600,
    height = 600,
    margin: userMargin,
    className,
    title,
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
    showLabels = false,
    enableHover = true,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  const safeNodes = nodes || []
  const safeEdges = edges || []

  const colorScale = useColorScale(safeNodes, colorBy, colorScheme)

  // Node style function
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
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

  // Legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    return createLegend({ data: safeNodes, colorBy, colorScale, getColor })
  }, [shouldShowLegend, colorBy, safeNodes, colorScale])

  // Adjust margin for legend
  const margin = useMemo(() => {
    const defaultMargin = { top: 20, bottom: 20, left: 20, right: 20 }
    const finalMargin = { ...defaultMargin, ...userMargin }
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }
    return finalMargin
  }, [userMargin, legend])

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
    <StreamNetworkFrame
      chartType="force"
      nodes={safeNodes}
      edges={safeEdges}
      size={[width, height]}
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
      legend={legend}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
ForceDirectedGraph.displayName = "ForceDirectedGraph"

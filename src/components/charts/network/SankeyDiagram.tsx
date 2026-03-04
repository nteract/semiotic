"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * SankeyDiagram component props
 */
export interface SankeyDiagramProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  nodes?: TNode[]
  edges: TEdge[]
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
export function SankeyDiagram<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: SankeyDiagramProps<TNode, TEdge>) {
  const {
    nodes,
    edges,
    width = 800,
    height = 600,
    margin = { top: 50, bottom: 50, left: 50, right: 50 },
    className,
    title,
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
    showLabels = true,
    enableHover = true,
    edgeOpacity = 0.5,
    edgeSort,
    tooltip,
    frameProps = {}
  } = props

  // Safe data defaults (hooks must always run)
  const safeEdges = edges || []

  // Infer nodes from edges if not provided
  const inferredNodes = useMemo(() => {
    if (nodes && nodes.length > 0) return nodes

    const nodeSet = new Set<string>()
    safeEdges.forEach((edge) => {
      const sourceId =
        typeof sourceAccessor === "function"
          ? sourceAccessor(edge)
          : edge[sourceAccessor]
      const targetId =
        typeof targetAccessor === "function"
          ? targetAccessor(edge)
          : edge[targetAccessor]

      nodeSet.add(sourceId)
      nodeSet.add(targetId)
    })

    return Array.from(nodeSet).map((id) => ({ id }))
  }, [nodes, safeEdges, sourceAccessor, targetAccessor])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(inferredNodes, colorBy, colorScheme)

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
  const edgeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "none",
        strokeWidth: 0,
        fillOpacity: edgeOpacity
      }

      if (typeof edgeColorBy === "function") {
        baseStyle.fill = edgeColorBy(d)
      } else if (edgeColorBy === "source") {
        const src = typeof d.source === "object" ? d.source : null
        if (colorBy && src) {
          baseStyle.fill = getColor(src.data || src, colorBy, colorScale)
        } else if (src) {
          baseStyle.fill = nodeStyle(src).fill
        }
      } else if (edgeColorBy === "target") {
        const tgt = typeof d.target === "object" ? d.target : null
        if (colorBy && tgt) {
          baseStyle.fill = getColor(tgt.data || tgt, colorBy, colorScale)
        } else if (tgt) {
          baseStyle.fill = nodeStyle(tgt).fill
        }
      } else if (edgeColorBy === "gradient") {
        baseStyle.fill = "#999"
        baseStyle.fillOpacity = edgeOpacity * 0.7
      }

      return baseStyle
    }
  }, [edgeColorBy, colorBy, colorScale, nodeStyle, edgeOpacity])

  // Node label accessor
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined
    const accessor = nodeLabel || nodeIdAccessor
    if (typeof accessor === "function") return accessor
    return (d: Record<string, any>) => d[accessor]
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Tooltip
  const tooltipFn = useMemo(() => {
    if (typeof tooltip === "function") return tooltip
    return undefined
  }, [tooltip])

  // Validate data (after all hooks)
  const error = validateNetworkData({
    componentName: "SankeyDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="SankeyDiagram" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType="sankey"
      nodes={inferredNodes}
      edges={safeEdges}
      size={[width, height]}
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
      tooltipContent={tooltipFn ? (d) => tooltipFn(d.data) : undefined}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
SankeyDiagram.displayName = "SankeyDiagram"

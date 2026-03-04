"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * ChordDiagram component props
 */
export interface ChordDiagramProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  nodes?: TNode[]
  edges: TEdge[]
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
  edgeColorBy?: "source" | "target" | ((d: any) => string)
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: any, b: any) => number
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  enableHover?: boolean
  edgeOpacity?: number
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * ChordDiagram - Visualize directed relationships with circular chord layout
 *
 * Now wraps StreamNetworkFrame (canvas-first) instead of legacy NetworkFrame.
 */
export function ChordDiagram<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: ChordDiagramProps<TNode, TEdge>) {
  const {
    nodes,
    edges,
    width = 600,
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
    padAngle = 0.01,
    groupWidth = 20,
    sortGroups,
    nodeLabel,
    showLabels = true,
    enableHover = true,
    edgeOpacity = 0.5,
    tooltip,
    frameProps = {}
  } = props

  const safeEdges = edges || []

  // Infer nodes from edges if not provided
  const inferredNodes = useMemo(() => {
    if (nodes && nodes.length > 0) return nodes

    const nodeSet = new Set<string>()
    safeEdges.forEach((edge) => {
      const sourceId = typeof sourceAccessor === "function" ? sourceAccessor(edge) : edge[sourceAccessor]
      const targetId = typeof targetAccessor === "function" ? targetAccessor(edge) : edge[targetAccessor]
      nodeSet.add(sourceId)
      nodeSet.add(targetId)
    })

    return Array.from(nodeSet).map((id) => ({ id }))
  }, [nodes, safeEdges, sourceAccessor, targetAccessor])

  const colorScale = useColorScale(inferredNodes, colorBy, colorScheme)

  // Node style function — d is a RealtimeNode, user data on d.data
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>, i?: number) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        const palette = Array.isArray(colorScheme) ? colorScheme : (COLOR_SCHEMES[colorScheme] || DEFAULT_COLORS)
        const colors = Array.isArray(palette) ? palette : DEFAULT_COLORS
        const index = (d as any).index ?? i ?? 0
        baseStyle.fill = colors[index % colors.length]
      }
      return baseStyle
    }
  }, [colorBy, colorScale, colorScheme])

  // Edge style function — d is a RealtimeEdge
  const edgeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 0.5,
        fillOpacity: edgeOpacity,
        strokeOpacity: edgeOpacity
      }
      if (typeof edgeColorBy === "function") {
        baseStyle.fill = edgeColorBy(d)
      } else if (edgeColorBy === "source") {
        const src = typeof d.source === "object" ? d.source : null
        if (colorBy && src) {
          baseStyle.fill = getColor(src.data || src, colorBy, colorScale)
        } else if (src) {
          baseStyle.fill = nodeStyle(src, src.index).fill
        }
      } else if (edgeColorBy === "target") {
        const tgt = typeof d.target === "object" ? d.target : null
        if (colorBy && tgt) {
          baseStyle.fill = getColor(tgt.data || tgt, colorBy, colorScale)
        } else if (tgt) {
          baseStyle.fill = nodeStyle(tgt, tgt.index).fill
        }
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

  // Validate
  const error = validateNetworkData({
    componentName: "ChordDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="ChordDiagram" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType="chord"
      nodes={inferredNodes}
      edges={safeEdges}
      size={[width, height]}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      valueAccessor={valueAccessor}
      padAngle={padAngle}
      groupWidth={groupWidth}
      sortGroups={sortGroups}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={colorScheme}
      edgeColorBy={edgeColorBy}
      edgeOpacity={edgeOpacity}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
ChordDiagram.displayName = "ChordDiagram"

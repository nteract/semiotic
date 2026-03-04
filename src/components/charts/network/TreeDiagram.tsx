"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateObjectData } from "../shared/validateChartData"

/**
 * TreeDiagram component props
 */
export interface TreeDiagramProps<TNode extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TNode
  layout?: "tree" | "cluster" | "partition" | "treemap" | "circlepack"
  orientation?: "vertical" | "horizontal" | "radial"
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: Accessor<number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  edgeStyle?: "line" | "curve"
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  nodeSize?: number
  enableHover?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * TreeDiagram - Visualize hierarchical data structures
 *
 * Wraps StreamNetworkFrame (canvas-first) for hierarchical tree visualization.
 */
export function TreeDiagram<TNode extends Record<string, any> = Record<string, any>>(props: TreeDiagramProps<TNode>) {
  const {
    data,
    width = 600,
    height = 600,
    margin = { top: 50, bottom: 50, left: 50, right: 50 },
    className,
    title,
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
    showLabels = true,
    nodeSize = 5,
    enableHover = true,
    tooltip,
    frameProps = {}
  } = props

  // Node style function
  const allNodes = useMemo(() => {
    if (!data) return []
    const nodes: Array<Record<string, any>> = []
    const traverse = (node: Record<string, any>) => {
      nodes.push(node)
      const children = typeof childrenAccessor === "function" ? childrenAccessor(node as TNode) : node[childrenAccessor]
      if (children && Array.isArray(children)) children.forEach(traverse)
    }
    traverse(data)
    return nodes
  }, [data, childrenAccessor])

  const colorScale = useMemo(() => {
    if (colorByDepth) return createColorScale(allNodes.map((_, idx) => ({ depth: idx % 5 })), "depth", colorScheme)
    if (!colorBy || typeof colorBy === "function") return undefined
    return createColorScale(allNodes, colorBy as string, colorScheme)
  }, [allNodes, colorBy, colorByDepth, colorScheme])

  // d is a RealtimeNode — user data on d.data, depth on d.depth
  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "black", strokeWidth: 1 }
      if (colorByDepth) {
        baseStyle.fill = getColor({ depth: d.depth || 0 }, "depth", colorScale)
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale])

  const edgeStyleFn = useMemo(() => {
    return () => ({ stroke: "#999", strokeWidth: 1, fill: "none" })
  }, [])

  const hierarchySumFn = useMemo(() => {
    if (layout === "treemap" || layout === "circlepack" || layout === "partition") {
      if (typeof valueAccessor === "function") return valueAccessor
      return (d: Record<string, any>) => d[valueAccessor] || 1
    }
    return undefined
  }, [layout, valueAccessor])

  // Validate
  const error = validateObjectData({ componentName: "TreeDiagram", data })
  if (error) return <ChartError componentName="TreeDiagram" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType={layout}
      data={data}
      size={[width, height]}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      treeOrientation={orientation}
      edgeType={edgeStyle}
      nodeStyle={nodeStyleFn}
      edgeStyle={edgeStyleFn}
      colorBy={colorBy as any}
      colorScheme={colorScheme}
      colorByDepth={colorByDepth}
      nodeSize={nodeSize}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
TreeDiagram.displayName = "TreeDiagram"

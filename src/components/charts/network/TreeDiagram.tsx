"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, createColorScale, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
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
    chartId
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLabels = resolved.showLabels ?? true
  const title = resolved.title

  // Node style function
  const allNodes = useMemo(() => {
    return flattenHierarchy(data, childrenAccessor as string | ((d: any) => any[]))
  }, [data, childrenAccessor])

  const colorScale = useMemo(() => {
    if (colorByDepth) return undefined
    if (!colorBy || typeof colorBy === "function") return undefined
    return createColorScale(allNodes, colorBy as string, colorScheme)
  }, [allNodes, colorBy, colorByDepth, colorScheme])

  // d is a RealtimeNode — user data on d.data, depth on d.depth
  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "black", strokeWidth: 1 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
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
      return resolveHierarchySum(valueAccessor)
    }
    return undefined
  }, [layout, valueAccessor])

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  const observationHoverBehavior = useCallback(
    (d: { type: "node" | "edge"; data: any; x: number; y: number } | null) => {
      if (!onObservation) return
      const now = Date.now()
      if (d) {
        onObservation({ type: "hover", datum: d.data || {}, x: d.x, y: d.y, timestamp: now, chartType: "TreeDiagram", chartId })
      } else {
        onObservation({ type: "hover-end", timestamp: now, chartType: "TreeDiagram", chartId })
      }
    },
    [onObservation, chartId]
  )

  // Validate
  const error = validateObjectData({ componentName: "TreeDiagram", data })
  if (error) return <ChartError componentName="TreeDiagram" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType={layout}
      data={data}
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
      colorBy={colorBy as any}
      colorScheme={colorScheme}
      colorByDepth={colorByDepth}
      nodeSize={nodeSize}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      customHoverBehavior={onObservation ? observationHoverBehavior : undefined}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
TreeDiagram.displayName = "TreeDiagram"

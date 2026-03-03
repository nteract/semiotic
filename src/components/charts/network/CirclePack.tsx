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
 * CirclePack component props
 */
export interface CirclePackProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: Accessor<number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  showLabels?: boolean
  nodeLabel?: ChartAccessor<TNode, string>
  circleOpacity?: number
  padding?: number
  enableHover?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * CirclePack - Visualize hierarchical data as nested circles.
 *
 * Now wraps StreamNetworkFrame (canvas-first) instead of legacy NetworkFrame.
 */
export function CirclePack<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: CirclePackProps<TNode, TEdge>) {
  const {
    data,
    width = 600,
    height = 600,
    margin = { top: 10, bottom: 10, left: 10, right: 10 },
    className,
    title,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    showLabels = true,
    nodeLabel,
    circleOpacity = 0.7,
    padding: paddingProp = 4,
    enableHover = true,
    tooltip,
    frameProps = {}
  } = props

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
    if (colorByDepth) return undefined
    if (!colorBy || typeof colorBy === "function") return undefined
    return createColorScale(allNodes, colorBy as string, colorScheme)
  }, [allNodes, colorBy, colorByDepth, colorScheme])

  const nodeStyleFn = useMemo(() => {
    const DEPTH_PASTELS = ["#f0f0f0", "#b5d4ea", "#f4c2a1", "#b8dab2", "#d4b5e0", "#f9e0a2", "#a8d8d8"]
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3,
        fillOpacity: circleOpacity
      }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PASTELS[(d.depth || 0) % DEPTH_PASTELS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale, circleOpacity])

  const hierarchySumFn = useMemo(() => {
    if (typeof valueAccessor === "function") return valueAccessor
    return (d: Record<string, any>) => d[valueAccessor] || 1
  }, [valueAccessor])

  // Validate
  const error = validateObjectData({ componentName: "CirclePack", data })
  if (error) return <ChartError componentName="CirclePack" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType="circlepack"
      data={data}
      size={[width, height]}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      nodeStyle={nodeStyleFn}
      colorBy={colorBy as any}
      colorScheme={colorScheme}
      colorByDepth={colorByDepth}
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
CirclePack.displayName = "CirclePack"

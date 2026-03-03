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
 * Treemap component props
 */
export interface TreemapProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: Accessor<number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  showLabels?: boolean
  labelMode?: "leaf" | "parent" | "all"
  nodeLabel?: ChartAccessor<TNode, string>
  padding?: number
  paddingTop?: number
  enableHover?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * Treemap - Visualize hierarchical data as nested rectangles.
 *
 * Now wraps StreamNetworkFrame (canvas-first) instead of legacy NetworkFrame.
 */
export function Treemap<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>>(props: TreemapProps<TNode, TEdge>) {
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
    labelMode = "leaf",
    nodeLabel,
    padding: paddingProp = 4,
    paddingTop: paddingTopProp,
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
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1, strokeOpacity: 0.8 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PASTELS[(d.depth || 0) % DEPTH_PASTELS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale])

  const hierarchySumFn = useMemo(() => {
    if (typeof valueAccessor === "function") return valueAccessor
    return (d: Record<string, any>) => d[valueAccessor] || 1
  }, [valueAccessor])

  const resolvedPaddingTop = paddingTopProp !== undefined
    ? paddingTopProp
    : (showLabels && labelMode === "parent" ? 18 : undefined)

  // Validate
  const error = validateObjectData({ componentName: "Treemap", data })
  if (error) return <ChartError componentName="Treemap" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType="treemap"
      data={data}
      size={[width, height]}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      paddingTop={resolvedPaddingTop}
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
Treemap.displayName = "Treemap"

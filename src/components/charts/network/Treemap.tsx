"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, createColorScale, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, useChartSelection, useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateObjectData } from "../shared/validateChartData"

/**
 * Treemap component props
 */
export interface TreemapProps<TNode extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
 * Wraps StreamNetworkFrame (canvas-first) for treemap visualization.
 */
export function Treemap<TNode extends Record<string, any> = Record<string, any>>(props: TreemapProps<TNode>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
    linkedHover: props.linkedHover,
  }, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    labelMode = "leaf",
    nodeLabel,
    padding: paddingProp = 4,
    paddingTop: paddingTopProp,
    tooltip,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLabels = resolved.showLabels ?? true
  const title = resolved.title

  const { activeSelectionHook, customHoverBehavior: baseHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "Treemap", chartId
  })

  // Network frame hover: { type, data: sceneNode, x, y }
  // sceneNode.data = original datum for this hierarchy node
  // Pass it as { data: originalDatum } so useChartSelection unwraps correctly
  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (!d) return baseHoverBehavior(null)
      const sceneNode = d.data || d
      const originalDatum = sceneNode?.data || sceneNode
      baseHoverBehavior({ data: originalDatum })
    },
    [baseHoverBehavior]
  )

  const allNodes = useMemo(() => {
    return flattenHierarchy(data, childrenAccessor as string | ((d: any) => any[]))
  }, [data, childrenAccessor])

  const colorScale = useColorScale(allNodes, colorByDepth ? undefined : colorBy as any, colorScheme)

  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1, strokeOpacity: 0.8 }
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

  // Wrap node style with selection — unwrap hierarchy .data for predicate matching
  const nodeStyle = useMemo(() => {
    if (!activeSelectionHook) return nodeStyleFn
    return (d: Record<string, any>) => {
      const style = { ...nodeStyleFn(d) }
      if (activeSelectionHook.isActive) {
        const datum = d.data || d
        const matches = activeSelectionHook.predicate(datum)
        if (matches) {
          if (selection?.selectedStyle) Object.assign(style, selection.selectedStyle)
        } else {
          style.fillOpacity = selection?.unselectedOpacity ?? 0.2
          style.strokeOpacity = selection?.unselectedOpacity ?? 0.2
          if (selection?.unselectedStyle) Object.assign(style, selection.unselectedStyle)
        }
      }
      return style
    }
  }, [nodeStyleFn, activeSelectionHook, selection])

  const hierarchySumFn = useMemo(() => {
    return resolveHierarchySum(valueAccessor)
  }, [valueAccessor])

  const resolvedPaddingTop = paddingTopProp !== undefined
    ? paddingTopProp
    : (showLabels && labelMode === "parent" ? 18 : undefined)

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  // Validate
  const error = validateObjectData({ componentName: "Treemap", data })
  if (error) return <ChartError componentName="Treemap" message={error} width={width} height={height} />

  return (
    <StreamNetworkFrame
      chartType="treemap"
      data={data}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      paddingTop={resolvedPaddingTop}
      nodeStyle={nodeStyle}
      colorBy={colorBy as any}
      colorScheme={colorScheme}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
      {...((linkedHover || onObservation) && { customHoverBehavior })}
      className={className}
      title={title}
      {...frameProps}
    />
  )
}
Treemap.displayName = "Treemap"

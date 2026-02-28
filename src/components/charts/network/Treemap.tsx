"use client"
import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { DEFAULT_COLOR } from "../shared/hooks"

/**
 * Treemap component props
 */
export interface TreemapProps extends BaseChartProps {
  /**
   * Hierarchical data structure with children and values.
   * @example
   * ```ts
   * {
   *   name: 'root',
   *   children: [
   *     {name: 'A', value: 100},
   *     {name: 'B', children: [{name: 'B1', value: 50}, {name: 'B2', value: 30}]}
   *   ]
   * }
   * ```
   */
  data: Record<string, any>

  /**
   * Field name or function to access children array
   * @default "children"
   */
  childrenAccessor?: Accessor<Record<string, any>[]>

  /**
   * Field name or function to access node value for sizing
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Field name or function to access node identifier
   * @default "name"
   */
  nodeIdAccessor?: Accessor<string>

  /**
   * Field name or function to determine node color
   */
  colorBy?: Accessor<string | number>

  /**
   * Color scheme for nodes or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Color nodes by hierarchy depth level
   * @default false
   */
  colorByDepth?: boolean

  /**
   * Show labels on treemap cells
   * @default true
   */
  showLabels?: boolean

  /**
   * Node label accessor
   * @default Uses nodeIdAccessor
   */
  nodeLabel?: Accessor<string>

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional NetworkFrame props for advanced customization
   * For full control, consider using NetworkFrame directly
   */
  frameProps?: Partial<Omit<NetworkFrameProps, "edges" | "size">>
}

/**
 * Treemap - Visualize hierarchical data as nested rectangles.
 *
 * A simplified wrapper around NetworkFrame with treemap layout.
 * Each rectangle's area is proportional to its value.
 *
 * @example
 * ```tsx
 * <Treemap
 *   data={{
 *     name: 'root',
 *     children: [
 *       {name: 'A', value: 100},
 *       {name: 'B', value: 200},
 *       {name: 'C', value: 150}
 *     ]
 *   }}
 *   colorBy="name"
 * />
 * ```
 */
export function Treemap(props: TreemapProps) {
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
    enableHover = true,
    tooltip,
    frameProps = {}
  } = props

  // Flatten hierarchy to get all nodes for color scale
  const allNodes = useMemo(() => {
    if (!data) return []
    const nodes: Array<Record<string, any>> = []
    const traverse = (node: Record<string, any>) => {
      nodes.push(node)
      const children =
        typeof childrenAccessor === "function"
          ? childrenAccessor(node)
          : node[childrenAccessor]
      if (children && Array.isArray(children)) {
        children.forEach(traverse)
      }
    }
    traverse(data)
    return nodes
  }, [data, childrenAccessor])

  // Create color scale
  const colorScale = useMemo(() => {
    if (colorByDepth) {
      return createColorScale(
        allNodes.map((_, idx) => ({ depth: idx % 5 })),
        "depth",
        colorScheme
      )
    }

    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    return createColorScale(allNodes, colorBy as string, colorScheme)
  }, [allNodes, colorBy, colorByDepth, colorScheme])

  // Node style function
  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3
      }

      if (colorByDepth) {
        baseStyle.fill = getColor({ depth: d.depth || 0 }, "depth", colorScale)
      } else if (colorBy) {
        baseStyle.fill = getColor(d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale])

  // Hierarchy configuration
  const hierarchyChildren = useMemo(() => {
    if (typeof childrenAccessor === "function") {
      return childrenAccessor
    }
    return (d: Record<string, any>) => d[childrenAccessor]
  }, [childrenAccessor])

  const hierarchySum = useMemo(() => {
    if (typeof valueAccessor === "function") {
      return valueAccessor
    }
    return (d: Record<string, any>) => d[valueAccessor] || 1
  }, [valueAccessor])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined

    if (nodeLabel) {
      if (typeof nodeLabel === "function") return nodeLabel
      return (d: Record<string, any>) => d[nodeLabel]
    }

    // Default: use nodeIdAccessor
    if (typeof nodeIdAccessor === "function") return nodeIdAccessor
    return (d: Record<string, any>) => d[nodeIdAccessor]
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Validate data (after all hooks)
  if (!data) {
    console.warn("Treemap: data prop is required")
    return null
  }

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    edges: data,
    nodeStyle: nodeStyleFn,
    edgeStyle: () => ({ fill: "none", stroke: "none" }),
    nodeIDAccessor: nodeIdAccessor,
    networkType: { type: "treemap" },
    hoverAnnotation: enableHover,
    margin,
    ...(hierarchyChildren && {
      hierarchyChildren: hierarchyChildren as Function
    }),
    ...(hierarchySum && { hierarchySum: hierarchySum as Function }),
    ...(nodeLabelFn && { nodeLabels: nodeLabelFn as (args: Record<string, any>) => string }),
    ...(className && { className }),
    ...(title && { title }),
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    ...frameProps
  }

  return <NetworkFrame {...networkFrameProps} />
}

"use client"
import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateObjectData } from "../shared/validateChartData"
import { hierarchyLayouts } from "../../processing/layouts/hierarchyLayout"

/**
 * CirclePack component props
 */
export interface CirclePackProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
  data: TNode

  /**
   * Field name or function to access children array
   * @default "children"
   */
  childrenAccessor?: ChartAccessor<TNode, TNode[]>

  /**
   * Field name or function to access node value for sizing
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Field name or function to access node identifier
   * @default "name"
   */
  nodeIdAccessor?: ChartAccessor<TNode, string>

  /**
   * Field name or function to determine node color
   */
  colorBy?: ChartAccessor<TNode, string | number>

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
   * Show labels on circles
   * @default true
   */
  showLabels?: boolean

  /**
   * Node label accessor
   * @default Uses nodeIdAccessor
   */
  nodeLabel?: ChartAccessor<TNode, string>

  /**
   * Circle fill opacity (helps see nesting)
   * @default 0.7
   */
  circleOpacity?: number

  /**
   * Padding between circles (pixels).
   * @default 4
   */
  padding?: number

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
 * CirclePack - Visualize hierarchical data as nested circles.
 *
 * A simplified wrapper around NetworkFrame with circlepack layout.
 * Each circle's area is proportional to its value.
 *
 * @example
 * ```tsx
 * <CirclePack
 *   data={{
 *     name: 'root',
 *     children: [
 *       {name: 'A', value: 100},
 *       {name: 'B', value: 200},
 *       {name: 'C', value: 150}
 *     ]
 *   }}
 *   colorByDepth
 * />
 * ```
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

  // Flatten hierarchy to get all nodes for color scale
  const allNodes = useMemo(() => {
    if (!data) return []
    const nodes: Array<Record<string, any>> = []
    const traverse = (node: Record<string, any>) => {
      nodes.push(node)
      const children =
        typeof childrenAccessor === "function"
          ? childrenAccessor(node as TNode)
          : node[childrenAccessor]
      if (children && Array.isArray(children)) {
        children.forEach(traverse)
      }
    }
    traverse(data)
    return nodes
  }, [data, childrenAccessor])

  // Pastel palette for depth-based coloring (shared with Treemap)
  const DEPTH_PASTELS = [
    "#f0f0f0",   // depth 0 (root) — near-white
    "#b5d4ea",   // depth 1 — soft blue
    "#f4c2a1",   // depth 2 — peach
    "#b8dab2",   // depth 3 — sage
    "#d4b5e0",   // depth 4 — lavender
    "#f9e0a2",   // depth 5 — butter
    "#a8d8d8",   // depth 6 — mint
  ]

  // Create color scale
  const colorScale = useMemo(() => {
    if (colorByDepth) return undefined // handled inline with DEPTH_PASTELS

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
        strokeOpacity: 0.3,
        fillOpacity: circleOpacity
      }

      if (colorByDepth) {
        const depth = d.depth || 0
        baseStyle.fill = DEPTH_PASTELS[depth % DEPTH_PASTELS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale, circleOpacity])

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

  // Node label function — returns centered React elements
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined

    // Build the raw label accessor
    const rawLabel = nodeLabel
      ? (typeof nodeLabel === "function" ? nodeLabel : (d: Record<string, any>) => d[nodeLabel])
      : (typeof nodeIdAccessor === "function" ? nodeIdAccessor : (d: Record<string, any>) => d[nodeIdAccessor])

    return (d: Record<string, any>) => {
      const text = rawLabel(d as any)
      if (!text) return null

      const radius = d.r || d.nodeSize || 5
      const hasChildren = d.children && d.children.length > 0

      // Skip labels on circles too small to read
      if (radius < 15) return null

      if (hasChildren) {
        // Parent node: label at top-center, white-outlined black text
        return (
          <text
            textAnchor="middle"
            y={-radius + 14}
            fontSize={11}
            fontWeight={600}
            fill="#333"
            stroke="white"
            strokeWidth={3}
            paintOrder="stroke"
            style={{ pointerEvents: "none" }}
          >
            {String(text)}
          </text>
        )
      }

      // Leaf node: centered label
      return (
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#333"
          style={{ pointerEvents: "none" }}
        >
          {String(text)}
        </text>
      )
    }
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Resolve the nodeIdAccessor into a function for use in tooltip
  const nodeIdFn = useMemo(() => {
    if (typeof nodeIdAccessor === "function") return nodeIdAccessor
    return (d: Record<string, any>) => d[nodeIdAccessor]
  }, [nodeIdAccessor])

  // Default tooltip: show ancestor path as grandparent → parent → **this node**
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      // Walk up the parent chain (skip root)
      const ancestors: string[] = []
      let current = d
      while (current) {
        const name = nodeIdFn(current.data || current)
        if (name) ancestors.unshift(String(name))
        current = current.parent
      }
      // Remove root (first element) from breadcrumb
      if (ancestors.length > 1) ancestors.shift()

      const last = ancestors.length - 1
      return (
        <div className="tooltip-content" style={{ padding: "4px 8px", fontSize: 12, lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>
            {ancestors.map((name, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: "0 3px", opacity: 0.5 }}>{" → "}</span>}
                {i === last ? <strong>{name}</strong> : <span style={{ opacity: 0.7 }}>{name}</span>}
              </span>
            ))}
          </p>
          {d.value != null && (
            <p style={{ margin: "2px 0 0", opacity: 0.7 }}>{d.value.toLocaleString()}</p>
          )}
        </div>
      )
    }
  }, [nodeIdFn])

  // SVG annotation rule: draw a highlight outline circle on hovered node
  const svgAnnotationRules = useMemo(() => {
    return ({ d }: Record<string, any>) => {
      if (d.type !== "frame-hover" || d.r === undefined) return null
      return (
        <circle
          key="circlepack-hover-outline"
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="none"
          stroke="#333"
          strokeWidth={2}
          style={{ pointerEvents: "none" }}
        />
      )
    }
  }, [])

  // Validate data (after all hooks)
  const error = validateObjectData({
    componentName: "CirclePack",
    data,
  })
  if (error) return <ChartError componentName="CirclePack" message={error} width={width} height={height} />

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    edges: data,
    nodeStyle: nodeStyleFn,
    edgeStyle: () => ({ fill: "none", stroke: "none" }),
    nodeIDAccessor: nodeIdAccessor,
    nodeSizeAccessor: (d: Record<string, any>) => d.r || 5,
    networkType: {
      type: "circlepack",
      ...(hierarchyChildren && { hierarchyChildren: hierarchyChildren as Function }),
      ...(hierarchySum && { hierarchySum: hierarchySum as Function }),
      padding: paddingProp,
    },
    hoverAnnotation: enableHover,
    margin,
    ...(nodeLabelFn && { nodeLabels: nodeLabelFn as unknown as (args: Record<string, any>) => string }),
    ...(className && { className }),
    ...(title && { title }),
    tooltipContent: tooltip ? normalizeTooltip(tooltip) as Function : defaultTooltipContent,
    svgAnnotationRules: enableHover ? svgAnnotationRules as any : undefined,
    transition: true,
    ...frameProps,
    _layoutMap: { circlepack: hierarchyLayouts.circlepack }
  }

  return <NetworkFrame {...networkFrameProps} />
}
CirclePack.displayName = "CirclePack"

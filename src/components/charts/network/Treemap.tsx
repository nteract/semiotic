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
 * Treemap component props
 */
export interface TreemapProps<TNode extends Record<string, any> = Record<string, any>, TEdge extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
   * Show labels on treemap cells
   * @default true
   */
  showLabels?: boolean

  /**
   * Which nodes to label
   * - "leaf" — only leaf nodes (no children)
   * - "parent" — only top-level groups (depth 1, direct children of root)
   * - "all" — every node
   * @default "leaf"
   */
  labelMode?: "leaf" | "parent" | "all"

  /**
   * Node label accessor
   * @default Uses nodeIdAccessor
   */
  nodeLabel?: ChartAccessor<TNode, string>

  /**
   * Padding between parent and child rectangles (pixels).
   * Makes parent containers visible as borders around their children.
   * @default 4
   */
  padding?: number

  /**
   * Extra padding at the top of parent nodes (pixels).
   * Useful when labeling parents — provides space for the label text.
   * @default 0 (or 18 when labelMode is "parent")
   */
  paddingTop?: number

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

  // Pastel palette for depth-based coloring
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
        stroke: "#fff",
        strokeWidth: 1,
        strokeOpacity: 0.8
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

  // Resolve paddingTop: auto-add header space when labeling parents
  const resolvedPaddingTop = paddingTopProp !== undefined
    ? paddingTopProp
    : (showLabels && labelMode === "parent" ? 18 : undefined)

  // Node label function — returns centered React elements, filtered by labelMode
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined

    // Build the raw label accessor
    const rawLabel = nodeLabel
      ? (typeof nodeLabel === "function" ? nodeLabel : (d: Record<string, any>) => d[nodeLabel])
      : (typeof nodeIdAccessor === "function" ? nodeIdAccessor : (d: Record<string, any>) => d[nodeIdAccessor])

    // Return centered <text> elements so they're rendered via basic-node-label
    return (d: Record<string, any>) => {
      if (labelMode === "leaf") {
        if (d.children && d.children.length > 0) return null
      } else if (labelMode === "parent") {
        if (d.depth !== 1) return null
      }
      const text = rawLabel(d as any)
      if (!text) return null

      // Check if the cell is wide enough to fit the label
      const cellWidth = (d.x1 || 0) - (d.x0 || 0)
      const cellHeight = (d.y1 || 0) - (d.y0 || 0)
      if (cellWidth < 30 || cellHeight < 14) return null

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
  }, [showLabels, nodeLabel, nodeIdAccessor, labelMode])

  // Validate data (after all hooks)
  const error = validateObjectData({
    componentName: "Treemap",
    data,
  })
  if (error) return <ChartError componentName="Treemap" message={error} width={width} height={height} />

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

  // SVG annotation rule: draw a highlight outline rect on hovered treemap node
  const svgAnnotationRules = useMemo(() => {
    return ({ d, networkFrameRender }: Record<string, any>) => {
      if (d.type !== "frame-hover" || d.x0 === undefined) return null
      return (
        <rect
          key="treemap-hover-outline"
          x={d.x0}
          y={d.y0}
          width={d.x1 - d.x0}
          height={d.y1 - d.y0}
          fill="none"
          stroke="#333"
          strokeWidth={2}
          style={{ pointerEvents: "none" }}
        />
      )
    }
  }, [])

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    edges: data,
    nodeStyle: nodeStyleFn,
    edgeStyle: () => ({ fill: "none", stroke: "none" }),
    nodeIDAccessor: nodeIdAccessor,
    networkType: {
      type: "treemap",
      ...(hierarchyChildren && { hierarchyChildren: hierarchyChildren as Function }),
      ...(hierarchySum && { hierarchySum: hierarchySum as Function }),
      padding: paddingProp,
      ...(resolvedPaddingTop !== undefined && { paddingTop: resolvedPaddingTop }),
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
    _layoutMap: { treemap: hierarchyLayouts.treemap }
  }

  return <NetworkFrame {...networkFrameProps} />
}
Treemap.displayName = "Treemap"

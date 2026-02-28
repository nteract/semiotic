"use client"
import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"

/**
 * SankeyDiagram component props
 */
export interface SankeyDiagramProps extends BaseChartProps {
  /**
   * Array of nodes (optional - will be inferred from edges if not provided)
   * @example
   * ```ts
   * [{id: 'A', category: 'Source'}, {id: 'B', category: 'Target'}]
   * ```
   */
  nodes?: Array<Record<string, any>>

  /**
   * Array of edges (links) with source, target, and value
   * @example
   * ```ts
   * [
   *   {source: 'A', target: 'B', value: 100},
   *   {source: 'B', target: 'C', value: 80}
   * ]
   * ```
   */
  edges: Array<Record<string, any>>

  /**
   * Field name or function to access source node identifier
   * @default "source"
   */
  sourceAccessor?: Accessor<string>

  /**
   * Field name or function to access target node identifier
   * @default "target"
   */
  targetAccessor?: Accessor<string>

  /**
   * Field name or function to access edge value (flow width)
   * @default "value"
   */
  valueAccessor?: Accessor<number>

  /**
   * Field name or function to access node identifier
   * @default "id"
   */
  nodeIdAccessor?: Accessor<string>

  /**
   * Field name or function to determine node color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.type}
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for nodes or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Edge color strategy
   * - "source": color edges by source node
   * - "target": color edges by target node
   * - "gradient": gradient from source to target
   * - function: custom coloring function
   * @default "source"
   */
  edgeColorBy?: "source" | "target" | "gradient" | ((d: any) => string)

  /**
   * Layout orientation
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical"

  /**
   * Node alignment strategy
   * - "justify": spread nodes evenly
   * - "left": align nodes to the left
   * - "right": align nodes to the right
   * - "center": center nodes
   * @default "justify"
   */
  nodeAlign?: "justify" | "left" | "right" | "center"

  /**
   * Padding between nodes (ratio of node height)
   * @default 0.05
   */
  nodePaddingRatio?: number

  /**
   * Fixed width of nodes in pixels
   * @default 15
   */
  nodeWidth?: number

  /**
   * Label accessor for nodes
   * @default Uses nodeIdAccessor
   */
  nodeLabel?: Accessor<string>

  /**
   * Show node labels
   * @default true
   */
  showLabels?: boolean

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Edge opacity
   * @default 0.5
   */
  edgeOpacity?: number

  /**
   * Sort function for edges
   * @example
   * ```ts
   * edgeSort={(a, b) => b.value - a.value}
   * ```
   */
  edgeSort?: (a: any, b: any) => number

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional NetworkFrame props for advanced customization
   * For full control, consider using NetworkFrame directly
   * @see https://semiotic.nteract.io/guides/network-frame
   */
  frameProps?: Partial<Omit<NetworkFrameProps, "edges" | "size">>
}

/**
 * SankeyDiagram - Visualize flow and magnitude of movement between nodes
 *
 * A simplified wrapper around NetworkFrame for creating Sankey diagrams.
 * Perfect for showing material, energy, cost, or any other quantity
 * flowing through a system.
 *
 * @example
 * ```tsx
 * // Simple Sankey diagram
 * <SankeyDiagram
 *   edges={[
 *     {source: 'A', target: 'B', value: 100},
 *     {source: 'A', target: 'C', value: 50},
 *     {source: 'B', target: 'D', value: 80}
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom styling and orientation
 * <SankeyDiagram
 *   edges={edges}
 *   nodes={nodes}
 *   colorBy="category"
 *   edgeColorBy="gradient"
 *   orientation="vertical"
 *   nodeAlign="center"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With sorting and padding
 * <SankeyDiagram
 *   edges={edges}
 *   nodeWidth={20}
 *   nodePaddingRatio={0.1}
 *   edgeSort={(a, b) => b.value - a.value}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link NetworkFrame} with sensible defaults for Sankey diagrams.
 * Sankey diagrams are used for directed acyclic graphs (DAGs).
 *
 * **Data Requirements:**
 * - Edges must have source, target, and value properties
 * - Graph should be acyclic (no cycles)
 * - If cycles are detected, consider using a force-directed layout instead
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any NetworkFrame prop
 * - See NetworkFrame documentation: https://semiotic.nteract.io/guides/network-frame
 * - All NetworkFrame props are available via `frameProps`
 * - For circular Sankey diagrams, use the `customSankey` prop via frameProps
 *
 * @param props - SankeyDiagram configuration
 * @returns Rendered Sankey diagram
 */
export function SankeyDiagram(props: SankeyDiagramProps) {
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
  const nodeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        // Default color
        baseStyle.fill = "#4d430c"
      }

      return baseStyle
    }
  }, [colorBy, colorScale])

  // Edge style function
  const edgeStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 0.5,
        fillOpacity: edgeOpacity,
        strokeOpacity: 0.3
      }

      // Apply color based on edge coloring strategy
      if (typeof edgeColorBy === "function") {
        baseStyle.fill = edgeColorBy(d)
      } else if (edgeColorBy === "source") {
        if (colorBy && d.source) {
          baseStyle.fill = getColor(d.source, colorBy, colorScale)
        } else if (d.source) {
          baseStyle.fill = nodeStyle(d.source).fill
        }
      } else if (edgeColorBy === "target") {
        if (colorBy && d.target) {
          baseStyle.fill = getColor(d.target, colorBy, colorScale)
        } else if (d.target) {
          baseStyle.fill = nodeStyle(d.target).fill
        }
      } else if (edgeColorBy === "gradient") {
        // For gradient, use a semi-transparent gray
        // (actual gradients would require SVG gradient definitions)
        baseStyle.fill = "#999"
        baseStyle.fillOpacity = edgeOpacity * 0.7
      }

      return baseStyle
    }
  }, [edgeColorBy, colorBy, colorScale, nodeStyle, edgeOpacity])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined
    const accessor = nodeLabel || nodeIdAccessor
    return (d: Record<string, any>) => {
      if (typeof accessor === "function") return accessor(d)
      return d[accessor]
    }
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Build network type configuration
  const networkType = useMemo(() => {
    const config: Record<string, unknown> = {
      type: "sankey",
      orient: nodeAlign,
      direction: orientation === "horizontal" ? undefined : "down",
      nodePaddingRatio,
      nodeWidth
    }

    if (edgeSort) {
      config.edgeSort = edgeSort
    }

    return config
  }, [nodeAlign, orientation, nodePaddingRatio, nodeWidth, edgeSort])

  // Validate data (after all hooks)
  if (!edges || edges.length === 0) {
    console.warn("SankeyDiagram: edges prop is required and should not be empty")
    return null
  }

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    nodes: inferredNodes,
    edges: safeEdges,
    nodeStyle,
    edgeStyle,
    nodeIDAccessor: nodeIdAccessor,
    sourceAccessor,
    targetAccessor,
    edgeWidthAccessor: valueAccessor,
    networkType,
    hoverAnnotation: enableHover,
    margin,
    nodeSizeAccessor: () => 5, // Small size for hover target
    ...(nodeLabelFn && { nodeLabels: nodeLabelFn }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <NetworkFrame {...networkFrameProps} />
}

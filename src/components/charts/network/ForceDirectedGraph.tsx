import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor, createColorScale, getSize } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

/**
 * ForceDirectedGraph component props
 */
export interface ForceDirectedGraphProps extends BaseChartProps {
  /**
   * Array of nodes. Each node should have an id property.
   * @example
   * ```ts
   * [{id: 'A', label: 'Node A'}, {id: 'B', label: 'Node B'}]
   * ```
   */
  nodes: Array<Record<string, any>>

  /**
   * Array of edges connecting nodes.
   * @example
   * ```ts
   * [{source: 'A', target: 'B'}, {source: 'B', target: 'C'}]
   * ```
   */
  edges: Array<Record<string, any>>

  /**
   * Field name or function to access node IDs
   * @default "id"
   */
  nodeIDAccessor?: Accessor<string>

  /**
   * Field name or function to access edge source IDs
   * @default "source"
   */
  sourceAccessor?: Accessor<string>

  /**
   * Field name or function to access edge target IDs
   * @default "target"
   */
  targetAccessor?: Accessor<string>

  /**
   * Field name or function to determine node labels
   * @example
   * ```ts
   * nodeLabel="label"  // Use label field
   * nodeLabel={d => d.name}  // Use function
   * ```
   */
  nodeLabel?: Accessor<string>

  /**
   * Field name or function to determine node color
   * @example
   * ```ts
   * colorBy="group"
   * colorBy={d => d.value > 10 ? 'red' : 'blue'}
   * ```
   */
  colorBy?: Accessor<string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Field name, number, or function to determine node size
   * @example
   * ```ts
   * nodeSize={5}  // Fixed size
   * nodeSize="importance"  // Use field
   * nodeSize={d => d.connections * 2}  // Use function
   * ```
   */
  nodeSize?: number | Accessor<number>

  /**
   * Min and max radius for nodes when using dynamic sizing
   * @default [5, 20]
   */
  nodeSizeRange?: [number, number]

  /**
   * Field name, number, or function to determine edge width
   * @default 1
   */
  edgeWidth?: number | Accessor<number>

  /**
   * Edge color
   * @default "#999"
   */
  edgeColor?: string

  /**
   * Edge opacity
   * @default 0.6
   */
  edgeOpacity?: number

  /**
   * Number of force simulation iterations
   * @default 300
   */
  iterations?: number

  /**
   * Strength of the force simulation
   * Lower values create looser layouts
   * @default 0.1
   */
  forceStrength?: number

  /**
   * Enable node labels
   * @default false
   */
  showLabels?: boolean

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show legend
   * @default true (when colorBy is specified)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional NetworkFrame props for advanced customization
   * For full control, consider using NetworkFrame directly
   * @see https://semiotic.nteract.io/guides/network-frame
   */
  frameProps?: Partial<Omit<NetworkFrameProps, "nodes" | "edges" | "size">>
}

/**
 * ForceDirectedGraph - Visualize network relationships with force-directed layout
 *
 * A simplified wrapper around NetworkFrame for creating force-directed graphs.
 * Perfect for visualizing connections, communities, and network structures.
 *
 * @example
 * ```tsx
 * // Simple force-directed graph
 * <ForceDirectedGraph
 *   nodes={[
 *     {id: 'A', label: 'Node A'},
 *     {id: 'B', label: 'Node B'},
 *     {id: 'C', label: 'Node C'}
 *   ]}
 *   edges={[
 *     {source: 'A', target: 'B'},
 *     {source: 'B', target: 'C'}
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color and size encoding
 * <ForceDirectedGraph
 *   nodes={nodes}
 *   edges={edges}
 *   colorBy="group"
 *   nodeSize="connections"
 *   nodeSizeRange={[5, 25]}
 *   showLabels={true}
 *   iterations={500}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override NetworkFrame props
 * <ForceDirectedGraph
 *   nodes={nodes}
 *   edges={edges}
 *   frameProps={{
 *     networkType: { type: "force", iterations: 500, edgeStrength: 2 },
 *     customNodeIcon: ({ d }) => <circle r={10} fill="gold" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link NetworkFrame} with sensible defaults for force-directed graphs.
 * For more advanced features like custom layouts, hierarchical networks, or complex interactions,
 * use NetworkFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any NetworkFrame prop
 * - See NetworkFrame documentation: https://semiotic.nteract.io/guides/network-frame
 * - All NetworkFrame props are available via `frameProps`
 *
 * @param props - ForceDirectedGraph configuration
 * @returns Rendered force-directed graph
 */
export function ForceDirectedGraph(props: ForceDirectedGraphProps) {
  const {
    nodes,
    edges,
    width = 600,
    height = 600,
    margin: userMargin,
    className,
    title,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    nodeLabel,
    colorBy,
    colorScheme = "category10",
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    edgeWidth = 1,
    edgeColor = "#999",
    edgeOpacity = 0.6,
    iterations = 300,
    forceStrength = 0.1,
    showLabels = false,
    enableHover = true,
    showLegend,
    tooltip,
    frameProps = {}
  } = props

  // Validate data
  if (!nodes || nodes.length === 0) {
    console.warn("ForceDirectedGraph: nodes prop is required and should not be empty")
    return null
  }

  if (!edges || edges.length === 0) {
    console.warn("ForceDirectedGraph: edges prop is required and should not be empty")
    return null
  }

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(nodes, colorBy as string, scheme)
  }, [nodes, colorBy, colorScheme])

  // Calculate node size domain if dynamic sizing
  const nodeSizeDomain = useMemo(() => {
    if (typeof nodeSize === "number") return undefined
    if (!nodeSize) return undefined

    const sizes = nodes.map((d) => {
      if (typeof nodeSize === "function") {
        return nodeSize(d)
      }
      return d[nodeSize]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [nodes, nodeSize])

  // Node style function
  const nodeStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {}

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = "#007bff"
      }

      // Apply size
      if (typeof nodeSize === "number") {
        baseStyle.r = nodeSize
      } else if (nodeSize) {
        baseStyle.r = getSize(d, nodeSize, nodeSizeRange, nodeSizeDomain)
      } else {
        baseStyle.r = 8
      }

      return baseStyle
    }
  }, [colorBy, colorScale, nodeSize, nodeSizeRange, nodeSizeDomain])

  // Edge style function
  const edgeStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {
        stroke: edgeColor,
        strokeOpacity: edgeOpacity
      }

      // Apply width
      if (typeof edgeWidth === "number") {
        baseStyle.strokeWidth = edgeWidth
      } else if (typeof edgeWidth === "function") {
        baseStyle.strokeWidth = edgeWidth(d)
      } else if (edgeWidth) {
        baseStyle.strokeWidth = d[edgeWidth]
      }

      return baseStyle
    }
  }, [edgeWidth, edgeColor, edgeOpacity])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels || !nodeLabel) return undefined

    return (d: any) => {
      if (typeof nodeLabel === "function") {
        return nodeLabel(d)
      }
      return d[nodeLabel]
    }
  }, [showLabels, nodeLabel])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: nodes,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, nodes, colorScale])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 20, bottom: 20, left: 20, right: 20 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    // If legend is present and right margin is too small, increase it
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    nodes,
    edges,
    nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    networkType: { type: "force", iterations, edgeStrength: forceStrength },
    nodeStyle,
    edgeStyle,
    hoverAnnotation: enableHover,
    margin,
    ...(legend && { legend }),
    ...(nodeLabelFn && { nodeLabels: nodeLabelFn }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <NetworkFrame {...networkFrameProps} />
}

// Export default for convenience
export default ForceDirectedGraph

import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"

/**
 * ChordDiagram component props
 */
export interface ChordDiagramProps extends BaseChartProps {
  /**
   * Array of nodes (optional - will be inferred from edges if not provided)
   * @example
   * ```ts
   * [{id: 'A', category: 'Group1'}, {id: 'B', category: 'Group2'}]
   * ```
   */
  nodes?: Array<Record<string, any>>

  /**
   * Array of edges with source, target, and value
   * @example
   * ```ts
   * [
   *   {source: 'A', target: 'B', value: 100},
   *   {source: 'B', target: 'A', value: 80},
   *   {source: 'A', target: 'A', value: 50}
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
   * Field name or function to access edge value (width)
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
   * colorBy={d => d.group}
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
   * - function: custom coloring function
   * @default "source"
   */
  edgeColorBy?: "source" | "target" | ((d: any) => string)

  /**
   * Padding angle between adjacent groups (in radians)
   * @default 0.01
   */
  padAngle?: number

  /**
   * Width of the outer arc (node) in pixels
   * @default 20
   */
  groupWidth?: number

  /**
   * Sort function for groups (nodes) around the circle
   * @example
   * ```ts
   * sortGroups={(a, b) => b.value - a.value}
   * ```
   */
  sortGroups?: (a: any, b: any) => number

  /**
   * Label accessor for nodes
   * @default Uses nodeIdAccessor
   */
  nodeLabel?: Accessor<string>

  /**
   * Show labels around circumference
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
 * ChordDiagram - Visualize directed relationships with circular chord layout
 *
 * A simplified wrapper around NetworkFrame for creating chord diagrams.
 * Perfect for showing flow and relationships between entities, especially
 * when there are reciprocal connections and self-loops.
 *
 * @example
 * ```tsx
 * // Simple chord diagram
 * <ChordDiagram
 *   edges={[
 *     {source: 'A', target: 'B', value: 100},
 *     {source: 'B', target: 'A', value: 80},
 *     {source: 'A', target: 'A', value: 50}
 *   ]}
 *   colorBy={(d) => d.id}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom styling and padding
 * <ChordDiagram
 *   edges={edges}
 *   nodes={nodes}
 *   colorBy="category"
 *   edgeColorBy="source"
 *   padAngle={0.05}
 *   groupWidth={30}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With sorting and labels
 * <ChordDiagram
 *   edges={edges}
 *   sortGroups={(a, b) => b.value - a.value}
 *   nodeLabel="name"
 *   showLabels={true}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link NetworkFrame} with sensible defaults for chord diagrams.
 * Chord diagrams work best when there are asymmetric relationships and self-loops.
 *
 * **Data Requirements:**
 * - Edges must have source, target, and value properties
 * - Self-loops (source === target) are displayed as curved arcs
 * - Reciprocal edges show the asymmetry in relationships
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any NetworkFrame prop
 * - See NetworkFrame documentation: https://semiotic.nteract.io/guides/network-frame
 * - All NetworkFrame props are available via `frameProps`
 *
 * @param props - ChordDiagram configuration
 * @returns Rendered chord diagram
 */
export function ChordDiagram(props: ChordDiagramProps) {
  const {
    nodes,
    edges,
    width = 600,
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
    padAngle = 0.01,
    groupWidth = 20,
    sortGroups,
    nodeLabel,
    showLabels = true,
    enableHover = true,
    edgeOpacity = 0.5,
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
    return (d: any, i: number) => {
      const baseStyle: any = {
        stroke: "black",
        strokeWidth: 1
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        // Default: color by index
        const colors = Array.isArray(colorScheme)
          ? colorScheme
          : createColorScale(
              inferredNodes.map((_, idx) => ({ index: idx })),
              "index",
              colorScheme
            )
        baseStyle.fill =
          typeof colors === "function" ? colors({ index: i }) : colors[i % 10]
      }

      return baseStyle
    }
  }, [colorBy, colorScale, colorScheme, inferredNodes])

  // Edge style function
  const edgeStyle = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {
        stroke: "black",
        strokeWidth: 0.5,
        fillOpacity: edgeOpacity,
        strokeOpacity: edgeOpacity
      }

      // Apply color based on edge coloring strategy
      if (typeof edgeColorBy === "function") {
        baseStyle.fill = edgeColorBy(d)
      } else if (edgeColorBy === "source") {
        if (colorBy) {
          baseStyle.fill = getColor(d.source, colorBy, colorScale)
        } else {
          baseStyle.fill = nodeStyle(d.source, d.source.index).fill
        }
      } else if (edgeColorBy === "target") {
        if (colorBy) {
          baseStyle.fill = getColor(d.target, colorBy, colorScale)
        } else {
          baseStyle.fill = nodeStyle(d.target, d.target.index).fill
        }
      }

      return baseStyle
    }
  }, [edgeColorBy, colorBy, colorScale, nodeStyle, edgeOpacity])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined
    const accessor = nodeLabel || nodeIdAccessor
    return (d: any) => {
      if (typeof accessor === "function") return accessor(d)
      return d[accessor]
    }
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Build network type configuration
  const networkType = useMemo(() => {
    const config: any = {
      type: "chord",
      padAngle,
      groupWidth
    }

    if (sortGroups) {
      config.sortGroups = sortGroups
    }

    return config
  }, [padAngle, groupWidth, sortGroups])

  // Validate data (after all hooks)
  if (!edges || edges.length === 0) {
    console.warn("ChordDiagram: edges prop is required and should not be empty")
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
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <NetworkFrame {...networkFrameProps} />
}

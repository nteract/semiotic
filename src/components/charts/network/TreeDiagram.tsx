import * as React from "react"
import { useMemo } from "react"
import NetworkFrame from "../../NetworkFrame"
import type { NetworkFrameProps } from "../../types/networkTypes"
import { getColor, createColorScale } from "../shared/colorUtils"
import type { BaseChartProps, Accessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"

/**
 * TreeDiagram component props
 */
export interface TreeDiagramProps extends BaseChartProps {
  /**
   * Hierarchical data structure
   * @example
   * ```ts
   * {
   *   name: 'root',
   *   children: [
   *     {name: 'A', children: [{name: 'A1'}, {name: 'A2'}]},
   *     {name: 'B'}
   *   ]
   * }
   * ```
   */
  data: Record<string, any>

  /**
   * Tree layout algorithm
   * - "tree": standard tree layout
   * - "cluster": cluster (dendrogram) layout
   * - "partition": partition (icicle/sunburst) layout
   * - "treemap": treemap layout
   * - "circlepack": circle packing layout
   * @default "tree"
   */
  layout?: "tree" | "cluster" | "partition" | "treemap" | "circlepack"

  /**
   * Projection orientation
   * - "vertical": top to bottom
   * - "horizontal": left to right
   * - "radial": radial layout (circular)
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal" | "radial"

  /**
   * Field name or function to access children array
   * @default "children"
   */
  childrenAccessor?: Accessor<any[]>

  /**
   * Field name or function to access node value for sizing
   * Used by treemap and circlepack layouts
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
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.depth}
   * ```
   */
  colorBy?: Accessor<string | number>

  /**
   * Color scheme for nodes or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Color nodes by depth level
   * @default false
   */
  colorByDepth?: boolean

  /**
   * Edge style
   * - "line": straight lines
   * - "curve": curved lines
   * @default "curve"
   */
  edgeStyle?: "line" | "curve"

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
   * Node size for tree/cluster layouts
   * @default 5
   */
  nodeSize?: number

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
   * @see https://semiotic.nteract.io/guides/network-frame
   */
  frameProps?: Partial<Omit<NetworkFrameProps, "edges" | "size">>
}

/**
 * TreeDiagram - Visualize hierarchical data structures
 *
 * A simplified wrapper around NetworkFrame for creating tree diagrams.
 * Perfect for organizational charts, file systems, taxonomies, and
 * any hierarchical data.
 *
 * @example
 * ```tsx
 * // Simple tree
 * <TreeDiagram
 *   data={{
 *     name: 'Root',
 *     children: [
 *       {name: 'A', children: [{name: 'A1'}, {name: 'A2'}]},
 *       {name: 'B'}
 *     ]
 *   }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Horizontal cluster (dendrogram)
 * <TreeDiagram
 *   data={hierarchicalData}
 *   layout="cluster"
 *   orientation="horizontal"
 *   colorByDepth={true}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Radial tree
 * <TreeDiagram
 *   data={hierarchicalData}
 *   layout="tree"
 *   orientation="radial"
 *   colorBy="category"
 *   nodeSize={8}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Treemap with sizing
 * <TreeDiagram
 *   data={hierarchicalData}
 *   layout="treemap"
 *   valueAccessor="size"
 *   colorBy="type"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Circle pack
 * <TreeDiagram
 *   data={hierarchicalData}
 *   layout="circlepack"
 *   valueAccessor="value"
 *   colorByDepth={true}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link NetworkFrame} with sensible defaults for tree diagrams.
 * Different layouts are suited for different use cases:
 * - **tree/cluster**: Good for organizational structures, phylogenetic trees
 * - **treemap**: Good for showing proportional sizes (disk usage, budget allocation)
 * - **partition**: Good for hierarchical proportions (icicle or sunburst charts)
 * - **circlepack**: Good for nested hierarchies with size encoding
 *
 * **Data Requirements:**
 * - Data must be hierarchical JSON with a children property (or custom accessor)
 * - For treemap/circlepack, nodes should have a value property for sizing
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any NetworkFrame prop
 * - See NetworkFrame documentation: https://semiotic.nteract.io/guides/network-frame
 * - All NetworkFrame props are available via `frameProps`
 *
 * @param props - TreeDiagram configuration
 * @returns Rendered tree diagram
 */
export function TreeDiagram(props: TreeDiagramProps) {
  const {
    data,
    width = 600,
    height = 600,
    margin = { top: 50, bottom: 50, left: 50, right: 50 },
    className,
    title,
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
    showLabels = true,
    nodeSize = 5,
    enableHover = true,
    tooltip,
    frameProps = {}
  } = props

  // Flatten hierarchy to get all nodes for color scale
  const allNodes = useMemo(() => {
    if (!data) return []
    const nodes: any[] = []
    const traverse = (node: any) => {
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

  // Create color scale if colorBy is specified
  const colorScale = useMemo(() => {
    if (colorByDepth) {
      // Color by depth level
      return createColorScale(
        allNodes.map((_, idx) => ({ depth: idx % 5 })),
        "depth",
        colorScheme
      )
    }

    if (!colorBy || typeof colorBy === "function") {
      return undefined
    }

    const scheme = Array.isArray(colorScheme) ? colorScheme : colorScheme
    return createColorScale(allNodes, colorBy as string, scheme)
  }, [allNodes, colorBy, colorByDepth, colorScheme])

  // Node style function
  const nodeStyleFn = useMemo(() => {
    return (d: any) => {
      const baseStyle: any = {
        stroke: "black",
        strokeWidth: 1
      }

      // Apply color
      if (colorByDepth) {
        baseStyle.fill = getColor({ depth: d.depth || 0 }, "depth", colorScale)
      } else if (colorBy) {
        baseStyle.fill = getColor(d, colorBy as any, colorScale)
      } else {
        // Default color
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale])

  // Edge style function
  const edgeStyleFn = useMemo(() => {
    return () => ({
      stroke: "#999",
      strokeWidth: 1,
      fill: "none"
    })
  }, [])

  // Build network type configuration
  const networkType = useMemo(() => {
    const config: any = {
      type: layout
    }

    // Set projection for tree/cluster layouts
    if (layout === "tree" || layout === "cluster") {
      config.projection = orientation
    }

    // For partition layout, radial creates sunburst
    if (layout === "partition" && orientation === "radial") {
      config.projection = "radial"
    }

    return config
  }, [layout, orientation])

  // Hierarchy configuration
  const hierarchyChildren = useMemo(() => {
    if (typeof childrenAccessor === "function") {
      return childrenAccessor
    }
    return (d: any) => d[childrenAccessor]
  }, [childrenAccessor])

  const hierarchySum = useMemo(() => {
    // For layouts that need sizing (treemap, circlepack, partition)
    if (
      layout === "treemap" ||
      layout === "circlepack" ||
      layout === "partition"
    ) {
      if (typeof valueAccessor === "function") {
        return valueAccessor
      }
      return (d: any) => d[valueAccessor] || 1
    }
    return undefined
  }, [layout, valueAccessor])

  // Validate data (after all hooks)
  if (!data) {
    console.warn("TreeDiagram: data prop is required")
    return null
  }

  // Build NetworkFrame props
  const networkFrameProps: NetworkFrameProps = {
    size: [width, height],
    edges: data, // For hierarchical data, pass to edges
    nodeStyle: nodeStyleFn,
    edgeStyle: edgeStyleFn,
    nodeIDAccessor: nodeIdAccessor,
    networkType,
    hoverAnnotation: enableHover,
    margin,
    nodeSizeAccessor: () => nodeSize,
    ...(hierarchyChildren && {
      hierarchyChildren: hierarchyChildren as any
    }),
    ...(hierarchySum && { hierarchySum: hierarchySum as any }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) }),
    // Allow frameProps to override defaults
    ...frameProps
  }

  return <NetworkFrame {...networkFrameProps} />
}

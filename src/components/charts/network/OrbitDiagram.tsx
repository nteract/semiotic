"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS, DEFAULT_COLORS, COLOR_SCHEMES } from "../shared/colorUtils"
import { flattenHierarchy } from "../shared/networkUtils"
import type { BaseChartProps } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"

// ── Orbit layout types (kept for API compatibility) ──────────────────

export interface OrbitNode {
  datum: any
  x: number
  y: number
  ring: number
  angle: number
  depth: number
  parent?: OrbitNode
  children?: OrbitNode[]
  id?: string
}

type OrbitMode = "flat" | "solar" | "atomic" | number[]

// ── OrbitDiagram props ──────────────────────────────────────────────────

export interface OrbitDiagramProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /** Hierarchical data — single root object with children */
  data: TDatum
  /** How to access children from each datum @default "children" */
  childrenAccessor?: string | ((d: TDatum) => TDatum[] | null | undefined)
  /** How to identify each node @default "name" */
  nodeIdAccessor?: string | ((d: Datum) => string)
  /** Field or function for node color */
  colorBy?: string | ((d: Datum) => string)
  /** Color scheme @default "category10" */
  colorScheme?: string | string[]
  /** Color by hierarchy depth instead of field @default false */
  colorByDepth?: boolean
  /**
   * Ring arrangement mode:
   * - "flat": all children in one ring
   * - "solar": one child per ring
   * - "atomic": [2, 8] electron shell pattern
   * - number[]: custom ring capacities (last value repeats)
   * @default "flat"
   */
  orbitMode?: OrbitMode
  /** Ring size divisor per depth. Larger = tighter orbits. @default 2.95 */
  orbitSize?: number | ((node: any) => number)
  /** Orbit speed in degrees per frame @default 0.25 */
  speed?: number
  /** Per-node speed modifier @default (node) => 1 / (node.depth + 1) */
  revolution?: (node: any) => number
  /**
   * Built-in revolution style presets:
   * - "locked": children rotate with parent at decreasing speed (default)
   * - "decay": each depth level progressively slower, independent of parent
   * - "alternate": odd-depth rings reverse direction
   * Ignored when `revolution` function is provided.
   * @default "locked"
   */
  revolutionStyle?: "locked" | "decay" | "alternate"
  /** Vertical squash for elliptical orbits. 1 = circle, 0.5 = ellipse @default 1 */
  eccentricity?: number | ((node: any) => number)
  /** Show orbital ring paths @default true */
  showRings?: boolean
  /** Node radius. Number or function of node. @default 6 */
  nodeRadius?: number | ((node: any) => number)
  /** Show node labels @default false */
  showLabels?: boolean
  /** Enable animation @default true */
  animated?: boolean
  /** Tooltip configuration. Function form receives the raw datum (not OrbitNode). */
  tooltip?: TooltipProp
  /** Enable hover @default true */
  enableHover?: boolean
  /** Annotation objects */
  annotations?: Array<Datum>
  /** Additional SVG content */
  foregroundGraphics?: React.ReactNode
  /** Frame props passthrough */
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "data" | "size">>
}

// ── Depth palette ─────────────────────────────────────────────────────

const DEPTH_COLORS = DEPTH_PALETTE_COLORS

// ── Component ───────────────────────────────────────────────────────────

/**
 * OrbitDiagram - Visualize a hierarchy as concentric orbits with optional rotation.
 *
 * Each level of the hierarchy becomes an orbit ring at a different radius;
 * children are placed around their parent's orbit. With `animated` set
 * (the default), nodes rotate continuously at `speed`, producing a
 * planet-system feel.
 *
 * @example
 * ```tsx
 * // Static orbits
 * <OrbitDiagram
 *   data={{
 *     name: "Sun",
 *     children: [
 *       { name: "Mercury" },
 *       { name: "Venus" },
 *       { name: "Earth", children: [{ name: "Moon" }] },
 *       { name: "Mars" },
 *     ],
 *   }}
 *   childrenAccessor="children"
 *   animated={false}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Animated, depth-colored, slower rotation
 * <OrbitDiagram
 *   data={hierarchyRoot}
 *   childrenAccessor="children"
 *   colorByDepth
 *   speed={0.2}
 * />
 * ```
 */
export function OrbitDiagram<TDatum extends Datum = Datum>(
  props: OrbitDiagramProps<TDatum>
) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
  }, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme,
    colorByDepth = false,
    orbitMode = "flat",
    orbitSize = 2.95,
    speed = 0.25,
    revolution,
    revolutionStyle,
    eccentricity = 1,
    showRings = true,
    nodeRadius: nodeRadiusProp = 6,
    showLabels = false,
    animated = true,
    tooltip,
    foregroundGraphics,
    annotations,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, title, description, summary, accessibleTable } = resolved

  // ── Flatten for color scale ──────────────────────────────────────────────
  const allNodes = useMemo(() => {
    return flattenHierarchy(data, childrenAccessor as string | ((d: Datum) => any[]))
  }, [data, childrenAccessor])

  // Consolidated network setup. OrbitDiagram uses tighter margin
  // defaults (10px on all sides) than the standard chart-mode
  // defaults — pass them through so the hook's margin reservation
  // honors the legacy spacing instead of the standard chart-grid one.
  const setup = useNetworkChartSetup({
    nodes: allNodes,
    edges: undefined,
    inferNodes: false,
    colorBy: colorByDepth ? undefined : (colorBy as string | ((d: Datum) => string) | undefined),
    colorScheme,
    showLegend: false,             // no top-level legend
    legendInteraction: undefined,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartType: "OrbitDiagram",
    chartId,
    marginDefaults: { top: 10, right: 10, bottom: 10, left: 10 },
    userMargin,
    width, height,
    loading,
  })
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // ── Node style — d is a RealtimeNode, user data on d.data ───────────────
  // Resolve the scheme colors array for root node coloring
  const schemeColors = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? (resolved as readonly string[]) : DEFAULT_COLORS
  }, [colorScheme])

  const baseNodeStyleFn = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1 }
      const isRoot = (d.depth ?? 0) === 0
      if (colorByDepth) {
        // Root nodes use the first color from the scheme instead of the grey depth palette
        baseStyle.fill = isRoot
          ? schemeColors[0]
          : DEPTH_COLORS[(d.depth || 0) % DEPTH_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: Datum) => string), setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, setup.themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      baseStyle.opacity = isRoot ? 1 : 0.85
      return baseStyle
    }
  }, [colorBy, colorByDepth, setup.colorScale, schemeColors, setup.themeCategorical, colorScheme, categoryIndexMap])

  const nodeStyleFn = useMemo(
    () => mergeShapeStyle(baseNodeStyleFn, { stroke, strokeWidth, opacity }),
    [baseNodeStyleFn, stroke, strokeWidth, opacity]
  )

  // Edge style — use semi-transparent grey that works in both light and dark mode
  // (canvas cannot resolve "currentColor")
  const edgeStyleFn = useMemo(() => {
    return () => ({ stroke: "rgba(128,128,128,0.35)", strokeWidth: 0.5, opacity: 1 })
  }, [])

  // Unwrap RealtimeNode wrapper — StreamNetworkFrame's hover payload has
  // data: RealtimeNode, and the user's raw datum is on RealtimeNode.data
  const wrappedHoverBehavior = useMemo(() => {
    if (!setup.customHoverBehavior) return undefined
    return (hover: any) => {
      if (hover && hover.data && hover.data.data !== undefined) {
        setup.customHoverBehavior({ ...hover, data: hover.data.data })
      } else {
        setup.customHoverBehavior(hover)
      }
    }
  }, [setup.customHoverBehavior])

  const wrappedClickBehavior = useMemo(() => {
    if (!setup.customClickBehavior) return undefined
    return (click: any) => {
      if (click && click.data && click.data.data !== undefined) {
        setup.customClickBehavior({ ...click, data: click.data.data })
      } else {
        setup.customClickBehavior(click)
      }
    }
  }, [setup.customClickBehavior])

  // Validate
  const error = validateObjectData({ componentName: "OrbitDiagram", data })
  if (error) return <ChartError componentName="OrbitDiagram" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (setup.loadingEl) return setup.loadingEl

  return (
    <SafeRender componentName="OrbitDiagram" width={width} height={height}>
      <StreamNetworkFrame
        chartType="orbit"
        {...(data != null && { data })}
        size={[width, height]}
        responsiveWidth={props.responsiveWidth}
        responsiveHeight={props.responsiveHeight}
        margin={setup.margin}
        nodeIDAccessor={nodeIdAccessor}
        childrenAccessor={childrenAccessor as string | ((d: Datum) => any[])}
        nodeStyle={nodeStyleFn}
        edgeStyle={edgeStyleFn}
        colorBy={colorBy}
        colorScheme={setup.effectivePalette}
        colorByDepth={colorByDepth}
        nodeSize={nodeRadiusProp}
        nodeLabel={showLabels ? nodeIdAccessor : undefined}
        showLabels={showLabels}
        enableHover={animated ? false : enableHover}
        tooltipContent={!animated ? (tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)) : undefined}
        customHoverBehavior={(linkedHover || onObservation || onClick) ? wrappedHoverBehavior : undefined}
        customClickBehavior={(onObservation || onClick) ? wrappedClickBehavior : undefined}
        foregroundGraphics={foregroundGraphics}
        annotations={annotations}
        className={className}
        title={title}
        description={description}
        summary={summary}
        orbitMode={orbitMode}
        orbitSize={orbitSize}
        orbitSpeed={speed}
        orbitRevolution={revolution}
        orbitRevolutionStyle={revolutionStyle}
        orbitEccentricity={eccentricity}
        orbitShowRings={showRings}
        orbitAnimated={animated}
        accessibleTable={accessibleTable}
        {...(props.animate != null && { animate: props.animate })}
        {...frameProps}
      />
    </SafeRender>
  )
}

OrbitDiagram.displayName = "OrbitDiagram"

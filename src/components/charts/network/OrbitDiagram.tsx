"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS } from "../shared/colorUtils"
import { flattenHierarchy } from "../shared/networkUtils"
import type { BaseChartProps } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, useChartSelection, useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderLoadingState } from "../shared/withChartWrapper"
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

export interface OrbitDiagramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Hierarchical data — single root object with children */
  data: TDatum
  /** How to access children from each datum @default "children" */
  childrenAccessor?: string | ((d: TDatum) => TDatum[] | null | undefined)
  /** How to identify each node @default "name" */
  nodeIdAccessor?: string | ((d: any) => string)
  /** Field or function for node color */
  colorBy?: string | ((d: any) => string)
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
  annotations?: Array<Record<string, any>>
  /** Additional SVG content */
  foregroundGraphics?: React.ReactNode
  /** Frame props passthrough */
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "data" | "size">>
}

// ── Depth palette ─────────────────────────────────────────────────────

const DEPTH_COLORS = DEPTH_PALETTE_COLORS

// ── Component ───────────────────────────────────────────────────────────

export function OrbitDiagram<TDatum extends Record<string, any> = Record<string, any>>(
  props: OrbitDiagramProps<TDatum>
) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
  }, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
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
    chartId,
    selection,
    linkedHover,
    loading,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const title = resolved.title

  // ── Loading state ───────────────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl

  // ── Flatten for color scale ──────────────────────────────────────────────
  const allNodes = useMemo(() => {
    return flattenHierarchy(data, childrenAccessor as string | ((d: any) => any[]))
  }, [data, childrenAccessor])

  const colorScale = useColorScale(allNodes, colorByDepth ? undefined : colorBy, colorScheme)

  // ── Node style — d is a RealtimeNode, user data on d.data ───────────────
  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_COLORS[(d.depth || 0) % DEPTH_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      baseStyle.opacity = (d.depth ?? 0) === 0 ? 1 : 0.85
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale])

  // Edge style
  const edgeStyleFn = useMemo(() => {
    return () => ({ stroke: "currentColor", strokeWidth: 0.5, opacity: 0.1 })
  }, [])

  // Margin
  const margin = { top: 10, right: 10, bottom: 10, left: 10, ...userMargin }

  // Selection
  const { customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation, chartType: "OrbitDiagram", chartId,
  })

  // Validate
  const error = validateObjectData({ componentName: "OrbitDiagram", data })
  if (error) return <ChartError componentName="OrbitDiagram" message={error} width={width} height={height} />

  return (
    <SafeRender componentName="OrbitDiagram" width={width} height={height}>
      <StreamNetworkFrame
        chartType="orbit"
        data={data}
        size={[width, height]}
        responsiveWidth={props.responsiveWidth}
        responsiveHeight={props.responsiveHeight}
        margin={margin}
        nodeIDAccessor={nodeIdAccessor}
        childrenAccessor={childrenAccessor as string | ((d: any) => any[])}
        nodeStyle={nodeStyleFn}
        edgeStyle={edgeStyleFn}
        colorBy={colorBy}
        colorScheme={colorScheme}
        colorByDepth={colorByDepth}
        nodeSize={nodeRadiusProp}
        nodeLabel={showLabels ? nodeIdAccessor : undefined}
        showLabels={showLabels}
        enableHover={animated ? false : enableHover}
        tooltipContent={!animated && tooltip ? (d) => (normalizeTooltip(tooltip) as Function)(d.data) : undefined}
        customHoverBehavior={(linkedHover || onObservation) ? customHoverBehavior : undefined}
        foregroundGraphics={foregroundGraphics}
        annotations={annotations}
        className={className}
        title={title}
        orbitMode={orbitMode}
        orbitSize={orbitSize}
        orbitSpeed={speed}
        orbitRevolution={revolution}
        orbitRevolutionStyle={revolutionStyle}
        orbitEccentricity={eccentricity}
        orbitShowRings={showRings}
        orbitAnimated={animated}
        {...frameProps}
      />
    </SafeRender>
  )
}

OrbitDiagram.displayName = "OrbitDiagram"

"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { inferNodesFromEdges, createEdgeStyleFn } from "../shared/networkUtils"
import { useColorScale, useChartMode, useChartSelection, useLegendInteraction, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * ChordDiagram component props
 */
export interface ChordDiagramProps<TNode extends Datum = Datum, TEdge extends Datum = Datum> extends BaseChartProps {
  nodes?: TNode[]
  edges?: TEdge[]
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
  edgeColorBy?: "source" | "target" | ((d: Datum) => string)
  padAngle?: number
  groupWidth?: number
  sortGroups?: (a: any, b: any) => number
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  enableHover?: boolean
  legendInteraction?: LegendInteractionMode
  edgeOpacity?: number
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * ChordDiagram - Visualize bidirectional flows between a small set of categories.
 *
 * Each node is a wedge around a circle; ribbons inside connect nodes whose
 * `valueAccessor` describes the flow magnitude. Best for ≤30 categories
 * with a square many-to-many relationship matrix.
 *
 * For directed many-step flows prefer {@link SankeyDiagram}; for
 * unbounded networks prefer {@link ForceDirectedGraph}.
 *
 * @example
 * ```tsx
 * // Trade flows between regions
 * <ChordDiagram
 *   nodes={[{ id: "EMEA" }, { id: "Americas" }, { id: "APAC" }]}
 *   edges={[
 *     { source: "EMEA", target: "Americas", value: 32 },
 *     { source: "Americas", target: "APAC", value: 18 },
 *     { source: "APAC", target: "EMEA", value: 24 },
 *   ]}
 *   valueAccessor="value"
 *   showLabels
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color ribbons by source, custom padAngle
 * <ChordDiagram
 *   nodes={nodes}
 *   edges={edges}
 *   valueAccessor="value"
 *   edgeColorBy="source"
 *   padAngle={0.04}
 * />
 * ```
 */
export const ChordDiagram = forwardRef(function ChordDiagram<TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: ChordDiagramProps<TNode, TEdge>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  // Chord's `getData` returns edges (the chart's primary data shape)
  // rather than nodes — override the helper's node-default.
  useFrameImperativeHandle(ref, {
    variant: "network",
    frameRef,
    overrides: {
      getData: () =>
        frameRef.current?.getTopology()?.edges?.map((e: { data?: Datum }) => e.data ?? {}) ?? [],
    },
  })

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
    nodes,
    edges,
    margin: userMargin,
    className,
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    nodeIdAccessor = "id",
    colorBy,
    colorScheme,
    edgeColorBy = "source",
    padAngle = 0.01,
    groupWidth = 20,
    sortGroups,
    nodeLabel,
    edgeOpacity = 0.5,
    tooltip,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    emptyContent,
    legendInteraction,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLabels = true, title, description, summary, accessibleTable } = resolved

  // Identity-preserving sparse-array filter for both edges and nodes
  // before downstream iteration (`inferNodesFromEdges`, color extraction).
  const safeEdges = useMemo(() => filterSparseArray(edges), [edges])
  const safeInputNodes = useMemo(() => filterSparseArray(nodes), [nodes])

  // ── Loading / empty states (computed early, returned after all hooks) ───
  // Drive empty-state off the filtered edge list so a sparse-only
  // `[null, undefined]` triggers the empty UI instead of a blank chord.
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl
    ? renderEmptyState(edges === undefined ? undefined : safeEdges, width, height, emptyContent)
    : null

  // Infer nodes from edges if not provided
  const inferredNodes = useMemo(
    () => inferNodesFromEdges(safeInputNodes, safeEdges, sourceAccessor, targetAccessor),
    [safeInputNodes, safeEdges, sourceAccessor, targetAccessor]
  )

  const colorScale = useColorScale(inferredNodes, colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of inferredNodes as Datum[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [inferredNodes, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const effectivePalette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  // When data is empty (push API, no edges at mount), the HOC's colorScale
  // is built from zero data points and returns "#999" for everything.
  // In that case, skip passing nodeStyle/edgeStyle so the chord layout
  // plugin's built-in nodeColorMap palette handles coloring per node index.
  const hasColorData = inferredNodes.length > 0

  // Node style function — d is a RealtimeNode, user data on d.data
  const baseNodeStyle = useMemo(() => {
    if (!hasColorData) return undefined
    return (d: Datum, i?: number) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        const palette = Array.isArray(colorScheme) ? colorScheme : (COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES] || DEFAULT_COLORS)
        const colors = Array.isArray(palette) ? palette : DEFAULT_COLORS
        const index = (d as any).index ?? i ?? 0
        baseStyle.fill = colors[index % colors.length]
      }
      return baseStyle
    }
  }, [hasColorData, colorBy, colorScale, colorScheme])

  // Overlay top-level primitive props (stroke/strokeWidth/opacity) last.
  const nodeStyle = useMemo(
    () => baseNodeStyle ? mergeShapeStyle(baseNodeStyle, { stroke, strokeWidth, opacity }) : undefined,
    [baseNodeStyle, stroke, strokeWidth, opacity]
  )

  // Edge style function — d is a RealtimeEdge
  const baseEdgeStyle = useMemo(() => {
    if (!hasColorData) return undefined
    return createEdgeStyleFn({
      edgeColorBy,
      colorBy,
      colorScale,
      nodeStyleFn: nodeStyle || ((_d: Datum) => ({ fill: resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap) })),
      edgeOpacity,
      baseStyle: { stroke: "black", strokeWidth: 0.5, strokeOpacity: edgeOpacity }
    })
  }, [hasColorData, edgeColorBy, colorBy, colorScale, nodeStyle, edgeOpacity, themeCategorical, colorScheme, categoryIndexMap])

  const edgeStyle = useMemo(
    () => baseEdgeStyle ? mergeShapeStyle(baseEdgeStyle, { stroke, strokeWidth, opacity }) : undefined,
    [baseEdgeStyle, stroke, strokeWidth, opacity]
  )

  // Node label accessor
  const nodeLabelFn = useMemo(() => {
    if (!showLabels) return undefined
    const accessor = nodeLabel || nodeIdAccessor
    if (typeof accessor === "function") return accessor
    // d is a RealtimeNode — user data lives at d.data, fall back to d.id
    return (d: Datum) => d.data?.[accessor] ?? d[accessor] ?? d.id
  }, [showLabels, nodeLabel, nodeIdAccessor])

  // Margin
  const margin = { ...resolved.marginDefaults, ...(typeof userMargin === "number" ? { top: userMargin, bottom: userMargin, left: userMargin, right: userMargin } : userMargin) }

  const { customHoverBehavior, customClickBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true, onObservation, onClick, chartType: "ChordDiagram", chartId,
  })

  // Validate
  const error = validateNetworkData({
    componentName: "ChordDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="ChordDiagram" message={error} width={width} height={height} />

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="ChordDiagram" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="chord"
      {...(inferredNodes.length > 0 && { nodes: inferredNodes })}
      {...(edges != null && { edges: safeEdges })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      valueAccessor={valueAccessor}
      padAngle={padAngle}
      groupWidth={groupWidth}
      sortGroups={sortGroups}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={effectivePalette}
      edgeColorBy={edgeColorBy}
      edgeOpacity={edgeOpacity}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      customHoverBehavior={(linkedHover || onObservation || onClick) ? customHoverBehavior : undefined}
      customClickBehavior={(onObservation || onClick) ? customClickBehavior : undefined}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: legendState.onLegendHover,
        legendClickBehavior: legendState.onLegendClick,
        legendHighlightedCategory: legendState.highlightedCategory,
        legendIsolatedCategories: legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      description={description}
      summary={summary}
      accessibleTable={accessibleTable}
      {...(props.animate != null && { animate: props.animate })}
      {...frameProps}
    />
  </SafeRender>)
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: ChordDiagramProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ChordDiagram.displayName = "ChordDiagram"

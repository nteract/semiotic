"use client"
import type { Datum } from "../shared/datumTypes"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { createEdgeStyleFn } from "../shared/networkUtils"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeNodeRuleContext, type StyleRule } from "../shared/styleRules"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"

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
  colorScheme?: string | string[] | Record<string, string>
  /**
   * Declarative, threshold-aware node styling (see ForceDirectedGraph).
   * Ordered `{ when, style }` rules; last applicable rule wins. Rules see the
   * raw node object. A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: StyleRule[]
  edgeColorBy?: "source" | "target" | ((d: Datum) => string)
  padAngle?: number
  groupWidth?: number
  /** Compare D3 chord group indices to control their angular order. */
  sortGroups?: (a: number, b: number) => number
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
  // rather than nodes — override the helper's node-default. Returns
  // `e.data` as-is (no `?? {}` fallback) so edges without a payload
  // still surface as `undefined`, matching the pre-migration inline
  // handle's runtime shape.
  useFrameImperativeHandle(ref, {
    variant: "network",
    frameRef,
    overrides: {
      getData: () =>
        (frameRef.current?.getTopology()?.edges?.map((e: { data?: Datum }) => e.data) as Datum[] | undefined) ?? [],
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
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
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
    styleRules,
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
    loadingContent,
    emptyContent,
    legendInteraction,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLabels = true, title, description, summary, accessibleTable } = resolved

  // Consolidated network setup. ChordDiagram doesn't have a top-level
  // `showLegend` prop — its legend is the `legendInteraction`-driven
  // hover/isolate behavior — so pass `showLegend: false` to suppress
  // the hook's auto-legend (and thus the legend-aware margin
  // reservation), matching the pre-migration manual margin.
  const setup = useNetworkChartSetup({
    nodes,
    edges,
    inferNodes: true,
    nodeIdAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy,
    colorScheme,
    showLegend: false,
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "ChordDiagram",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    loading,
    loadingContent,
    emptyContent,
  })
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // When data is empty (push API, no edges at mount), the HOC's colorScale
  // is built from zero data points and returns "#999" for everything.
  // In that case, skip passing nodeStyle/edgeStyle so the chord layout
  // plugin's built-in nodeColorMap palette handles coloring per node index.
  const hasColorData = setup.safeNodes.length > 0

  // Node style function — d is a RealtimeNode, user data on d.data
  const baseNodeStyle = useMemo(() => {
    if (!hasColorData) return undefined
    return (d: Datum, i?: number) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, setup.colorScale)
      } else {
        const palette = Array.isArray(colorScheme) ? colorScheme : (COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES] || DEFAULT_COLORS)
        const colors = Array.isArray(palette) ? palette : DEFAULT_COLORS
        const index = (d as { index?: number }).index ?? i ?? 0
        baseStyle.fill = colors[index % colors.length]
      }
      return baseStyle
    }
  }, [hasColorData, colorBy, setup.colorScale, colorScheme])

  const nodeRuleContext = useMemo(
    () => makeNodeRuleContext(colorBy as string | ((d: Datum) => unknown) | undefined),
    [colorBy],
  )

  // Overlay top-level primitive props (stroke/strokeWidth/opacity) last.
  // Declarative style rules layer over the base node color; when there's no
  // color base but rules are set, they still apply (rules-only styling).
  const nodeStyle = useMemo(
    () => {
      if (!baseNodeStyle && !(styleRules && styleRules.length > 0)) return undefined
      return mergeShapeStyle(
        composeStyleRules(baseNodeStyle, styleRules, nodeRuleContext, (d) => d.data || d),
        { stroke, strokeWidth, opacity },
      )
    },
    [baseNodeStyle, styleRules, nodeRuleContext, stroke, strokeWidth, opacity]
  )

  // Edge style function — d is a RealtimeEdge
  const baseEdgeStyle = useMemo(() => {
    if (!hasColorData) return undefined
    return createEdgeStyleFn({
      edgeColorBy,
      colorBy,
      colorScale: setup.colorScale,
      nodeStyleFn: nodeStyle || ((_d: Datum) => ({ fill: resolveDefaultFill(undefined, setup.themeCategorical, colorScheme, undefined, categoryIndexMap) })),
      edgeOpacity,
      baseStyle: { stroke: "black", strokeWidth: 0.5, strokeOpacity: edgeOpacity }
    })
  }, [hasColorData, edgeColorBy, colorBy, setup.colorScale, nodeStyle, edgeOpacity, setup.themeCategorical, colorScheme, categoryIndexMap])

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

  // Validate
  const error = validateNetworkData({
    componentName: "ChordDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="ChordDiagram" message={error} width={width} height={height} />

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.loadingEl) return setup.loadingEl
  if (setup.emptyEl) return setup.emptyEl

  return (
    <SafeRender componentName="ChordDiagram" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="chord"
      {...(setup.safeNodes.length > 0 && { nodes: setup.safeNodes })}
      {...(edges != null && { edges: setup.safeEdges })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={setup.margin}
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
      colorScheme={setup.effectivePalette}
      edgeColorBy={edgeColorBy}
      edgeOpacity={edgeOpacity}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        onClick,
        mobileInteraction: setup.mobileInteraction,
        customHoverBehavior: setup.customHoverBehavior,
        customClickBehavior: setup.customClickBehavior,
        linkedHoverInClickPredicate: false,
      })}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: setup.legendState.onLegendHover,
        legendClickBehavior: setup.legendState.onLegendClick,
        legendHighlightedCategory: setup.legendState.highlightedCategory,
        legendIsolatedCategories: setup.legendState.isolatedCategories,
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

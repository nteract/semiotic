"use client"
import type { Datum } from "../shared/datumTypes"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"

import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { createEdgeStyleFn } from "../shared/networkUtils"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeNodeRuleContext, type StyleRule } from "../shared/styleRules"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"

/**
 * SankeyDiagram component props
 */
export interface SankeyDiagramProps<TNode extends Datum = Datum, TEdge extends Datum = Datum> extends BaseChartProps {
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
   * raw node object; `ctx` = `{ value, category }`. A rule `fill` may be a
   * color or a HatchFill. Layers over the resolved node color.
   */
  styleRules?: StyleRule[]
  edgeColorBy?: "source" | "target" | "gradient" | ((d: Datum) => string)
  orientation?: "horizontal" | "vertical"
  nodeAlign?: "justify" | "left" | "right" | "center"
  nodePaddingRatio?: number
  nodeWidth?: number
  nodeLabel?: ChartAccessor<TNode, string>
  showLabels?: boolean
  enableHover?: boolean
  /** Show a swatch + label legend. Defaults to `true` when `colorBy` is set. */
  showLegend?: boolean
  /** Legend position. Default `"right"`. */
  legendPosition?: LegendPosition
  legendInteraction?: LegendInteractionMode
  edgeOpacity?: number
  edgeSort?: (a: TEdge, b: TEdge) => number
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * SankeyDiagram - Visualize directed many-step flow between nodes.
 *
 * Each `edge` is a ribbon whose width encodes `valueAccessor`. The layout
 * positions nodes in vertical columns (`orientation: "horizontal"`) or
 * horizontal rows (`orientation: "vertical"`) so flows always run in a
 * single direction.
 *
 * For bidirectional same-tier flows prefer {@link ChordDiagram}; for
 * unstructured many-to-many networks prefer {@link ForceDirectedGraph}.
 *
 * @example
 * ```tsx
 * // User funnel
 * <SankeyDiagram
 *   nodes={[
 *     { id: "Visit" }, { id: "Signup" }, { id: "Activate" }, { id: "Drop" },
 *   ]}
 *   edges={[
 *     { source: "Visit",   target: "Signup",   value: 320 },
 *     { source: "Visit",   target: "Drop",     value: 180 },
 *     { source: "Signup",  target: "Activate", value: 240 },
 *     { source: "Signup",  target: "Drop",     value: 80 },
 *   ]}
 *   valueAccessor="value"
 *   showLabels
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color edges by source, vertical orientation
 * <SankeyDiagram
 *   nodes={nodes}
 *   edges={edges}
 *   valueAccessor="value"
 *   edgeColorBy="source"
 *   orientation="vertical"
 *   nodeAlign="justify"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Tighter nodes for many categories
 * <SankeyDiagram
 *   nodes={nodes}
 *   edges={edges}
 *   valueAccessor="value"
 *   nodeWidth={6}
 *   nodePaddingRatio={0.3}
 * />
 * ```
 */
export const SankeyDiagram = forwardRef(function SankeyDiagram<TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: SankeyDiagramProps<TNode, TEdge>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  // Sankey's `getData` returns edges (the chart's primary data shape)
  // rather than nodes — override the helper's node-default with the
  // edge variant. Returns `e.data` as-is (no `?? {}` fallback) so
  // edges without a payload still surface as `undefined`, matching
  // the pre-migration inline handle's runtime shape.
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
}, { width: 800, height: 600 })

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
    orientation = "horizontal",
    nodeAlign = "justify",
    nodePaddingRatio = 0.05,
    nodeWidth = 15,
    nodeLabel,
    edgeOpacity = 0.5,
    edgeSort,
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
    showLegend,
    legendPosition,
    legendInteraction,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLabels = true, title, description, summary, accessibleTable } = resolved

  // Consolidated setup — sparse filtering, node inference, color
  // scale, palette resolution, category extraction, legend
  // interaction, margin/legend composition, and selection wiring.
  const setup = useNetworkChartSetup({
    nodes,
    edges,
    inferNodes: true,
    nodeIdAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy,
    colorScheme,
    showLegend,                   // undefined → auto-on when colorBy is set
    legendPosition,
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "SankeyDiagram",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    loading,
    loadingContent,
    emptyContent,
  })

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // Node style function
  // d is a RealtimeNode — user data lives on d.data
  const baseNodeStyle = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {
        stroke: "black",
        strokeWidth: 1
      }

      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, setup.themeCategorical, colorScheme, undefined, categoryIndexMap)
      }

      return baseStyle
    }
  }, [colorBy, setup.colorScale, setup.themeCategorical, colorScheme, categoryIndexMap])

  // Declarative style rules layer over the base node color (raw node via .data).
  const nodeRuleContext = useMemo(
    () => makeNodeRuleContext(colorBy as string | ((d: Datum) => unknown) | undefined, valueAccessor as string | ((d: Datum) => unknown)),
    [colorBy, valueAccessor],
  )

  // Overlay top-level primitive props onto nodeStyle.
  const nodeStyle = useMemo(
    () => mergeShapeStyle(
      composeStyleRules<number>(baseNodeStyle, styleRules, nodeRuleContext, (d) => d.data || d),
      { stroke, strokeWidth, opacity },
    ),
    [baseNodeStyle, styleRules, nodeRuleContext, stroke, strokeWidth, opacity]
  )

  // Edge style function
  // d is a RealtimeEdge — d.source/d.target are RealtimeNode objects
  const baseEdgeStyle = useMemo(() => createEdgeStyleFn({
    edgeColorBy,
    colorBy,
    colorScale: setup.colorScale,
    nodeStyleFn: nodeStyle,
    edgeOpacity,
    baseStyle: { stroke: "none", strokeWidth: 0 }
  }), [edgeColorBy, colorBy, setup.colorScale, nodeStyle, edgeOpacity])

  const edgeStyle = useMemo(
    () => mergeShapeStyle(baseEdgeStyle, { stroke, strokeWidth, opacity }),
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

  // Validate data (after all hooks)
  const error = validateNetworkData({
    componentName: "SankeyDiagram",
    edges,
    edgesRequired: true,
  })
  if (error) return <ChartError componentName="SankeyDiagram" message={error} width={width} height={height} />

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.loadingEl) return setup.loadingEl
  if (setup.emptyEl) return setup.emptyEl

  return (
    <SafeRender componentName="SankeyDiagram" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="sankey"
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
      orientation={orientation}
      nodeAlign={nodeAlign}
      nodePaddingRatio={nodePaddingRatio}
      nodeWidth={nodeWidth}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      edgeColorBy={edgeColorBy}
      edgeOpacity={edgeOpacity}
      edgeSort={edgeSort}
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
      legend={setup.legend}
      legendPosition={setup.legendPosition}
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
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: SankeyDiagramProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
SankeyDiagram.displayName = "SankeyDiagram"

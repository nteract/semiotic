"use client"
import type { NetworkPerspectiveProps } from "../shared/networkPerspectiveProps"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo } from "react"
import { hierarchyLayoutPlugin } from "../../stream/layouts/hierarchyLayoutPlugin"
import { registerLayoutPlugin } from "../../stream/layouts/registry"
import { registerNetworkPerspective } from "../../stream/networkPerspectiveRuntime"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { createHierarchyStyle } from "../shared/hierarchyStyle"
import { useChartMode } from "../shared/hooks"
import {
  flattenHierarchy,
  wrapNetworkNodeStyleWithSelection,
} from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import {
  composeStyleRules,
  makeNodeRuleContext,
  type StyleRule,
} from "../shared/styleRules"
import { withDisplayName } from "../shared/withDisplayName"

// Registered at render (not import) so unused charts stay tree-shakeable.
function ensureCirclePackRegistrations(): void {
  registerLayoutPlugin("circlepack", hierarchyLayoutPlugin)
  registerNetworkPerspective()
}

/**
 * CirclePack component props
 */
export interface CirclePackProps<TNode extends Datum = Datum> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[] | Record<string, string>
  colorByDepth?: boolean
  /** Ordered data-aware node styling. Rules see the authored hierarchy node. */
  styleRules?: StyleRule[]
  /**
   * Draw the laid-out network in a parallel projection: `"isometric"`,
   * `"pixel"`, `"dimetric"`, `"military"`, `"cabinet"`, or a config object.
   * See {@link NetworkPerspectiveProps.perspective}. @default "flat"
   */
  perspective?: NetworkPerspectiveProps["perspective"]
  showLabels?: boolean
  nodeLabel?: ChartAccessor<TNode, string>
  circleOpacity?: number
  padding?: number
  enableHover?: boolean
  /** Show a swatch + label legend. Defaults to `true` when `colorBy` is set. */
  showLegend?: boolean
  /** Legend position. Default `"right"`. */
  legendPosition?: LegendPosition
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * CirclePack - Visualize hierarchical data as nested circles.
 *
 * Each leaf becomes a circle sized by `valueAccessor`; parents enclose
 * their children. Best for hierarchies where size encoding matters more
 * than precise comparisons.
 *
 * For rectangular tiling of the same data shape use {@link Treemap}; for
 * radial parent→child connections use {@link TreeDiagram}.
 *
 * @example
 * ```tsx
 * // Filesystem-style hierarchy sized by file size
 * <CirclePack
 *   data={{
 *     name: "src",
 *     children: [
 *       { name: "components", children: [
 *         { name: "Chart.tsx", value: 1200 },
 *         { name: "Frame.tsx", value: 800 },
 *       ]},
 *       { name: "utils", children: [{ name: "color.ts", value: 400 }] },
 *     ],
 *   }}
 *   valueAccessor="value"
 *   childrenAccessor="children"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by depth instead of by leaf identity
 * <CirclePack
 *   data={hierarchyRoot}
 *   valueAccessor="size"
 *   colorByDepth
 *   showLabels
 * />
 * ```
 */
export const CirclePack = /* @__PURE__ */ withDisplayName(function CirclePack<TNode extends Datum = Datum>(props: CirclePackProps<TNode>) {
  ensureCirclePackRegistrations()

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
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
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme,
    colorByDepth = false,
    styleRules,
    nodeLabel,
    circleOpacity = 0.7,
    padding: paddingProp = 4,
    tooltip,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    loadingContent,
    legendInteraction,
    legendPosition,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLegend, showLabels = true, title, description, summary, accessibleTable } = resolved

  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: Datum) => Datum[]))
  }, [data, childrenAccessor])

  // Consolidated network setup. Same shape as Treemap's migration —
  // hierarchy charts feed flattened descendants into the hook with
  // node inference off, so colorScale / categories / legend state /
  // selection wiring all funnel through one call.
  const setup = useNetworkChartSetup({
    nodes: allNodes,
    edges: undefined,
    inferNodes: false,
    colorBy: colorByDepth ? undefined : (colorBy as string | ((d: Datum) => string) | undefined),
    colorScheme,
    showLegend,
    legendPosition,
    legendInteraction,
    frameLegend: frameProps,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "CirclePack",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    hasTitle: !!title,
    loading,
    loadingContent,
  })

  const baseNodeStyleFn = useMemo(() => {
    return createHierarchyStyle(
      {
        stroke: "currentColor",
        strokeWidth: 1,
        strokeOpacity: 0.3,
        fillOpacity: circleOpacity
      },
      colorBy as string | ((d: Datum) => string) | undefined,
      colorByDepth,
      setup.colorScale,
      setup.themeCategorical,
      colorScheme
    )
  }, [colorBy, colorByDepth, setup.colorScale, circleOpacity, setup.themeCategorical, colorScheme])

  const nodeRuleContext = useMemo(
    () => makeNodeRuleContext(
      colorBy as string | ((d: Datum) => unknown) | undefined,
      valueAccessor as string | ((d: Datum) => unknown) | undefined,
    ),
    [colorBy, valueAccessor],
  )
  const ruledNodeStyleFn = useMemo(
    () => composeStyleRules(
      baseNodeStyleFn,
      styleRules,
      nodeRuleContext,
      (d) => d.data || d,
    ),
    [baseNodeStyleFn, styleRules, nodeRuleContext],
  )

  const nodeStyleFn = useMemo(
    () => mergeShapeStyle(ruledNodeStyleFn, { stroke, strokeWidth, opacity }),
    [ruledNodeStyleFn, stroke, strokeWidth, opacity]
  )
  const nodeStyle = useMemo(
    () => wrapNetworkNodeStyleWithSelection(
      nodeStyleFn,
      setup.effectiveSelectionHook,
      setup.resolvedSelection,
    ),
    [nodeStyleFn, setup.effectiveSelectionHook, setup.resolvedSelection],
  )

  // Validate
  const error = validateObjectData({ componentName: "CirclePack", data })
  if (error) return <ChartError componentName="CirclePack" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (setup.loadingEl) return setup.loadingEl

  return (
    <SafeRender componentName="CirclePack" width={width} height={height}>
    <StreamNetworkFrame
      chartType="circlepack"
      {...(data != null && { data })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={setup.margin}
      {...setup.legendBehaviorProps}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={valueAccessor}
      padding={paddingProp}
      nodeStyle={nodeStyle}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
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
      perspective={props.perspective}
      {...frameProps}
    />
  </SafeRender>)
}, "CirclePack")

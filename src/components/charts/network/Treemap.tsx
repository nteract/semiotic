"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps } from "../../stream/networkTypes"
import { getColor, DEPTH_PALETTE_COLORS, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import { flattenHierarchy, resolveHierarchySum } from "../shared/networkUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, useChartSelection, useColorScale, useLegendInteraction, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderLoadingState } from "../shared/withChartWrapper"
import { validateObjectData } from "../shared/validateChartData"

/**
 * Treemap component props
 */
export interface TreemapProps<TNode extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TNode
  childrenAccessor?: ChartAccessor<TNode, TNode[]>
  valueAccessor?: ChartAccessor<TNode, number>
  nodeIdAccessor?: ChartAccessor<TNode, string>
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[]
  colorByDepth?: boolean
  showLabels?: boolean
  labelMode?: "leaf" | "parent" | "all"
  nodeLabel?: ChartAccessor<TNode, string>
  padding?: number
  paddingTop?: number
  enableHover?: boolean
  legendInteraction?: LegendInteractionMode
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "edges" | "size">>
}

/**
 * Treemap - Visualize hierarchical data as nested rectangles.
 *
 * Wraps StreamNetworkFrame (canvas-first) for treemap visualization.
 */
export function Treemap<TNode extends Record<string, any> = Record<string, any>>(props: TreemapProps<TNode>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLabels: props.showLabels,
    title: props.title,
    linkedHover: props.linkedHover,
  }, { width: 600, height: 600 })

  const {
    data,
    margin: userMargin,
    className,
    childrenAccessor = "children",
    valueAccessor = "value",
    nodeIdAccessor = "name",
    colorBy,
    colorScheme = "category10",
    colorByDepth = false,
    labelMode = "leaf",
    nodeLabel,
    padding: paddingProp = 4,
    paddingTop: paddingTopProp,
    tooltip,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    legendInteraction,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLabels = resolved.showLabels ?? true
  const title = resolved.title

  // ── Loading state (computed early, returned after all hooks) ─────────────
  const loadingEl = renderLoadingState(loading, width, height)

  const { activeSelectionHook, customHoverBehavior: baseHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "Treemap", chartId
  })

  // Network frame hover: { type, data: sceneNode, x, y }
  // sceneNode.data = original datum for this hierarchy node
  // Pass it as { data: originalDatum } so useChartSelection unwraps correctly
  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (!d) return baseHoverBehavior(null)
      const sceneNode = d.data || d
      const originalDatum = sceneNode?.data || sceneNode
      baseHoverBehavior({ data: originalDatum })
    },
    [baseHoverBehavior]
  )

  const allNodes = useMemo(() => {
    return flattenHierarchy(data ?? null, childrenAccessor as string | ((d: any) => any[]))
  }, [data, childrenAccessor])

  const colorScale = useColorScale(allNodes, colorByDepth ? undefined : colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy || colorByDepth) return []
    const vals = new Set<string>()
    for (const d of allNodes as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [allNodes, colorBy, colorByDepth])

  const legendState = useLegendInteraction(legendInteraction, colorByDepth ? undefined : colorBy as string | ((d: any) => string) | undefined, allCategories)

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const effectivePalette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  const nodeStyleFn = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { stroke: "#fff", strokeWidth: 1, strokeOpacity: 0.8 }
      if (colorByDepth) {
        baseStyle.fill = DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
      } else if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy as string | ((d: any) => string), colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      return baseStyle
    }
  }, [colorBy, colorByDepth, colorScale, themeCategorical, colorScheme, categoryIndexMap])

  // Wrap node style with selection — unwrap hierarchy .data for predicate matching
  const nodeStyle = useMemo(() => {
    if (!activeSelectionHook) return nodeStyleFn
    return (d: Record<string, any>) => {
      const style = { ...nodeStyleFn(d) }
      if (activeSelectionHook.isActive) {
        const datum = d.data || d
        const matches = activeSelectionHook.predicate(datum)
        if (matches) {
          if (selection?.selectedStyle) Object.assign(style, selection.selectedStyle)
        } else {
          const dimOpacity = selection?.unselectedOpacity ?? 0.2
          style.opacity = dimOpacity
          style.fillOpacity = dimOpacity
          style.strokeOpacity = dimOpacity
          if (selection?.unselectedStyle) Object.assign(style, selection.unselectedStyle)
        }
      }
      return style
    }
  }, [nodeStyleFn, activeSelectionHook, selection])

  const hierarchySumFn = useMemo(() => {
    return resolveHierarchySum(valueAccessor)
  }, [valueAccessor])

  const resolvedPaddingTop = paddingTopProp !== undefined
    ? paddingTopProp
    : (showLabels && (labelMode === "parent" || labelMode === "all") ? 18 : undefined)

  // Margin
  const margin = { ...resolved.marginDefaults, ...userMargin }

  // Validate
  const error = validateObjectData({ componentName: "Treemap", data })
  if (error) return <ChartError componentName="Treemap" message={error} width={width} height={height} />

  // ── Loading guard (deferred to after all hooks) ────────────────────────
  if (loadingEl) return loadingEl

  return (<SafeRender componentName="Treemap" width={width} height={height}>
    <StreamNetworkFrame
      chartType="treemap"
      {...(data != null && { data })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIdAccessor}
      childrenAccessor={childrenAccessor}
      hierarchySum={hierarchySumFn}
      padding={paddingProp}
      paddingTop={resolvedPaddingTop}
      nodeStyle={nodeStyle}
      colorBy={colorBy}
      colorScheme={effectivePalette}
      colorByDepth={colorByDepth}
      nodeLabel={showLabels ? (nodeLabel || nodeIdAccessor) : undefined}
      showLabels={showLabels}
      labelMode={labelMode}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      {...((linkedHover || onObservation) && { customHoverBehavior })}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: legendState.onLegendHover,
        legendClickBehavior: legendState.onLegendClick,
        legendHighlightedCategory: legendState.highlightedCategory,
        legendIsolatedCategories: legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      {...frameProps}
    />
  </SafeRender>)
}
Treemap.displayName = "Treemap"

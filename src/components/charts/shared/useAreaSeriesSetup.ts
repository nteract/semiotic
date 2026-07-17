/**
 * useAreaSeriesSetup — shared series construction for area-shaped XY HOCs.
 *
 * AreaChart and StackedAreaChart both follow the same recipe to turn a
 * flat data array (or pre-grouped area objects) into the props
 * `StreamXYFrame` expects:
 *
 *   1. **Area-format detection + grouping** — if `data[0][lineDataAccessor]`
 *      is set, the input is already in `{ [groupKey]: rows[] }` shape;
 *      otherwise group by `areaBy` (or wrap in a single-area object
 *      when neither is supplied).
 *   2. **Flatten back** — `StreamXYFrame` consumes a flat array; we
 *      re-flatten the grouped form, re-injecting the `areaBy` field so
 *      the frame's group accessor can re-derive series.
 *   3. **Line style** — fill/stroke from `colorBy`+`colorScale` or
 *      uniform-`color` fallback, `fillOpacity = areaOpacity`,
 *      stroke/lineWidth gated on `showLine`. Push-mode with `colorBy`
 *      but no `colorScale` returns an empty style so the frame can
 *      paint from its own palette.
 *   4. **Primitive overlay + selection wrap** — top-level
 *      `stroke`/`strokeWidth`/`opacity` win via `mergeShapeStyle`;
 *      then `wrapStyleWithSelection` dims unmatched series when a
 *      selection is active.
 *   5. **Optional point style** — same color resolution as line style
 *      but with `r: pointRadius, fillOpacity: 1`. Skipped when
 *      `showPoints` is false.
 *   6. **Default tooltip content** — `buildDefaultTooltip` rows for
 *      x / y / group with `xFormat`/`yFormat` cascading through.
 *
 * This hook collapses those six steps into one call. Adopters drop
 * ~70 lines of recipe per HOC.
 */
"use client"
import { useMemo } from "react"
import type { ReactNode } from "react"
import type { Datum } from "./datumTypes"
import { prepareAreaSeriesData } from "./areaSeriesData"
import type { Accessor, ChartAccessor } from "./types"
import type { SelectionHookResult } from "./selectionUtils"
import { wrapStyleWithSelection } from "./selectionUtils"
import { mergeShapeStyle } from "./mergeShapeStyle"
import { getColor } from "./colorUtils"
import { DEFAULT_COLOR } from "./hooks"
import { buildDefaultTooltip, accessorName, bandTooltipFields } from "./tooltipUtils"
import type { HoverData } from "../../stream/types"
import type { BandConfig } from "../../stream/types"
import { resolveStyleRules, type StyleRule, type StyleRuleContext } from "./styleRules"
import type { HatchFill } from "./hatchFill"

/** Values a resolved area/line style may carry (`fill` can be a HatchFill). */
type AreaStyleValue = string | number | HatchFill | CanvasPattern | undefined

export interface AreaSeriesSetupOptions<TDatum extends Datum = Datum> {
  /** Sparse-filtered data array (the HOC's `safeData`). */
  safeData: TDatum[]
  /** Original `data` prop — used to short-circuit to push-mode flatten. */
  data: TDatum[] | undefined
  /** Group accessor (`areaBy` on the HOC). When set, flat data is
   *  grouped into one series per distinct value. */
  areaBy?: ChartAccessor<TDatum, string>
  /** Field on grouped objects that contains the coordinate array.
   *  Convention: `"coordinates"`. Pre-grouped input is detected by
   *  presence of this field on the first row. */
  lineDataAccessor: string
  /** Effective color accessor (already resolved by HOC: AreaChart =
   *  `colorBy`; StackedAreaChart = `colorBy || areaBy`). */
  colorBy?: Accessor<string> | ChartAccessor<TDatum, string>
  /** Resolved categorical color scale from `useChartSetup`. */
  colorScale: ((v: string) => string) | undefined
  /** Top-level uniform `color` prop. */
  color?: string
  /** Top-level primitive props — applied last so they win over
   *  HOC base + (future) user style. */
  stroke?: string
  strokeWidth?: number
  opacity?: number
  /** Selection hook output (`setup.effectiveSelectionHook`). */
  effectiveSelectionHook: SelectionHookResult | null | undefined
  /** Resolved selection config (`setup.resolvedSelection`). */
  resolvedSelection: import("./types").SelectionConfig | undefined
  /** Area fillOpacity. @default 0.7 */
  areaOpacity: number
  /** Render line on top of fill. @default true */
  showLine: boolean
  /** Line stroke width. @default 2 */
  lineWidth: number
  /** Render points along the line. @default false */
  showPoints: boolean
  /** Point radius when `showPoints`. @default 3 */
  pointRadius: number
  // ── Tooltip pieces ────────────────────────────────────────────
  xAccessor: ChartAccessor<TDatum, number | Date | string>
  yAccessor: ChartAccessor<TDatum, number>
  xLabel?: string
  yLabel?: string
  /** Tooltip-side x formatter — same signature as `AxisConfig.xFormat`
   *  so the HOC can forward the prop verbatim. ReactNode return is OK. */
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | ReactNode
  yFormat?: (d: number | Date | string) => string | ReactNode
  /** Field used to label the series row in the default tooltip.
   *  Typically `areaBy ?? colorBy`. */
  groupField?: Accessor<string> | ChartAccessor<TDatum, string>
  /** Optional band prop — when set, the default tooltip surfaces a
   *  pair of rows per band (low + high). Threaded through verbatim. */
  band?: BandConfig<TDatum> | Array<BandConfig<TDatum>>
  /**
   * Declarative style rules, merged on top of the resolved area fill/stroke
   * (last-applicable rule wins). Per-series: resolves against the series'
   * sample datum. A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: ReadonlyArray<StyleRule>
  /** Build the `StyleRuleContext` for a series sample datum. */
  ruleContext?: (d: Datum) => StyleRuleContext
}

export interface AreaSeriesSetupResult<TDatum extends Datum = Datum> {
  /** Flat data array ready for `<StreamXYFrame data={…} />`. Empty
   *  when the HOC is in push mode (no `data` prop). */
  flattenedData: TDatum[]
  /** Selection-aware line/area style fn. */
  lineStyle: (d: Datum) => Record<string, AreaStyleValue>
  /** Selection-aware point style fn — `undefined` when `showPoints`
   *  is false so the HOC can spread it conditionally. */
  pointStyle: ((d: Datum) => Record<string, string | number>) | undefined
  /** Default tooltip content fn for the chart. */
  defaultTooltipContent: (hover: HoverData) => ReactNode
}

/**
 * Build the area-series pieces for an area-shaped XY HOC.
 * The HOC still owns chart-specific frame props (chartType,
 * gradientFill, normalize, baseline, stackOrder) and all the
 * passthrough wiring; this hook covers the part both shared
 * verbatim before extraction.
 */
export function useAreaSeriesSetup<TDatum extends Datum = Datum>(
  options: AreaSeriesSetupOptions<TDatum>,
): AreaSeriesSetupResult<TDatum> {
  const {
    safeData,
    data,
    areaBy,
    lineDataAccessor,
    colorBy,
    colorScale,
    color,
    stroke,
    strokeWidth,
    opacity,
    effectiveSelectionHook,
    resolvedSelection,
    areaOpacity,
    showLine,
    lineWidth,
    showPoints,
    pointRadius,
    xAccessor,
    yAccessor,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    groupField,
    styleRules,
    ruleContext,
  } = options

  // Normalize flat/grouped and pre-grouped object data through the same pure
  // adapter the server renderer uses.
  const flattenedData = useMemo(() => {
    return prepareAreaSeriesData({ data, safeData, areaBy, lineDataAccessor })
  }, [data, safeData, areaBy, lineDataAccessor])

  // 3 — base line/area style
  const baseLineStyle = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, AreaStyleValue> = {}

      if (colorBy) {
        // Push-mode initial state — `colorBy` set but no scale yet.
        // Return empty so the frame paints from its own palette.
        if (colorScale) {
          const resolvedColor = getColor(d, colorBy, colorScale)
          baseStyle.fill = resolvedColor
          if (showLine) {
            baseStyle.stroke = resolvedColor
            baseStyle.strokeWidth = lineWidth
          } else {
            baseStyle.stroke = "none"
          }
        }
      } else {
        const uniformColor = color || DEFAULT_COLOR
        baseStyle.fill = uniformColor
        if (showLine) {
          baseStyle.stroke = uniformColor
          baseStyle.strokeWidth = lineWidth
        } else {
          baseStyle.stroke = "none"
        }
      }
      baseStyle.fillOpacity = areaOpacity
      // Declarative style rules merge on top of the resolved area fill/stroke.
      if (styleRules && styleRules.length > 0) {
        Object.assign(baseStyle, resolveStyleRules(d, styleRules, ruleContext ? ruleContext(d) : { value: undefined }))
      }
      return baseStyle
    }
  }, [colorBy, colorScale, color, areaOpacity, showLine, lineWidth, styleRules, ruleContext])

  // 4 — primitive overlay + selection wrap
  const baseLineStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(baseLineStyle, { stroke, strokeWidth, opacity }),
    [baseLineStyle, stroke, strokeWidth, opacity],
  )

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyleWithPrimitives, effectiveSelectionHook ?? null, resolvedSelection),
    [baseLineStyleWithPrimitives, effectiveSelectionHook, resolvedSelection],
  )

  // 5 — optional point style
  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = { r: pointRadius, fillOpacity: 1 }
      if (colorBy) {
        if (colorScale) baseStyle.fill = getColor(d.parentLine || d, colorBy, colorScale)
      } else {
        baseStyle.fill = color || DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [showPoints, pointRadius, colorBy, colorScale, color])

  // 6 — default tooltip content
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    ...(groupField ? [{ label: accessorName(groupField), accessor: groupField, role: "group" as const }] : []),
    ...bandTooltipFields(options.band, yFormat),
  ]), [xAccessor, yAccessor, xLabel, yLabel, groupField, xFormat, yFormat, options.band])

  return { flattenedData, lineStyle, pointStyle, defaultTooltipContent }
}

/**
 * useOrdinalPieceStyle — shared piece-style construction for ordinal HOCs.
 *
 * Every ordinal HOC that paints "pieces" (BarChart, StackedBarChart,
 * GroupedBarChart, PieChart, DonutChart, FunnelChart, BoxPlot,
 * ViolinPlot, RidgelinePlot, DotPlot, SwimlaneChart, SwarmPlot…)
 * builds `pieceStyle` through the same three-step recipe:
 *
 *   1. **Base style** — fill via `getColor(d, colorBy, colorScale)`
 *      when `colorBy` is set, else `resolveDefaultFill(color, theme,
 *      colorScheme, ...)`.
 *   2. **User overlay** — merge `frameProps.pieceStyle` on top of
 *      the base. Functions get composed; objects spread.
 *   3. **Primitive props** — apply top-level `stroke` /
 *      `strokeWidth` / `opacity` last so they win over both HOC
 *      defaults and user-supplied frameProps overrides.
 *   4. **Selection wrap** — `wrapStyleWithSelection` dims
 *      non-matching pieces when a selection is active.
 *
 * This hook collapses those four steps into one call. Adopters drop
 * ~25 lines of recipe per HOC.
 */
"use client"
import { useMemo } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor, ChartAccessor } from "./types"
import type { SelectionHookResult } from "./selectionUtils"
import { wrapStyleWithSelection } from "./selectionUtils"
import { mergeShapeStyle } from "./mergeShapeStyle"
import { getColor } from "./colorUtils"
import { resolveDefaultFill } from "./hooks"

export interface OrdinalPieceStyleOptions {
  /** colorBy accessor — string field name or function */
  colorBy?: Accessor<string> | ChartAccessor<Datum, string>
  /** Resolved categorical color scale (typically from useChartSetup). */
  colorScale: ((v: string) => string) | undefined
  /** Top-level uniform `color` prop (BaseChartProps). Applied as a
   *  default-fill primitive when `colorBy` is unset. */
  color?: string
  /** Theme categorical palette (from useThemeCategorical). */
  themeCategorical: string[] | undefined
  /** colorScheme prop — array or string scheme name. */
  colorScheme?: string | string[] | Record<string, string>
  /** Stable category-index map for default-fill cycling. */
  categoryIndexMap: Map<string, number>
  /** User-supplied `frameProps.pieceStyle`. Accepts the looser
   *  Frame-side `Style` type (typed fields like `fill: string`) or a
   *  function returning the same shape; we don't pin a stricter
   *  contract here because every ordinal HOC re-types pieceStyle
   *  via its own props interface. */
  userPieceStyle?:
    | ((d: Datum, category?: string) => Record<string, unknown>)
    | Record<string, unknown>
    | unknown
  /** Top-level primitive props — applied last so they win over HOC base + user overlay. */
  stroke?: string
  strokeWidth?: number
  opacity?: number
  /**
   * Chart-shape defaults applied BEFORE the color resolution and
   * user overlay. Use for properties that are intrinsic to the
   * chart's mark shape (point radius `r`, fillOpacity for swarms /
   * dots, etc.). User-supplied `frameProps.pieceStyle` and top-level
   * primitive props can still override them.
   *
   * Static object form for shape-constant defaults
   * (`{ r: dotRadius, fillOpacity: 0.8 }` — DotPlot). Function form
   * for per-datum derivation (`(d) => ({ r: sizeBy ? getSize(d, ...) :
   * pointRadius })` — SwarmPlot's size-encoded points). The function
   * receives the same `(d, category)` args as user pieceStyle.
   */
  baseStyleExtras?:
    | Record<string, string | number | undefined>
    | ((d: Datum, category?: string) => Record<string, string | number | undefined>)
  /**
   * After the base fill is resolved, also write it to `stroke`.
   * Used by statistical-summary charts (BoxPlot / ViolinPlot /
   * RidgelinePlot / Histogram) where the box outline should match
   * the box fill rather than be a separate stroke. Top-level
   * primitive `stroke` still wins via `mergeShapeStyle` if supplied.
   */
  linkStrokeToFill?: boolean
  /**
   * When `colorBy` is unset, pass the per-piece `category` to
   * `resolveDefaultFill` so each piece cycles through the
   * colorScheme's palette (Pie / Donut / Funnel / radial charts —
   * each slice/wedge wants its own color).
   *
   * When `false` (default), the category arg is omitted and
   * `resolveDefaultFill` returns the first scheme color uniformly
   * (BarChart / StackedBarChart / GroupedBarChart — bars without
   * `colorBy` should be one color, since the user picked
   * `categoryAccessor` but explicitly didn't ask for category-driven
   * coloring). Locked by `bugRepros.test.tsx` BR-2.
   */
  cycleByCategory?: boolean
  /** Selection hook output (typically `setup.effectiveSelectionHook`). */
  effectiveSelectionHook: SelectionHookResult | null | undefined
  /** Resolved selection config (typically `setup.resolvedSelection`). */
  resolvedSelection: import("./types").SelectionConfig | undefined
}

/**
 * Build a memoized `pieceStyle` function that the chart can pass
 * straight to `<StreamOrdinalFrame pieceStyle={…} />`. Composes the
 * standard base-fill / user-overlay / primitive-prop / selection
 * pipeline so each HOC doesn't re-derive it.
 *
 * @example
 * ```tsx
 * const pieceStyle = useOrdinalPieceStyle({
 *   colorBy, colorScale: setup.colorScale,
 *   color, themeCategorical, colorScheme, categoryIndexMap,
 *   userPieceStyle: frameProps?.pieceStyle,
 *   stroke, strokeWidth, opacity,
 *   effectiveSelectionHook: setup.effectiveSelectionHook,
 *   resolvedSelection: setup.resolvedSelection,
 * })
 * ```
 */
export function useOrdinalPieceStyle(
  options: OrdinalPieceStyleOptions,
): (d: Datum, category?: string) => Record<string, string | number | undefined> {
  const {
    colorBy,
    colorScale,
    color,
    themeCategorical,
    colorScheme,
    categoryIndexMap,
    userPieceStyle,
    stroke,
    strokeWidth,
    opacity,
    effectiveSelectionHook,
    resolvedSelection,
    cycleByCategory = false,
    baseStyleExtras,
    linkStrokeToFill = false,
  } = options

  // 1 — base fill from colorBy or theme/scheme fallback. When
  // `colorBy` is set but the resolved `colorScale` is undefined
  // (push-mode initial state — no data yet to derive a categorical
  // domain), return an empty style so the frame falls back to its
  // own palette. PieChart relies on this; other ordinal HOCs hit it
  // identically in push mode.
  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      // Start from chart-shape defaults. Function form runs per
      // datum (SwarmPlot's size-encoded `r`, LikertChart's per-level
      // fill); object form is static (DotPlot's constant radius).
      const extras: Record<string, string | number | undefined> | undefined =
        typeof baseStyleExtras === "function"
          ? baseStyleExtras(d, category)
          : baseStyleExtras
      const baseStyle: Record<string, string | number | undefined> = extras ? { ...extras } : {}
      // When extras already supplied a fill (LikertChart's
      // level-keyed palette, future charts with bespoke color
      // logic), respect it and skip the standard color resolution.
      // Otherwise resolve from colorBy or theme/scheme fallback.
      if (baseStyle.fill === undefined) {
        if (colorBy) {
          if (!colorScale) {
            // Push-mode initial state — return only the extras so the
            // frame can supply its own palette for fill.
            return baseStyle
          }
          baseStyle.fill = getColor(d, colorBy, colorScale)
        } else {
          // Pass `category` only when the chart wants per-category
          // cycling (Pie/Donut/Funnel). Bar-style charts pass
          // `undefined` so all pieces resolve to colorScheme[0].
          baseStyle.fill = resolveDefaultFill(
            color, themeCategorical, colorScheme,
            cycleByCategory ? category : undefined,
            categoryIndexMap,
          )
        }
      }
      // Summary-style charts link the box outline to the fill so
      // stroke and fill come from the same resolved color.
      if (linkStrokeToFill && baseStyle.stroke === undefined && baseStyle.fill !== undefined) {
        baseStyle.stroke = baseStyle.fill
      }
      return baseStyle
    }
  }, [colorBy, colorScale, color, themeCategorical, colorScheme, categoryIndexMap, cycleByCategory, baseStyleExtras, linkStrokeToFill])

  // 2 — overlay user-supplied pieceStyle on top of base. Function form
  // composes (call both, spread); object form spreads directly.
  const mergedPieceStyle = useMemo(() => {
    const baseWithUser = (() => {
      if (!userPieceStyle) return basePieceStyle
      if (typeof userPieceStyle === "function") {
        return (d: Datum, category?: string) => ({
          ...basePieceStyle(d, category),
          ...(userPieceStyle as (d: Datum, category?: string) => Record<string, string | number | undefined>)(d, category) || {},
        })
      }
      // Object form — spread the static overrides per call.
      return (d: Datum, category?: string) => ({
        ...basePieceStyle(d, category),
        ...(userPieceStyle as Record<string, string | number | undefined>),
      })
    })()
    // 3 — primitive props (stroke/strokeWidth/opacity) applied LAST.
    return mergeShapeStyle(baseWithUser, { stroke, strokeWidth, opacity })
  }, [basePieceStyle, userPieceStyle, stroke, strokeWidth, opacity])

  // 4 — selection wrap. When active, dims pieces that don't match the
  // selection predicate. No-op when no selection is set.
  return useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, effectiveSelectionHook ?? null, resolvedSelection),
    [mergedPieceStyle, effectiveSelectionHook, resolvedSelection],
  )
}

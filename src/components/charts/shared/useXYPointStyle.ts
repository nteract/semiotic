/**
 * useXYPointStyle — shared point-style construction for XY HOCs.
 *
 * Scatterplot, BubbleChart, QuadrantChart, and ConnectedScatterplot
 * all build their `pointStyle` through the same three-step recipe:
 *
 *   1. **Base style** — fill via `getColor(d, colorBy, colorScale)`
 *      when `colorBy` is set, else `color || DEFAULT_COLOR`. Plus
 *      `r` (fixed `pointRadius` or `sizeBy`-derived) and
 *      `fillOpacity`. Charts can supply additional shape-constant
 *      defaults via `baseStyleExtras` (BubbleChart's default stroke,
 *      ConnectedScatterplot's viridis fill + white stroke, etc.).
 *   2. **Primitive overlay** — `mergeShapeStyle` applies top-level
 *      `stroke` / `strokeWidth` / `opacity` last so they win over
 *      both the HOC base and any per-datum color resolution.
 *   3. **Selection wrap** — `wrapStyleWithSelection` dims
 *      non-matching points when a selection is active.
 *
 * This hook collapses those three steps into one call. Adopters
 * drop ~20 lines of recipe per HOC and keep the design symmetric
 * with `useOrdinalPieceStyle` (its ordinal counterpart) so cognitive
 * load stays low when working across families.
 */
"use client"
import { useMemo } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor, ChartAccessor } from "./types"
import type { SelectionHookResult } from "./selectionUtils"
import { wrapStyleWithSelection } from "./selectionUtils"
import { mergeShapeStyle } from "./mergeShapeStyle"
import { getColor } from "./colorUtils"
import { DEFAULT_COLOR } from "./hooks"

export interface XYPointStyleOptions {
  /** colorBy accessor — string field name or function. */
  colorBy?: Accessor<string> | ChartAccessor<Datum, string>
  /** Resolved categorical color scale (typically from useChartSetup). */
  colorScale: ((v: string) => string) | undefined
  /** Top-level uniform `color` prop. Used as the fallback fill when
   *  `colorBy` is unset. */
  color?: string
  /**
   * Fixed point radius. When `radiusFn` is supplied, that wins
   * (per-datum sizing for BubbleChart / Scatterplot's `sizeBy`).
   * @default 5
   */
  pointRadius?: number
  /** Per-datum radius resolver (e.g. wraps `getSize(d, sizeBy, …)`).
   *  Ignored when undefined; HOCs with no `sizeBy` should pass it
   *  unset and rely on `pointRadius`. */
  radiusFn?: (d: Datum) => number
  /** Default fillOpacity. Charts override this through their own
   *  prop name (`pointOpacity`, `bubbleOpacity`). @default 1 */
  fillOpacity?: number
  /**
   * Fallback fill resolver invoked when `colorBy` is unset. Used by
   * QuadrantChart to pick a color from the quadrant the point lands
   * in. When omitted, fallback is `color || DEFAULT_COLOR` (the
   * standard Scatterplot/BubbleChart behavior).
   */
  fallbackFill?: (d: Datum) => string
  /**
   * Static or per-datum extra style applied BEFORE color resolution
   * and primitive overlay. Use for shape-constant defaults
   * (BubbleChart's `{ stroke: bubbleStrokeColor, strokeWidth: 1 }`).
   * If extras supply a `fill`, the standard color resolution is
   * skipped — same bypass as `useOrdinalPieceStyle`. Lets
   * ConnectedScatterplot drop in its viridis-by-order fill.
   */
  baseStyleExtras?:
    | Record<string, string | number | undefined>
    | ((d: Datum) => Record<string, string | number | undefined>)
  /** Top-level primitive props — applied last via `mergeShapeStyle`. */
  stroke?: string
  strokeWidth?: number
  opacity?: number
  /** Selection hook output (typically `setup.effectiveSelectionHook`). */
  effectiveSelectionHook: SelectionHookResult | null | undefined
  /** Resolved selection config (typically `setup.resolvedSelection`). */
  resolvedSelection: import("./types").SelectionConfig | undefined
  /**
   * For ConnectedScatterplot-style charts whose color depends on the
   * point's position in an ordered sequence, the resolver may need
   * the point's parent line. Defaults to identity (`d => d`).
   * Same hook BarChart's `parentLine` cascade uses.
   */
  colorDatumAccessor?: (d: Datum) => Datum
}

/**
 * Build a memoized `pointStyle` function for an XY HOC.
 *
 * @example
 * ```tsx
 * // Scatterplot — sizeBy-driven radius, standard color fallback
 * const pointStyle = useXYPointStyle({
 *   colorBy, colorScale: setup.colorScale,
 *   color, pointRadius, fillOpacity: pointOpacity,
 *   radiusFn: sizeBy ? (d) => getSize(d, sizeBy, sizeRange, sizeDomain) : undefined,
 *   stroke, strokeWidth, opacity,
 *   effectiveSelectionHook: setup.effectiveSelectionHook,
 *   resolvedSelection: setup.resolvedSelection,
 * })
 * ```
 *
 * @example
 * ```tsx
 * // QuadrantChart — bespoke fallback fill from quadrant lookup
 * const pointStyle = useXYPointStyle({
 *   colorBy, colorScale: setup.colorScale, color,
 *   pointRadius, fillOpacity: pointOpacity,
 *   radiusFn: sizeBy ? (d) => getSize(d, sizeBy, sizeRange, sizeDomain) : undefined,
 *   fallbackFill: (d) => quadrantColor(d, getXValue, getYValue, xCenter, yCenter, quadrants),
 *   stroke, strokeWidth, opacity,
 *   effectiveSelectionHook: setup.effectiveSelectionHook,
 *   resolvedSelection: setup.resolvedSelection,
 * })
 * ```
 */
export function useXYPointStyle(
  options: XYPointStyleOptions,
): (d: Datum) => Record<string, string | number | undefined> {
  const {
    colorBy,
    colorScale,
    color,
    pointRadius = 5,
    radiusFn,
    fillOpacity = 1,
    fallbackFill,
    baseStyleExtras,
    stroke,
    strokeWidth,
    opacity,
    effectiveSelectionHook,
    resolvedSelection,
    colorDatumAccessor,
  } = options

  // 1 — base style (extras → fill resolution → r + fillOpacity)
  const basePointStyle = useMemo(() => {
    return (d: Datum) => {
      const extras = typeof baseStyleExtras === "function"
        ? baseStyleExtras(d)
        : baseStyleExtras
      const baseStyle: Record<string, string | number | undefined> = extras ? { ...extras } : {}

      // Default fillOpacity unless extras already set it.
      if (baseStyle.fillOpacity === undefined) baseStyle.fillOpacity = fillOpacity

      // Color resolution — skip if extras supplied a fill (lets
      // ConnectedScatterplot's viridis-by-order palette through).
      if (baseStyle.fill === undefined) {
        if (colorBy) {
          if (colorScale) {
            const datum = colorDatumAccessor ? colorDatumAccessor(d) : d
            baseStyle.fill = getColor(datum, colorBy, colorScale)
          }
          // else: leave unset — the frame paints from its own palette
          // (push-mode initial state).
        } else if (fallbackFill) {
          baseStyle.fill = fallbackFill(d)
        } else {
          baseStyle.fill = color || DEFAULT_COLOR
        }
      }

      // Radius — radiusFn wins over fixed pointRadius.
      if (baseStyle.r === undefined) {
        baseStyle.r = radiusFn ? radiusFn(d) : pointRadius
      }
      return baseStyle
    }
  }, [colorBy, colorScale, color, pointRadius, radiusFn, fillOpacity, fallbackFill, baseStyleExtras, colorDatumAccessor])

  // 2 — primitive overlay
  const baseWithPrimitives = useMemo(
    () => mergeShapeStyle(basePointStyle, { stroke, strokeWidth, opacity }),
    [basePointStyle, stroke, strokeWidth, opacity],
  )

  // 3 — selection wrap
  return useMemo(
    () => wrapStyleWithSelection(baseWithPrimitives, effectiveSelectionHook ?? null, resolvedSelection),
    [baseWithPrimitives, effectiveSelectionHook, resolvedSelection],
  )
}

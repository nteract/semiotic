/**
 * useXYLineStyle — shared line-style construction for XY HOCs.
 *
 * LineChart, MultiAxisLineChart, and MinimapChart (both the main
 * line and the overview line) all build their `lineStyle` through
 * the same five-step recipe:
 *
 *   1. **Base style** — `{ strokeWidth: lineWidth }`.
 *   2. **Color resolution** — `getColor(d, colorBy, colorScale)` when
 *      `colorBy` is set, else `color || DEFAULT_COLOR`. The caller
 *      can also supply `resolveStroke(d, group)` to override the
 *      whole resolution (MultiAxisLineChart's per-series colorMap).
 *   3. **Optional fill** — when `fillArea` is `true`, every series
 *      fills; when it's a `string[]`, only series whose `group`
 *      argument matches fill. The fill mirrors the stroke and uses
 *      `areaOpacity` as `fillOpacity`.
 *   4. **Primitive overlay** — `mergeShapeStyle` applies top-level
 *      `stroke` / `strokeWidth` / `opacity` last so they win over
 *      both the HOC base and any per-datum color resolution.
 *   5. **Selection wrap** — `wrapStyleWithSelection` dims non-matching
 *      lines when a selection is active.
 *
 * Forecast/anomaly **segment-aware** wrapping in LineChart is a
 * separate post-pass that wraps the function `useXYLineStyle`
 * returns — it stays HOC-side because the lazy-load + state-management
 * + cancellation logic has no symmetric counterpart in the other two
 * line HOCs and would only be invariant on one consumer.
 *
 * Adopters drop ~25 lines of recipe per HOC and keep the design
 * symmetric with `useXYPointStyle` so cognitive load stays low when
 * working across the XY family.
 */
"use client"
import { useMemo } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor, ChartAccessor } from "./types"
import type { SelectionHookResult, SelectionStyleConfig } from "./selectionUtils"
import { wrapStyleWithSelection } from "./selectionUtils"
import { mergeShapeStyle } from "./mergeShapeStyle"
import { buildXYLineBaseStyle } from "./xyLineStyle"
import type { XYLineBaseStyleOptions } from "./xyLineStyle"
import type { StyleRule, StyleRuleContext } from "./styleRules"

export interface XYLineStyleOptions extends XYLineBaseStyleOptions {
  /**
   * Base stroke width. The top-level `strokeWidth` override below
   * wins via `mergeShapeStyle` when both are supplied.
   * @default 2
   */
  lineWidth?: number

  // ── Color resolution ───────────────────────────────────────────────
  // Two paths, mutually exclusive in practice:
  //   - Pass `colorBy` + `colorScale` (+ optional `color` fallback) for
  //     the standard LineChart / MinimapChart case.
  //   - Pass `resolveStroke(d, group)` to override the whole step for
  //     MultiAxisLineChart-style per-series colorMap lookups.

  /** Color accessor (string field name or function). */
  colorBy?: Accessor<string> | ChartAccessor<Datum, string>
  /** Resolved categorical color scale (typically from useChartSetup). */
  colorScale?: ((v: string) => string)
  /** Static color used as the fallback stroke when `colorBy` is unset. */
  color?: string
  /** Custom stroke resolver. Wins over `colorBy`/`colorScale`/`color`.
   *  Receives the datum and the optional `group` key the frame
   *  passes through `resolveLineStyle`. */
  resolveStroke?: (d: Datum, group?: string) => string

  // ── Fill ──────────────────────────────────────────────────────────
  /** When `true`, every line fills. When a `string[]`, only series
   *  whose `group` key appears in the array fill. When omitted/false,
   *  no fill is set on the style. */
  fillArea?: boolean | string[]
  /** Fill opacity used when `fillArea` triggers a fill. @default 0.3 */
  areaOpacity?: number

  // ── Primitive overlay ─────────────────────────────────────────────
  stroke?: string
  strokeWidth?: number
  opacity?: number

  // ── Selection wrap ────────────────────────────────────────────────
  /** Selection hook result from `useChartSelection`/`useChartSetup`.
   *  Pass `null`/`undefined` to skip dimming entirely (MinimapChart's
   *  overview line and main line both skip selection wrapping). */
  effectiveSelectionHook?: SelectionHookResult | null
  /** Resolved selection style config (matched/unmatched style overrides). */
  resolvedSelection?: SelectionStyleConfig

  // ── Style rules ───────────────────────────────────────────────────
  /**
   * Declarative style rules, merged on top of the resolved base stroke/fill
   * (last-applicable rule wins). NOTE: line styles resolve per-SERIES against
   * a representative sample datum (the series' first point), so a rule's
   * `ctx.x`/`ctx.y` reflect that sample point, not every vertex.
   */
  styleRules?: ReadonlyArray<StyleRule>
  /** Build the `StyleRuleContext` for a series' sample datum + group key. */
  ruleContext?: (d: Datum, group?: string) => StyleRuleContext
}

/**
 * Returns a memoized `lineStyle` callback that the XY frame's
 * `resolveLineStyle` invokes with `(datum, group?)`.
 *
 * @example
 * ```tsx
 * // LineChart's recipe collapses to a single hook call:
 * const lineStyle = useXYLineStyle({
 *   lineWidth, colorBy, colorScale, color, fillArea, areaOpacity,
 *   stroke, strokeWidth, opacity,
 *   effectiveSelectionHook, resolvedSelection,
 * })
 * ```
 *
 * @example
 * ```tsx
 * // MultiAxisLineChart hands in a series-aware resolver:
 * const lineStyle = useXYLineStyle({
 *   lineWidth,
 *   resolveStroke: (d) => seriesColorMap.get(d[SERIES_FIELD]) || seriesColors[0],
 *   stroke, strokeWidth, opacity,
 *   effectiveSelectionHook: setup.effectiveSelectionHook,
 *   resolvedSelection: setup.resolvedSelection,
 * })
 * ```
 *
 * @example
 * ```tsx
 * // MinimapChart's overview line: thin stroke, no selection, no primitives.
 * const overviewLineStyle = useXYLineStyle({ lineWidth: 1, colorBy, colorScale })
 * ```
 */
export function useXYLineStyle(
  options: XYLineStyleOptions,
): (d: Datum, group?: string) => Datum {
  const {
    lineWidth = 2,
    colorBy,
    colorScale,
    color,
    resolveStroke,
    fillArea,
    areaOpacity = 0.3,
    stroke,
    strokeWidth,
    opacity,
    effectiveSelectionHook,
    resolvedSelection,
    styleRules,
    ruleContext,
  } = options

  // Step 1+2+3 — base style with resolved stroke (and optional fill).
  //
  // Push-mode contract: when `colorBy` is set but `colorScale` is
  // undefined (e.g. `useColorScale` returning undefined for empty
  // initial data), leave `stroke` unset so
  // `PipelineStore.resolveLineStyle` can inject per-group palette
  // colors as series arrive. Setting `stroke` here would back-fill
  // a single fallback color and lock every push-mode series into
  // it — the original LineChart code had this branch intentionally
  // bare for that reason.
  const baseLineStyle = useMemo(
    () => buildXYLineBaseStyle({
      lineWidth,
      colorBy,
      colorScale,
      color,
      resolveStroke,
      fillArea,
      areaOpacity,
      styleRules,
      ruleContext,
    }),
    [lineWidth, colorBy, colorScale, color, resolveStroke, fillArea, areaOpacity, styleRules, ruleContext],
  )

  // Step 4 — top-level primitive overlay. `mergeShapeStyle` no-ops
  // when no overrides are set, so HOCs that don't pass these (e.g.
  // MinimapChart's overview line) get the base function back
  // referentially unchanged.
  const lineStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(baseLineStyle, { stroke, strokeWidth, opacity }),
    [baseLineStyle, stroke, strokeWidth, opacity],
  )

  // Step 5 — selection wrap. `wrapStyleWithSelection` no-ops when the
  // hook is null, so passing nothing leaves the function unchanged.
  const lineStyle = useMemo(
    () => wrapStyleWithSelection(
      lineStyleWithPrimitives,
      effectiveSelectionHook ?? null,
      resolvedSelection,
    ),
    [lineStyleWithPrimitives, effectiveSelectionHook, resolvedSelection],
  )

  return lineStyle
}

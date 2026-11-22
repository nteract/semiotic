"use client"
import { useMemo } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor, ChartAccessor } from "./types"
import type { SelectionHookResult } from "./selectionUtils"
import { wrapStyleWithSelection } from "./selectionUtils"
import { mergeShapeStyle } from "./mergeShapeStyle"
import { getColor } from "./colorUtils"
import { resolveDefaultFill } from "./hooks"
import { resolveStyleRules, type StyleRule } from "./styleRules"
import type { HatchFill } from "./hatchFill"
import type { Style } from "../../stream/types"

type PieceStyleValue = string | number | HatchFill | CanvasPattern | undefined
type PieceStyleObject = Record<string, PieceStyleValue>

/** The chart already applied pieceStyle through its selection and color layers. */
export function withoutOrdinalPieceStyle(frameProps: Datum) {
  return Object.fromEntries(Object.entries(frameProps).filter(([key]) => key !== "pieceStyle"))
}

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
  /** User-supplied `frameProps.pieceStyle`, using the frame's known style shape. */
  userPieceStyle?: Style | ((d: Datum, category?: string) => Style)
  /** Top-level primitive props — applied last so they win over HOC base + user overlay. */
  stroke?: string
  strokeWidth?: number
  opacity?: number
  /** Static or per-datum defaults applied before color, caller styles, and primitive props. */
  baseStyleExtras?:
    | Record<string, string | number | undefined>
    | ((d: Datum, category?: string) => Record<string, string | number | undefined>)
  /** Use the resolved fill for missing summary strokes. */
  linkStrokeToFill?: boolean
  /** Cycle the default palette by category when colorBy is absent. */
  cycleByCategory?: boolean
  /** Selection hook output (typically `setup.effectiveSelectionHook`). */
  effectiveSelectionHook: SelectionHookResult | null | undefined
  /** Resolved selection config (typically `setup.resolvedSelection`). */
  resolvedSelection: import("./types").SelectionConfig | undefined
  /**
   * Declarative, threshold-aware style rules. Evaluated per piece and merged
   * on top of the resolved base fill (last-applicable rule wins per property).
   * The user's `frameProps.pieceStyle` still overrides these, and top-level
   * primitive props (`stroke`/`strokeWidth`/`opacity`) override everything.
   */
  styleRules?: ReadonlyArray<StyleRule>
  /**
   * Resolve the numeric value a threshold rule compares against for a datum
   * (typically the chart's `valueAccessor` output). Lets `{ when: { gt: 10 } }`
   * work with no `field` on the threshold.
   */
  resolveRuleValue?: (d: Datum, category?: string) => number | undefined
}

/** Apply chart defaults, style rules, caller styles, primitive props, then selection. */
export function useOrdinalPieceStyle(
  options: OrdinalPieceStyleOptions,
): (d: Datum, category?: string) => PieceStyleObject {
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
    styleRules,
    resolveRuleValue,
  } = options

  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      const extras: Record<string, string | number | undefined> | undefined =
        typeof baseStyleExtras === "function"
          ? baseStyleExtras(d, category)
          : baseStyleExtras
      const baseStyle: PieceStyleObject = extras ? { ...extras } : {}
      if (baseStyle.fill === undefined) {
        if (colorBy) {
          if (!colorScale) {
            return baseStyle
          }
          baseStyle.fill = getColor(d, colorBy, colorScale)
        } else {
          baseStyle.fill = resolveDefaultFill(
            color, themeCategorical, colorScheme,
            cycleByCategory ? category : undefined,
            categoryIndexMap,
          )
        }
      }
      if (styleRules && styleRules.length > 0) {
        const ruled = resolveStyleRules(d, styleRules, {
          value: resolveRuleValue ? resolveRuleValue(d, category) : undefined,
          category,
        })
        Object.assign(baseStyle, ruled)
      }
      if (linkStrokeToFill && baseStyle.stroke === undefined && baseStyle.fill !== undefined) {
        baseStyle.stroke = baseStyle.fill
      }
      return baseStyle
    }
  }, [colorBy, colorScale, color, themeCategorical, colorScheme, categoryIndexMap, cycleByCategory, baseStyleExtras, linkStrokeToFill, styleRules, resolveRuleValue])

  const mergedPieceStyle = useMemo(() => {
    const baseWithUser = (() => {
      if (!userPieceStyle) return basePieceStyle
      if (typeof userPieceStyle === "function") {
        return (d: Datum, category?: string) => ({
          ...basePieceStyle(d, category),
          ...userPieceStyle(d, category),
        })
      }
      return (d: Datum, category?: string) => ({
        ...basePieceStyle(d, category),
        ...userPieceStyle,
      })
    })()
    return mergeShapeStyle(baseWithUser, { stroke, strokeWidth, opacity })
  }, [basePieceStyle, userPieceStyle, stroke, strokeWidth, opacity])

  return useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, effectiveSelectionHook ?? null, resolvedSelection),
    [mergedPieceStyle, effectiveSelectionHook, resolvedSelection],
  )
}

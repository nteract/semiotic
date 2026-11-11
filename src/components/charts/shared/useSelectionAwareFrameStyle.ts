/**
 * useSelectionAwareFrameStyle — memoized `selectionAwareFrameStyle` for chart
 * components. See `frameStyleProps.ts` for the contract.
 *
 * @example
 * ```tsx
 * const framePointStyle = useSelectionAwareFrameStyle(
 *   frameProps.pointStyle,
 *   setup.effectiveSelectionHook,
 *   setup.resolvedSelection,
 * )
 * const streamProps = {
 *   pointStyle,
 *   ...frameProps,
 *   ...(framePointStyle && { pointStyle: framePointStyle }),
 * }
 * ```
 */
"use client"
import { useMemo } from "react"
import {
  selectionAwareFrameStyle,
  type FrameStyleSelectionOptions,
} from "./frameStyleProps"
import type { SelectionHookResult, SelectionStyleConfig } from "./selectionUtils"

/** One `frameProps` style made selection-aware, with a stable identity between unchanged renders. */
export function useSelectionAwareFrameStyle<TStyle>(
  frameStyle: TStyle,
  selectionHook: SelectionHookResult | null | undefined,
  config?: SelectionStyleConfig,
  options: FrameStyleSelectionOptions = {},
): TStyle {
  const { wrap, selectionDatum } = options
  return useMemo(
    () => selectionAwareFrameStyle(frameStyle, selectionHook, config, { wrap, selectionDatum }),
    [frameStyle, selectionHook, config, wrap, selectionDatum],
  )
}

type XYFrameStyles = { lineStyle?: unknown; areaStyle?: unknown; pointStyle?: unknown }

/**
 * The line, area, and point styles of an XY chart in one call, for charts
 * that own all three. Returns only the keys the caller passed, ready to
 * spread after `frameProps`. `pointSelectionDatum` adapts point datums when
 * the chart's own point style uses an adapter.
 */
export function useSelectionAwareXYFrameStyles<T extends XYFrameStyles>(
  frameProps: T,
  selectionHook: SelectionHookResult | null | undefined,
  config?: SelectionStyleConfig,
  pointSelectionDatum?: FrameStyleSelectionOptions["selectionDatum"],
): Partial<Pick<T, "lineStyle" | "areaStyle" | "pointStyle">> {
  const lineStyle = useSelectionAwareFrameStyle(frameProps.lineStyle, selectionHook, config)
  const areaStyle = useSelectionAwareFrameStyle(frameProps.areaStyle, selectionHook, config)
  const pointStyle = useSelectionAwareFrameStyle(frameProps.pointStyle, selectionHook, config, {
    selectionDatum: pointSelectionDatum,
  })
  return useMemo(
    () => ({
      ...(lineStyle !== undefined && { lineStyle }),
      ...(areaStyle !== undefined && { areaStyle }),
      ...(pointStyle !== undefined && { pointStyle }),
    }),
    [lineStyle, areaStyle, pointStyle],
  )
}

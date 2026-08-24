import * as React from "react"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { StreamXYFrameHandle } from "../../stream/types"
import type { Datum } from "../shared/datumTypes"
import type { ChartModeInput, ChartModeResult } from "../shared/chartMode"
import { useChartMode } from "../shared/hooks"
import type {
  LegendInteractionMode,
  LegendInteractionState
} from "../shared/hooks"
import {
  wrapStyleWithSelection,
  type SelectionHookResult
} from "../shared/selectionUtils"
import type { ChartAccessor, ChartMode, SelectionConfig } from "../shared/types"

/** Read a numeric time/value off a datum via accessor, with a field fallback. */
export function readRealtimeNumber<TDatum extends Datum>(
  datum: Datum,
  accessor: ChartAccessor<TDatum, number> | undefined,
  fallback: string
): number | null {
  const raw: unknown =
    typeof accessor === "function"
      ? accessor(datum)
      : datum[String(accessor ?? fallback)]
  if (raw == null) return null
  if (raw instanceof Date) return raw.getTime()
  const number = Number(raw)
  return Number.isFinite(number) ? number : null
}

interface RealtimeModeProps extends Omit<ChartModeInput, "enableHover"> {
  mode?: ChartMode
  size?: [number, number]
  enableHover?: unknown
}

export function useRealtimeChartMode(
  props: RealtimeModeProps
): ChartModeResult {
  return useChartMode(props.mode, {
    width: props.size?.[0] ?? props.width,
    height: props.size?.[1] ?? props.height,
    showAxes: props.showAxes,
    showLegend: props.showLegend,
    enableHover: props.enableHover == null ? undefined : !!props.enableHover,
    linkedHover: props.linkedHover,
    title: props.title,
    description: props.description,
    summary: props.summary,
    accessibleTable: props.accessibleTable,
    mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules
  })
}

export function useRealtimeFrameHandle<TDatum extends Datum = Datum>(
  ref: React.Ref<RealtimeFrameHandle<TDatum>>,
  frameRef: React.RefObject<StreamXYFrameHandle | null>
): void {
  React.useImperativeHandle(
    ref,
    () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      remove: (id) => (frameRef.current?.remove(id) ?? []) as TDatum[],
      update: (id, updater) =>
        (frameRef.current?.update(id, (datum) => updater(datum as TDatum)) ??
          []) as TDatum[],
      clear: () => frameRef.current?.clear(),
      getData: () => (frameRef.current?.getData() ?? []) as TDatum[],
      getScales: () => frameRef.current?.getScales() ?? null
    }),
    [frameRef]
  )
}

const EMPTY_STYLE = () => ({})

export function useRealtimeSelectionStyle<TStyle extends Datum>(
  baseStyle: ((datum: Datum) => TStyle) | undefined,
  hooks: readonly (SelectionHookResult | null)[],
  selection: SelectionConfig | undefined
): ((datum: Datum) => TStyle) | undefined {
  const activeHook = hooks.find(Boolean) ?? null
  return React.useMemo<((datum: Datum) => TStyle) | undefined>(
    () =>
      activeHook
        ? (wrapStyleWithSelection(
            (baseStyle ?? EMPTY_STYLE) as (datum: Datum) => TStyle,
            activeHook,
            selection
          ) as (datum: Datum) => TStyle)
        : baseStyle,
    [activeHook, baseStyle, selection]
  )
}

export function buildRealtimeFrameChromeProps(
  resolved: ChartModeResult,
  legend: LegendInteractionState,
  mode: LegendInteractionMode | undefined
) {
  return {
    title: resolved.title,
    description: resolved.description,
    summary: resolved.summary,
    accessibleTable: resolved.accessibleTable,
    legendHoverBehavior: legend.onLegendHover,
    legendClickBehavior: legend.onLegendClick,
    legendHighlightedCategory: legend.highlightedCategory,
    legendIsolatedCategories:
      mode === "isolate" ? legend.isolatedCategories : undefined
  }
}

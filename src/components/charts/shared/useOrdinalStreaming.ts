"use client"

import type { Ref, RefObject } from "react"
import { useCallback, useImperativeHandle, useMemo } from "react"
import { useStreamingLegend } from "./useStreamingLegend"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Accessor } from "./types"
import type { LegendPosition } from "./hooks"

interface UseOrdinalStreamingConfig {
  /** External ref for push API */
  ref: Ref<RealtimeFrameHandle>
  /** Internal frame ref */
  frameRef: RefObject<StreamOrdinalFrameHandle | null>
  /** True when data prop is undefined (push API mode) */
  isPushMode: boolean
  /** Color-by accessor (may be derived from stackBy/groupBy/etc.) */
  colorBy: Accessor<string> | undefined
  /** Color scheme name or array — undefined lets useColorScale consult the theme */
  colorScheme: string | string[] | undefined
  /** Whether legend is requested */
  showLegend: boolean | undefined
  /** Legend position */
  legendPosition?: LegendPosition
  /** Results from useChartSetup — needed for legend/margin merge */
  setup: {
    legendBehaviorProps: Record<string, any>
    legendPosition: LegendPosition
    margin: { top: number; right: number; bottom: number; left: number }
  }
}

interface UseOrdinalStreamingResult {
  /** Legend props merged with streaming legend (spread into streamProps) */
  effectiveLegendProps: Record<string, any>
  /** Margin merged with streaming legend margin adjustments */
  effectiveMargin: { top: number; right: number; bottom: number; left: number }
}

/**
 * Shared hook for ordinal charts that support push API + streaming legend.
 *
 * Consolidates: useStreamingLegend, wrappedPush/pushMany,
 * useImperativeHandle, effectiveLegendProps, effectiveMargin.
 *
 * Used by: StackedBarChart, GroupedBarChart, PieChart, DonutChart, SwimlaneChart.
 * NOT used by LikertChart (custom accumulator + deterministic legend).
 */
export function useOrdinalStreaming({
  ref,
  frameRef,
  isPushMode,
  colorBy,
  colorScheme,
  showLegend,
  legendPosition,
  setup,
}: UseOrdinalStreamingConfig): UseOrdinalStreamingResult {
  const streaming = useStreamingLegend({
    isPushMode,
    colorBy,
    colorScheme,
    showLegend,
    legendPosition,
  })

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => frameRef.current?.push(d)),
    [streaming.wrapPush]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => frameRef.current?.pushMany(d)),
    [streaming.wrapPushMany]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    clear: () => {
      streaming.resetCategories()
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories])

  const effectiveLegendProps = useMemo(() => {
    if (streaming.streamingLegend) {
      return {
        ...setup.legendBehaviorProps,
        legend: streaming.streamingLegend,
        legendPosition: legendPosition || setup.legendPosition,
      }
    }
    return setup.legendBehaviorProps
  }, [setup.legendBehaviorProps, setup.legendPosition, streaming.streamingLegend, legendPosition])

  const effectiveMargin = useMemo(() => {
    if (streaming.streamingMarginAdjust) {
      const m = { ...setup.margin }
      for (const [key, val] of Object.entries(streaming.streamingMarginAdjust)) {
        const k = key as keyof typeof m
        if (m[k] < val) m[k] = val
      }
      return m
    }
    return setup.margin
  }, [setup.margin, streaming.streamingMarginAdjust])

  return { effectiveLegendProps, effectiveMargin }
}

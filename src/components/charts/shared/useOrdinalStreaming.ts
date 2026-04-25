"use client"
import type { Datum } from "./datumTypes"

import type { Ref, RefObject } from "react"
import { useImperativeHandle } from "react"
import type { StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

interface UseOrdinalStreamingConfig {
  /** External ref for push API */
  ref: Ref<RealtimeFrameHandle>
  /** Internal frame ref */
  frameRef: RefObject<StreamOrdinalFrameHandle | null>
  /** Results from useChartSetup that should be forwarded to the stream frame */
  setup: {
    legendBehaviorProps: Datum
    margin: { top: number; right: number; bottom: number; left: number }
  }
}

interface UseOrdinalStreamingResult {
  /** Legend/category-domain props from useChartSetup (spread into streamProps) */
  effectiveLegendProps: Datum
  /** Margin from useChartSetup, including frame-domain legend expansion */
  effectiveMargin: { top: number; right: number; bottom: number; left: number }
}

/**
 * Shared hook for ordinal charts that support push API + streaming legend.
 *
 * Consolidates imperative handle forwarding and returns the legend/margin
 * props that useChartSetup derives from static data or frame-reported domains.
 *
 * Used by: StackedBarChart, GroupedBarChart, PieChart, DonutChart, SwimlaneChart.
 * NOT used by LikertChart (custom accumulator + deterministic legend).
 */
export function useOrdinalStreaming({
  ref,
  frameRef,
  setup,
}: UseOrdinalStreamingConfig): UseOrdinalStreamingResult {
  useImperativeHandle(ref, () => ({
    push: (d: Datum) => frameRef.current?.push(d),
    pushMany: (d: Datum[]) => frameRef.current?.pushMany(d),
    remove: (id: string | string[]) => frameRef.current?.remove(id) ?? [],
    update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? [],
    getScales: () => frameRef.current?.getScales() ?? null
  }), [frameRef])

  const effectiveLegendProps = setup.legendBehaviorProps
  const effectiveMargin = setup.margin

  return { effectiveLegendProps, effectiveMargin }
}

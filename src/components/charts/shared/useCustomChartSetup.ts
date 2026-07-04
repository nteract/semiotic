/**
 * useCustomChartScaffold / useCustomChartSetup — shared scaffolding for
 * the four custom-layout HOCs.
 *
 * `XYCustomChart`, `OrdinalCustomChart`, `NetworkCustomChart`, and `GeoCustomChart` all
 * repeat the same orchestration pipeline: bind the imperative ref, run
 * `useChartMode`, normalize the user margin shorthand, filter the
 * sparse data array, and (for the data-shaped HOCs) call
 * `useChartSetup` for selection / legend / loading / empty plumbing.
 *
 * The split:
 *   - `useCustomChartScaffold`  — chart-mode + margin + imperative
 *      handle. Used by all four HOCs (network and geo call this directly).
 *   - `useCustomChartSetup`     — the scaffold *plus* `useChartSetup`
 *      wiring for the data-shaped HOCs (XYCustomChart, OrdinalCustomChart).
 *
 * Two separate hooks rather than one conditional hook so React's
 * rules-of-hooks aren't on the line — each call site pins exactly one
 * shape.
 */
"use client"
import { useMemo, useRef } from "react"
import type { Ref, RefObject, ReactElement, ReactNode } from "react"
import { useChartMode } from "./hooks"
import { useChartSetup, type ChartSetupResult } from "./useChartSetup"
import type { Accessor, ChartMode, SelectionConfig, LinkedHoverProp } from "./types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { normalizePartialMargin, type PartialMargin, type MarginType } from "../../types/marginType"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"

/**
 * Margin shorthand → sided form. The Stream*Frame margin props only
 * accept the sided object form, so HOCs that expose the user-friendly
 * number shorthand have to expand it themselves. Centralized here so
 * every custom-layout HOC normalizes consistently.
 */
export function normalizeUserMargin(m: PartialMargin | undefined): Partial<MarginType> | undefined {
  return normalizePartialMargin(m)
}

interface ScaffoldOptions {
  /** Ref forwarded by the HOC. The hook binds the imperative handle internally. */
  imperativeRef: Ref<RealtimeFrameHandle> | undefined
  /** Which `useFrameImperativeHandle` variant to bind. XY/ordinal frames share "xy". */
  imperativeVariant: "xy" | "network" | "geo-points"
  /** Margin shorthand or sided form from the HOC's `margin` prop. */
  margin: PartialMargin | undefined
  // Common chart-mode inputs
  width?: number
  height?: number
  showGrid?: boolean
  enableHover?: boolean
  showLegend?: boolean
  title?: string
  mode?: ChartMode
  xLabel?: string
  yLabel?: string
}

interface ScaffoldResult<TFrameHandle> {
  /** Ref to attach to the inner Stream*Frame component. */
  frameRef: RefObject<TFrameHandle | null>
  /** Result of `useChartMode` — width/height/showGrid/etc. with mode defaults applied. */
  resolved: ReturnType<typeof useChartMode>
  /** User margin normalized to the sided form, or undefined if not supplied. */
  normalizedMargin: Partial<MarginType> | undefined
}

/**
 * Scaffold shared by all four custom-layout HOCs: imperative-handle
 * binding, chart-mode resolution, margin normalization. Network HOCs
 * stop here; data-shaped HOCs layer `useChartSetup` on top via
 * `useCustomChartSetup`.
 */
export function useCustomChartScaffold<TFrameHandle>(
  options: ScaffoldOptions
): ScaffoldResult<TFrameHandle> {
  const frameRef = useRef<TFrameHandle | null>(null)
  useFrameImperativeHandle(options.imperativeRef, {
    variant: options.imperativeVariant,
    frameRef: frameRef as RefObject<unknown>,
  })

  const resolved = useChartMode(options.mode, {
    width: options.width,
    height: options.height,
    showGrid: options.showGrid,
    enableHover: options.enableHover,
    showLegend: options.showLegend,
    title: options.title,
    xLabel: options.xLabel,
    yLabel: options.yLabel,
  })

  const normalizedMargin = useMemo(
    () => normalizeUserMargin(options.margin),
    [options.margin],
  )

  return { frameRef, resolved, normalizedMargin }
}

interface DataSetupOptions extends ScaffoldOptions {
  /** Raw `data` prop from the HOC (may be undefined in push mode). */
  data: Datum[] | undefined
  /** Label used by useChartSetup for observation events ("XYCustomChart", "OrdinalCustomChart"). */
  chartTypeLabel: string
  /** Whether the hover callback should unwrap the datum (ordinal/network = true, XY = false). */
  unwrapData: boolean
  /** Color scheme threaded into useChartSetup's color resolution. */
  colorScheme?: string | string[] | Record<string, string>
  /** Semantic color accessor for legend, linked-hover series mode, and frame color config. */
  colorBy?: Accessor<string>
  /** Pass-through chart-setup inputs. */
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  onObservation?: OnObservationCallback
  onClick?: (datum: Datum, ev: { x: number; y: number }) => void
  chartId?: string
  loading?: boolean
  loadingContent?: ReactNode | false
  emptyContent?: ReactNode | false
}

interface DataSetupResult<TFrameHandle> extends ScaffoldResult<TFrameHandle> {
  /** Sparse-filtered copy of the input data array. */
  safeData: Datum[]
  /** Full `useChartSetup` result — selection/legend/behavior wiring for the streamProps. */
  setup: ChartSetupResult
  /** If non-null, the HOC should render this immediately (loading skeleton or empty state). */
  earlyReturn: ReactElement | null
}

/**
 * Scaffold + `useChartSetup` wiring for the data-shaped custom-layout
 * HOCs (`XYCustomChart`, `OrdinalCustomChart`). Each HOC stays in charge
 * of its own frame-specific streamProps; the hook only owns the
 * orchestration that is genuinely identical.
 */
export function useCustomChartSetup<TFrameHandle>(
  options: DataSetupOptions
): DataSetupResult<TFrameHandle> {
  const scaffold = useCustomChartScaffold<TFrameHandle>(options)
  const { resolved, normalizedMargin } = scaffold

  // `useChartSetup` filters sparse data internally and returns the
  // result as `setup.data`. Forward the raw prop in and reuse that
  // sparse-filtered output below — one pass per data change instead of
  // two. `filterSparseArray` preserves identity when nothing's dropped,
  // so memo cache hits in the (overwhelmingly common) clean-input case
  // are unchanged.
  const setup = useChartSetup({
    data: options.data ?? [],
    rawData: options.data,
    colorBy: options.colorBy,
    colorScheme: options.colorScheme,
    legendInteraction: undefined,
    selection: options.selection,
    linkedHover: options.linkedHover,
    fallbackFields: typeof options.colorBy === "string" ? [options.colorBy] : [],
    unwrapData: options.unwrapData,
    onObservation: options.onObservation,
    onClick: options.onClick,
    chartType: options.chartTypeLabel,
    chartId: options.chartId,
    showLegend: resolved.showLegend,
    userMargin: normalizedMargin,
    marginDefaults: resolved.marginDefaults,
    loading: options.loading,
    loadingContent: options.loadingContent,
    emptyContent: options.emptyContent,
    width: resolved.width,
    height: resolved.height,
  })

  return {
    ...scaffold,
    safeData: setup.data,
    setup,
    earlyReturn: setup.earlyReturn,
  }
}

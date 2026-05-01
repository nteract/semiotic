/**
 * useCustomChartScaffold / useCustomChartSetup — shared scaffolding for
 * the three custom-layout HOCs.
 *
 * `XYCustomChart`, `OrdinalCustomChart`, and `NetworkCustomChart` all
 * repeat the same orchestration pipeline: bind the imperative ref, run
 * `useChartMode`, normalize the user margin shorthand, filter the
 * sparse data array, and (for the data-shaped HOCs) call
 * `useChartSetup` for selection / legend / loading / empty plumbing.
 *
 * The split:
 *   - `useCustomChartScaffold`  — chart-mode + margin + imperative
 *      handle. Used by all three HOCs (network calls this directly).
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
import type { ChartMode, SelectionConfig, LinkedHoverProp } from "./types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { PartialMargin, MarginType } from "../../types/marginType"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"
import { filterSparseArray } from "./sparseArray"

/**
 * Margin shorthand → sided form. The Stream*Frame margin props only
 * accept the sided object form, so HOCs that expose the user-friendly
 * number shorthand have to expand it themselves. Centralized here so
 * every custom-layout HOC normalizes consistently.
 */
export function normalizeUserMargin(m: PartialMargin | undefined): Partial<MarginType> | undefined {
  if (m == null) return undefined
  if (typeof m === "number") return { top: m, right: m, bottom: m, left: m }
  return m
}

interface ScaffoldOptions<TFrameHandle> {
  /** Ref forwarded by the HOC. The hook binds the imperative handle internally. */
  imperativeRef: Ref<RealtimeFrameHandle> | undefined
  /** Which `useFrameImperativeHandle` variant to bind. XY/ordinal frames share "xy". */
  imperativeVariant: "xy" | "network"
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
 * Scaffold shared by all three custom-layout HOCs: imperative-handle
 * binding, chart-mode resolution, margin normalization. Network HOCs
 * stop here; data-shaped HOCs layer `useChartSetup` on top via
 * `useCustomChartSetup`.
 */
export function useCustomChartScaffold<TFrameHandle>(
  options: ScaffoldOptions<TFrameHandle>
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

interface DataSetupOptions<TFrameHandle> extends ScaffoldOptions<TFrameHandle> {
  /** Raw `data` prop from the HOC (may be undefined in push mode). */
  data: Datum[] | undefined
  /** Label used by useChartSetup for observation events ("XYCustomChart", "OrdinalCustomChart"). */
  chartTypeLabel: string
  /** Whether the hover callback should unwrap the datum (ordinal/network = true, XY = false). */
  unwrapData: boolean
  /** Color scheme threaded into useChartSetup's color resolution. */
  colorScheme?: string | string[]
  /** Pass-through chart-setup inputs. */
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  onObservation?: OnObservationCallback
  onClick?: (datum: any, ev: { x: number; y: number }) => void
  chartId?: string
  loading?: boolean
  emptyContent?: ReactNode
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
  options: DataSetupOptions<TFrameHandle>
): DataSetupResult<TFrameHandle> {
  const scaffold = useCustomChartScaffold<TFrameHandle>(options)
  const { resolved, normalizedMargin } = scaffold

  // `useChartSetup` filters sparse data internally, but HOCs that want
  // to forward `safeData` directly into their frame's `data` prop need
  // a parallel reference here. `filterSparseArray` returns the original
  // reference when nothing was dropped so memo identity is preserved.
  const safeData = useMemo(() => filterSparseArray(options.data ?? []), [options.data])

  const setup = useChartSetup({
    data: safeData,
    rawData: options.data,
    colorBy: undefined,
    colorScheme: options.colorScheme,
    legendInteraction: undefined,
    selection: options.selection,
    linkedHover: options.linkedHover,
    fallbackFields: [],
    unwrapData: options.unwrapData,
    onObservation: options.onObservation,
    onClick: options.onClick,
    chartType: options.chartTypeLabel,
    chartId: options.chartId,
    showLegend: resolved.showLegend,
    userMargin: normalizedMargin,
    marginDefaults: resolved.marginDefaults,
    loading: options.loading,
    emptyContent: options.emptyContent,
    width: resolved.width,
    height: resolved.height,
  })

  return {
    ...scaffold,
    safeData,
    setup,
    earlyReturn: setup.earlyReturn,
  }
}

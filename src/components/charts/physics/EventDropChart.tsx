"use client"
import { EVENT_DROP_CHART_SIZE } from "../shared/chartSizeDefaultsPhysics"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import { useStableShallow } from "../../stream/useStableShallow"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildEventDropPhysics,
  composePhysicsBodyStyle,
  projectionRowsToSemanticItems,
  type EventDropProjectionMetadata,
  type EventDropWindowOptions
} from "./physicsChartUtils"
import type { StyleRule } from "../shared/styleRules"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import { usePhysicsChartData } from "./usePhysicsChartData"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  usePhysicsRerun,
  usePhysicsSelection,
  type PhysicsHocFrameProps,
  type PhysicsRerunMS,
  type PhysicsSharedChartProps,
  type TooltipProp
} from "./physicsHocUtils"
import {
  useEventDropHandle,
  type EventDropChartHandle,
  type EventDropReadoutProps
} from "./useEventDropHandle"
import {
  eventDropSourceRail,
  type EventDropSource,
  type EventDropSourceRail
} from "./eventDropSources"
import { eventDropBodyStyle, type EventDropColorBy } from "./eventDropStyle"
import type { EventDropWatermark } from "./eventDropLedger"
import type { EventDropArrival } from "./eventDropArrival"
import { eventDropWindowBackground } from "./eventDropWindowBackground"
import { physicsCanvasThemeCSSValue } from "../../stream/physics/PhysicsCanvasTheme"
import type {
  EventDropLiveOptions,
  EventDropLiveConfig
} from "./EventDropLiveRuntime"
import type { PhysicsEmitterOptions } from "../../stream/physics/PhysicsEmitterSchedule"
import { buildLiveEventDropLayout, useEventDropLive } from "./useEventDropLive"
import {
  eventDropOverlay,
  type EventDropWindowChrome
} from "./physicsProjectionOverlays"

type ProjectionRow = {
  label: string
  secondary?: number
  value: number
}

export interface EventDropChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "selection">,
    PhysicsSharedChartProps {
  onLedgerChange?: EventDropReadoutProps["onLedgerChange"]
  onWatermarkChange?: EventDropReadoutProps["onWatermarkChange"]
  onClockTick?: EventDropReadoutProps["onClockTick"]
  clockTickMs?: EventDropReadoutProps["clockTickMs"]
  data?: TDatum[]
  /** Follow the simulation indefinitely while retiring old bodies and retaining counts. */
  live?: boolean | EventDropLiveOptions
  /** Built-in fixed-step sources, shared by sync and worker execution. Requires live. */
  emitters?: Omit<
    PhysicsEmitterOptions,
    "templates" | "timeUnit" | "originTime"
  >
  size?: [number, number]
  timeAccessor?: ChartAccessor<TDatum, number>
  arrivalAccessor?: ChartAccessor<TDatum, number>
  /** Source-to-board choreography; requires a visible source rail. */
  arrival?: EventDropArrival
  windows?: EventDropWindowOptions
  watermark?: EventDropWatermark
  /** Explicit time units avoid magnitude-based inference (above 1e5 uses ms). */
  timeUnit?: "ms" | "s"
  sources?: EventDropSource[]
  sourceAccessor?: ChartAccessor<TDatum, string>
  sourceRail?: EventDropSourceRail
  onSourceClick?: (source: EventDropSource) => void
  /** Recorded watermark for each arrival; later closure changes preserve this decision. */
  watermarkAtArrivalAccessor?: ChartAccessor<TDatum, number>
  ballRadius?: number
  colorBy?: EventDropColorBy<TDatum>
  windowChrome?: EventDropWindowChrome
  /**
   * Declarative, threshold-aware drop styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. `ctx` = `{ value, category }` (value =
   * the event time). A rule `fill` may be a color or a HatchFill.
   */
  styleRules?: StyleRule[]
  seed?: number
  timeExtent?: [number, number]
  timeScale?: number
  showProjection?: boolean
  tooltip?: TooltipProp
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  paused?: boolean
  frameProps?: PhysicsHocFrameProps
}

function eventDropSemanticItems(
  rows: ProjectionRow[],
  metadata: EventDropProjectionMetadata | undefined,
  chartSize: [number, number],
  sources: readonly EventDropSource[] = []
) {
  if (!metadata) return projectionRowsToSemanticItems(rows, chartSize, "window")
  const laneWidth =
    metadata.windowPlot.width / Math.max(1, metadata.windowCount)
  const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 1)
  const maxHeight = metadata.windowPlot.height * 0.62
  const yBottom = metadata.windowPlot.y + metadata.windowPlot.height

  const ledgerById = new Map(metadata.ledger?.map((row) => [row.windowId, row]))
  const items = rows.map((row, index) => {
    const barHeight = Math.max(8, (row.value / maxValue) * maxHeight)
    const ledger = ledgerById.get(row.label)
    const position = ledger
      ? (ledger.start - metadata.windowStart) / metadata.windowSize
      : index
    const x = metadata.windowPlot.x + (position + 0.5) * laneWidth
    const y = yBottom - barHeight / 2
    const late = row.secondary
      ? `, ${row.secondary} late sent to the far-left bin`
      : ""
    const label = `window ${row.label}: ${row.value} on time${late}, ${ledger ? (ledger.open ? "open" : "closed") : index < metadata.closedWindowCount ? "closed" : "open"}`
    return {
      id: `window-${row.label}`,
      label,
      description: label,
      datum: row,
      x,
      y,
      shape: "rect" as const,
      width: Math.max(12, laneWidth * 0.58),
      height: barHeight,
      group: "window",
      tableFields: Object.fromEntries(
        sources
          .filter((source) => source.visible !== false)
          .map((source) => [
            source.label,
            `${ledger?.bySource[source.id]?.accepted ?? 0} accepted, ${ledger?.bySource[source.id]?.late ?? 0} late`
          ])
      )
    }
  })
  return [
    ...items,
    {
      id: "eventdrop-late-bin",
      label: `far-left bin: ${metadata.lateCount} late events`,
      description:
        "Late events are collected here, outside their original event-time windows.",
      datum: { label: "Late", value: metadata.lateCount },
      x: metadata.gutter.x + metadata.gutter.width / 2,
      y: yBottom - maxHeight / 2,
      shape: "rect" as const,
      width: metadata.gutter.width,
      height: maxHeight,
      group: "late-bin"
    }
  ]
}

/**
 * Physics-backed event drop chart for replaying arrivals against event-time windows and watermarks.
 *
 * @example
 * ```tsx
 * <EventDropChart
 *   data={[{ id: "a", time: 4, arrivalTime: 8 }, { id: "b", time: 18, arrivalTime: 12 }]}
 *   timeAccessor="time"
 *   arrivalAccessor="arrivalTime"
 *   windows={{ size: 10 }}
 *   watermark={{ delay: 5 }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <EventDropChart
 *   data={events}
 *   windows={{ size: 60_000 }}
 *   watermark={{ value: Date.now() - 120_000 }}
 *   timeScale={4}
 *   timeExtent={[start, end]}
 * />
 * ```
 */
export const EventDropChart = /* @__PURE__ */ forwardRef(
  function EventDropChart<TDatum extends Datum = Datum>(
    props: EventDropChartProps<TDatum>,
    ref: React.Ref<EventDropChartHandle>
  ) {
    const {
      arrivalAccessor = "arrivalTime" as ChartAccessor<TDatum, number>,
      ballRadius = 7,
      colorBy,
      styleRules,
      sources,
      sourceAccessor,
      sourceRail: sourceRailProp,
      timeUnit,
      data,
      emptyContent,
      frameProps,
      loading,
      loadingContent,
      paused,
      rerunMS,
      seed = 1,
      timeAccessor = "time" as ChartAccessor<TDatum, number>,
      timeExtent: timeExtentProp,
      timeScale = 1,
      watermark: watermarkProp,
      watermarkAtArrivalAccessor,
      windows: windowsProp
    } = props
    // Inline option objects are ordinary JSX. Preserve the compiler identity
    // across observer-driven rerenders when their values have not changed.
    const windows = useStableShallow(windowsProp ?? { size: 10 })
    const sourceRail = useStableShallow(sourceRailProp)
    const arrival = useStableShallow(props.arrival)
    const watermark = useStableShallow(watermarkProp)
    const timeExtent = useStableShallow(timeExtentProp)
    const layoutMode = usePhysicsChartMode(props, EVENT_DROP_CHART_SIZE)
    const {
      chartSize,
      showProjection,
      className: modeClassName,
      title: modeTitle,
      chartMode,
      margin: modeMargin,
      enableHover: modeEnableHover,
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable
    } = layoutMode
    const frameRef = useRef<StreamPhysicsFrameHandle>(null)
    const dataRef = useRef<PhysicsFrameHandle>(null)
    const live = useStableShallow(
      props.live === true
        ? {
            follow: "watermark" as const,
            horizon: windows.size,
            retain: windows.size * 8
          }
        : props.live || undefined
    )
    const liveConfig = useMemo<EventDropLiveConfig | undefined>(
      () =>
        live
          ? {
              live,
              windowSize: windows.size,
              size: chartSize,
              ballRadius,
              seed,
              sources,
              sourceRail,
              watermark,
              arrival,
              timeUnit: timeUnit ?? "s",
              originTime: timeExtent?.[0] ?? 0
            }
          : undefined,
      [
        live,
        windows.size,
        chartSize,
        ballRadius,
        seed,
        sources,
        sourceRail,
        watermark,
        arrival,
        timeUnit,
        timeExtent
      ]
    )
    const liveInputs = useRef(props)
    liveInputs.current = props
    const liveReadout = useEventDropLive(
      dataRef,
      frameRef,
      props as EventDropChartProps
    )
    const buildLayout = useCallback(
      (rows: TDatum[]) =>
        liveConfig
          ? buildLiveEventDropLayout(liveConfig, {
              ...liveInputs.current,
              data: liveInputs.current.data === undefined ? undefined : rows,
              emitters: props.emitters,
              frameProps: { config: frameProps?.config },
              timeScale
            })
          : buildEventDropPhysics({
              data: rows,
              timeAccessor,
              arrivalAccessor,
              arrival,
              sources,
              sourceAccessor,
              sourceRail,
              timeUnit,
              windows,
              watermark,
              watermarkAtArrivalAccessor,
              ballRadius,
              seed,
              size: chartSize,
              timeExtent,
              timeScale
            }),
      [
        liveConfig,
        props.emitters,
        frameProps?.config,
        arrivalAccessor,
        arrival,
        sources,
        sourceAccessor,
        sourceRail,
        timeUnit,
        ballRadius,
        chartSize,
        seed,
        timeAccessor,
        timeExtent,
        timeScale,
        watermark,
        watermarkAtArrivalAccessor,
        windows
      ]
    )
    const { layout, resetSeed } = usePhysicsChartData({
      ref: live ? undefined : dataRef,
      frameRef,
      data,
      idPrefix: "event",
      buildLayout
    })
    const rerun = usePhysicsRerun(
      layout.config,
      rerunMS,
      paused,
      resetSeed,
      props.onSimulationStateChange
    )

    const metadata =
      (live ? liveReadout.metadata : undefined) ??
      (layout.metadata as EventDropProjectionMetadata | undefined)
    const readouts = useEventDropHandle(ref, dataRef, frameRef, metadata, props)
    const generatedBodyStyle = useMemo(
      () =>
        eventDropBodyStyle(sources, colorBy as EventDropColorBy | undefined, {
          styleRules,
          valueAccessor: timeAccessor as string | ((d: Datum) => unknown)
        }),
      [sources, colorBy, styleRules, timeAccessor]
    )
    const bodyStyle = useMemo(
      () => composePhysicsBodyStyle(generatedBodyStyle, frameProps?.bodyStyle),
      [generatedBodyStyle, frameProps?.bodyStyle]
    )
    const semanticItems = useMemo(
      () =>
        eventDropSemanticItems(
          live
            ? (metadata?.ledger ?? []).map((row) => ({
                label: row.windowId,
                value: row.accepted,
                secondary: row.late
              }))
            : layout.projectionRows,
          metadata,
          chartSize,
          sources
        ),
      [chartSize, layout.projectionRows, metadata, sources, live]
    )

    const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
      selection: props.selection,
      linkedHover: props.linkedHover,
      colorBy: typeof colorBy === "object" ? undefined : colorBy,
      chartType: "EventDropChart",
      chartId: props.chartId,
      onObservation: props.onObservation,
      onClick: props.onClick,
      onBodyHover: frameProps?.onBodyHover,
      fallbackFields:
        typeof timeAccessor === "string" ? [timeAccessor] : undefined
    })

    const stateEl = renderPhysicsChartState({
      responsive: props,
      data,
      emptyContent,
      loading,
      loadingContent,
      size: chartSize
    })
    if (props.emitters && !live)
      throw new Error("EventDrop emitters require live mode")
    if (stateEl) return stateEl
    const windowBackground = eventDropWindowBackground(
      metadata,
      showProjection,
      props.windowChrome
    )
    const projectionOverlay = eventDropOverlay(
      live && metadata
        ? Array.from({ length: metadata.windowCount }, (_, i) => {
            const start = metadata.windowStart + i * metadata.windowSize
            const row = metadata.ledger?.find((entry) => entry.start === start)
            return {
              label: `${start}-${start + metadata.windowSize}`,
              value: row?.accepted ?? 0,
              secondary: row?.late ?? 0
            }
          })
        : layout.projectionRows,
      metadata,
      showProjection,
      props.windowChrome
    )
    const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
    const sharedFrameProps = resolvePhysicsFrameSharedProps(
      props,
      frameProps,
      semanticItems,
      {
        selection: bodySelection,
        chartMode,
        className: modeClassName,
        title: modeTitle,
        description: modeDescription,
        summary: modeSummary,
        accessibleTable: modeAccessibleTable,
        enableHover: modeEnableHover,
        margin: modeMargin
      }
    )

    return renderPhysicsFrame(
      "EventDropChart",
      chartSize,
      <StreamPhysicsFrame
        {...frameProps}
        {...tooltipProps}
        {...sharedFrameProps}
        ref={frameRef}
        onBodyHover={onBodyHover}
        onTick={readouts.onTick}
        onFrame={(store) => {
          liveReadout.onFrame(store)
          readouts.onFrame?.(store)
        }}
        key={`${rerun.rerunKey}:${live ? "live" : "replay"}`}
        config={rerun.config}
        backgroundGraphics={composePhysicsFrameGraphics(
          frameProps?.backgroundGraphics,
          windowBackground
        )}
        backgroundGraphicsBackdrop={
          frameProps?.backgroundGraphicsBackdrop ??
          (windowBackground && !frameProps?.backgroundGraphics
            ? (sharedFrameProps.background ??
              physicsCanvasThemeCSSValue("background"))
            : undefined)
        }
        foregroundGraphics={composePhysicsFrameGraphics(
          composePhysicsFrameGraphics(
            projectionOverlay,
            eventDropSourceRail(
              sources,
              sourceRail,
              chartSize,
              props.onSourceClick
            )
          ),
          frameProps?.foregroundGraphics
        )}
        initialSpawns={layout.initialSpawns}
        initialSpawnPacing={layout.initialSpawnPacing}
        paused={paused}
        responsiveHeight={false}
        responsiveWidth={false}
        size={chartSize}
        bodyStyle={bodyStyle}
      />,
      layoutMode
    )
  }
) as {
  // Existing object refs can keep the common physics handle type. Callback
  // refs and ComponentRef infer the complete EventDrop handle below.
  (
    props: EventDropChartProps & {
      ref?:
        | React.RefObject<PhysicsFrameHandle | null>
        | React.Ref<EventDropChartHandle>
    }
  ): React.ReactNode
} & React.ForwardRefExoticComponent<
  EventDropChartProps & React.RefAttributes<EventDropChartHandle>
>

export default EventDropChart

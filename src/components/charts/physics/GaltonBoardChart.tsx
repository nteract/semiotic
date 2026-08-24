"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildGaltonBoardPhysics,
  composePhysicsBodyStyle,
  generateGaltonMechanicalSamples,
  type GaltonBoardProjectionMetadata,
  physicsChartArea,
  projectionRowsToSemanticItems,
  styleFromColorAccessor
} from "./physicsChartUtils"
import type { StyleRule } from "../shared/styleRules"
import {
  usePhysicsHocHandle,
  type PhysicsFrameHandle
} from "./physicsHocHandle"
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
  type PhysicsSimulationMode,
  type TooltipProp
} from "./physicsHocUtils"
import type { ChartMode } from "../shared/types"
import {
  galtonBoardOverlay,
  type GaltonBoardReferenceLine
} from "./physicsProjectionOverlays"

export type { GaltonBoardReferenceLine } from "./physicsProjectionOverlays"

export interface GaltonBoardChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "mode" | "selection">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  valueAccessor?: ChartAccessor<TDatum, number>
  valueExtent?: [number, number]
  bins?: number
  /**
   * Chart display mode (`primary`/`context`/`sparkline`/`mobile`) **or**
   * legacy simulation mode (`sample`/`mechanical`). Prefer `simulationMode`
   * for sample vs mechanical; use `mode` for ChartContainer / ChartMode.
   */
  mode?: ChartMode | PhysicsSimulationMode
  /** Sample data rows vs seeded mechanical demo (no data required). */
  simulationMode?: PhysicsSimulationMode
  pegRows?: number
  mechanicalCount?: number
  branchProbability?: number
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware ball styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. Rules resolve against each ball's datum;
   * `ctx` = `{ value, category }` (category = the colorBy group). A rule `fill`
   * may be a color or a HatchFill. Layers over the colorBy-derived fill.
   */
  styleRules?: StyleRule[]
  referenceLines?: GaltonBoardReferenceLine | GaltonBoardReferenceLine[]
  seed?: number
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  showProjection?: boolean
  tooltip?: TooltipProp
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

function normalizeValueExtent(
  extent: GaltonBoardChartProps["valueExtent"]
): [number, number] | undefined {
  if (!extent) return undefined
  const a = Number(extent[0])
  const b = Number(extent[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined
  return a <= b ? [a, b] : [b, a]
}

/**
 * Physics-backed Galton board chart that drops values through seeded pegs into a settled distribution.
 *
 * @example
 * ```tsx
 * <GaltonBoardChart
 *   data={[{ id: "a", value: 2 }, { id: "b", value: 7 }]}
 *   valueAccessor="value"
 *   bins={12}
 *   size={[520, 320]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <GaltonBoardChart
 *   mode="mechanical"
 *   mechanicalCount={80}
 *   branchProbability={0.62}
 *   seed={11}
 * />
 * ```
 */
export const GaltonBoardChart = forwardRef(function GaltonBoardChart<
  TDatum extends Datum = Datum
>(props: GaltonBoardChartProps<TDatum>, ref: React.Ref<PhysicsFrameHandle>) {
  const {
    data,
    valueAccessor = "value" as ChartAccessor<TDatum, number>,
    styleRules,
    bins = 21,
    ballRadius,
    colorBy,
    branchProbability = 0.5,
    emptyContent,
    frameProps,
    loading,
    loadingContent,
    mechanicalCount,
    paused,
    pegRows,
    referenceLines,
    rerunMS,
    seed = 1,
    valueExtent
  } = props
  const layoutMode = usePhysicsChartMode(props, [700, 420], {
    hasSimulationMode: true
  })
  const {
    chartSize,
    simulationMode,
    showProjection,
    className,
    title: modeTitle,
    chartMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const resolvedBallRadius =
    ballRadius ??
    (chartMode === "sparkline" ? 1.5 : chartMode === "context" ? 4 : 6)
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const resolvedPegRows = Math.max(1, Math.round(pegRows ?? bins - 1))
  const resolvedValueExtent = useMemo(
    () =>
      simulationMode === "mechanical"
        ? ([0, resolvedPegRows] as [number, number])
        : normalizeValueExtent(valueExtent),
    [resolvedPegRows, simulationMode, valueExtent]
  )
  const chartData = useMemo(
    () =>
      simulationMode === "mechanical"
        ? (generateGaltonMechanicalSamples({
            bins,
            branchProbability,
            count: mechanicalCount,
            pegRows: resolvedPegRows,
            seed
          }) as TDatum[])
        : (data ?? []),
    [
      bins,
      branchProbability,
      data,
      mechanicalCount,
      resolvedPegRows,
      seed,
      simulationMode
    ]
  )
  const layout = useMemo(
    () =>
      buildGaltonBoardPhysics({
        data: chartData,
        valueAccessor,
        bins,
        ballRadius: resolvedBallRadius,
        seed,
        size: chartSize,
        valueExtent: resolvedValueExtent
      }),
    [
      bins,
      chartData,
      chartSize,
      resolvedBallRadius,
      resolvedValueExtent,
      seed,
      valueAccessor
    ]
  )
  const rerun = usePhysicsRerun(
    layout.config,
    rerunMS,
    paused,
    undefined,
    props.onSimulationStateChange
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const single = buildGaltonBoardPhysics({
        data: [datum],
        valueAccessor: valueAccessor as ChartAccessor<Datum, number>,
        bins,
        ballRadius: resolvedBallRadius,
        seed: seed + index + 1,
        size: chartSize,
        valueExtent: resolvedValueExtent
      })
      const spawn = single.initialSpawns[0] ?? {
        id: String(datum.id ?? `galton-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: resolvedBallRadius },
        datum
      }
      return {
        datumId: String(datum.id ?? spawn.id),
        spawns: [spawn as PhysicsQueuedSpawn]
      }
    },
    [
      bins,
      chartSize,
      resolvedBallRadius,
      resolvedValueExtent,
      seed,
      valueAccessor
    ]
  )
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: chartData as Datum[],
    seedSpawns: layout.initialSpawns
  })
  const resolvedColorBy =
    simulationMode === "mechanical" && colorBy == null
      ? ("side" as ChartAccessor<Datum, string>)
      : (colorBy as ChartAccessor<Datum, string> | undefined)
  const generatedBodyStyle = useMemo(
    () =>
      styleFromColorAccessor(resolvedColorBy, "#4e79a7", {
        styleRules,
        valueAccessor: valueAccessor as string | ((d: Datum) => unknown)
      }),
    [resolvedColorBy, styleRules, valueAccessor]
  )
  const bodyStyle = useMemo(
    () => composePhysicsBodyStyle(generatedBodyStyle, frameProps?.bodyStyle),
    [generatedBodyStyle, frameProps?.bodyStyle]
  )
  const semanticItems = useMemo(
    () =>
      projectionRowsToSemanticItems(layout.projectionRows, chartSize, "bin"),
    [chartSize, layout.projectionRows]
  )

  const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    colorBy,
    chartType: "GaltonBoardChart",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick,
    onBodyHover: frameProps?.onBodyHover,
    fallbackFields:
      typeof valueAccessor === "string" ? [valueAccessor] : undefined
  })

  const stateEl = renderPhysicsChartState({
    data: simulationMode === "mechanical" ? chartData : data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl
  const structureOverlay = galtonBoardOverlay(
    layout.projectionRows,
    bins,
    showProjection,
    layout.metadata as GaltonBoardProjectionMetadata | undefined,
    referenceLines
  )
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    semanticItems,
    {
      selection: bodySelection,
      chartMode,
      className,
      title: modeTitle,
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
  )
  return renderPhysicsFrame(
    "GaltonBoardChart",
    chartSize,
    <StreamPhysicsFrame
      key={`${chartSize[0]}x${chartSize[1]}:${rerun.rerunKey}`}
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      onBodyHover={onBodyHover}
      config={rerun.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        structureOverlay,
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
})

export default GaltonBoardChart

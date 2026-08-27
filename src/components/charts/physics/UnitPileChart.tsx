"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor, ChartMode } from "../shared/types"
import {
  buildPhysicsPile,
  composePhysicsBodyStyle,
  generatePhysicsPileMechanicalSamples,
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
import { pileProjectionOverlay } from "./physicsProjectionOverlays"

export interface UnitPileChartProps<TDatum extends Datum = Datum>
  extends
    Omit<BaseChartProps, "margin" | "mode" | "selection">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  size?: [number, number]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Chart display mode **or** legacy simulation mode (`sample`/`mechanical`).
   * Prefer `simulationMode` for mechanical demos; use `mode` for ChartMode.
   */
  mode?: ChartMode | PhysicsSimulationMode
  simulationMode?: PhysicsSimulationMode
  mechanicalCount?: number
  mechanicalCategories?: readonly string[]
  unitValue?: number
  ballRadius?: number
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware body styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. `ctx` = `{ value, category }`. A rule
   * `fill` may be a color or a HatchFill. Layers over the colorBy-derived fill.
   */
  styleRules?: StyleRule[]
  seed?: number
  showProjection?: boolean
  sediment?: boolean
  tooltip?: TooltipProp
  /**
   * Replay the seeded simulation this many milliseconds after it settles.
   * Omit or pass `null` for a single run; `0` replays on the next timer turn.
   */
  rerunMS?: PhysicsRerunMS
  paused?: boolean
  frameProps?: PhysicsHocFrameProps<"config">
}

/** @deprecated Renamed to {@link UnitPileChartProps} in 3.9.0. */
export type PhysicsPileChartProps<TDatum extends Datum = Datum> =
  UnitPileChartProps<TDatum>

/**
 * Physics-backed unit pile chart that converts category values into repeated bodies and a readable settled projection.
 *
 * @example
 * ```tsx
 * <UnitPileChart
 *   data={[{ category: "A", value: 12 }, { category: "B", value: 8 }]}
 *   categoryAccessor="category"
 *   valueAccessor="value"
 *   unitValue={1}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <UnitPileChart
 *   mode="mechanical"
 *   mechanicalCategories={["North", "South", "West"]}
 *   mechanicalCount={90}
 *   seed={5}
 * />
 * ```
 */
export const UnitPileChart = forwardRef(function UnitPileChart<
  TDatum extends Datum = Datum
>(props: UnitPileChartProps<TDatum>, ref: React.Ref<PhysicsFrameHandle>) {
  const {
    ballRadius = 8,
    categoryAccessor = "category" as ChartAccessor<TDatum, string>,
    colorBy,
    data,
    emptyContent,
    frameProps,
    loading,
    loadingContent,
    mechanicalCategories,
    mechanicalCount,
    paused,
    rerunMS,
    seed = 1,
    unitValue = 1,
    valueAccessor,
    styleRules
  } = props
  const layoutMode = usePhysicsChartMode(props, [700, 380], {
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
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const resolvedValueAccessor =
    simulationMode === "mechanical" && valueAccessor == null
      ? ("value" as ChartAccessor<TDatum, number>)
      : valueAccessor
  const chartData = useMemo(
    () =>
      simulationMode === "mechanical"
        ? (generatePhysicsPileMechanicalSamples({
            categories: mechanicalCategories,
            count: mechanicalCount,
            seed,
            unitValue
          }) as TDatum[])
        : (data ?? []),
    [
      data,
      mechanicalCategories,
      mechanicalCount,
      seed,
      simulationMode,
      unitValue
    ]
  )
  const layout = useMemo(
    () =>
      buildPhysicsPile({
        data: chartData,
        categoryAccessor,
        valueAccessor: resolvedValueAccessor,
        unitValue,
        ballRadius,
        seed,
        size: chartSize
      }),
    [
      ballRadius,
      categoryAccessor,
      chartSize,
      chartData,
      resolvedValueAccessor,
      seed,
      unitValue
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
      const single = buildPhysicsPile({
        data: [datum],
        categoryAccessor: categoryAccessor as ChartAccessor<Datum, string>,
        valueAccessor: resolvedValueAccessor as
          ChartAccessor<Datum, number> | undefined,
        unitValue,
        ballRadius,
        seed: seed + index + 1,
        size: chartSize
      })
      const fallback = {
        id: String(datum.id ?? `pile-push-${index}`),
        x: physicsChartArea(chartSize).plot.x,
        y: physicsChartArea(chartSize).plot.y,
        mass: 1,
        shape: { type: "circle" as const, radius: ballRadius },
        datum
      }
      const spawns = single.initialSpawns.length
        ? single.initialSpawns
        : [fallback]
      return {
        datumId: String(datum.id ?? spawns[0].id),
        spawns: spawns as PhysicsQueuedSpawn[]
      }
    },
    [
      ballRadius,
      categoryAccessor,
      chartSize,
      resolvedValueAccessor,
      seed,
      unitValue
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
      ? ("category" as ChartAccessor<Datum, string>)
      : (colorBy as ChartAccessor<Datum, string> | undefined)
  const generatedBodyStyle = useMemo(
    () =>
      styleFromColorAccessor(resolvedColorBy, "#4e79a7", {
        styleRules,
        valueAccessor: valueAccessor as
          string | ((d: Datum) => unknown) | undefined
      }),
    [resolvedColorBy, styleRules, valueAccessor]
  )
  const bodyStyle = useMemo(
    () => composePhysicsBodyStyle(generatedBodyStyle, frameProps?.bodyStyle),
    [generatedBodyStyle, frameProps?.bodyStyle]
  )
  const semanticItems = useMemo(
    () =>
      projectionRowsToSemanticItems(
        layout.projectionRows,
        chartSize,
        "category"
      ),
    [chartSize, layout.projectionRows]
  )

  const { selection: bodySelection, onBodyHover } = usePhysicsSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    colorBy,
    chartType: "UnitPileChart",
    chartId: props.chartId,
    onObservation: props.onObservation,
    onClick: props.onClick,
    onBodyHover: frameProps?.onBodyHover,
    fallbackFields:
      typeof categoryAccessor === "string" ? [categoryAccessor] : undefined
  })

  const stateEl = renderPhysicsChartState({
    data: simulationMode === "mechanical" ? chartData : data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  if (stateEl) return stateEl
  const projectionOverlay = pileProjectionOverlay(
    layout.projectionRows,
    ballRadius,
    showProjection
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
    "UnitPileChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      onBodyHover={onBodyHover}
      key={`${chartSize[0]}x${chartSize[1]}:${rerun.rerunKey}`}
      config={rerun.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        projectionOverlay,
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

/**
 * @deprecated Renamed to {@link UnitPileChart} in 3.9.0. Unitizes category values into countable bodies; the substrate is an implementation detail, not the reading.
 * The alias stays exported indefinitely for existing imports; new code and
 * every registry (schema, capabilities, MCP, server configs) use `UnitPileChart`.
 */
export const PhysicsPileChart = UnitPileChart

export default UnitPileChart

"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  buildGaltonBoardPhysics,
  generateGaltonMechanicalSamples,
  type GaltonBoardProjectionMetadata,
  physicsChartArea,
  projectionRowsToSemanticItems,
  styleFromColorAccessor
} from "./physicsChartUtils"
import type { StyleRule } from "../shared/styleRules"
import { usePhysicsHocHandle, type PhysicsFrameHandle } from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  usePhysicsChartMode,
  usePhysicsRerun,
  type PhysicsHocFrameProps,
  type PhysicsRerunMS,
  type PhysicsSharedChartProps,
  type PhysicsSimulationMode,
  type TooltipProp
} from "./physicsHocUtils"
import type { ChartMode } from "../shared/types"

type ProjectionRow = {
  label: string
  value: number
}

export interface GaltonBoardReferenceLine {
  value: number
  label?: React.ReactNode
  color?: string
  className?: string
  strokeDasharray?: string
  strokeWidth?: number
  labelPosition?: "top" | "bottom"
}

export interface GaltonBoardChartProps<TDatum extends Datum = Datum>
  extends Omit<BaseChartProps, "margin" | "mode">,
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

function galtonBoardOverlay(
  rows: ProjectionRow[],
  bins: number,
  enabled: boolean | undefined,
  metadata: GaltonBoardProjectionMetadata | undefined,
  referenceLines: GaltonBoardChartProps["referenceLines"]
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  const referenceLineArray = Array.isArray(referenceLines)
    ? referenceLines
    : referenceLines
      ? [referenceLines]
      : []
  if (enabled === false && referenceLineArray.length === 0) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 420
    ]
    const area = physicsChartArea(resolvedSize)
    const resolvedBins = Math.max(2, Math.round(bins))
    const laneWidth = area.plot.width / resolvedBins
    const yBottom = area.plot.y + area.plot.height
    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    const showScaffold = enabled !== false
    const [domainStart, domainEnd] = metadata?.valueExtent ?? [0, resolvedBins]
    const domainSpan = domainEnd === domainStart ? 1 : domainEnd - domainStart
    // The ghost curve traces the exact settled count per bin — the "truth
    // layer" the physical pile of units assembles itself into as it falls.
    const curve = rows
      .map((row, index) => {
        const x = area.plot.x + (index + 0.5) * laneWidth
        const y = yBottom - (row.value / maxValue) * area.plot.height * 0.9
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")

    return (
      <svg
        aria-hidden="true"
        data-testid="galton-board-structure-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {showScaffold ? (
          <>
            {Array.from({ length: resolvedBins + 1 }, (_, index) => {
              const x = area.plot.x + index * laneWidth
              return (
                <line
                  key={`bin-wall-${index}`}
                  data-testid="galton-board-bin-wall"
                  x1={x}
                  x2={x}
                  y1={area.plot.y}
                  y2={yBottom}
                  stroke="var(--semiotic-border, #d1d5db)"
                  strokeOpacity={0.28}
                  strokeWidth={1}
                />
              )
            })}
            <line
              x1={area.plot.x}
              x2={area.plot.x + area.plot.width}
              y1={yBottom}
              y2={yBottom}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeWidth={1.5}
            />
            <path
              d={curve}
              fill="none"
              stroke="var(--semiotic-accent, #4e79a7)"
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {rows.map((row, index) => {
              if (row.value <= 0) return null
              const x = area.plot.x + (index + 0.5) * laneWidth
              const y = yBottom - (row.value / maxValue) * area.plot.height * 0.9
              return (
                <text
                  key={`${row.label}-${index}`}
                  x={x}
                  y={Math.max(area.plot.y + 10, y - 6)}
                  textAnchor="middle"
                  fill="var(--semiotic-text-secondary, #555)"
                  fontSize={10}
                  fontWeight={700}
                >
                  {row.value}
                </text>
              )
            })}
          </>
        ) : null}
        {referenceLineArray.map((line, index) => {
          const value = Number(line.value)
          if (!Number.isFinite(value)) return null
          const ratio = Math.max(0, Math.min(1, (value - domainStart) / domainSpan))
          const x = area.plot.x + ratio * area.plot.width
          const color = line.color ?? "var(--semiotic-warning, #f28e2b)"
          const labelY =
            line.labelPosition === "bottom"
              ? Math.min(resolvedSize[1] - 8, yBottom + 16)
              : area.plot.y + 16
          return (
            <g
              key={`galton-reference-${index}-${value}`}
              className={line.className}
              data-testid="galton-board-reference-line"
            >
              <line
                x1={x}
                x2={x}
                y1={area.plot.y + 8}
                y2={yBottom - 4}
                stroke={color}
                strokeDasharray={line.strokeDasharray ?? "6 5"}
                strokeWidth={line.strokeWidth ?? 2}
              />
              {line.label == null ? null : (
                <text
                  x={Math.min(area.plot.x + area.plot.width - 4, x + 6)}
                  y={labelY}
                  fill={color}
                  fontSize={10}
                  fontWeight={700}
                >
                  {line.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }
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
    responsiveHeight,
    responsiveWidth,
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
    ballRadius ?? (chartMode === "sparkline" ? 1.5 : chartMode === "context" ? 4 : 6)
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
    [bins, chartData, chartSize, resolvedBallRadius, resolvedValueExtent, seed, valueAccessor]
  )
  const rerun = usePhysicsRerun(layout.config, rerunMS, paused)

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
    [bins, chartSize, resolvedBallRadius, resolvedValueExtent, seed, valueAccessor]
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
  const bodyStyle = useMemo(
    () => styleFromColorAccessor(resolvedColorBy, "#4e79a7", {
      styleRules,
      valueAccessor: valueAccessor as string | ((d: Datum) => unknown),
    }),
    [resolvedColorBy, styleRules, valueAccessor]
  )
  const semanticItems = useMemo(
    () => projectionRowsToSemanticItems(layout.projectionRows, chartSize, "bin"),
    [chartSize, layout.projectionRows]
  )

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
      key={rerun.rerunKey}
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      config={rerun.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        structureOverlay,
        frameProps?.foregroundGraphics
      )}
      initialSpawns={layout.initialSpawns}
      initialSpawnPacing={layout.initialSpawnPacing}
      paused={paused}
      responsiveHeight={responsiveHeight}
      responsiveWidth={responsiveWidth}
      size={chartSize}
      bodyStyle={bodyStyle}
    />
  )
})

export default GaltonBoardChart

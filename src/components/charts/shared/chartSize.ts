import { isChartMode, resolveChartMode } from "./chartMode"
import { BIG_NUMBER_SIZES } from "./chartSizeDefaultsValue"
import {
  CHART_PRIMARY_SIZES,
  hasFixedModeSize,
  type SizedChartName
} from "./chartSizeDefaults"
import { SCATTERPLOT_MATRIX_SIZE } from "./chartSizeDefaultsXY"
import type { ChartMode } from "./types"
import type { ResponsiveRule } from "./responsiveRules"
import { resolveResponsiveDimension } from "../../stream/responsiveSize"
import { minimapOverviewHeight } from "../xy/minimapLayout"

export type { SizedChartName } from "./chartSizeDefaults"

/** Numeric viewport size, in CSS pixels. */
export interface ChartSize {
  width: number
  height: number
}

/** Size-affecting chart props. Container measurements are optional until a responsive host mounts. */
export interface ChartSizeOptions {
  mode?: ChartMode | "sample" | "mechanical" | "snapshot" | "replay"
  width?: number
  height?: number
  size?: [number, number]
  responsiveRules?: ResponsiveRule[]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  /** The chart host's measured content box; used only on responsive axes. */
  containerSize?: Partial<ChartSize>
  /** ScatterplotMatrix uses field count and cell geometry instead of width/height. */
  fields?: readonly string[]
  cellSize?: number
  cellGap?: number
  /** MinimapChart's overview is included in its total height. */
  minimap?: {
    height?: number
    margin?: { top?: number; bottom?: number }
    handles?: unknown
    showExtentLabels?: boolean
  }
}

export interface BigNumberSizeOptions {
  mode?: keyof typeof BIG_NUMBER_SIZES | ChartMode
  width?: number | string
  height?: number | string
}

/** Inline or percentage-sized value cards retain their CSS sizing instead of inventing pixel dimensions. */
export interface BigNumberSize {
  width: number | string | undefined
  height: number | string | undefined
}

/**
 * Resolve a chart's viewport without mounting React. Uses the same defaults as
 * the chart itself. Explicit dimensions override mode defaults. Supply the
 * measured host content box for responsive axes; otherwise returns their
 * pre-measurement fallback. Excludes external CSS, titles/legends outside a
 * ScatterplotMatrix grid, and accessible tables rendered outside the viewport.
 *
 * @example
 * const { height } = resolveChartSize("CandlestickChart", { mode: "context" })
 */
export function resolveChartSize(
  chart: "BigNumber",
  props?: BigNumberSizeOptions
): BigNumberSize
export function resolveChartSize(
  chart: SizedChartName,
  props?: ChartSizeOptions
): ChartSize
export function resolveChartSize(
  chart: SizedChartName | "BigNumber",
  props: ChartSizeOptions | BigNumberSizeOptions = {}
): ChartSize | BigNumberSize {
  if (chart === "BigNumber") {
    const p = props as BigNumberSizeOptions
    const defaults =
      p.mode && Object.hasOwn(BIG_NUMBER_SIZES, p.mode)
        ? BIG_NUMBER_SIZES[p.mode as keyof typeof BIG_NUMBER_SIZES]
        : BIG_NUMBER_SIZES.tile
    return {
      width: p.width ?? defaults.width,
      height: p.height ?? defaults.height
    }
  }
  if (!Object.hasOwn(CHART_PRIMARY_SIZES, chart))
    throw new Error(`Unknown chart: ${chart}`)
  const p = props as ChartSizeOptions
  if (chart === "ScatterplotMatrix") {
    const count = p.fields?.length ?? 0
    const side =
      SCATTERPLOT_MATRIX_SIZE.labelWidth +
      count *
        ((p.cellSize ?? SCATTERPLOT_MATRIX_SIZE.cellSize) +
          (p.cellGap ?? SCATTERPLOT_MATRIX_SIZE.cellGap))
    return { width: side, height: side }
  }
  // These compositions have their own semantics for `mode` and historically
  // retain primary viewport dimensions. Do not silently change their layout.
  const fixed = hasFixedModeSize(chart)
  const physics = [
    "GaltonBoardChart",
    "UnitPileChart",
    "CollisionSwarmChart",
    "EventDropChart",
    "PacketFlowChart",
    "ProcessFlowChart",
    "PhysicsCustomChart",
    "GauntletChart",
    "CrucibleChart"
  ].includes(chart)
  const tuple =
    physics || chart.startsWith("Realtime") || chart === "TemporalHistogram"
      ? p.size
      : undefined
  const resolved = resolveChartMode(
    chart === "Sparkline"
      ? "sparkline"
      : fixed
        ? undefined
        : isChartMode(p.mode)
          ? p.mode
          : undefined,
    {
      width: !physics && tuple ? tuple[0] : p.width,
      height: !physics && tuple ? tuple[1] : p.height,
      responsiveRules: fixed ? undefined : p.responsiveRules
    },
    CHART_PRIMARY_SIZES[chart]
  )
  let width = tuple ? tuple[0] : resolved.width
  let height = tuple ? tuple[1] : resolved.height
  if (p.responsiveWidth && p.containerSize?.width !== undefined)
    width = resolveResponsiveDimension(p.containerSize.width)
  if (p.responsiveHeight && p.containerSize?.height !== undefined)
    height = resolveResponsiveDimension(p.containerSize.height)
  if (chart === "MinimapChart") {
    height += minimapOverviewHeight(p.minimap ?? {})
  }
  if (
    physics ||
    chart === "ChainReactionChart" ||
    chart === "FlowCircuitChart"
  ) {
    width = Math.max(1, width)
    height = Math.max(1, height)
  }
  return { width, height }
}

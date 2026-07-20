"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  SafeRender,
  renderEmptyState,
  renderLoadingState
} from "../shared/withChartWrapper"
import type { FrameGraphicsProp } from "../../stream/useFrame"
import type {
  PhysicsSemanticItem,
  StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartMode } from "../shared/types"
import { useChartMode, type ChartModeResult } from "../shared/hooks"

export type PhysicsHocFrameProps<
  TOmitted extends keyof StreamPhysicsFrameProps = never
> = Partial<
  Omit<
    StreamPhysicsFrameProps,
    "initialSpawns" | "initialSpawnPacing" | "size" | TOmitted
  >
>

/**
 * Chrome / AI / annotation contracts HOCs forward to StreamPhysicsFrame.
 * Compose with `BaseChartProps` on every physics HOC.
 */
export type PhysicsSharedChartProps = {
  annotations?: StreamPhysicsFrameProps["annotations"]
  autoPlaceAnnotations?: StreamPhysicsFrameProps["autoPlaceAnnotations"]
  background?: StreamPhysicsFrameProps["background"]
  legend?: StreamPhysicsFrameProps["legend"]
  legendPosition?: StreamPhysicsFrameProps["legendPosition"]
  legendLayout?: StreamPhysicsFrameProps["legendLayout"]
  svgAnnotationRules?: StreamPhysicsFrameProps["svgAnnotationRules"]
}

/** Galton / pile sampling mode (orthogonal to ChartMode display modes). */
export type PhysicsSimulationMode = "sample" | "mechanical"

/** Delay between a settled physics run and a fresh seeded replay. */
export type PhysicsRerunMS = number | null

const SIM_MODES = new Set<string>(["sample", "mechanical"])

function normalizedRerunDelay(rerunMS: PhysicsRerunMS | undefined): number | null {
  return typeof rerunMS === "number" && Number.isFinite(rerunMS) && rerunMS >= 0
    ? rerunMS
    : null
}

/**
 * Add an optional settle -> delay -> remount loop to a physics HOC.
 *
 * Remounting is intentional: it replays the chart's deterministic seed,
 * initial bodies, and spawn pacing instead of trying to reverse a live store.
 */
export function usePhysicsRerun(
  config: StreamPhysicsFrameProps["config"],
  rerunMS: PhysicsRerunMS | undefined,
  paused: boolean | undefined,
  onRerun?: () => void
): {
  config: StreamPhysicsFrameProps["config"]
  rerunKey: number
} {
  const [rerunKey, setRerunKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settledRef = useRef(false)
  const delay = normalizedRerunDelay(rerunMS)
  const delayRef = useRef(delay)
  const pausedRef = useRef(Boolean(paused))
  const onRerunRef = useRef(onRerun)
  delayRef.current = delay
  pausedRef.current = Boolean(paused)
  onRerunRef.current = onRerun

  const clearRerun = useCallback(() => {
    if (timerRef.current == null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const scheduleRerun = useCallback(() => {
    clearRerun()
    const nextDelay = delayRef.current
    if (nextDelay == null || pausedRef.current || !settledRef.current) return
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      settledRef.current = false
      onRerunRef.current?.()
      setRerunKey((current) => current + 1)
    }, nextDelay)
  }, [clearRerun])

  useEffect(() => {
    if (delay == null || paused) clearRerun()
    else if (settledRef.current) scheduleRerun()
  }, [clearRerun, delay, paused, scheduleRerun])

  useEffect(() => clearRerun, [clearRerun])

  const previousStateChange = config?.observation?.onSimulationStateChange
  const onSimulationStateChange = useCallback<
    NonNullable<
      NonNullable<
        NonNullable<StreamPhysicsFrameProps["config"]>["observation"]
      >["onSimulationStateChange"]
    >
  >(
    (state, previousState) => {
      previousStateChange?.(state, previousState)
      if (state === "running") {
        settledRef.current = false
        clearRerun()
        return
      }
      if (state !== "settled" || previousState !== "running") return
      settledRef.current = true
      scheduleRerun()
    },
    [clearRerun, previousStateChange, scheduleRerun]
  )

  const rerunnableConfig = useMemo<StreamPhysicsFrameProps["config"]>(() => {
    if (delay == null) return config
    return {
      ...config,
      observation: {
        ...config?.observation,
        onSimulationStateChange
      }
    }
  }, [config, delay, onSimulationStateChange])

  return { config: rerunnableConfig, rerunKey }
}

/**
 * Split ChartMode (`primary`/`context`/`sparkline`/`mobile`) from the
 * Galton/pile `sample`/`mechanical` simulation mode. Accepts legacy
 * `mode="mechanical"` as simulationMode for back-compat.
 */
export function resolvePhysicsModes(options: {
  mode?: ChartMode | PhysicsSimulationMode
  simulationMode?: PhysicsSimulationMode
}): {
  chartMode: ChartMode | undefined
  simulationMode: PhysicsSimulationMode
} {
  const isSim = (value: unknown): value is PhysicsSimulationMode =>
    typeof value === "string" && SIM_MODES.has(value)

  if (options.simulationMode) {
    return {
      chartMode: isSim(options.mode)
        ? undefined
        : (options.mode as ChartMode | undefined),
      simulationMode: options.simulationMode
    }
  }
  if (isSim(options.mode)) {
    return { chartMode: undefined, simulationMode: options.mode }
  }
  return {
    chartMode: options.mode as ChartMode | undefined,
    simulationMode: "sample"
  }
}

/** Physics fills its box; only compact ChartModes get non-zero chrome padding. */
export function physicsMarginForMode(compactMode: boolean, mode?: ChartMode) {
  if (!compactMode) return { top: 0, right: 0, bottom: 0, left: 0 }
  if (mode === "sparkline") return { top: 2, right: 2, bottom: 2, left: 2 }
  return { top: 8, right: 8, bottom: 8, left: 8 }
}

export function resolvePhysicsChartSize(
  size: [number, number] | undefined,
  width: number | undefined,
  height: number | undefined,
  fallback: [number, number]
): [number, number] {
  return size ?? [width ?? fallback[0], height ?? fallback[1]]
}

export type PhysicsChartModeProps = {
  width?: number
  height?: number
  title?: string
  description?: string
  summary?: string
  accessibleTable?: boolean
  /** Frame-level hover; HOCs may pass via tooltip or frameProps. */
  enableHover?: boolean
  mobileInteraction?: BaseChartProps["mobileInteraction"]
  mobileSemantics?: BaseChartProps["mobileSemantics"]
  responsiveRules?: BaseChartProps["responsiveRules"]
  mode?: ChartMode | PhysicsSimulationMode
  simulationMode?: PhysicsSimulationMode
  size?: [number, number]
  showProjection?: boolean
  showChrome?: boolean
  tooltip?: TooltipProp
  className?: string
}

export interface PhysicsChartModeResult {
  chartMode: ChartMode | undefined
  simulationMode: PhysicsSimulationMode
  resolved: ChartModeResult
  chartSize: [number, number]
  margin: { top: number; right: number; bottom: number; left: number }
  showProjection: boolean
  showChrome: boolean
  enableHover: boolean
  title: string | undefined
  description: string | undefined
  summary: string | undefined
  accessibleTable: boolean | undefined
  className: string | undefined
  compactMode: boolean
  mobileInteraction: ChartModeResult["mobileInteraction"]
  mobileSemantics: ChartModeResult["mobileSemantics"]
}

/**
 * ChartMode + size + compact chrome defaults for every physics HOC.
 * Primary physics sizes stay family-specific (`primaryFallback`); mode only
 * overrides when width/height/size are unset.
 */
export function usePhysicsChartMode(
  props: PhysicsChartModeProps,
  primaryFallback: [number, number],
  options?: { hasSimulationMode?: boolean }
): PhysicsChartModeResult {
  const modes = options?.hasSimulationMode
    ? resolvePhysicsModes({
        mode: props.mode,
        simulationMode: props.simulationMode
      })
    : {
        chartMode: (props.mode === "sample" || props.mode === "mechanical"
          ? undefined
          : props.mode) as ChartMode | undefined,
        simulationMode: "sample" as PhysicsSimulationMode
      }

  const resolved = useChartMode(
    modes.chartMode,
    {
      width: props.width,
      height: props.height,
      enableHover: props.enableHover,
      title: props.title,
      description: props.description,
      summary: props.summary,
      accessibleTable: props.accessibleTable,
      mobileInteraction: props.mobileInteraction,
      mobileSemantics: props.mobileSemantics,
      responsiveRules: props.responsiveRules
    },
    { width: primaryFallback[0], height: primaryFallback[1] }
  )

  // Depend on numeric dimensions, not `props.size` array identity — callers
  // often pass `size={[w, h]}` inline and a fresh array must not rebuild layout.
  const sizeW = props.size?.[0]
  const sizeH = props.size?.[1]
  const fallbackW = primaryFallback[0]
  const fallbackH = primaryFallback[1]
  const chartSize = useMemo(
    () =>
      resolvePhysicsChartSize(
        sizeW != null && sizeH != null ? [sizeW, sizeH] : undefined,
        resolved.width,
        resolved.height,
        [fallbackW, fallbackH]
      ),
    [fallbackH, fallbackW, resolved.height, resolved.width, sizeH, sizeW]
  )

  const margin = physicsMarginForMode(resolved.compactMode, modes.chartMode)
  const showProjection = props.showProjection ?? !resolved.compactMode
  const showChrome = props.showChrome ?? !resolved.compactMode

  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, undefined)
  const enableHover =
    tooltipProps.enableHover !== undefined
      ? tooltipProps.enableHover
      : resolved.enableHover

  const title = resolved.compactMode
    ? resolved.title
    : (resolved.title ?? props.title)

  const modeClass =
    modes.chartMode && modes.chartMode !== "primary"
      ? `semiotic-physics--${modes.chartMode}`
      : null
  const className = [props.className, modeClass].filter(Boolean).join(" ") || undefined

  return {
    chartMode: modes.chartMode,
    simulationMode: modes.simulationMode,
    resolved,
    chartSize,
    margin,
    showProjection,
    showChrome,
    enableHover,
    title,
    description: resolved.description ?? props.description,
    summary: resolved.summary ?? props.summary,
    accessibleTable: resolved.accessibleTable ?? props.accessibleTable,
    className,
    compactMode: resolved.compactMode,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics
  }
}

export function renderPhysicsChartState<TDatum extends Datum>(options: {
  data?: TDatum[] | null
  emptyContent?: BaseChartProps["emptyContent"]
  loading?: BaseChartProps["loading"]
  loadingContent?: BaseChartProps["loadingContent"]
  size: [number, number]
}): React.ReactElement | null {
  const [width, height] = options.size
  const loadingEl = renderLoadingState(
    options.loading,
    width,
    height,
    options.loadingContent
  )
  if (loadingEl) return loadingEl
  return renderEmptyState(options.data, width, height, options.emptyContent)
}

export function renderPhysicsFrame(
  componentName: string,
  size: [number, number],
  children: React.ReactNode
): React.ReactElement {
  return (
    <SafeRender componentName={componentName} width={size[0]} height={size[1]}>
      {children}
    </SafeRender>
  )
}

export function composePhysicsFrameGraphics(
  first: FrameGraphicsProp | undefined,
  second: FrameGraphicsProp | undefined
): FrameGraphicsProp | undefined {
  if (!first) return second
  if (!second) return first
  return (ctx) => (
    <>
      {typeof first === "function" ? first(ctx) : first}
      {typeof second === "function" ? second(ctx) : second}
    </>
  )
}

export function resolvePhysicsTooltipProps(
  tooltip: TooltipProp | undefined,
  frameProps?: Partial<StreamPhysicsFrameProps>
): Pick<StreamPhysicsFrameProps, "enableHover" | "tooltipContent"> {
  if (tooltip === false) {
    return { enableHover: false }
  }
  return {
    enableHover: frameProps?.enableHover,
    tooltipContent:
      (normalizeTooltip(tooltip) as
        | StreamPhysicsFrameProps["tooltipContent"]
        | false) ||
      frameProps?.tooltipContent
  }
}

/**
 * HOC → StreamPhysicsFrame shared Semiotic contracts: a11y, observation,
 * click, chrome (title/legend/annotations), primitive styling, emphasis.
 * Prefer HOC props; frameProps fill gaps.
 */
export function resolvePhysicsFrameSharedProps(
  props: Pick<
    BaseChartProps,
    | "accessibleTable"
    | "chartId"
    | "className"
    | "color"
    | "description"
    | "emphasis"
    | "hoverRadius"
    | "onClick"
    | "onObservation"
    | "opacity"
    | "stroke"
    | "strokeWidth"
    | "summary"
    | "title"
  > & {
    annotations?: StreamPhysicsFrameProps["annotations"]
    autoPlaceAnnotations?: StreamPhysicsFrameProps["autoPlaceAnnotations"]
    background?: StreamPhysicsFrameProps["background"]
    legend?: StreamPhysicsFrameProps["legend"]
    legendPosition?: StreamPhysicsFrameProps["legendPosition"]
    legendLayout?: StreamPhysicsFrameProps["legendLayout"]
    svgAnnotationRules?: StreamPhysicsFrameProps["svgAnnotationRules"]
  },
  frameProps: Partial<StreamPhysicsFrameProps> | undefined,
  semanticItems?: PhysicsSemanticItem[],
  modeExtras?: {
    chartMode?: ChartMode
    className?: string
    title?: string
    description?: string
    summary?: string
    accessibleTable?: boolean
    enableHover?: boolean
    margin?: StreamPhysicsFrameProps["margin"]
  }
): Partial<StreamPhysicsFrameProps> {
  return {
    accessibleTable:
      modeExtras?.accessibleTable ??
      props.accessibleTable ??
      frameProps?.accessibleTable,
    annotations: props.annotations ?? frameProps?.annotations,
    autoPlaceAnnotations:
      props.autoPlaceAnnotations ?? frameProps?.autoPlaceAnnotations,
    background: props.background ?? frameProps?.background,
    chartId: props.chartId ?? frameProps?.chartId,
    chartMode: modeExtras?.chartMode ?? frameProps?.chartMode,
    className: modeExtras?.className ?? props.className ?? frameProps?.className,
    color: props.color ?? frameProps?.color,
    description:
      modeExtras?.description ??
      props.description ??
      frameProps?.description,
    emphasis: props.emphasis ?? frameProps?.emphasis,
    enableHover: modeExtras?.enableHover ?? frameProps?.enableHover,
    hoverRadius: props.hoverRadius ?? frameProps?.hoverRadius,
    legend: props.legend ?? frameProps?.legend,
    legendLayout: props.legendLayout ?? frameProps?.legendLayout,
    legendPosition: props.legendPosition ?? frameProps?.legendPosition,
    margin: modeExtras?.margin ?? frameProps?.margin,
    onClick:
      props.onClick != null
        ? (datum, event) => {
            if (datum) props.onClick?.(datum, { x: event.x, y: event.y })
          }
        : frameProps?.onClick,
    onObservation: props.onObservation ?? frameProps?.onObservation,
    onAnnotationActivate: frameProps?.onAnnotationActivate,
    opacity: props.opacity ?? frameProps?.opacity,
    semanticItems: frameProps?.semanticItems ?? semanticItems,
    stroke: props.stroke ?? frameProps?.stroke,
    strokeWidth: props.strokeWidth ?? frameProps?.strokeWidth,
    summary: modeExtras?.summary ?? props.summary ?? frameProps?.summary,
    svgAnnotationRules:
      props.svgAnnotationRules ?? frameProps?.svgAnnotationRules,
    title: modeExtras?.title ?? props.title ?? frameProps?.title
  }
}

export type { TooltipProp }

"use client"

import * as React from "react"
import { forwardRef, useCallback, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { scaleLinear, type ScaleLinear } from "d3-scale"
import type { RealtimeFrameHandle } from "../../realtime/types"
import {
  buildResolveColor,
  resolveCustomLayoutPalette,
  schemeCategory10
} from "../../stream/customLayoutPalette"
import type { Style, ThemeSemanticColors } from "../../stream/types"
import StreamPhysicsFrame, {
  type PhysicsBodyStyleContext,
  type PhysicsSemanticItem,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps
} from "../../stream/physics/StreamPhysicsFrame"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions
} from "../../stream/physics/PhysicsPipelineStore"
import type {
  PhysicsBodyState,
  PhysicsColliderSpec,
  PhysicsSpringSpec
} from "../../stream/physics/PhysicsKernel"
import {
  LIGHT_THEME,
  resolveThemeSemanticColors,
  useThemeSelector
} from "../../store/ThemeStore"
import { filterSparseArray } from "../shared/sparseArray"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { physicsChartArea, type PhysicsChartArea } from "./physicsChartUtils"
import {
  type PhysicsDatumSpawnResult,
  usePhysicsHocHandle
} from "./physicsHocHandle"
import {
  composePhysicsFrameGraphics,
  renderPhysicsChartState,
  renderPhysicsFrame,
  resolvePhysicsChartSize,
  resolvePhysicsFrameSharedProps,
  resolvePhysicsTooltipProps,
  type TooltipProp
} from "./physicsHocUtils"

type PhysicsBodyStyleFn = (
  body: PhysicsBodyState,
  context: PhysicsBodyStyleContext
) => Style

export interface PhysicsCustomLayoutContext<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> {
  data: TDatum[]
  scales: {
    x: ScaleLinear<number, number>
    y: ScaleLinear<number, number>
  }
  dimensions: PhysicsChartArea
  theme: {
    semantic: ThemeSemanticColors
    categorical: string[]
  }
  resolveColor: (key: string, datum?: TDatum) => string
  config: TConfig
  /**
   * Scratch pipeline store initialized from the base frame config. Use it for
   * derived geometry, seeded randomness, or quick settle probes; return
   * declarative `bodies`/`colliders` from the layout result for rendering.
   */
  world: PhysicsPipelineStore
}

export interface PhysicsCustomLayoutResult {
  bodies?: PhysicsQueuedSpawn[]
  initialSpawns?: PhysicsQueuedSpawn[]
  colliders?: PhysicsColliderSpec[]
  sensors?: PhysicsColliderSpec[]
  constraints?: PhysicsSpringSpec[]
  config?: PhysicsPipelineConfig
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  overlays?: ReactNode
  backgroundOverlays?: ReactNode
  bodyStyle?: StreamPhysicsFrameProps["bodyStyle"]
  selectedBodyStyle?: StreamPhysicsFrameProps["selectedBodyStyle"]
  semanticItems?: PhysicsSemanticItem[]
}

export type PhysicsCustomLayout<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> = (
  ctx: PhysicsCustomLayoutContext<TDatum, TConfig>
) => PhysicsCustomLayoutResult

export type PhysicsCustomSpawnDatumResult =
  | PhysicsDatumSpawnResult
  | PhysicsQueuedSpawn
  | PhysicsQueuedSpawn[]

export interface PhysicsCustomChartProps<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends Omit<BaseChartProps, "margin"> {
  data?: TDatum[]
  layout: PhysicsCustomLayout<TDatum, TConfig>
  layoutConfig?: TConfig
  config?: PhysicsPipelineConfig
  size?: [number, number]
  xExtent?: [number, number]
  yExtent?: [number, number]
  colorBy?: ChartAccessor<TDatum, string | number>
  colorScheme?: string | string[] | Record<string, string>
  paused?: boolean
  tooltip?: TooltipProp
  spawnDatum?: (
    datum: TDatum,
    index: number,
    ctx: PhysicsCustomLayoutContext<TDatum, TConfig>
  ) => PhysicsCustomSpawnDatumResult
  frameProps?: Partial<
    Omit<
      StreamPhysicsFrameProps,
      "config" | "initialSpawns" | "initialSpawnPacing" | "size"
    >
  >
}

interface ResolvedPhysicsCustomLayout<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> {
  config: PhysicsPipelineConfig
  context: PhysicsCustomLayoutContext<TDatum, TConfig>
  initialSpawnPacing?: PhysicsSpawnPacingOptions
  initialSpawns: PhysicsQueuedSpawn[]
  result: PhysicsCustomLayoutResult
}

function readAccessor<TDatum extends Datum, TValue>(
  datum: TDatum,
  index: number,
  accessor: ChartAccessor<TDatum, TValue>
): TValue {
  return typeof accessor === "function"
    ? accessor(datum, index)
    : (datum[accessor] as TValue)
}

function withPhysicsCustomObservation(
  config: PhysicsPipelineConfig | undefined,
  chartId: string | undefined,
  onObservation: BaseChartProps["onObservation"]
): PhysicsPipelineConfig {
  const observation = config?.observation
  return {
    ...config,
    observation: {
      ...observation,
      chartId: chartId ?? observation?.chartId ?? "physics-custom",
      chartType: observation?.chartType ?? "PhysicsCustomChart",
      onObservation:
        (onObservation as NonNullable<
          PhysicsPipelineConfig["observation"]
        >["onObservation"]) ?? observation?.onObservation
    }
  }
}

function mergeLayoutConfig(
  baseConfig: PhysicsPipelineConfig,
  result: PhysicsCustomLayoutResult
): PhysicsPipelineConfig {
  const resultConfig = result.config ?? {}
  const sensors = (result.sensors ?? []).map((sensor) => ({
    ...sensor,
    sensor: true
  }))
  const generatedColliders = [
    ...(result.colliders ?? []),
    ...sensors
  ]
  const colliders = [
    ...(baseConfig.colliders ?? []),
    ...(resultConfig.colliders ?? []),
    ...generatedColliders
  ]

  return {
    ...baseConfig,
    ...resultConfig,
    observation: {
      ...baseConfig.observation,
      ...resultConfig.observation
    },
    ...(colliders.length > 0 && { colliders })
  }
}

function attachInitialConstraints(
  spawns: PhysicsQueuedSpawn[],
  constraints: PhysicsSpringSpec[] | undefined
): PhysicsQueuedSpawn[] {
  if (!constraints?.length) return spawns

  const springsByBody = new Map<string, Omit<PhysicsSpringSpec, "bodyId">[]>()
  for (const constraint of constraints) {
    const { bodyId, ...spring } = constraint
    const springs = springsByBody.get(bodyId) ?? []
    springs.push(spring)
    springsByBody.set(bodyId, springs)
  }

  return spawns.map((spawn) => {
    const springs = springsByBody.get(spawn.id)
    if (!springs?.length) return spawn
    return {
      ...spawn,
      springs: [...(spawn.springs ?? []), ...springs]
    }
  })
}

function resolveCustomLayout<
  TDatum extends Datum,
  TConfig extends object
>(options: {
  chartId?: string
  colorScheme?: string | string[] | Record<string, string>
  config?: PhysicsPipelineConfig
  data: TDatum[]
  layout: PhysicsCustomLayout<TDatum, TConfig>
  layoutConfig?: TConfig
  onObservation?: BaseChartProps["onObservation"]
  semantic: ThemeSemanticColors
  skipLayout?: boolean
  size: [number, number]
  themeCategorical: string[]
  xExtent?: [number, number]
  yExtent?: [number, number]
}): ResolvedPhysicsCustomLayout<TDatum, TConfig> {
  const baseConfig = withPhysicsCustomObservation(
    options.config,
    options.chartId,
    options.onObservation
  )
  const palette = resolveCustomLayoutPalette(
    options.colorScheme,
    options.themeCategorical,
    schemeCategory10
  )
  const dimensions = physicsChartArea(options.size)
  const context: PhysicsCustomLayoutContext<TDatum, TConfig> = {
    data: options.data,
    scales: {
      x: scaleLinear()
        .domain(options.xExtent ?? [0, 1])
        .range([dimensions.plot.x, dimensions.plot.x + dimensions.plot.width]),
      y: scaleLinear()
        .domain(options.yExtent ?? [0, 1])
        .range([dimensions.plot.y + dimensions.plot.height, dimensions.plot.y])
    },
    dimensions,
    theme: {
      semantic: options.semantic,
      categorical: [...palette]
    },
    resolveColor: buildResolveColor(palette, options.colorScheme),
    config: (options.layoutConfig ?? {}) as TConfig,
    world: new PhysicsPipelineStore(baseConfig)
  }
  const result = options.skipLayout ? {} : options.layout(context) ?? {}
  const spawns = attachInitialConstraints(
    [...(result.initialSpawns ?? result.bodies ?? [])],
    result.constraints
  )

  return {
    config: mergeLayoutConfig(baseConfig, result),
    context,
    initialSpawnPacing: result.initialSpawnPacing,
    initialSpawns: spawns,
    result
  }
}

function normalizeSpawnDatumResult(
  datum: Datum,
  index: number,
  result: PhysicsCustomSpawnDatumResult
): PhysicsDatumSpawnResult {
  if (Array.isArray(result)) {
    return {
      datumId: String(datum.id ?? result[0]?.id ?? `physics-custom-${index}`),
      spawns: result
    }
  }
  if ("spawns" in result) return result
  return {
    datumId: String(datum.id ?? result.id ?? `physics-custom-${index}`),
    spawns: [result]
  }
}

export const PhysicsCustomChart = forwardRef(function PhysicsCustomChart<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(
  props: PhysicsCustomChartProps<TDatum, TConfig>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    chartId,
    className,
    color,
    colorBy,
    colorScheme,
    config,
    data,
    emptyContent,
    frameProps = {},
    height,
    layout,
    layoutConfig,
    loading,
    loadingContent,
    onClick,
    onObservation,
    opacity,
    paused,
    size,
    spawnDatum: customSpawnDatum,
    stroke,
    strokeWidth,
    title,
    width,
    xExtent,
    yExtent
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const sizeWidth = size?.[0]
  const sizeHeight = size?.[1]
  const chartSize = useMemo(
    () =>
      sizeWidth != null && sizeHeight != null
        ? [sizeWidth, sizeHeight] as [number, number]
        : resolvePhysicsChartSize(undefined, width, height, [700, 380]),
    [height, sizeHeight, sizeWidth, width]
  )
  const stateEl = renderPhysicsChartState({
    data,
    emptyContent,
    loading,
    loadingContent,
    size: chartSize
  })
  const skipLayout = stateEl != null
  const safeData = useMemo(
    () => filterSparseArray(data ?? []) as TDatum[],
    [data]
  )
  const theme = useThemeSelector((state) => state.theme)
  const semantic = useMemo(
    () => resolveThemeSemanticColors(theme) ?? {},
    [theme]
  )
  const themeCategorical = theme?.colors?.categorical ?? LIGHT_THEME.colors.categorical

  const resolved = useMemo(
    () =>
      resolveCustomLayout({
        chartId,
        colorScheme,
        config,
        data: safeData,
        layout,
        layoutConfig,
        onObservation,
        semantic,
        skipLayout,
        size: chartSize,
        themeCategorical,
        xExtent,
        yExtent
      }),
    [
      chartId,
      chartSize,
      colorScheme,
      config,
      layout,
      layoutConfig,
      onObservation,
      safeData,
      semantic,
      skipLayout,
      themeCategorical,
      xExtent,
      yExtent
    ]
  )

  const fallbackBodyStyle = useCallback<PhysicsBodyStyleFn>(
    (body) => {
      const datum = body.datum as TDatum | undefined
      const key =
        datum && colorBy
          ? String(readAccessor(datum, 0, colorBy))
          : body.id
      return {
        fill: color ?? resolved.context.resolveColor(key, datum),
        stroke: stroke ?? "#111827",
        strokeWidth: strokeWidth ?? 1,
        opacity: opacity ?? 0.9
      }
    },
    [color, colorBy, opacity, resolved.context, stroke, strokeWidth]
  )

  const spawnDatum = useCallback(
    (datum: Datum, index: number) => {
      const typedDatum = datum as TDatum
      if (customSpawnDatum) {
        return normalizeSpawnDatumResult(
          datum,
          index,
          customSpawnDatum(typedDatum, index, resolved.context)
        )
      }
      const single = resolveCustomLayout({
        chartId,
        colorScheme,
        config,
        data: [typedDatum],
        layout,
        layoutConfig,
        onObservation,
        semantic,
        size: chartSize,
        themeCategorical,
        xExtent,
        yExtent
      })
      const fallback: PhysicsQueuedSpawn = {
        id: String(datum.id ?? `physics-custom-${index}`),
        x: single.context.dimensions.plot.x + single.context.dimensions.plot.width / 2,
        y: single.context.dimensions.plot.y + 12,
        mass: 1,
        shape: { type: "circle", radius: 5 },
        datum
      }
      const spawns = single.initialSpawns.length
        ? single.initialSpawns
        : [fallback]
      return {
        datumId: String(datum.id ?? spawns[0].id),
        spawns
      }
    },
    [
      chartId,
      chartSize,
      colorScheme,
      config,
      customSpawnDatum,
      layout,
      layoutConfig,
      onObservation,
      resolved.context,
      semantic,
      themeCategorical,
      xExtent,
      yExtent
    ]
  )
  usePhysicsHocHandle(ref, { frameRef, spawnDatum })

  const handlePointerDown = useCallback<
    NonNullable<StreamPhysicsFrameProps["onBodyPointerDown"]>
  >(
    (body, event) => {
      frameProps.onBodyPointerDown?.(body, event)
      if (!body?.datum || !onClick) return
      onClick(body.datum, { x: body.x, y: body.y })
    },
    [frameProps, onClick]
  )

  if (stateEl) return stateEl
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    resolved.result.semanticItems
  )

  return renderPhysicsFrame(
    "PhysicsCustomChart",
    chartSize,
    <StreamPhysicsFrame
      {...frameProps}
      {...tooltipProps}
      {...sharedFrameProps}
      ref={frameRef}
      backgroundGraphics={composePhysicsFrameGraphics(
        frameProps.backgroundGraphics,
        resolved.result.backgroundOverlays
      )}
      bodyStyle={resolved.result.bodyStyle ?? frameProps.bodyStyle ?? fallbackBodyStyle}
      className={className}
      config={resolved.config}
      foregroundGraphics={composePhysicsFrameGraphics(
        frameProps.foregroundGraphics,
        resolved.result.overlays
      )}
      initialSpawnPacing={resolved.initialSpawnPacing}
      initialSpawns={resolved.initialSpawns}
      onBodyPointerDown={handlePointerDown}
      paused={paused}
      responsiveHeight={props.responsiveHeight}
      responsiveWidth={props.responsiveWidth}
      selectedBodyStyle={
        resolved.result.selectedBodyStyle ?? frameProps.selectedBodyStyle
      }
      size={chartSize}
      title={title ?? "Physics custom chart"}
    />
  )
}) as unknown as {
  <
    TDatum extends Datum = Datum,
    TConfig extends object = Record<string, unknown>
  >(
    props: PhysicsCustomChartProps<TDatum, TConfig> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(PhysicsCustomChart as { displayName?: string }).displayName =
  "PhysicsCustomChart"

export default PhysicsCustomChart

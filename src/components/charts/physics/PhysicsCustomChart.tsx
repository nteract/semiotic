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
  type StreamPhysicsBodyForce,
  type StreamPhysicsFrameHandle,
  type StreamPhysicsFrameProps,
  type StreamPhysicsRegionEffect
} from "../../stream/physics/StreamPhysicsFrame"
import type { PhysicsController } from "../../stream/physics/PhysicsControllers"
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
  usePhysicsChartMode,
  type PhysicsHocFrameProps,
  type PhysicsSharedChartProps,
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
  /**
   * Region effects (membranes, capacity stages, portals). Prefer declaring
   * these here and driving interaction via `controllers` / `layoutConfig`
   * rather than re-spawning bodies.
   */
  regionEffects?: StreamPhysicsRegionEffect[]
  /**
   * Process plugins (capacity queues, portals). Tick with the frame heartbeat
   * without rebuilding world topology when only `layoutConfig` changes.
   */
  controllers?: PhysicsController[]
  bodyForces?: StreamPhysicsBodyForce
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
> extends Omit<BaseChartProps, "margin">,
    PhysicsSharedChartProps {
  data?: TDatum[]
  layout: PhysicsCustomLayout<TDatum, TConfig>
  /**
   * Interaction / style config passed as `ctx.config`. Changing only
   * `layoutConfig` re-runs the layout for regionEffects, controllers, overlays,
   * and bodyStyle — it does **not** re-create the physics store or re-enqueue
   * initial spawns (topology is keyed by data + size + layout identity).
   */
  layoutConfig?: TConfig
  config?: PhysicsPipelineConfig
  size?: [number, number]
  xExtent?: [number, number]
  yExtent?: [number, number]
  colorBy?: ChartAccessor<TDatum, string | number>
  colorScheme?: string | string[] | Record<string, string>
  paused?: boolean
  tooltip?: TooltipProp
  /**
   * Extra process controllers composed with any returned from `layout()`.
   */
  controllers?: PhysicsController[]
  spawnDatum?: (
    datum: TDatum,
    index: number,
    ctx: PhysicsCustomLayoutContext<TDatum, TConfig>
  ) => PhysicsCustomSpawnDatumResult
  /**
   * Frame passthrough. Prefer top-level `controllers` / layout-returned
   * regionEffects; frameProps merges are still supported for escape hatches.
   */
  frameProps?: PhysicsHocFrameProps<"config">
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

export function resolveCustomLayout<
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
    controllers: propControllers,
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
  const layoutMode = usePhysicsChartMode(props, [700, 380])
  const {
    chartSize,
    className: modeClassName,
    title: modeTitle,
    chartMode,
    compactMode,
    margin: modeMargin,
    enableHover: modeEnableHover,
    description: modeDescription,
    summary: modeSummary,
    accessibleTable: modeAccessibleTable
  } = layoutMode
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const topologySpawnsRef = useRef<PhysicsQueuedSpawn[] | null>(null)
  const topologyKeyRef = useRef<string>("")
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

  // Topology key excludes layoutConfig so interaction restyles do not re-enqueue bodies.
  const topologyKey = useMemo(
    () =>
      [
        chartSize[0],
        chartSize[1],
        safeData.length,
        safeData
          .map((row, index) => String(row.id ?? index))
          .join("|"),
        xExtent?.join(",") ?? "",
        yExtent?.join(",") ?? ""
      ].join("::"),
    [chartSize, safeData, xExtent, yExtent]
  )

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

  if (topologyKeyRef.current !== topologyKey || topologySpawnsRef.current == null) {
    topologyKeyRef.current = topologyKey
    topologySpawnsRef.current = resolved.initialSpawns
  }
  const stableInitialSpawns = topologySpawnsRef.current

  const controllers = useMemo(() => {
    const fromLayout = resolved.result.controllers ?? []
    const fromProps = propControllers ?? []
    const fromFrame = frameProps.controllers ?? []
    const merged = [...fromLayout, ...fromProps, ...fromFrame]
    return merged.length ? merged : undefined
  }, [frameProps.controllers, propControllers, resolved.result.controllers])

  const regionEffects = useMemo(() => {
    const fromLayout = resolved.result.regionEffects ?? []
    const fromFrame = frameProps.regionEffects ?? []
    const merged = [...fromLayout, ...fromFrame]
    return merged.length ? merged : undefined
  }, [frameProps.regionEffects, resolved.result.regionEffects])

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
  usePhysicsHocHandle(ref, {
    frameRef,
    spawnDatum,
    seedRows: safeData as Datum[],
    seedSpawns: stableInitialSpawns
  })

  const handlePointerDown = useCallback<
    NonNullable<StreamPhysicsFrameProps["onBodyPointerDown"]>
  >(
    (body, event) => {
      // Semiotic onClick/onObservation are owned by StreamPhysicsFrame via
      // resolvePhysicsFrameSharedProps — only forward frameProps escape hatch.
      frameProps.onBodyPointerDown?.(body, event)
    },
    [frameProps]
  )

  if (stateEl) return stateEl
  const tooltipProps = resolvePhysicsTooltipProps(props.tooltip, frameProps)
  const sharedFrameProps = resolvePhysicsFrameSharedProps(
    props,
    frameProps,
    resolved.result.semanticItems,
    {
      chartMode,
      className: modeClassName,
      title: compactMode ? modeTitle : (modeTitle ?? title ?? "Physics custom chart"),
      description: modeDescription,
      summary: modeSummary,
      accessibleTable: modeAccessibleTable,
      enableHover: modeEnableHover,
      margin: modeMargin
    }
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
      bodyForces={resolved.result.bodyForces ?? frameProps.bodyForces}
      bodyStyle={resolved.result.bodyStyle ?? frameProps.bodyStyle ?? fallbackBodyStyle}
      config={resolved.config}
      controllers={controllers}
      foregroundGraphics={composePhysicsFrameGraphics(
        frameProps.foregroundGraphics,
        resolved.result.overlays
      )}
      initialSpawnPacing={resolved.initialSpawnPacing}
      initialSpawns={stableInitialSpawns}
      onBodyPointerDown={handlePointerDown}
      paused={paused}
      regionEffects={regionEffects}
      responsiveHeight={props.responsiveHeight}
      responsiveWidth={props.responsiveWidth}
      selectedBodyStyle={
        resolved.result.selectedBodyStyle ?? frameProps.selectedBodyStyle
      }
      size={chartSize}
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

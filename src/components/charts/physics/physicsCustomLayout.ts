import { scaleLinear } from "d3-scale"
import {
  buildResolveColor,
  resolveCustomLayoutPalette,
  schemeCategory10
} from "../../stream/customLayoutPalette"
import type { ThemeSemanticColors } from "../../stream/types"
import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsQueuedSpawn,
  type PhysicsSpawnPacingOptions
} from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsSpringSpec } from "../../stream/physics/PhysicsKernel"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"
import { physicsChartArea } from "./physicsChartUtils"
import type {
  PhysicsCustomLayout,
  PhysicsCustomLayoutContext,
  PhysicsCustomLayoutResult
} from "./PhysicsCustomChart"

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

/**
 * Resolve the pure PhysicsCustomChart layout contract without importing the
 * React HOC. Shared by the component and the static server renderer.
 */
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

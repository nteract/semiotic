import type { Datum } from "../shared/datumTypes"
import { compileMotionEncoding, resolveMotionAccessor } from "../shared/motionEncoding"
import type {
  MotionCoordinateSpace,
  MotionEncoding,
  MotionEncodingAccessor,
  MotionEncodingConstant,
  MotionKinematicsEncoding,
  MotionPlacementEncoding,
  MotionProcessEncoding,
  MotionTimeBasis,
  MotionTimeEncoding,
  MotionTimeUnit,
  ResolvedMotionEncodingRow
} from "../shared/motionEncoding"
import type { Style } from "../../stream/types"
import type {
  PhysicsBodyShape,
  PhysicsBodyState
} from "../../stream/physics/PhysicsKernel"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type { PhysicsSemanticItem } from "../../stream/physics/StreamPhysicsFrame"
import type {
  PhysicsCustomLayout,
  PhysicsCustomLayoutContext,
  PhysicsCustomLayoutResult
} from "./PhysicsCustomChart"

/** Explicit literal wrapper for channels whose values could also be field names. */
export type PhysicsEncodingConstant<TValue> =
  MotionEncodingConstant<TValue>

/**
 * A data channel can read a field, calculate a value, or provide an explicit
 * constant. Constants use a wrapper so string values are never confused with
 * field names.
 */
export type PhysicsEncodingAccessor<TDatum, TValue> =
  MotionEncodingAccessor<TDatum, TValue>

export interface PhysicsAppearanceEncoding<TDatum> {
  color?: PhysicsEncodingAccessor<TDatum, string>
  opacity?: PhysicsEncodingAccessor<TDatum, number>
  shape?: PhysicsEncodingAccessor<TDatum, PhysicsBodyShape>
  size?: PhysicsEncodingAccessor<TDatum, number>
  stroke?: PhysicsEncodingAccessor<TDatum, string>
  strokeWidth?: PhysicsEncodingAccessor<TDatum, number>
}

export type PhysicsPlacementEncoding<TDatum> = MotionPlacementEncoding<TDatum>

export interface PhysicsTimeEncoding<TDatum>
  extends MotionTimeEncoding<TDatum> {
  /** Simulated time at which the body enters the world. */
  spawnAt?: PhysicsEncodingAccessor<TDatum, number>
}

export type PhysicsKinematicsEncoding<TDatum> = MotionKinematicsEncoding<TDatum>

/**
 * Causal simulation channels. Unlike appearance channels, these values change
 * behavior and should be paired with visible or settled evidence when they
 * carry analytical meaning.
 */
export interface PhysicsDynamicsEncoding<TDatum> {
  bodyCollisions?: PhysicsEncodingAccessor<TDatum, boolean>
  friction?: PhysicsEncodingAccessor<TDatum, number>
  mass?: PhysicsEncodingAccessor<TDatum, number>
  restitution?: PhysicsEncodingAccessor<TDatum, number>
}

export type PhysicsProcessEncoding<TDatum> = MotionProcessEncoding<TDatum>

export interface PhysicsAccessibleEncoding<TDatum> {
  description?: PhysicsEncodingAccessor<TDatum, string>
  group?: PhysicsEncodingAccessor<TDatum, string>
  label?: PhysicsEncodingAccessor<TDatum, string>
}

/**
 * Grammar-of-graphics bridge for physics-backed charts. Visual channels remain
 * separate from causal dynamics and from process/evidence channels so motion
 * does not silently become an unexplained quantitative encoding.
 */
export interface PhysicsEncoding<TDatum extends Datum = Datum> {
  id: PhysicsEncodingAccessor<TDatum, string | number>
  appearance?: PhysicsAppearanceEncoding<TDatum>
  placement?: PhysicsPlacementEncoding<TDatum>
  time?: PhysicsTimeEncoding<TDatum>
  kinematics?: PhysicsKinematicsEncoding<TDatum>
  dynamics?: PhysicsDynamicsEncoding<TDatum>
  process?: PhysicsProcessEncoding<TDatum>
  /** Named analytical values retained on resolved rows for projections. */
  evidence?: Record<string, PhysicsEncodingAccessor<TDatum, unknown>>
  accessible?: PhysicsAccessibleEncoding<TDatum>
}

export interface PhysicsEncodingDefaults {
  color?: string
  mass?: number
  opacity?: number
  shape?: PhysicsBodyShape
  size?: number
  stroke?: string
  strokeWidth?: number
  x?: number
  y?: number
}

/**
 * A resolved physics row is a resolved motion row (the shared neutral channels
 * — kinematics, process, evidence, accessible) plus the physics-only channels:
 * appearance, causal dynamics, a scaled/required placement, spawn timing, and
 * the queued body spawn. Physics is literally a superset of motion.
 */
export interface ResolvedPhysicsEncodingRow<TDatum extends Datum = Datum>
  extends Omit<ResolvedMotionEncodingRow<TDatum>, "placement" | "time"> {
  appearance: {
    color?: string
    opacity?: number
    shape: PhysicsBodyShape
    size: number
    stroke?: string
    strokeWidth?: number
  }
  placement: {
    x: number
    y: number
    lane?: string | number
    space?: MotionCoordinateSpace
  }
  time: {
    arrival?: number
    spawnAt?: number
    basis?: MotionTimeBasis
    unit?: MotionTimeUnit
  }
  dynamics: {
    bodyCollisions?: boolean
    friction?: number
    mass: number
    restitution?: number
  }
  spawn: PhysicsQueuedSpawn
}

export interface PhysicsEncodingCompilation<TDatum extends Datum = Datum> {
  rows: ResolvedPhysicsEncodingRow<TDatum>[]
  byId: Map<string, ResolvedPhysicsEncodingRow<TDatum>>
  spawns: PhysicsQueuedSpawn[]
  semanticItems: PhysicsSemanticItem[]
  /**
   * Per-body style lookup. Always the function form (the compiler resolves one
   * style per id up front); assignable to `StreamPhysicsFrameProps["bodyStyle"]`.
   */
  bodyStyle: (body: PhysicsBodyState) => Style
}

export interface CompilePhysicsEncodingOptions<
  TDatum extends Datum = Datum
> {
  data: readonly TDatum[]
  encoding: PhysicsEncoding<TDatum>
  defaults?: PhysicsEncodingDefaults
  scales?: {
    x?: (value: number) => number
    y?: (value: number) => number
  }
}

/** Resolve row accessors once into worker-safe body spawns and chart metadata. */
export function compilePhysicsEncoding<TDatum extends Datum = Datum>(
  options: CompilePhysicsEncodingOptions<TDatum>
): PhysicsEncodingCompilation<TDatum> {
  const { data, encoding, defaults = {}, scales } = options

  // The neutral motion channels — id (with validation + duplicate detection),
  // time.arrival, raw placement, kinematics, process, evidence, and the
  // accessible label/description plus the group←stage fallback — are resolved
  // once by the shared motion compiler. Physics only layers on the channels
  // that motion doesn't have: appearance, causal dynamics, spawn timing, and
  // scale-applied placement.
  const motion = compileMotionEncoding<TDatum>({
    data,
    encoding: encoding as MotionEncoding<TDatum>
  })

  const rows: ResolvedPhysicsEncodingRow<TDatum>[] = []
  const byId = new Map<string, ResolvedPhysicsEncodingRow<TDatum>>()
  const spawns: PhysicsQueuedSpawn[] = []
  const semanticItems: PhysicsSemanticItem[] = []
  const styles = new Map<string, Style>()

  motion.rows.forEach((motionRow, index) => {
    const { id, datum } = motionRow

    const size = Math.max(
      0,
      resolveMotionAccessor(encoding.appearance?.size, datum, index) ??
        defaults.size ??
        6
    )
    const shape =
      resolveMotionAccessor(encoding.appearance?.shape, datum, index) ??
      defaults.shape ??
      ({ type: "circle", radius: size } as PhysicsBodyShape)
    const xValue = motionRow.placement.x ?? defaults.x ?? 0
    const yValue = motionRow.placement.y ?? defaults.y ?? 0
    const x = scales?.x ? scales.x(xValue) : xValue
    const y = scales?.y ? scales.y(yValue) : yValue
    const color =
      resolveMotionAccessor(encoding.appearance?.color, datum, index) ??
      defaults.color
    const opacity =
      resolveMotionAccessor(encoding.appearance?.opacity, datum, index) ??
      defaults.opacity
    const stroke =
      resolveMotionAccessor(encoding.appearance?.stroke, datum, index) ??
      defaults.stroke
    const strokeWidth =
      resolveMotionAccessor(encoding.appearance?.strokeWidth, datum, index) ??
      defaults.strokeWidth
    const spawnAt =
      resolveMotionAccessor(encoding.time?.spawnAt, datum, index) ??
      motionRow.time.arrival
    const velocityX = motionRow.kinematics.velocityX
    const velocityY = motionRow.kinematics.velocityY
    const mass =
      resolveMotionAccessor(encoding.dynamics?.mass, datum, index) ??
      defaults.mass ??
      1
    const friction = resolveMotionAccessor(
      encoding.dynamics?.friction,
      datum,
      index
    )
    const restitution = resolveMotionAccessor(
      encoding.dynamics?.restitution,
      datum,
      index
    )
    const bodyCollisions = resolveMotionAccessor(
      encoding.dynamics?.bodyCollisions,
      datum,
      index
    )

    const spawn: PhysicsQueuedSpawn = {
      id,
      x,
      y,
      mass,
      shape: { ...shape } as PhysicsBodyShape,
      datum,
      ...(spawnAt != null && { spawnAt }),
      ...(velocityX != null && { vx: velocityX }),
      ...(velocityY != null && { vy: velocityY }),
      ...(friction != null && { friction }),
      ...(restitution != null && { restitution }),
      ...(bodyCollisions != null && { bodyCollisions })
    }
    const style: Style = {
      ...(color != null && { fill: color }),
      ...(opacity != null && { opacity }),
      ...(stroke != null && { stroke }),
      ...(strokeWidth != null && { strokeWidth })
    }
    const row: ResolvedPhysicsEncodingRow<TDatum> = {
      id,
      datum,
      appearance: {
        color,
        opacity,
        shape,
        size,
        stroke,
        strokeWidth
      },
      placement: {
        x,
        y,
        lane: motionRow.placement.lane,
        space: encoding.placement?.space ?? "world"
      },
      time: {
        arrival: spawnAt,
        spawnAt,
        basis: encoding.time?.basis ?? "simulation",
        unit: encoding.time?.unit
      },
      kinematics: {
        velocityX,
        velocityY,
        space: encoding.kinematics?.space ?? "world"
      },
      dynamics: {
        bodyCollisions,
        friction,
        mass,
        restitution
      },
      process: motionRow.process,
      evidence: motionRow.evidence,
      accessible: motionRow.accessible,
      spawn
    }

    rows.push(row)
    byId.set(id, row)
    spawns.push(spawn)
    styles.set(id, style)
    semanticItems.push({
      id,
      bodyId: id,
      label: motionRow.accessible.label,
      description: motionRow.accessible.description,
      datum,
      x,
      y,
      group: motionRow.accessible.group
    })
  })

  const bodyStyle = (body: PhysicsBodyState): Style =>
    styles.get(body.id) ?? {}

  return { rows, byId, spawns, semanticItems, bodyStyle }
}

export type PhysicsEncodingLayoutExtension = Omit<
  PhysicsCustomLayoutResult,
  "bodies" | "initialSpawns" | "bodyStyle" | "semanticItems"
> & {
  semanticItems?: PhysicsSemanticItem[]
}

export interface CreatePhysicsEncodingLayoutOptions<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> {
  encoding: PhysicsEncoding<TDatum>
  defaults?: PhysicsEncodingDefaults
  /** Add constraints, regions, controllers, world config, and overlays. */
  extend?: (
    context: PhysicsCustomLayoutContext<TDatum, TConfig>,
    compilation: PhysicsEncodingCompilation<TDatum>
  ) => PhysicsEncodingLayoutExtension | undefined
}

/** Build a PhysicsCustomChart layout from declarative data encodings. */
export function createPhysicsEncodingLayout<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(
  options: CreatePhysicsEncodingLayoutOptions<TDatum, TConfig>
): PhysicsCustomLayout<TDatum, TConfig> {
  return (context) => {
    const compilation = compilePhysicsEncoding({
      data: context.data,
      encoding: options.encoding,
      defaults: options.defaults,
      scales: context.scales
    })
    const extension = options.extend?.(context, compilation) ?? {}
    return {
      ...extension,
      initialSpawns: compilation.spawns,
      bodyStyle: compilation.bodyStyle,
      semanticItems: [
        ...compilation.semanticItems,
        ...(extension.semanticItems ?? [])
      ]
    }
  }
}

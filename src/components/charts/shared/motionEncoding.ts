import type { Datum } from "./datumTypes"
import {
  bandFromAge,
  type LifecycleBand,
  type LifecycleBandThresholds
} from "../../realtime/lifecycleBands"

/** Explicit literal wrapper for channels whose values could be field names. */
export interface MotionEncodingConstant<TValue> {
  constant: TValue
}

/** A motion channel can read a field, calculate a value, or use a constant. */
export type MotionEncodingAccessor<TDatum, TValue> =
  | keyof TDatum
  | ((datum: TDatum, index: number) => TValue)
  | MotionEncodingConstant<TValue>

/** The clock that gives an arrival or age value meaning. */
export type MotionTimeBasis =
  | "event"
  | "ingest"
  | "simulation"
  | "presentation"
  | "buffer-index"

/** Motion helpers do not convert units; related values must use the same unit. */
export type MotionTimeUnit =
  | "milliseconds"
  | "seconds"
  | "frames"
  | "index"

/** Coordinate system in which placement or velocity values are expressed. */
export type MotionCoordinateSpace = "data" | "world" | "screen"

export interface MotionTimeEncoding<TDatum> {
  /** Time at which the datum enters the represented system. */
  arrival?: MotionEncodingAccessor<TDatum, number>
  basis?: MotionTimeBasis
  unit?: MotionTimeUnit
}

export interface MotionPlacementEncoding<TDatum> {
  x?: MotionEncodingAccessor<TDatum, number>
  y?: MotionEncodingAccessor<TDatum, number>
  lane?: MotionEncodingAccessor<TDatum, string | number>
  space?: MotionCoordinateSpace
}

export interface MotionKinematicsEncoding<TDatum> {
  velocityX?: MotionEncodingAccessor<TDatum, number>
  velocityY?: MotionEncodingAccessor<TDatum, number>
  space?: MotionCoordinateSpace
}

export interface MotionProcessEncoding<TDatum> {
  group?: MotionEncodingAccessor<TDatum, string | number>
  stage?: MotionEncodingAccessor<TDatum, string | number>
  target?: MotionEncodingAccessor<TDatum, string | number>
  work?: MotionEncodingAccessor<TDatum, number>
}

export interface MotionAccessibleEncoding<TDatum> {
  description?: MotionEncodingAccessor<TDatum, string>
  group?: MotionEncodingAccessor<TDatum, string>
  label?: MotionEncodingAccessor<TDatum, string>
}

/** Runtime-neutral motion channels shared by streaming and physics adapters. */
export interface MotionEncoding<TDatum extends Datum = Datum> {
  id: MotionEncodingAccessor<TDatum, string | number>
  time?: MotionTimeEncoding<TDatum>
  placement?: MotionPlacementEncoding<TDatum>
  kinematics?: MotionKinematicsEncoding<TDatum>
  process?: MotionProcessEncoding<TDatum>
  evidence?: Record<string, MotionEncodingAccessor<TDatum, unknown>>
  accessible?: MotionAccessibleEncoding<TDatum>
}

export interface ResolvedMotionEncodingRow<TDatum extends Datum = Datum> {
  id: string
  datum: TDatum
  time: {
    arrival?: number
    basis?: MotionTimeBasis
    unit?: MotionTimeUnit
  }
  placement: {
    x?: number
    y?: number
    lane?: string | number
    space?: MotionCoordinateSpace
  }
  kinematics: {
    velocityX?: number
    velocityY?: number
    space?: MotionCoordinateSpace
  }
  process: {
    group?: string | number
    stage?: string | number
    target?: string | number
    work?: number
  }
  evidence: Record<string, unknown>
  accessible: {
    description?: string
    group?: string
    label: string
  }
}

export interface MotionEncodingCompilation<TDatum extends Datum = Datum> {
  rows: ResolvedMotionEncodingRow<TDatum>[]
  byId: Map<string, ResolvedMotionEncodingRow<TDatum>>
}

export interface CompileMotionEncodingOptions<
  TDatum extends Datum = Datum
> {
  data: readonly TDatum[]
  encoding: MotionEncoding<TDatum>
}

/** Resolve one encoding accessor without attaching it to a specific runtime. */
export function resolveMotionAccessor<TDatum, TValue>(
  accessor: MotionEncodingAccessor<TDatum, TValue> | undefined,
  datum: TDatum,
  index: number
): TValue | undefined {
  if (accessor == null) return undefined
  if (typeof accessor === "function") return accessor(datum, index)
  if (
    typeof accessor === "object" &&
    accessor !== null &&
    "constant" in accessor
  ) {
    return accessor.constant
  }
  return datum[accessor as keyof TDatum] as TValue
}

/** Resolve runtime-neutral motion channels once while preserving source data. */
export function compileMotionEncoding<TDatum extends Datum = Datum>(
  options: CompileMotionEncodingOptions<TDatum>
): MotionEncodingCompilation<TDatum> {
  const { data, encoding } = options
  const rows: ResolvedMotionEncodingRow<TDatum>[] = []
  const byId = new Map<string, ResolvedMotionEncodingRow<TDatum>>()

  data.forEach((datum, index) => {
    const rawId = resolveMotionAccessor(encoding.id, datum, index)
    if (rawId == null || rawId === "") {
      throw new Error(
        `[semiotic] Motion encoding row ${index} resolved an empty id.`
      )
    }
    const id = String(rawId)
    if (byId.has(id)) {
      throw new Error(`[semiotic] Duplicate motion encoding id "${id}".`)
    }

    const processGroup = resolveMotionAccessor(
      encoding.process?.group,
      datum,
      index
    )
    const processStage = resolveMotionAccessor(
      encoding.process?.stage,
      datum,
      index
    )
    const accessibleGroup =
      resolveMotionAccessor(encoding.accessible?.group, datum, index) ??
      (processGroup != null
        ? String(processGroup)
        : processStage != null
          ? String(processStage)
          : undefined)
    const evidence: Record<string, unknown> = {}
    for (const name of Object.keys(encoding.evidence ?? {})) {
      evidence[name] = resolveMotionAccessor(
        encoding.evidence?.[name],
        datum,
        index
      )
    }

    const row: ResolvedMotionEncodingRow<TDatum> = {
      id,
      datum,
      time: {
        arrival: resolveMotionAccessor(encoding.time?.arrival, datum, index),
        basis: encoding.time?.basis,
        unit: encoding.time?.unit
      },
      placement: {
        x: resolveMotionAccessor(encoding.placement?.x, datum, index),
        y: resolveMotionAccessor(encoding.placement?.y, datum, index),
        lane: resolveMotionAccessor(encoding.placement?.lane, datum, index),
        space: encoding.placement?.space
      },
      kinematics: {
        velocityX: resolveMotionAccessor(
          encoding.kinematics?.velocityX,
          datum,
          index
        ),
        velocityY: resolveMotionAccessor(
          encoding.kinematics?.velocityY,
          datum,
          index
        ),
        space: encoding.kinematics?.space
      },
      process: {
        group: processGroup,
        stage: processStage,
        target: resolveMotionAccessor(encoding.process?.target, datum, index),
        work: resolveMotionAccessor(encoding.process?.work, datum, index)
      },
      evidence,
      accessible: {
        description: resolveMotionAccessor(
          encoding.accessible?.description,
          datum,
          index
        ),
        group: accessibleGroup,
        label:
          resolveMotionAccessor(encoding.accessible?.label, datum, index) ?? id
      }
    }

    rows.push(row)
    byId.set(id, row)
  })

  return { rows, byId }
}

export interface ResolveMotionAgeOptions {
  now: number
  arrival: number
  /** Uses the same unit as now and arrival. */
  ttl: number
  thresholds?: LifecycleBandThresholds
}

export interface ResolvedMotionAge {
  age: number
  /** Unbounded age / ttl ratio. Negative and invalid ages resolve to zero. */
  progress: number
  lifecycle: LifecycleBand
}

/**
 * Derive age, its unbounded ttl progress, and its named lifecycle band from
 * values on a common clock — the one-call helper for authoring custom
 * age-based encodings (see the Motion Encodings guide, which drives an "age +
 * lifecycle" table from it). For band-only or ramp-only needs, reach for
 * `bandFromAge` / `opacityFromAge` directly.
 */
export function resolveMotionAge(
  options: ResolveMotionAgeOptions
): ResolvedMotionAge {
  const age = options.now - options.arrival
  const progress =
    Number.isFinite(age) && Number.isFinite(options.ttl) && options.ttl > 0
      ? Math.max(0, age) / options.ttl
      : age === Infinity && Number.isFinite(options.ttl) && options.ttl > 0
        ? Infinity
        : 0
  return {
    age,
    progress,
    lifecycle: bandFromAge(age, options.ttl, options.thresholds)
  }
}

export type MotionAgeOpacityType = "linear" | "exponential" | "step"

export interface MotionAgeOpacityOptions {
  /** Age where zero is newest. */
  age: number
  /** Oldest meaningful age in the same unit. */
  extent: number
  type: MotionAgeOpacityType
  halfLife?: number
  threshold?: number
  minOpacity?: number
}

/** Map an age to opacity without assuming wall, simulation, or index time. */
export function opacityFromAge(options: MotionAgeOpacityOptions): number {
  const minOpacity = Math.max(0, Math.min(1, options.minOpacity ?? 0.1))
  if (Number.isNaN(options.age)) return 1
  if (options.age === Infinity) return minOpacity
  if (!Number.isFinite(options.extent) || options.extent <= 0) return 1
  const age = Math.max(0, options.age)

  if (options.type === "step") {
    const threshold = options.threshold ?? options.extent * 0.5
    return age < threshold ? 1 : minOpacity
  }
  if (options.type === "exponential") {
    const requestedHalfLife = options.halfLife ?? options.extent / 2
    const halfLife = requestedHalfLife > 0 ? requestedHalfLife : options.extent / 2
    const amount = Math.pow(0.5, age / halfLife)
    return minOpacity + amount * (1 - minOpacity)
  }

  const amount = Math.max(0, Math.min(1, 1 - age / options.extent))
  return minOpacity + amount * (1 - minOpacity)
}

export interface MotionPoint {
  x: number
  y: number
}

export interface ResolvedMotionVector {
  velocityX: number
  velocityY: number
  speed: number
  /** atan2 angle in radians in the supplied coordinate space. */
  direction: number
}

/** Resolve cartesian velocity into speed and direction. */
export function resolveMotionVector(
  velocityX: number,
  velocityY: number
): ResolvedMotionVector {
  const safeX = Number.isFinite(velocityX) ? velocityX : 0
  const safeY = Number.isFinite(velocityY) ? velocityY : 0
  return {
    velocityX: safeX,
    velocityY: safeY,
    speed: Math.hypot(safeX, safeY),
    direction: Math.atan2(safeY, safeX)
  }
}

/** Derive velocity per elapsed unit between two positions. */
export function deriveMotionVector(
  previous: MotionPoint,
  current: MotionPoint,
  elapsed: number
): ResolvedMotionVector {
  if (!Number.isFinite(elapsed) || elapsed <= 0) {
    return resolveMotionVector(0, 0)
  }
  return resolveMotionVector(
    (current.x - previous.x) / elapsed,
    (current.y - previous.y) / elapsed
  )
}

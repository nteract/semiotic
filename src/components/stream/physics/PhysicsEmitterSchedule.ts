import {
  createSyntheticEmitter,
  type SyntheticEmitterLimits,
  type SyntheticEmitterSnapshot,
  type SyntheticSourceSpec
} from "../../recipes/syntheticArrivals"
import type { PhysicsQueuedSpawn } from "./PhysicsPipelineTypes"
import { validatePhysicsSpawn } from "./physicsInputValidation"
import { cloneSpawn } from "./physicsPipelineHelpers"

/** Fixed-step emission shared by synchronous and worker pipelines. */
export interface PhysicsEmitterOptions extends SyntheticEmitterLimits {
  sources: readonly SyntheticSourceSpec[]
  seed?: number
  /** Each source needs a spawn template. Arrival fields are added to datum. */
  templates: Readonly<
    Record<string, Omit<PhysicsQueuedSpawn, "id" | "spawnAt">>
  >
  rate?: number
  active?: Readonly<Record<string, boolean>>
  paused?: boolean
  /** Units for datum.time, eventTime and arrivalTime; scheduling always uses ms. */
  timeUnit?: "ms" | "s"
  /** Offset added to generated timestamps, in timeUnit. */
  originTime?: number
}

export interface PhysicsEmitterSnapshot {
  options: PhysicsEmitterOptions
  progress: SyntheticEmitterSnapshot
}

/** Source specs/seed/limits belong to a run; controls/templates update live. */
export class PhysicsEmitterSchedule {
  private emitter: ReturnType<typeof createSyntheticEmitter>

  constructor(private options: PhysicsEmitterOptions) {
    this.validate(options)
    this.emitter = createSyntheticEmitter(options.sources, options.seed, {
      durationMs: options.durationMs,
      maxEvents: options.maxEvents
    })
  }

  private validate(options: PhysicsEmitterOptions): void {
    if (options.originTime != null && !Number.isFinite(options.originTime))
      throw new RangeError("Emitter originTime must be finite")
    if (
      options.rate != null &&
      (!Number.isFinite(options.rate) || options.rate <= 0)
    )
      throw new RangeError("Emitter rate must be finite and positive")
    for (const source of options.sources) {
      const template = options.templates[source.id]
      if (!template)
        throw new RangeError(`Missing emitter template: ${source.id}`)
      validatePhysicsSpawn({ ...template, id: source.id })
    }
  }

  update(options: PhysicsEmitterOptions): void {
    const next = {
      ...options,
      sources: this.options.sources,
      seed: this.options.seed,
      durationMs: this.options.durationMs,
      maxEvents: this.options.maxEvents
    }
    this.validate(next)
    this.options = next
  }

  pending(): boolean {
    return (
      !this.options.paused &&
      !this.emitter.isComplete() &&
      this.options.sources.some(
        (source) => this.options.active?.[source.id] !== false
      )
    )
  }

  advance(seconds: number): PhysicsQueuedSpawn[] {
    const unit = this.options.timeUnit === "s" ? 0.001 : 1
    const origin = this.options.originTime ?? 0
    return this.emitter.advance(seconds * 1000, this.options).map((event) => {
      const template = this.options.templates[event.source]
      return {
        ...template,
        id: event.id,
        datum: {
          ...(template.datum as object),
          ...event,
          time: origin + event.eventTime * unit,
          eventTime: origin + event.eventTime * unit,
          arrivalTime: origin + event.arrivalTime * unit
        }
      }
    })
  }

  snapshot(): PhysicsEmitterSnapshot {
    return {
      options: {
        ...this.options,
        active: { ...this.options.active },
        sources: this.options.sources.map((source) => ({
          ...source,
          ...(source.burst && {
            burst: {
              ...source.burst,
              ...(source.burst.gapMs && {
                gapMs: [...source.burst.gapMs] as [number, number]
              })
            }
          }),
          ...(typeof source.jitter === "object" && {
            jitter: {
              ...source.jitter,
              buckets: source.jitter.buckets.map((bucket) => ({ ...bucket }))
            }
          })
        })),
        templates: Object.fromEntries(
          Object.entries(this.options.templates).map(([id, template]) => [
            id,
            cloneSpawn({ ...template, id })
          ])
        )
      },
      progress: this.progress()
    }
  }

  progress(): SyntheticEmitterSnapshot {
    return this.emitter.snapshot()
  }
  restoreProgress(progress: SyntheticEmitterSnapshot): void {
    this.emitter.restore(progress)
  }

  static restore(snapshot: PhysicsEmitterSnapshot): PhysicsEmitterSchedule {
    const schedule = new PhysicsEmitterSchedule(snapshot.options)
    schedule.emitter.restore(snapshot.progress)
    return schedule
  }
}

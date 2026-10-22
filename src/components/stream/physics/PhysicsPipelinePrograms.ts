import type {
  PhysicsEmitterOptions,
  PhysicsEmitterSchedule,
  PhysicsEmitterSnapshot
} from "./PhysicsEmitterSchedule"
import type {
  EventDropLiveConfig,
  EventDropLiveRuntime,
  EventDropLiveSnapshot
} from "../../charts/physics/EventDropLiveRuntime"
import type {
  PhysicsPipelineConfig,
  PhysicsPipelineSnapshot
} from "./PhysicsPipelineTypes"
import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"

/**
 * Constructors for the clock-driven programs. The modules that build their
 * configs (EventDropChart and the physics worker) register them, so a chart
 * that never uses `emitters` or live `eventDrop` never loads either runtime.
 */
export interface PhysicsProgramRuntimes {
  emitters: {
    create(options: PhysicsEmitterOptions): PhysicsEmitterSchedule
    restore(snapshot: PhysicsEmitterSnapshot): PhysicsEmitterSchedule
  }
  eventDrop: {
    create(config: EventDropLiveConfig): EventDropLiveRuntime
    restore(snapshot: EventDropLiveSnapshot): EventDropLiveRuntime
  }
}

const runtimes: Partial<PhysicsProgramRuntimes> = {}

export function registerPhysicsProgramRuntimes(
  next: Partial<PhysicsProgramRuntimes>
): void {
  Object.assign(runtimes, next)
}

function runtime<K extends keyof PhysicsProgramRuntimes>(
  kind: K
): PhysicsProgramRuntimes[K] {
  const found = runtimes[kind]
  if (!found)
    throw new Error(
      `Physics ${kind} configuration requires registerPhysicsLivePrograms() from semiotic/physics before a PhysicsPipelineStore is created or restored with it.`
    )
  return found
}

/** Serializable clock-driven programs share the pipeline's retained engine. */
export class PhysicsPipelinePrograms {
  emitters?: PhysicsEmitterSchedule
  eventDrop?: EventDropLiveRuntime

  configure(config: PhysicsPipelineConfig, world: PhysicsEngineAdapter): void {
    if (config.emitters === false) this.emitters = undefined
    else if (config.emitters) {
      if (this.emitters) this.emitters.update(config.emitters)
      else this.emitters = runtime("emitters").create(config.emitters)
    }
    if (config.eventDrop === false) this.eventDrop = undefined
    else if (config.eventDrop) {
      if (this.eventDrop) this.eventDrop.update(config.eventDrop, world)
      else this.eventDrop = runtime("eventDrop").create(config.eventDrop)
      world.setColliders(this.eventDrop.colliders())
    }
  }

  /** Finite work a "run to completion" settle must finish: live handoffs and camera catch-up. */
  backlog(): boolean {
    return Boolean(this.eventDrop?.backlog())
  }

  /** A live program or an active producer spends a capped settle's whole step budget. */
  ownsClock(): boolean {
    return Boolean(this.eventDrop || this.emitters?.pending())
  }

  /** Work that keeps the clock running: backlog, active producers or a time-driven live view. */
  pending(): boolean {
    return (
      this.backlog() ||
      Boolean(this.emitters?.pending() || this.eventDrop?.continuous())
    )
  }

  snapshot(): Pick<PhysicsPipelineSnapshot, "emitters" | "eventDrop"> {
    return {
      ...(this.emitters && { emitters: this.emitters.snapshot() }),
      ...(this.eventDrop && { eventDrop: this.eventDrop.snapshot() })
    }
  }

  static restore(snapshot: PhysicsPipelineSnapshot): PhysicsPipelinePrograms {
    const programs = new PhysicsPipelinePrograms()
    if (snapshot.emitters)
      programs.emitters = runtime("emitters").restore(snapshot.emitters)
    if (snapshot.eventDrop)
      programs.eventDrop = runtime("eventDrop").restore(snapshot.eventDrop)
    return programs
  }
}

import { PhysicsEmitterSchedule } from "./PhysicsEmitterSchedule"
import { EventDropLiveRuntime } from "../../charts/physics/EventDropLiveRuntime"
import type {
  PhysicsPipelineConfig,
  PhysicsPipelineSnapshot
} from "./PhysicsPipelineTypes"
import type { PhysicsEngineAdapter } from "./PhysicsEngineAdapter"

/** Serializable clock-driven programs share the pipeline's retained engine. */
export class PhysicsPipelinePrograms {
  emitters?: PhysicsEmitterSchedule
  eventDrop?: EventDropLiveRuntime

  configure(config: PhysicsPipelineConfig, world: PhysicsEngineAdapter): void {
    if (config.emitters === false) this.emitters = undefined
    else if (config.emitters) {
      if (this.emitters) this.emitters.update(config.emitters)
      else this.emitters = new PhysicsEmitterSchedule(config.emitters)
    }
    if (config.eventDrop === false) this.eventDrop = undefined
    else if (config.eventDrop) {
      if (this.eventDrop) this.eventDrop.update(config.eventDrop, world)
      else this.eventDrop = new EventDropLiveRuntime(config.eventDrop)
      world.setColliders(this.eventDrop.colliders())
    }
  }

  pending(): boolean {
    return Boolean(this.eventDrop || this.emitters?.pending())
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
      programs.emitters = PhysicsEmitterSchedule.restore(snapshot.emitters)
    if (snapshot.eventDrop)
      programs.eventDrop = EventDropLiveRuntime.restore(snapshot.eventDrop)
    return programs
  }
}

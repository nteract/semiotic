import { registerPhysicsProgramRuntimes } from "../../stream/physics/PhysicsPipelinePrograms"
import { PhysicsEmitterSchedule } from "../../stream/physics/PhysicsEmitterSchedule"
import { EventDropLiveRuntime } from "./EventDropLiveRuntime"

/**
 * Enable PhysicsPipelineStore `emitters` and live `eventDrop` programs.
 * EventDropChart and the physics worker register them automatically. Call
 * this once before constructing or restoring a store with either config
 * yourself. Ordinary physics charts never load the runtimes it registers.
 */
export function registerPhysicsLivePrograms(): void {
  registerPhysicsProgramRuntimes({
    emitters: {
      create: (options) => new PhysicsEmitterSchedule(options),
      restore: (snapshot) => PhysicsEmitterSchedule.restore(snapshot)
    },
    eventDrop: {
      create: (config) => new EventDropLiveRuntime(config),
      restore: (snapshot) => EventDropLiveRuntime.restore(snapshot)
    }
  })
}

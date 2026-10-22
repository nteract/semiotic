import {
  PhysicsPipelineStore,
  type PhysicsPipelineConfig,
  type PhysicsPipelineTickResult
} from "./PhysicsPipelineStore"
import {
  packPhysicsWorkerFrame,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import { registerPhysicsLivePrograms } from "../../charts/physics/registerPhysicsLivePrograms"

export interface PhysicsWorkerRuntime {
  handle: (command: PhysicsWorkerCommand) => PhysicsWorkerResponsePayload
}

function frameFromStore(
  store: PhysicsPipelineStore,
  result: PhysicsPipelineTickResult,
  structural = false
): PhysicsWorkerFrame {
  const live = store.workerLiveDelta()
  const bodiesChanged =
    live?.bodiesChanged ||
    result.spawned.length ||
    result.evicted.length ||
    result.sedimented.length ||
    result.events.some((event) => event.type === "travel-end")
  const snapshot =
    structural || (!live && bodiesChanged) ? store.snapshot() : undefined
  const bodies = store.readBodies()
  const frame = packPhysicsWorkerFrame(result, bodies, [], snapshot)
  if (live && !snapshot) {
    frame.live = live
    if (bodiesChanged) frame.structure = store.workerStructure()
  }
  if (bodies.some((body) => body.travel))
    frame.travelElapsed = Float64Array.from(
      bodies,
      (body) => body.travel?.elapsedSeconds ?? 0
    )
  // Body metadata lives in structural snapshots. Stable ticks transfer only
  // motion buffers and scheduling state, without another datum-bearing copy.
  frame.sleepTimes = store.workerSleepTimes(frame.ids)
  frame.bodies = []
  if (!snapshot && !frame.structure) frame.ids = []
  frame.state = store.workerState()
  return frame
}

function zeroTickFrame(store: PhysicsPipelineStore): PhysicsWorkerFrame {
  return frameFromStore(store, store.tick(0), true)
}

export function createPhysicsWorkerRuntime(): PhysicsWorkerRuntime {
  // The worker accepts any structured-cloneable host config, including live programs.
  registerPhysicsLivePrograms()
  let store = new PhysicsPipelineStore()

  return {
    handle(command) {
      switch (command.type) {
        case "init": {
          store = new PhysicsPipelineStore(
            command.config as PhysicsPipelineConfig | undefined
          )
          if (command.snapshot) {
            store.restore(command.snapshot)
          } else if (command.initialSpawns?.length) {
            store.enqueue(command.initialSpawns, command.initialSpawnPacing)
          }
          return { type: "frame", frame: zeroTickFrame(store) }
        }
        case "configure": {
          store.updateConfig(command.config as PhysicsPipelineConfig)
          return { type: "frame", frame: zeroTickFrame(store) }
        }
        case "enqueue": {
          store.enqueue(command.spawns, command.pacing)
          return { type: "frame", frame: zeroTickFrame(store) }
        }
        case "tick":
          return {
            type: "frame",
            frame: frameFromStore(store, store.tick(command.deltaSeconds))
          }
        case "settle":
          return {
            type: "frame",
            frame: frameFromStore(
              store,
              store.settleWithObservations(command.maxSteps)
            )
          }
        case "snapshot":
          return { type: "snapshot", snapshot: store.snapshot() }
        case "restore": {
          store.restore(command.snapshot)
          return { type: "frame", frame: zeroTickFrame(store) }
        }
        case "clear":
          store.clear()
          return { type: "frame", frame: zeroTickFrame(store) }
        case "remove": {
          const removed = store.remove(command.ids)
          return { type: "removed", removed, frame: zeroTickFrame(store) }
        }
        case "applyImpulse":
          store.applyImpulse(command.id, command.ix, command.iy)
          return { type: "frame", frame: zeroTickFrame(store) }
        case "setPaused":
          store.setPaused(command.paused)
          return { type: "frame", frame: zeroTickFrame(store) }
        case "setVisible":
          store.setVisible(command.visible)
          return { type: "frame", frame: zeroTickFrame(store) }
      }
    }
  }
}

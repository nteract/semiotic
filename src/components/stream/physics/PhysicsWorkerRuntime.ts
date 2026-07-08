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

export interface PhysicsWorkerRuntime {
  handle: (command: PhysicsWorkerCommand) => PhysicsWorkerResponsePayload
}

function frameFromStore(
  store: PhysicsPipelineStore,
  result: PhysicsPipelineTickResult
): PhysicsWorkerFrame {
  return packPhysicsWorkerFrame(
    result,
    store.readBodies(),
    store.readSediment(),
    store.snapshot()
  )
}

function zeroTickFrame(store: PhysicsPipelineStore): PhysicsWorkerFrame {
  return frameFromStore(store, store.tick(0))
}

export function createPhysicsWorkerRuntime(): PhysicsWorkerRuntime {
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

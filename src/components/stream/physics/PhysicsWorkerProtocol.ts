import type { PhysicsBodyState } from "./PhysicsKernel"
import type {
  PhysicsPipelineConfig,
  PhysicsPipelineObservationOptions,
  PhysicsPipelineSnapshot,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn,
  PhysicsSensorObservationConfig,
  PhysicsSpawnPacingOptions
} from "./PhysicsPipelineStore"
import type {
  PhysicsSedimentBinSnapshot,
} from "./PhysicsSediment"

export type PhysicsExecution = "auto" | "worker" | "sync"

export const DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD = 2500

export type PhysicsWorkerObservationOptions = Omit<
  PhysicsPipelineObservationOptions,
  "onObservation" | "onSimulationStateChange"
>

export type PhysicsWorkerSedimentConfig =
  | false
  | {
      binAccessor?: string
      labelAccessor?: string
      valueAccessor?: number | string
      retainBodyIds?: number
    }

export type PhysicsWorkerPipelineConfig = Omit<
  PhysicsPipelineConfig,
  "engine" | "observation" | "sediment"
> & {
  observation?: PhysicsWorkerObservationOptions
  sediment?: PhysicsWorkerSedimentConfig
}

export interface PhysicsWorkerFrame {
  bodies: PhysicsBodyState[]
  ids: string[]
  positions: Float32Array
  result: PhysicsPipelineTickResult
  sediment: PhysicsSedimentBinSnapshot[]
  sleeping: Uint8Array
  snapshot?: PhysicsPipelineSnapshot
  velocities: Float32Array
}

export type PhysicsWorkerCommand =
  | {
      type: "init"
      config?: PhysicsWorkerPipelineConfig
      initialSpawns?: PhysicsQueuedSpawn[]
      initialSpawnPacing?: PhysicsSpawnPacingOptions
      snapshot?: PhysicsPipelineSnapshot
    }
  | { type: "configure"; config: PhysicsWorkerPipelineConfig }
  | {
      type: "enqueue"
      spawns: PhysicsQueuedSpawn[]
      pacing?: PhysicsSpawnPacingOptions
    }
  | { type: "tick"; deltaSeconds: number }
  | { type: "settle"; maxSteps?: number }
  | { type: "snapshot" }
  | { type: "restore"; snapshot: PhysicsPipelineSnapshot }
  | { type: "clear" }
  | { type: "remove"; ids: string[] }
  | { type: "applyImpulse"; id: string; ix: number; iy: number }
  | { type: "setPaused"; paused: boolean }
  | { type: "setVisible"; visible: boolean }

export interface PhysicsWorkerRequest {
  command: PhysicsWorkerCommand
  requestId: number
}

export type PhysicsWorkerResponsePayload =
  | { type: "frame"; frame: PhysicsWorkerFrame }
  | { type: "removed"; frame: PhysicsWorkerFrame; removed: string[] }
  | { type: "snapshot"; snapshot: PhysicsPipelineSnapshot }

export type PhysicsWorkerResponse =
  | {
      ok: true
      payload: PhysicsWorkerResponsePayload
      requestId: number
    }
  | {
      error: {
        message: string
        name?: string
        stack?: string
      }
      ok: false
      requestId: number
    }

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function"
}

function isSerializableSedimentConfig(
  sediment: PhysicsPipelineConfig["sediment"]
): boolean {
  if (sediment === undefined || sediment === false) return true
  return (
    !isFunction(sediment.binAccessor) &&
    !isFunction(sediment.labelAccessor) &&
    !isFunction(sediment.valueAccessor)
  )
}

function isSerializablePacing(
  pacing: PhysicsSpawnPacingOptions | undefined
): boolean {
  return !isFunction(pacing?.timeAccessor)
}

function workerSedimentConfig(
  sediment: PhysicsPipelineConfig["sediment"]
): PhysicsWorkerSedimentConfig | undefined {
  if (sediment === undefined) return undefined
  if (sediment === false) return false
  if (!isSerializableSedimentConfig(sediment)) {
    throw new TypeError(
      "Physics worker sediment config only supports string or numeric accessors"
    )
  }
  return {
    binAccessor:
      typeof sediment.binAccessor === "string"
        ? sediment.binAccessor
        : undefined,
    labelAccessor:
      typeof sediment.labelAccessor === "string"
        ? sediment.labelAccessor
        : undefined,
    valueAccessor:
      typeof sediment.valueAccessor === "string" ||
      typeof sediment.valueAccessor === "number"
        ? sediment.valueAccessor
        : undefined,
    retainBodyIds: sediment.retainBodyIds
  }
}

function workerObservationConfig(
  observation: PhysicsPipelineConfig["observation"]
): PhysicsWorkerObservationOptions | undefined {
  if (!observation) return undefined
  return {
    chartId: observation.chartId,
    chartType: observation.chartType,
    sensors: observation.sensors as
      | Record<string, PhysicsSensorObservationConfig>
      | undefined
  }
}

export function isPhysicsWorkerConfigSupported(
  config: PhysicsPipelineConfig | undefined
): boolean {
  if (!config) return true
  return !config.engine && isSerializableSedimentConfig(config.sediment)
}

export function isPhysicsWorkerPacingSupported(
  pacing: PhysicsSpawnPacingOptions | undefined
): boolean {
  return isSerializablePacing(pacing)
}

export function createPhysicsWorkerConfig(
  config: PhysicsPipelineConfig | undefined = {}
): PhysicsWorkerPipelineConfig {
  if (config.engine) {
    throw new TypeError("Physics workers use the built-in kernel adapter")
  }
  const { engine: _engine, observation, sediment, ...rest } = config
  return {
    ...rest,
    observation: workerObservationConfig(observation),
    sediment: workerSedimentConfig(sediment)
  }
}

export function shouldUsePhysicsWorker(
  execution: PhysicsExecution,
  liveBodies: number,
  queuedBodies = 0,
  threshold = DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD
): boolean {
  if (execution === "sync") return false
  if (execution === "worker") return true
  return liveBodies + queuedBodies >= threshold
}

export function packPhysicsWorkerFrame(
  result: PhysicsPipelineTickResult,
  bodies: PhysicsBodyState[],
  sediment: PhysicsSedimentBinSnapshot[] = [],
  snapshot?: PhysicsPipelineSnapshot
): PhysicsWorkerFrame {
  const ids = new Array<string>(bodies.length)
  const positions = new Float32Array(bodies.length * 2)
  const velocities = new Float32Array(bodies.length * 2)
  const sleeping = new Uint8Array(bodies.length)

  bodies.forEach((body, index) => {
    const offset = index * 2
    ids[index] = body.id
    positions[offset] = body.x
    positions[offset + 1] = body.y
    velocities[offset] = body.vx
    velocities[offset + 1] = body.vy
    sleeping[index] = body.sleeping ? 1 : 0
  })

  return {
    bodies,
    ids,
    positions,
    result,
    sediment,
    sleeping,
    snapshot,
    velocities
  }
}

export function physicsWorkerFrameTransferables(
  frame: PhysicsWorkerFrame
): Transferable[] {
  return [
    frame.positions.buffer,
    frame.velocities.buffer,
    frame.sleeping.buffer
  ] as Transferable[]
}

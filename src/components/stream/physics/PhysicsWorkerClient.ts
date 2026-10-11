import type {
  PhysicsPipelineConfig,
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacingOptions
} from "./PhysicsPipelineStore"
import {
  createPhysicsWorkerConfig,
  isPhysicsWorkerPacingSupported,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerResponse,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import { PhysicsWorkerDatums } from "./physicsWorkerDatums"
import { commonJsWorkerModuleUrl } from "../workerModuleUrl"

import {
  ModuleWorkerSession,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField
} from "../moduleWorkerSession"

export function canUsePhysicsWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined"
}

export function createPhysicsWorker(): Worker {
  // Keep the Worker/URL expression intact so consumer bundlers also compile
  // imports inside the worker. CJS still resolves the shipped sibling asset.
  if (typeof import.meta.url === "string" && import.meta.url) {
    return new Worker(new URL("./physicsWorker.js", import.meta.url), {
      type: "module",
      name: "semiotic-physics"
    })
  }
  return new Worker(commonJsWorkerModuleUrl("physicsWorker.js"), {
    type: "module",
    name: "semiotic-physics"
  })
}

export class PhysicsWorkerSession extends ModuleWorkerSession<
  PhysicsWorkerCommand,
  PhysicsWorkerResponsePayload
> {
  private datums = new PhysicsWorkerDatums()

  constructor(worker: Worker = createPhysicsWorker()) {
    super({
      name: "Physics",
      createWorker: () => worker,
      requestTimeoutMs: 30_000,
      encodeRequest: (requestId, command) => ({ requestId, command }),
      parseMessage: (data) => {
        const { requestId, error } = parseModuleWorkerErrorField(data)
        const response = data as PhysicsWorkerResponse
        if (requestId === undefined || typeof response.ok !== "boolean") {
          throw new Error("Malformed physics worker response")
        }
        if (!response.ok) {
          if (!error) throw new Error("Malformed physics worker error")
          return {
            requestId,
            ok: false,
            error: moduleWorkerErrorFromPayload(error)
          }
        }
        if (
          !response.payload ||
          !["frame", "removed", "snapshot"].includes(response.payload.type)
        ) {
          throw new Error("Malformed physics worker payload")
        }
        return { requestId, ok: true, payload: response.payload }
      }
    })
  }

  override async request(
    command: PhysicsWorkerCommand,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerResponsePayload> {
    const revision = this.datums.capture(command)
    return this.datums.receive(await super.request(command, signal), revision)
  }

  async init(
    config?: PhysicsPipelineConfig,
    initialSpawns?: PhysicsQueuedSpawn[],
    initialSpawnPacing?: PhysicsSpawnPacingOptions,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    if (!isPhysicsWorkerPacingSupported(initialSpawnPacing)) {
      throw new TypeError(
        "Physics worker spawn pacing only supports string time accessors"
      )
    }
    const payload = await this.request(
      {
        type: "init",
        config: createPhysicsWorkerConfig(config),
        initialSpawns,
        initialSpawnPacing
      },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame init response")
    }
    return payload.frame
  }

  async restore(
    snapshot: PhysicsPipelineSnapshot,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request({ type: "restore", snapshot }, signal)
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame restore response")
    }
    return payload.frame
  }

  async initFromSnapshot(
    config: PhysicsPipelineConfig | undefined,
    snapshot: PhysicsPipelineSnapshot,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request(
      {
        type: "init",
        config: createPhysicsWorkerConfig(config),
        snapshot
      },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame init response")
    }
    return payload.frame
  }

  async enqueue(
    spawns: PhysicsQueuedSpawn[],
    pacing?: PhysicsSpawnPacingOptions,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    if (!isPhysicsWorkerPacingSupported(pacing)) {
      throw new TypeError(
        "Physics worker spawn pacing only supports string time accessors"
      )
    }
    const payload = await this.request(
      { type: "enqueue", spawns, pacing },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame enqueue response")
    }
    return payload.frame
  }

  async tick(
    deltaSeconds: number,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request(
      { type: "tick", deltaSeconds },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame tick response")
    }
    return payload.frame
  }

  async settle(
    maxSteps?: number,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request({ type: "settle", maxSteps }, signal)
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame settle response")
    }
    return payload.frame
  }

  async snapshot(signal?: AbortSignal): Promise<PhysicsPipelineSnapshot> {
    const payload = await this.request({ type: "snapshot" }, signal)
    if (payload.type !== "snapshot") {
      throw new Error("Physics worker returned a non-snapshot response")
    }
    return payload.snapshot
  }

  async remove(
    ids: string[],
    signal?: AbortSignal
  ): Promise<{ frame: PhysicsWorkerFrame; removed: string[] }> {
    const payload = await this.request({ type: "remove", ids }, signal)
    if (payload.type !== "removed") {
      throw new Error("Physics worker returned a non-remove response")
    }
    return { frame: payload.frame, removed: payload.removed }
  }
}

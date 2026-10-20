import type {
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn
} from "./PhysicsPipelineStore"
import { physicsPhaseDatum } from "./physicsBodyTravel"
import type {
  PhysicsWorkerCommand,
  PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"

/** Keep authored objects on the main thread across structured-clone responses. */
export class PhysicsWorkerDatums {
  private datums = new Map<string, { datum: unknown; revision: number }>()
  private revision = 0
  private ids: string[] = []

  private runtimeDatum(original: unknown, runtime: unknown): unknown {
    return runtime && typeof runtime === "object" && "__phase" in runtime &&
      typeof runtime.__phase === "string"
      ? physicsPhaseDatum(original, runtime.__phase)
      : original
  }

  private remember(bodies: PhysicsQueuedSpawn[]): void {
    for (const body of bodies)
      this.datums.set(body.id, { datum: body.datum, revision: this.revision })
  }

  capture(command: PhysicsWorkerCommand): number {
    this.revision++
    if (command.type === "init") {
      this.datums.clear()
      if (command.initialSpawns) this.remember(command.initialSpawns)
    }
    if (
      (command.type === "init" || command.type === "restore") &&
      command.snapshot
    ) {
      this.remember(command.snapshot.world.bodies)
      this.remember(command.snapshot.queue)
    }
    if (command.type === "enqueue") this.remember(command.spawns)
    return this.revision
  }

  private restore(snapshot: PhysicsPipelineSnapshot): void {
    for (const body of [...snapshot.world.bodies, ...snapshot.queue]) {
      const original = this.datums.get(body.id)
      if (original) body.datum = this.runtimeDatum(original.datum, body.datum)
    }
  }

  receive(
    payload: PhysicsWorkerResponsePayload,
    revision: number
  ): PhysicsWorkerResponsePayload {
    if (payload.type === "snapshot") {
      this.restore(payload.snapshot)
      return payload
    }
    const frame = payload.frame
    for (const event of frame.result.observations) {
      const original = event.bodyId && this.datums.get(event.bodyId)
      if (original) event.datum = this.runtimeDatum(original.datum, event.datum)
    }
    if (frame.snapshot) {
      this.restore(frame.snapshot)
      this.ids = frame.ids
      const retained = new Set([
        ...this.ids,
        ...frame.snapshot.queue.map((body) => body.id)
      ])
      for (const [id, original] of this.datums)
        if (!retained.has(id) && original.revision <= revision)
          this.datums.delete(id)
    } else if (frame.state && frame.ids.length === 0) {
      frame.ids = this.ids
    }
    return payload
  }
}

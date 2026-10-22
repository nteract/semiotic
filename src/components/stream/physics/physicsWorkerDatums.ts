import type {
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn
} from "./PhysicsPipelineStore"
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
    if (!runtime || typeof runtime !== "object" || !("__phase" in runtime))
      return original
    const next = { ...(original as object) } as Record<string, unknown>
    // Admission metadata is owned by the live worker. Preserve authored values
    // (including functions) outside these runtime-owned fields.
    for (const key of [
      "__phase",
      "eventTime",
      "arrivalTime",
      "windowIndex",
      "windowId",
      "source",
      "watermarkAtArrival",
      "late",
      "time"
    ]) {
      if (key in runtime) next[key] = (runtime as Record<string, unknown>)[key]
    }
    return next
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
      this.remember(
        command.snapshot.eventDrop?.pending.map((entry) => entry.spawn) ?? []
      )
    }
    if (command.type === "enqueue") this.remember(command.spawns)
    return this.revision
  }

  private restore(snapshot: PhysicsPipelineSnapshot): void {
    this.restoreBodies([
      ...snapshot.world.bodies,
      ...snapshot.queue,
      ...(snapshot.eventDrop?.pending.map((entry) => entry.spawn) ?? [])
    ])
  }

  private restoreBodies(bodies: PhysicsQueuedSpawn[]): void {
    for (const body of bodies) {
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
    const structure = frame.snapshot ?? frame.structure
    const pending =
      frame.snapshot?.eventDrop?.pending ?? frame.live?.pending ?? []
    this.restoreBodies(pending.map((entry) => entry.spawn))
    if (structure) {
      this.restoreBodies([...structure.world.bodies, ...structure.queue])
      this.ids = frame.ids
      const retained = new Set([
        ...this.ids,
        ...structure.queue.map((body) => body.id),
        ...pending.map((entry) => entry.spawn.id)
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

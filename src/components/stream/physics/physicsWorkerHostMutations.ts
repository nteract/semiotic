import type { PhysicsPipelineStore } from "./PhysicsPipelineStore"
import type {
  PhysicsWorkerFrame,
  PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"

/** Reapplies one host edit to the mirror after a worker frame replaced it. */
export type PhysicsWorkerHostMutation = (
  store: PhysicsPipelineStore,
  frame: PhysicsWorkerFrame
) => void

/** A frame that replaces the mirror's queue and bodies instead of moving them. */
export function replacesPhysicsMirror(frame: PhysicsWorkerFrame): boolean {
  return Boolean(frame.snapshot || frame.structure)
}

/** The frame carried by a worker response, if any. */
export function physicsWorkerPayloadFrame(
  payload: PhysicsWorkerResponsePayload
): PhysicsWorkerFrame | null {
  return payload.type === "frame" || payload.type === "removed"
    ? payload.frame
    : null
}

/**
 * Host edits posted to the worker but not yet acknowledged. The host applies
 * each edit to its mirror at once, but a frame the worker computed before it
 * received the edit replaces the mirror's queue, bodies and state. Applying
 * the outstanding edits again after every worker frame keeps them visible and
 * in the snapshot that seeds a replacement worker. An edit's own
 * acknowledgement frame already contains it, so it is settled first.
 */
export class PhysicsWorkerHostMutations {
  private outstanding: { apply: PhysicsWorkerHostMutation }[] = []

  /** `supersedes` drops earlier edits, as a clear or restore does. */
  track(apply: PhysicsWorkerHostMutation, supersedes = false): object {
    const entry = { apply }
    if (supersedes) this.outstanding = []
    this.outstanding.push(entry)
    return entry
  }

  acknowledge(token: object | undefined): void {
    if (token)
      this.outstanding = this.outstanding.filter((entry) => entry !== token)
  }

  reapply(store: PhysicsPipelineStore, frame: PhysicsWorkerFrame): void {
    for (const entry of this.outstanding) entry.apply(store, frame)
  }

  clear(): void {
    this.outstanding = []
  }
}

import type { PhysicsWorkerFrame } from "./PhysicsWorkerProtocol"
import {
  PhysicsKernelWorld,
  type PhysicsActiveSensorPair,
  type PhysicsBodySpec,
  type PhysicsBodyState,
  type PhysicsColliderSpec,
  type PhysicsKernelEvent,
  type PhysicsKernelOptions,
  type PhysicsKernelSnapshot,
  type PhysicsSpringSpec
} from "./PhysicsKernel"

/** Repeatability within the same engine/runtime, inputs, and fixed timestep. */
export type PhysicsEngineDeterminism = "strict" | "tolerance" | "none"

export interface PhysicsEngineCapabilities {
  engine: string
  determinism: PhysicsEngineDeterminism
  sensors: boolean
  joints: boolean
  ccd: boolean
  maxBodiesHint: number
  worker: boolean
}

export interface PhysicsEngineAdapter {
  readonly id: string
  readonly capabilities: PhysicsEngineCapabilities
  init: (options?: PhysicsKernelOptions) => void
  spawn: (spec: PhysicsBodySpec) => void
  remove: (ids: string[]) => void
  setColliders: (colliders: PhysicsColliderSpec[]) => void
  setConstraint: (spec: PhysicsSpringSpec) => string
  removeConstraint: (id: string) => void
  applyImpulse: (id: string, ix: number, iy: number) => void
  step: (dtSeconds?: number) => void
  settle: (maxSteps?: number, dtSeconds?: number) => number
  readState: (out?: PhysicsBodyState[]) => PhysicsBodyState[]
  /** Optional indexed read returning an independent body state. */
  readBody?: (id: string) => PhysicsBodyState | undefined
  events: () => PhysicsKernelEvent[]
  activeSensorPairs: () => PhysicsActiveSensorPair[]
  allSleeping: () => boolean
  snapshot: () => PhysicsKernelSnapshot
  restore: (snapshot: PhysicsKernelSnapshot) => void
  /** Internal worker mirror update; custom engines use synchronous execution. */
  workerSleepTimes?: (ids: string[]) => Float32Array
  applyWorkerMotion?: (frame: PhysicsWorkerFrame) => void
  nextRandom: () => number
  dispose: () => void
}

export type PhysicsEngineAdapterFactory = (
  options?: PhysicsKernelOptions
) => PhysicsEngineAdapter

export type PhysicsEngineAdapterInput =
  PhysicsEngineAdapter
  | PhysicsEngineAdapterFactory

export class BuiltInPhysicsEngineAdapter implements PhysicsEngineAdapter {
  readonly id = "builtin"
  readonly capabilities: PhysicsEngineCapabilities

  private world: PhysicsKernelWorld

  constructor(options: PhysicsKernelOptions = {}) {
    this.world = new PhysicsKernelWorld(options)
    this.capabilities = { ...this.world.capabilities, engine: "builtin" }
  }

  init(options: PhysicsKernelOptions = {}): void {
    this.world.init(options)
  }

  spawn(spec: PhysicsBodySpec): void {
    this.world.spawn(spec)
  }

  remove(ids: string[]): void {
    this.world.remove(ids)
  }

  setColliders(colliders: PhysicsColliderSpec[]): void {
    this.world.setColliders(colliders)
  }

  setConstraint(spec: PhysicsSpringSpec): string {
    return this.world.setConstraint(spec)
  }

  removeConstraint(id: string): void {
    this.world.removeConstraint(id)
  }

  applyImpulse(id: string, ix: number, iy: number): void {
    this.world.applyImpulse(id, ix, iy)
  }

  step(dtSeconds?: number): void {
    this.world.step(dtSeconds)
  }

  settle(maxSteps?: number, dtSeconds?: number): number {
    return this.world.settle(maxSteps, dtSeconds)
  }

  readState(out?: PhysicsBodyState[]): PhysicsBodyState[] {
    return this.world.readState(out)
  }

  readBody(id: string): PhysicsBodyState | undefined {
    return this.world.readBody(id)
  }

  events(): PhysicsKernelEvent[] {
    return this.world.events()
  }

  activeSensorPairs(): PhysicsActiveSensorPair[] {
    return this.world.activeSensorPairs()
  }

  allSleeping(): boolean {
    return this.world.allSleeping()
  }

  snapshot(): PhysicsKernelSnapshot {
    return this.world.snapshot()
  }

  restore(snapshot: PhysicsKernelSnapshot): void {
    this.world.restore(snapshot)
  }

  workerSleepTimes(ids: string[]): Float32Array {
    return this.world.workerSleepTimes(ids)
  }

  applyWorkerMotion(frame: PhysicsWorkerFrame): void {
    this.world.applyWorkerMotion(frame)
  }

  nextRandom(): number {
    return this.world.nextRandom()
  }

  dispose(): void {
    this.world.dispose()
  }
}

export function createDefaultPhysicsEngineAdapter(
  options: PhysicsKernelOptions = {}
): PhysicsEngineAdapter {
  return new BuiltInPhysicsEngineAdapter(options)
}

export function resolvePhysicsEngineAdapter(
  input: PhysicsEngineAdapterInput | undefined,
  options: PhysicsKernelOptions = {}
): PhysicsEngineAdapter {
  if (!input) return createDefaultPhysicsEngineAdapter(options)
  if (typeof input === "function") return input(options)
  input.init(options)
  return input
}

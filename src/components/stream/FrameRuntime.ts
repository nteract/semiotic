/**
 * Shared timing and randomness policy for frame hosts.
 *
 * A runtime converts a wall clock into logical frame time. Logical time moves
 * forward only while the frame is active, so a paused or hidden chart resumes
 * from its previous animation state instead of fast-forwarding through the
 * elapsed wall-clock interval.
 */
export type FrameClock = () => number
export type FrameRandom = () => number

export interface FrameRuntimeOptions {
  /** Monotonic wall-clock milliseconds. Defaults to performance.now/Date.now. */
  clock?: FrameClock
  /** Injectable random source for tests or an embedding runtime. */
  random?: FrameRandom
  /** Serializable deterministic random seed. Ignored when `random` is provided. */
  seed?: number
  paused?: boolean
  visible?: boolean
}

export interface FrameRuntimeSnapshot {
  now: number
  paused: boolean
  seed?: number
  visible: boolean
}

const defaultClock: FrameClock = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now()

/** Mulberry32 is small, deterministic, and accepts the serializable integer seed surface. */
export function createSeededFrameRandom(seed: number): FrameRandom {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function normalizeSeed(seed: number | undefined): number | undefined {
  return typeof seed === "number" && Number.isFinite(seed) ? Math.trunc(seed) : undefined
}

function readClock(clock: FrameClock, fallback: number): number {
  const value = clock()
  return Number.isFinite(value) ? value : fallback
}

export class FrameRuntime {
  private clock: FrameClock
  private lastWallTime: number
  private logicalTime: number
  private randomInput: FrameRandom | undefined
  private randomSource: FrameRandom = Math.random
  private seedValue: number | undefined
  private pausedValue: boolean
  private subscribers = new Set<() => void>()
  private visibleValue: boolean

  /** Stable callable seam for stores and render loops. */
  readonly now = (): number => this.advance()
  /** Stable callable seam for stochastic renderers. */
  readonly random = (): number => this.randomSource()

  constructor(options: FrameRuntimeOptions = {}) {
    this.clock = options.clock ?? defaultClock
    this.lastWallTime = readClock(this.clock, 0)
    this.logicalTime = this.lastWallTime
    this.pausedValue = options.paused === true
    this.visibleValue = options.visible !== false
    this.setRandomSource(options.random, options.seed)
  }

  get isActive(): boolean {
    return !this.pausedValue && this.visibleValue
  }

  get paused(): boolean {
    return this.pausedValue
  }

  get seed(): number | undefined {
    return this.seedValue
  }

  get visible(): boolean {
    return this.visibleValue
  }

  configure(options: Pick<FrameRuntimeOptions, "clock" | "random" | "seed">): void {
    this.setClock(options.clock)
    this.setRandomSource(options.random, options.seed)
  }

  setPaused(paused: boolean): void {
    if (this.pausedValue === paused) return
    this.advance()
    this.pausedValue = paused
    this.emit()
  }

  setVisible(visible: boolean): void {
    if (this.visibleValue === visible) return
    this.advance()
    this.visibleValue = visible
    this.emit()
  }

  snapshot(): FrameRuntimeSnapshot {
    return {
      now: this.now(),
      paused: this.pausedValue,
      seed: this.seedValue,
      visible: this.visibleValue,
    }
  }

  subscribe(listener: () => void): () => void {
    this.subscribers.add(listener)
    return () => this.subscribers.delete(listener)
  }

  private advance(): number {
    const wallTime = readClock(this.clock, this.lastWallTime)
    const elapsed = Math.max(0, wallTime - this.lastWallTime)
    this.lastWallTime = wallTime
    if (this.isActive) this.logicalTime += elapsed
    return this.logicalTime
  }

  private emit(): void {
    for (const listener of this.subscribers) listener()
  }

  private setClock(clock: FrameClock | undefined): void {
    const nextClock = clock ?? defaultClock
    if (nextClock === this.clock) return
    this.advance()
    this.clock = nextClock
    this.lastWallTime = readClock(nextClock, this.lastWallTime)
  }

  private setRandomSource(random: FrameRandom | undefined, seed: number | undefined): void {
    const nextSeed = normalizeSeed(seed)
    if (random === this.randomInput && nextSeed === this.seedValue) return
    this.randomInput = random
    this.seedValue = nextSeed
    this.randomSource = random ?? (nextSeed === undefined ? Math.random : createSeededFrameRandom(nextSeed))
  }
}

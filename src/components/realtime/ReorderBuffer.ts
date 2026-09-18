// Event-time reorder buffer — bounded out-of-order tolerance.
//
// The RingBuffer appends in arrival order, so a jittery or merged
// multi-source stream draws a zigzag line. This buffer sits in front of
// it: it holds freshly-pushed events for a bounded **lateness** (grace)
// window and releases them in event-time order once the watermark has
// advanced far enough that no earlier event can still arrive within the
// grace window.
//
// An event whose time is older than `watermark − lateness` is **late**:
// it missed its grace window. An explicit `flush()` also commits the
// released tail as an ordering frontier, so later backdated input is late.
// Late events are dropped or kept per policy, and always counted so
// lateness is observable rather than silent (Kafka's grace-period /
// late-record model).
//
// Tradeoff: a `lateness` window delays display by that much in exchange
// for correct ordering. Default-off; when unused the stream behaves
// exactly as before.

import { heapPop, heapPush } from "./minHeap"

export type LatePolicy = "drop" | "keep"

interface HeldEvent<T> {
  item: T
  time: number
  order: number
}

function compareEvents(a: HeldEvent<unknown>, b: HeldEvent<unknown>): number {
  return a.time - b.time || a.order - b.order
}

export interface ReorderBufferConfig<T> {
  /** Grace window in ms. Events older than `watermark − lateness` are late. */
  lateness: number
  /** Event-time accessor (ms), evaluated once when the event is pushed. */
  getTime: (item: T) => number
  /**
   * What to do with a late event:
   * - `"drop"` (default): discard it (still counted).
   * - `"keep"`: release it immediately, out of order (still counted).
   */
  latePolicy?: LatePolicy
}

export interface ReorderResult<T> {
  /**
   * Events ready to append to the main buffer now, in event-time order.
   * Already reflects the late policy — dropped late events are excluded.
   */
  released: T[]
  /** The events that were late this push (informational; for diagnostics). */
  late: T[]
}

/**
 * Buffers pushed events and releases them in event-time order once they
 * fall outside the grace window. Stateful; one instance per series.
 */
export class ReorderBuffer<T> {
  private readonly lateness: number
  private readonly getTime: (item: T) => number
  private readonly latePolicy: LatePolicy

  // Stable event-time ordering without rescanning the grace window on push.
  private held: HeldEvent<T>[] = []
  private nextOrder = 0
  private _watermark: number = -Infinity
  // Largest finite event-time already released. Normally this trails the
  // watermark by `lateness`; an explicit flush advances it to the tail and
  // therefore commits a hard ordering boundary for any later pushes.
  private _releasedThrough: number = -Infinity
  private _lateCount: number = 0

  constructor(config: ReorderBufferConfig<T>) {
    this.lateness = config.lateness > 0 ? config.lateness : 0
    this.getTime = config.getTime
    this.latePolicy = config.latePolicy ?? "drop"
  }

  /**
   * Ingest one event. Returns the events that became safe to emit (in
   * event-time order) plus any late events seen this push.
   */
  push(item: T): ReorderResult<T> {
    const t = this.getTime(item)
    if (!Number.isFinite(t)) {
      // No usable event-time — pass straight through, don't reorder.
      return { released: [item], late: [] }
    }

    const late: T[] = []
    // Late if it missed either the moving grace window or a tail the caller
    // explicitly committed with flush().
    const lateThreshold = Math.max(
      this._watermark - this.lateness,
      this._releasedThrough
    )
    if (this._watermark !== -Infinity && t < lateThreshold) {
      this._lateCount += 1
      late.push(item)
      if (this.latePolicy === "drop") {
        return { released: [], late }
      }
      // keep: emit immediately, out of order, but still advance nothing.
      return { released: [item], late }
    }

    if (t > this._watermark) this._watermark = t
    heapPush(
      this.held,
      { item, time: t, order: this.nextOrder++ },
      compareEvents
    )

    return { released: this.drain(this._watermark - this.lateness), late }
  }

  /** Release all events whose time is at or before `watermark − lateness`. */
  private drain(threshold: number): T[] {
    const ready: T[] = []
    let next = this.held[0]
    while (next && next.time <= threshold) {
      heapPop(this.held, compareEvents)
      ready.push(next.item)
      this._releasedThrough = Math.max(this._releasedThrough, next.time)
      next = this.held[0]
    }
    return ready
  }

  /**
   * Release everything still held, in event-time order — e.g. when the
   * stream ends and the remaining grace-window events should be shown.
   */
  flush(): T[] {
    return this.drain(Infinity)
  }

  clear(): void {
    this.held = []
    this.nextOrder = 0
    this._watermark = -Infinity
    this._releasedThrough = -Infinity
    this._lateCount = 0
  }

  /** Largest event-time seen, or `-Infinity` if empty. */
  get watermark(): number {
    return this._watermark
  }

  /** Total late events seen since construction (or last `clear`). */
  get lateCount(): number {
    return this._lateCount
  }

  /** Events currently held inside the grace window. */
  get heldCount(): number {
    return this.held.length
  }
}

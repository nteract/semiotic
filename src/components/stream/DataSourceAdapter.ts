import type { Changeset } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"

const DEFAULT_CHUNK_LIMIT = 5000
// Each default chunk multiplies the rows delivered so far by this factor.
const CHUNK_GROWTH = 4

function normalizeChunkLimit(value: number | undefined, minimum: number): number {
  if (value === Infinity) return Infinity
  return Number.isFinite(value)
    ? Math.max(minimum, Math.floor(value!))
    : DEFAULT_CHUNK_LIMIT
}

/** A caller-chosen chunk size (anything `normalizeChunkLimit` would honor). */
function isExplicitChunkSize(value: number | undefined): boolean {
  return value === Infinity || Number.isFinite(value)
}

export type ChangesetCallback<T> = (changeset: Changeset<T>) => void

type Ingestion<T> = {
  history: { data: T[]; offset: number; frame: number | null } | null
  pushes: T[]
  flush: (() => void) | null
}
// Compile named internal phases to constants without shipping a lookup table.
const enum DeliveryPhase {
  Idle,
  Publishing,
  FlushRequested
}

/**
 * Normalize bounded snapshots, progressive history, and live pushes into changesets.
 * Replacement is atomic: queued work from the previous dataset is discarded.
 * Live pushes are microtask-batched and follow all chunks of the current history.
 *
 * Progressive history: a dataset larger than `chunkThreshold` is delivered as a
 * first chunk now and the rest on later animation frames, so the first paint
 * stays fast. The consumer rebuilds its whole scene after every chunk, so the
 * schedule decides the total work:
 *
 * - Default (`chunkSize` omitted): the first chunk has 5000 rows and each later
 *   chunk quadruples the rows delivered so far, finishing early instead of
 *   leaving a tail smaller than what is already delivered (200,000 rows arrive
 *   as 5k, 20k, 80k, 200k). Total rebuild work is linear: at most twice one
 *   pass, and under 1.7x beyond 10,000 rows.
 * - Explicit `chunkSize`: every chunk has exactly that many rows. Total rebuild
 *   work then grows with the square of the row count; use it only when a fixed
 *   per-frame row count matters more than load time.
 */
export class DataSourceAdapter<T extends object = Datum> {
  private lastBoundedData: T[] | null = null
  private chunkThreshold = DEFAULT_CHUNK_LIMIT
  private chunkSize = DEFAULT_CHUNK_LIMIT
  private fixedChunks = false
  // Snapshot chunks and queued pushes belong to the same replacement epoch.
  private ingestion: Ingestion<T> = { history: null, pushes: [], flush: null }
  private delivery = DeliveryPhase.Idle
  private connected = true

  constructor(
    private callback: ChangesetCallback<T>,
    options?: { chunkThreshold?: number; chunkSize?: number }
  ) {
    this.updateChunkOptions(options ?? {})
  }

  updateChunkOptions(options: {
    chunkThreshold?: number
    chunkSize?: number
  }): void {
    this.chunkThreshold = normalizeChunkLimit(options.chunkThreshold, 0)
    this.chunkSize = normalizeChunkLimit(options.chunkSize, 1)
    this.fixedChunks = isExplicitChunkSize(options.chunkSize)
  }

  /** Rows delivered once the next history chunk lands. */
  private nextOffset(delivered: number, total: number): number {
    if (this.fixedChunks) return Math.min(total, delivered + this.chunkSize)
    const next = delivered * CHUNK_GROWTH
    // A tail smaller than the rows already delivered is not worth its own
    // full rebuild: finish in this chunk instead.
    return next * 2 >= total ? total : next
  }

  /** Effect cleanup retires scheduled work; reconnecting retains queued rows. */
  connect(): () => void {
    this.connected = true
    this.scheduleChunk()
    this.scheduleFlush()
    return () => {
      this.connected = false
      this.cancelPending(this.ingestion)
    }
  }

  setBoundedData(data: T[]): void {
    data = filterSparseArray(data)
    if (this.lastBoundedData === data) return
    this.replace(data, false)
  }

  /** Replace aggregate rows while preserving the store's category ordering. */
  setReplacementData(data: T[]): void {
    this.replace(filterSparseArray(data), true)
  }

  private replace(data: T[], preserveCategoryOrder: boolean): void {
    this.clear()
    this.lastBoundedData = data
    const progressive = data.length > this.chunkThreshold
    const ingestion = this.ingestion
    const offset = progressive ? Math.min(data.length, this.chunkSize) : data.length
    if (offset < data.length) ingestion.history = { data, offset, frame: null }
    this.publish({
      inserts: progressive ? data.slice(0, offset) : data,
      bounded: true,
      ...(progressive ? { totalSize: data.length } : {}),
      ...(preserveCategoryOrder ? { preserveCategoryOrder: true } : {})
    })
    // The callback may replace/clear the dataset; schedule only current history.
    this.scheduleChunk()
  }

  private cancelPending(ingestion: Ingestion<T>): void {
    const history = ingestion.history
    if (history?.frame != null) cancelAnimationFrame(history.frame)
    if (history) history.frame = null
    ingestion.flush = null
  }

  private publish(changeset: Changeset<T>): void {
    const previous = this.delivery
    this.delivery = DeliveryPhase.Publishing
    try {
      this.callback(changeset)
    } finally {
      this.finishDelivery(previous)
    }
  }

  private finishDelivery(previous: DeliveryPhase): void {
    const requested = this.delivery === DeliveryPhase.FlushRequested
    this.delivery = previous
    if (requested) this.flush()
  }

  private emitChunk(): void {
    const ingestion = this.ingestion
    const history = ingestion.history
    if (!history) return
    const start = history.offset
    history.offset = this.nextOffset(start, history.data.length)
    if (history.offset >= history.data.length) ingestion.history = null
    this.publish({
      inserts: history.data.slice(start, history.offset),
      bounded: false,
      boundedAppend: true
    })
  }

  private scheduleChunk(): void {
    const ingestion = this.ingestion
    const history = ingestion.history
    if (!this.connected || !history || history.frame !== null) return
    history.frame = requestAnimationFrame(() => {
      if (this.ingestion !== ingestion) return
      history.frame = null
      this.emitChunk()
      this.scheduleChunk()
    })
  }

  private scheduleFlush(): void {
    const ingestion = this.ingestion
    // The queued callback owns this batch; a manual flush retires it before
    // another push can schedule work for the same replacement.
    if (!this.connected || !ingestion.pushes.length || ingestion.flush) return
    const pending = () => {
      if (this.ingestion === ingestion && ingestion.flush === pending)
        this.flush()
    }
    ingestion.flush = pending
    queueMicrotask(pending)
  }

  push(datum: T): void {
    if (datum == null || typeof datum !== "object") return
    this.ingestion.pushes.push(datum)
    this.scheduleFlush()
  }

  pushMany(data: T[]): void {
    for (const datum of data) {
      if (datum != null && typeof datum === "object")
        this.ingestion.pushes.push(datum)
    }
    this.scheduleFlush()
  }

  /** Synchronously expose the complete snapshot and all queued live rows. */
  flush(): void {
    if (!this.connected) return
    // This also covers callbacks from a history rAF or initial replacement,
    // where no flush is running yet. Finish their consumer commit first.
    if (this.delivery !== DeliveryPhase.Idle) {
      this.delivery = DeliveryPhase.FlushRequested
      return
    }
    const ingestion = this.ingestion
    this.cancelPending(ingestion)
    if (!ingestion.history && ingestion.pushes.length === 0) return
    this.delivery = DeliveryPhase.Publishing
    try {
      while (this.connected && this.ingestion === ingestion && ingestion.history)
        this.emitChunk()
      if (!this.connected || this.ingestion !== ingestion || ingestion.pushes.length === 0) return
      const inserts = ingestion.pushes
      ingestion.pushes = []
      ingestion.flush = null
      this.callback({ inserts, bounded: false })
    } finally {
      this.finishDelivery(DeliveryPhase.Idle)
    }
  }

  clear(): void {
    const previous = this.ingestion
    this.ingestion = { history: null, pushes: [], flush: null }
    this.cancelPending(previous)
    this.lastBoundedData = null
  }
}

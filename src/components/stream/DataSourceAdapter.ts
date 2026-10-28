import type { Changeset } from "./types"
import type { Datum } from "../charts/shared/datumTypes"
import { filterSparseArray } from "../charts/shared/sparseArray"

const CHUNK_THRESHOLD = 5000
const CHUNK_SIZE = 5000

function normalizeChunkThreshold(value: number | undefined): number {
  if (value === Infinity) return Infinity
  return Number.isFinite(value)
    ? Math.max(0, Math.floor(value!))
    : CHUNK_THRESHOLD
}

function normalizeChunkSize(value: number | undefined): number {
  if (value === Infinity) return Infinity
  return Number.isFinite(value) ? Math.max(1, Math.floor(value!)) : CHUNK_SIZE
}

export type ChangesetCallback<T> = (changeset: Changeset<T>) => void

/**
 * Normalize bounded snapshots, progressive history, and live pushes into changesets.
 * Replacement is atomic: queued work from the previous dataset is discarded.
 * Live pushes are microtask-batched and follow all chunks of the current history.
 */
export class DataSourceAdapter<T extends object = Datum> {
  private lastBoundedData: T[] | null = null
  private chunkTimer: number | null = null
  private chunkThreshold: number
  private chunkSize: number
  private pendingSnapshot: { data: T[]; offset: number } | null = null
  private pushBuffer: T[] = []
  private flushScheduled = false
  private generation = 0

  constructor(
    private callback: ChangesetCallback<T>,
    options?: { chunkThreshold?: number; chunkSize?: number }
  ) {
    this.chunkThreshold = normalizeChunkThreshold(options?.chunkThreshold)
    this.chunkSize = normalizeChunkSize(options?.chunkSize)
  }

  updateChunkOptions(options: {
    chunkThreshold?: number
    chunkSize?: number
  }): void {
    this.chunkThreshold = normalizeChunkThreshold(options.chunkThreshold)
    this.chunkSize = normalizeChunkSize(options.chunkSize)
  }

  /** Forget the snapshot and cancel its pending chunks and queued pushes. */
  clearLastData(): void {
    this.clear()
  }

  setBoundedData(data: T[]): void {
    data = filterSparseArray(data) as T[]
    if (this.lastBoundedData === data) return
    this.replace(data, false)
  }

  /** Replace aggregate rows while preserving the store's category ordering. */
  setReplacementData(data: T[]): void {
    this.replace(filterSparseArray(data) as T[], true)
  }

  private replace(data: T[], preserveCategoryOrder: boolean): void {
    this.clear()
    this.lastBoundedData = data
    const progressive = data.length > this.chunkThreshold
    const snapshot = {
      data,
      offset: progressive ? Math.min(data.length, this.chunkSize) : data.length
    }
    if (snapshot.offset < data.length) this.pendingSnapshot = snapshot
    this.callback({
      inserts: progressive ? data.slice(0, snapshot.offset) : data,
      bounded: true,
      ...(progressive ? { totalSize: data.length } : {}),
      ...(preserveCategoryOrder ? { preserveCategoryOrder: true } : {})
    })
    // The callback may synchronously replace or clear this dataset.
    if (this.pendingSnapshot === snapshot) this.scheduleChunk()
  }

  private cancelChunk(): void {
    if (this.chunkTimer !== null) cancelAnimationFrame(this.chunkTimer)
    this.chunkTimer = null
  }

  private emitChunk(): void {
    const snapshot = this.pendingSnapshot
    if (!snapshot) return
    const start = snapshot.offset
    snapshot.offset = Math.min(snapshot.data.length, start + this.chunkSize)
    if (snapshot.offset >= snapshot.data.length) this.pendingSnapshot = null
    this.callback({
      inserts: snapshot.data.slice(start, snapshot.offset),
      bounded: false,
      boundedAppend: true
    })
  }

  private scheduleChunk(): void {
    this.cancelChunk()
    this.chunkTimer = requestAnimationFrame(() => {
      this.chunkTimer = null
      this.emitChunk()
      if (this.pendingSnapshot) this.scheduleChunk()
    })
  }

  private flushPushBuffer(): void {
    this.flushScheduled = false
    if (this.pushBuffer.length === 0) return
    // Finish history before appending live rows. Otherwise a late history chunk
    // can evict newer rows or reintroduce data outside a sliding live window.
    this.flushSnapshot()
    if (this.pushBuffer.length === 0) return
    const inserts = this.pushBuffer
    this.pushBuffer = []
    this.callback({ inserts, bounded: false })
  }

  private flushSnapshot(): void {
    this.cancelChunk()
    while (this.pendingSnapshot) this.emitChunk()
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) return
    this.flushScheduled = true
    const generation = this.generation
    queueMicrotask(() => {
      if (generation === this.generation) this.flushPushBuffer()
    })
  }

  push(datum: T): void {
    if (datum == null || typeof datum !== "object") return
    this.pushBuffer.push(datum)
    this.scheduleFlush()
  }

  pushMany(data: T[]): void {
    for (const datum of data) {
      if (datum != null && typeof datum === "object")
        this.pushBuffer.push(datum)
    }
    if (this.pushBuffer.length > 0) this.scheduleFlush()
  }

  /** Synchronously expose the complete snapshot and all queued live rows. */
  flush(): void {
    this.flushSnapshot()
    this.flushPushBuffer()
  }

  clear(): void {
    this.generation++
    this.cancelChunk()
    this.pendingSnapshot = null
    this.lastBoundedData = null
    this.pushBuffer = []
    this.flushScheduled = false
  }
}

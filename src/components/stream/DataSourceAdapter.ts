import type { Changeset } from "./types"

/**
 * DataSourceAdapter normalizes all data ingestion paths into uniform changesets:
 *
 * 1. Bounded (props): `data` array → changeset(s) with `bounded: true`
 * 2. Streaming (push): `ref.push()` → micro-changeset with `bounded: false`
 * 3. Hybrid: `data` prop first, then `push()` — seamless transition
 *
 * For large bounded datasets (above CHUNK_THRESHOLD), data is automatically
 * chunked and ingested progressively across multiple animation frames. This
 * keeps the UI responsive while the chart draws incrementally. The first chunk
 * renders immediately so the user sees data right away.
 *
 * Streaming pushes are batched via microtask: rapid push()/pushMany() calls
 * within the same task are coalesced into a single changeset, preventing
 * main-thread saturation under high-frequency push rates (thousands/sec).
 */

/** Datasets larger than this are chunked for progressive rendering */
const CHUNK_THRESHOLD = 5000
/** Number of items per progressive chunk */
const CHUNK_SIZE = 5000

export type ChangesetCallback<T> = (changeset: Changeset<T>) => void

export class DataSourceAdapter<T = Record<string, any>> {
  private callback: ChangesetCallback<T>
  private lastBoundedData: T[] | null = null
  private chunkTimer: number = 0
  private chunkThreshold: number
  private chunkSize: number

  /** Buffer for batching high-frequency push() calls */
  private pushBuffer: T[] = []
  /** Whether a microtask flush is already scheduled */
  private flushScheduled = false

  constructor(callback: ChangesetCallback<T>, options?: { chunkThreshold?: number; chunkSize?: number }) {
    this.callback = callback
    this.chunkThreshold = options?.chunkThreshold ?? CHUNK_THRESHOLD
    this.chunkSize = options?.chunkSize ?? CHUNK_SIZE
  }

  /** Update chunking options without recreating the adapter. */
  updateChunkOptions(options: { chunkThreshold?: number; chunkSize?: number }): void {
    if (options.chunkThreshold != null) this.chunkThreshold = options.chunkThreshold
    if (options.chunkSize != null) this.chunkSize = options.chunkSize
  }

  /** Clear the dedup cache so the next setBoundedData call re-ingests even the same reference.
   *  Also cancels any in-flight progressive chunking and discards buffered pushes. */
  clearLastData(): void {
    this.lastBoundedData = null
    this.pushBuffer = []
    this.flushScheduled = false
    if (this.chunkTimer) {
      cancelAnimationFrame(this.chunkTimer)
      this.chunkTimer = 0
    }
  }

  /**
   * Ingest a bounded data array (from props).
   *
   * Small datasets emit a single changeset synchronously.
   * Large datasets (> CHUNK_THRESHOLD) are split into chunks that render
   * progressively: the first chunk fires immediately (bounded: true to
   * reset + seed the buffer), subsequent chunks arrive on successive
   * animation frames (bounded: false so they append without clearing).
   */
  setBoundedData(data: T[]): void {
    this.lastBoundedData = data

    // Cancel any in-flight progressive ingestion
    if (this.chunkTimer) {
      cancelAnimationFrame(this.chunkTimer)
      this.chunkTimer = 0
    }

    if (data.length <= this.chunkThreshold) {
      // Small dataset — ingest all at once
      this.callback({ inserts: data, bounded: true })
      return
    }

    // Large dataset — progressive chunked ingestion.
    // First chunk is bounded: true (resets buffer and sizes it to full length).
    // Subsequent chunks are bounded: false (appends without clearing).
    this.callback({ inserts: data.slice(0, this.chunkSize), bounded: true, totalSize: data.length })

    let offset = this.chunkSize
    const scheduleNext = () => {
      if (offset >= data.length) return
      // Check that this is still the active dataset
      if (data !== this.lastBoundedData) return

      const end = Math.min(offset + this.chunkSize, data.length)
      this.callback({ inserts: data.slice(offset, end), bounded: false })
      offset = end

      if (offset < data.length) {
        this.chunkTimer = requestAnimationFrame(scheduleNext)
      } else {
        this.chunkTimer = 0
      }
    }

    this.chunkTimer = requestAnimationFrame(scheduleNext)
  }

  /**
   * Flush all buffered push data as a single changeset.
   * Called automatically via microtask after push()/pushMany().
   */
  private flushPushBuffer(): void {
    this.flushScheduled = false
    if (this.pushBuffer.length === 0) return
    const inserts = this.pushBuffer
    this.pushBuffer = []
    this.callback({ inserts, bounded: false })
  }

  /** Schedule a microtask flush if one isn't already pending. */
  private scheduleFlush(): void {
    if (this.flushScheduled) return
    this.flushScheduled = true
    queueMicrotask(() => this.flushPushBuffer())
  }

  /**
   * Push a single datum (streaming mode).
   * Data is buffered and flushed as a single changeset via microtask,
   * so rapid sequential push() calls within the same task are batched
   * into one callback invocation.
   */
  push(datum: T): void {
    this.pushBuffer.push(datum)
    this.scheduleFlush()
  }

  /**
   * Push multiple data (streaming batch).
   * Like push(), data is buffered and flushed via microtask. Multiple
   * pushMany() calls within the same task are coalesced.
   */
  pushMany(data: T[]): void {
    if (data.length === 0) return
    for (let i = 0; i < data.length; i++) {
      this.pushBuffer.push(data[i])
    }
    this.scheduleFlush()
  }

  /**
   * Immediately flush any buffered push data without waiting for the microtask.
   * Useful when you need the data to be processed synchronously (e.g., in tests).
   */
  flush(): void {
    this.flushPushBuffer()
  }

  /**
   * Reset the adapter state.
   */
  clear(): void {
    if (this.chunkTimer) {
      cancelAnimationFrame(this.chunkTimer)
      this.chunkTimer = 0
    }
    this.lastBoundedData = null
    this.pushBuffer = []
    this.flushScheduled = false
  }
}

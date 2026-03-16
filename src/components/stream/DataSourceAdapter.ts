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

  constructor(callback: ChangesetCallback<T>, options?: { chunkThreshold?: number; chunkSize?: number }) {
    this.callback = callback
    this.chunkThreshold = options?.chunkThreshold ?? CHUNK_THRESHOLD
    this.chunkSize = options?.chunkSize ?? CHUNK_SIZE
  }

  /** Clear the dedup cache so the next setBoundedData call re-ingests even the same reference.
   *  Also cancels any in-flight progressive chunking. */
  clearLastData(): void {
    this.lastBoundedData = null
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
   * Push a single datum (streaming mode).
   * Emits a micro-changeset with `bounded: false`.
   */
  push(datum: T): void {
    this.callback({ inserts: [datum], bounded: false })
  }

  /**
   * Push multiple data (streaming batch).
   * Emits a single changeset with `bounded: false`.
   */
  pushMany(data: T[]): void {
    if (data.length === 0) return
    this.callback({ inserts: data, bounded: false })
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
  }
}

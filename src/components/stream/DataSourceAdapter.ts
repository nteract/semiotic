import type { Changeset } from "./types"

/**
 * DataSourceAdapter normalizes two ingestion paths into uniform changesets:
 *
 * 1. Bounded (props): `data` array → single changeset with `bounded: true`
 * 2. Streaming (push): `ref.push()` → micro-changeset with `bounded: false`
 * 3. Hybrid: `data` prop first, then `push()` — seamless transition
 */

export type ChangesetCallback<T> = (changeset: Changeset<T>) => void

export class DataSourceAdapter<T = Record<string, any>> {
  private callback: ChangesetCallback<T>
  private lastBoundedData: T[] | null = null

  constructor(callback: ChangesetCallback<T>) {
    this.callback = callback
  }

  /**
   * Ingest a bounded data array (from props).
   * Emits a single changeset with `bounded: true`.
   * Deduplicates: if the same array reference is passed, skips.
   */
  setBoundedData(data: T[]): void {
    if (data === this.lastBoundedData) return
    this.lastBoundedData = data
    this.callback({ inserts: data, bounded: true })
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
    this.lastBoundedData = null
  }
}

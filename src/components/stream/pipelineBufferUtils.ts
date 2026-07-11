import { RingBuffer } from "../realtime/RingBuffer"

/**
 * Resize a data buffer and its optional timestamp companion to fit a bounded
 * replacement dataset. Keeps timestamp/data indices aligned for pulse logic.
 */
export function ensureRingBufferCapacity<T>(
  buffer: RingBuffer<T>,
  targetSize: number,
  timestampBuffer?: RingBuffer<number> | null
): void {
  if (targetSize <= buffer.capacity) return
  buffer.resize(targetSize)
  if (timestampBuffer && targetSize > timestampBuffer.capacity) {
    timestampBuffer.resize(targetSize)
  }
}

/**
 * Create a timestamp companion for data that predates pulse tracking.
 *
 * A pulse buffer is indexed in lockstep with the datum buffer. When pulse is
 * enabled after mount, an empty companion would make the next inserted datum
 * line up with the *oldest* retained datum. Seed every retained row at the
 * activation time instead, so the two rings start aligned and the newly
 * enabled encoding has a coherent first frame.
 */
export function createTimestampBufferForData<T>(
  buffer: RingBuffer<T>,
  timestamp: number
): RingBuffer<number> {
  const timestamps = new RingBuffer<number>(buffer.capacity)
  buffer.forEach(() => timestamps.push(timestamp))
  return timestamps
}

/**
 * Push a datum and its ingest timestamp in lockstep. Returns any evicted datum
 * from the data buffer so callers can update extents/categories.
 */
export function pushWithTimestamp<T>(
  buffer: RingBuffer<T>,
  datum: T,
  timestampBuffer: RingBuffer<number> | null | undefined,
  timestamp: number
): T | undefined {
  const evicted = buffer.push(datum)
  if (timestampBuffer) timestampBuffer.push(timestamp)
  return evicted
}

/**
 * Compact a timestamp ring buffer before removing matching rows from the data
 * ring buffer. The predicate must be the same one passed to `buffer.remove()`.
 */
export function compactTimestampBufferForRemoval<T>(
  buffer: RingBuffer<T>,
  timestampBuffer: RingBuffer<number> | null | undefined,
  predicate: (item: T) => boolean
): void {
  if (!timestampBuffer || timestampBuffer.size === 0) return

  const removeSet = new Set<number>()
  buffer.forEach((item, i) => {
    if (predicate(item)) removeSet.add(i)
  })
  if (removeSet.size === 0) return

  const oldTimestamps = timestampBuffer.toArray()
  timestampBuffer.clear()
  for (let i = 0; i < oldTimestamps.length; i++) {
    if (!removeSet.has(i)) timestampBuffer.push(oldTimestamps[i])
  }
}

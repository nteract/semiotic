import type { RingBuffer } from "../realtime/RingBuffer"
import { createTimestampBufferForData } from "./pipelineBufferUtils"

/** Keep a pulse timestamp ring aligned with the retained ordinal data. */
export function syncOrdinalPulseTimestampBuffer<T>(
  pulseEnabled: boolean,
  buffer: RingBuffer<T>,
  timestamps: RingBuffer<number> | null,
  timestamp: number
): RingBuffer<number> | null {
  if (!pulseEnabled) return null
  const aligned = timestamps != null
    && timestamps.capacity === buffer.capacity
    && timestamps.size === buffer.size
  return aligned ? timestamps : createTimestampBufferForData(buffer, timestamp)
}

/**
 * Pulse encoding for XY pipeline scene nodes.
 *
 * Applies time-based glow to recently-inserted data points. Intensity fades
 * from 1 (just inserted) to 0 (pulse expired) over a configurable duration.
 *
 * Dependencies: types (SceneNode, PulseConfig), RingBuffer (timestamp buffer)
 * Consumed by: PipelineStore.computeScene (after decay, before transitions)
 */
import type { SceneNode, PulseConfig } from "./types"
import type { RingBuffer } from "../realtime/RingBuffer"

/**
 * Compute pulse intensity for a datum inserted at `insertTime`.
 * Returns 0–1 (1 = just inserted, 0 = pulse expired).
 */
export function computePulseIntensity(pulse: PulseConfig, insertTime: number, now: number): number {
  const duration = pulse.duration ?? 500
  const age = now - insertTime
  if (age >= duration) return 0
  return 1 - age / duration
}

/**
 * Apply pulse glow to scene nodes using insertion timestamps.
 */
export function applyPulse(
  pulse: PulseConfig,
  nodes: SceneNode[],
  data: Record<string, any>[],
  timestampBuffer: RingBuffer<number>
): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now()
  const pulseColor = pulse.color ?? "rgba(255,255,255,0.6)"
  const glowRadius = pulse.glowRadius ?? 4

  // Build datum→index lookup
  const indexMap = new Map<any, number>()
  for (let i = 0; i < data.length; i++) {
    indexMap.set(data[i], i)
  }

  for (const node of nodes) {
    if (node.type === "line") continue

    // Area nodes: datum is an array of data points for the group.
    // Pulse the area when any constituent point was recently inserted.
    if (node.type === "area") {
      const datumArr = Array.isArray(node.datum) ? node.datum : [node.datum]
      let bestIntensity = 0
      for (const d of datumArr) {
        const idx = indexMap.get(d)
        if (idx == null) continue
        const insertTime = timestampBuffer.get(idx)
        if (insertTime == null) continue
        const intensity = computePulseIntensity(pulse, insertTime, now)
        if (intensity > bestIntensity) bestIntensity = intensity
      }
      if (bestIntensity > 0) {
        node._pulseIntensity = bestIntensity
        node._pulseColor = pulseColor
      }
      continue
    }

    const idx = indexMap.get(node.datum)
    if (idx == null) continue
    const insertTime = timestampBuffer.get(idx)
    if (insertTime == null) continue
    const intensity = computePulseIntensity(pulse, insertTime, now)
    if (intensity > 0) {
      node._pulseIntensity = intensity
      node._pulseColor = pulseColor
      node._pulseGlowRadius = glowRadius
    }
  }
}

/**
 * Check whether there are active pulse animations needing continuous rendering.
 */
export function hasActivePulses(pulse: PulseConfig, timestampBuffer: RingBuffer<number> | null): boolean {
  if (!timestampBuffer || timestampBuffer.size === 0) return false
  const now = typeof performance !== "undefined" ? performance.now() : Date.now()
  const duration = pulse.duration ?? 500
  const newest = timestampBuffer.peek()
  return newest != null && (now - newest) < duration
}

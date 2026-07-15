import type { Datum, DatumValue } from "../charts/shared/datumTypes"
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
 *
 * @param indexMap Optional prebuilt datum→index map so a scene pass that
 * also runs decay can share one O(n) walk of the buffer.
 */
export function applyPulse(
  pulse: PulseConfig,
  nodes: SceneNode[],
  data: Datum[],
  timestampBuffer: RingBuffer<number>,
  indexMap?: Map<DatumValue, number>,
  now = typeof performance !== "undefined" ? performance.now() : Date.now()
): boolean {
  const pulseColor = pulse.color ?? "rgba(255,255,255,0.6)"
  const glowRadius = pulse.glowRadius ?? 4
  let changed = false

  const map = indexMap ?? (() => {
    const m = new Map<DatumValue, number>()
    for (let i = 0; i < data.length; i++) m.set(data[i], i)
    return m
  })()

  for (const node of nodes) {
    if (node.type === "line") continue

    // Area nodes: datum is an array of data points for the group.
    // Pulse the area when any constituent point was recently inserted.
    if (node.type === "area") {
      const datumArr = Array.isArray(node.datum) ? node.datum : [node.datum]
      let bestIntensity = 0
      let matchedSourceDatum = false
      for (const d of datumArr) {
        const idx = map.get(d)
        if (idx == null) continue
        matchedSourceDatum = true
        const insertTime = timestampBuffer.get(idx)
        if (insertTime == null) continue
        const intensity = computePulseIntensity(pulse, insertTime, now)
        if (intensity > bestIntensity) bestIntensity = intensity
      }
      if (matchedSourceDatum) {
        changed = setPulseState(node, bestIntensity, pulseColor) || changed
      }
      continue
    }

    const idx = map.get(node.datum)
    if (idx == null) continue
    const insertTime = timestampBuffer.get(idx)
    const intensity = insertTime == null
      ? 0
      : computePulseIntensity(pulse, insertTime, now)
    changed = setPulseState(node, intensity, pulseColor, glowRadius) || changed
  }

  return changed
}

/**
 * Update the pulse-owned fields for a node that the pipeline has matched to
 * source data. Keeping this narrow is important for custom layouts: nodes
 * which do not map back to a datum are left entirely alone, including any
 * user-owned underscore fields they may carry.
 */
export function setPulseState(
  node: {
    _pulseIntensity?: number
    _pulseColor?: string
    _pulseGlowRadius?: number
  },
  intensity: number,
  pulseColor: string,
  glowRadius?: number
): boolean {
  let changed = false

  if (intensity > 0) {
    if (node._pulseIntensity !== intensity) {
      node._pulseIntensity = intensity
      changed = true
    }
    if (node._pulseColor !== pulseColor) {
      node._pulseColor = pulseColor
      changed = true
    }
    if (node._pulseGlowRadius !== glowRadius) {
      node._pulseGlowRadius = glowRadius
      changed = true
    }
    return changed
  }

  // A pulse frame after expiry is still a meaningful visual update: clear the
  // old glow rather than leaving the last active intensity frozen in the scene.
  if (node._pulseIntensity !== 0) {
    node._pulseIntensity = 0
    changed = true
  }
  if (node._pulseColor !== undefined) {
    node._pulseColor = undefined
    changed = true
  }
  if (node._pulseGlowRadius !== undefined) {
    node._pulseGlowRadius = undefined
    changed = true
  }
  return changed
}

/**
 * Check whether there are active pulse animations needing continuous rendering.
 */
export function hasActivePulses(
  pulse: PulseConfig,
  timestampBuffer: RingBuffer<number> | null,
  now = typeof performance !== "undefined" ? performance.now() : Date.now()
): boolean {
  if (!timestampBuffer || timestampBuffer.size === 0) return false
  const duration = pulse.duration ?? 500
  const newest = timestampBuffer.peek()
  return newest != null && (now - newest) < duration
}

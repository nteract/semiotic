import type { Datum } from "../charts/shared/datumTypes"
import type { RingBuffer } from "../realtime/RingBuffer"
import type { OrdinalSceneNode } from "./ordinalTypes"
import type { PulseConfig } from "./types"
import { computePulseIntensity, setPulseState } from "./pipelinePulse"

/**
 * Apply pulse-derived fields to ordinal scene nodes without rebuilding their
 * layout. Wedges aggregate their category's source data; other supported
 * nodes map directly to one source datum.
 */
export function applyOrdinalPulse(
  pulse: PulseConfig,
  nodes: OrdinalSceneNode[],
  timestampBuffer: RingBuffer<number>,
  datumIndex: ReadonlyMap<Datum, number>,
  getCategoryIndices: (category: string) => number[] | undefined,
  now: number
): boolean {
  const pulseColor = pulse.color ?? "rgba(255,255,255,0.6)"
  const glowRadius = pulse.glowRadius ?? 4
  let changed = false

  for (const node of nodes) {
    if (node.type === "connector" || node.type === "violin" || node.type === "boxplot") continue

    if (node.type === "wedge") {
      const category = node.category
      if (!category) continue
      let intensity = 0
      for (const index of getCategoryIndices(category) ?? []) {
        const insertedAt = timestampBuffer.get(index)
        if (insertedAt != null) {
          intensity = Math.max(intensity, computePulseIntensity(pulse, insertedAt, now))
        }
      }
      changed = setPulseState(node, intensity, pulseColor) || changed
      continue
    }

    if (node.datum == null) continue
    const index = datumIndex.get(node.datum)
    if (index == null) continue
    const insertedAt = timestampBuffer.get(index)
    const intensity = insertedAt == null ? 0 : computePulseIntensity(pulse, insertedAt, now)
    changed = setPulseState(node, intensity, pulseColor, glowRadius) || changed
  }

  return changed
}

import type { Datum, DatumValue } from "../charts/shared/datumTypes"
/**
 * Shared decay encoding utilities for all pipeline stores.
 *
 * `computeDecayOpacity()` — core algorithm used by all four pipeline stores
 * (XY, Ordinal, Network, Geo) to compute age-based opacity. It is the
 * buffer-index projection of the runtime-neutral `opacityFromAge` age→opacity
 * ramp: streaming decay is just "age measured in buffer positions", where the
 * oldest surviving datum sits `bufferSize - 1` positions behind the newest.
 * Keeping one ramp implementation means the streaming runtime, physics
 * bodies, and any future age-based encoding share the exact same curves.
 *
 * `applyDecay()` — XY-specific application that handles per-vertex decay
 * for line/area nodes. Other stores call `computeDecayOpacity()` directly
 * with their own node iteration logic.
 */
import type { SceneNode, DecayConfig } from "./types"
import { opacityFromAge } from "../charts/shared/motionEncoding"

/**
 * Compute decay opacity for a datum at `bufferIndex` out of `bufferSize` items.
 * Index 0 = oldest, bufferSize-1 = newest. Returns 0–1.
 *
 * Delegates to the shared {@link opacityFromAge} ramp with age expressed in
 * buffer positions (`age = 0` at the newest datum, `extent = bufferSize - 1`
 * at the oldest). The buffer-based half-life / step defaults are passed
 * explicitly so the streaming ramp is unchanged from its standalone form.
 */
export function computeDecayOpacity(decay: DecayConfig, bufferIndex: number, bufferSize: number): number {
  if (bufferSize <= 1) return 1

  const extent = bufferSize - 1
  // age: 0 = newest, bufferSize-1 = oldest
  const age = extent - bufferIndex

  return opacityFromAge({
    age,
    extent,
    type: decay.type,
    // Preserve the buffer-sized defaults (opacityFromAge would otherwise
    // default to extent-based values, shifting the ramp by half a position).
    halfLife: decay.halfLife ?? bufferSize / 2,
    threshold: decay.stepThreshold ?? bufferSize * 0.5,
    minOpacity: decay.minOpacity ?? 0.1
  })
}

/**
 * Build a datum→buffer-index map. Callers that apply decay + pulse in the
 * same scene pass should share one map (and cache it by ingest version)
 * so continuous animation does not re-walk the buffer twice per frame.
 */
export function buildDatumIndexMap(data: readonly Datum[]): Map<Datum, number> {
  const indexMap = new Map<Datum, number>()
  for (let i = 0; i < data.length; i++) {
    indexMap.set(data[i], i)
  }
  return indexMap
}

/**
 * Apply decay opacity to a list of scene nodes.
 * Uses the datum's index in the buffer data array.
 *
 * @param indexMap Optional prebuilt datum→index map (see {@link buildDatumIndexMap}).
 */
export function applyDecay(
  decay: DecayConfig,
  nodes: SceneNode[],
  data: Datum[],
  indexMap: Map<DatumValue, number> = buildDatumIndexMap(data)
): void {
  const bufferSize = data.length
  if (bufferSize <= 1) return

  for (const node of nodes) {
    // Per-vertex decay for line nodes
    if (node.type === "line") {
      const datumArr = Array.isArray(node.datum) ? node.datum : []
      if (datumArr.length < 2) continue
      const opacities = new Array<number>(datumArr.length)
      let hasDecay = false
      for (let i = 0; i < datumArr.length; i++) {
        const idx = indexMap.get(datumArr[i])
        if (idx != null) {
          opacities[i] = computeDecayOpacity(decay, idx, bufferSize)
          if (opacities[i] < 1) hasDecay = true
        } else {
          opacities[i] = 1
        }
      }
      if (hasDecay) {
        node._decayOpacities = opacities
      }
      continue
    }

    // Per-vertex decay for area nodes
    if (node.type === "area") {
      const datumArr = Array.isArray(node.datum) ? node.datum : []
      const vertexCount = node.topPath ? node.topPath.length : datumArr.length
      if (vertexCount < 2) continue

      if (datumArr.length === vertexCount) {
        // Datum array aligns with path vertices — per-vertex decay
        const opacities = new Array<number>(vertexCount)
        let hasDecay = false
        for (let i = 0; i < datumArr.length; i++) {
          const idx = indexMap.get(datumArr[i])
          if (idx != null) {
            opacities[i] = computeDecayOpacity(decay, idx, bufferSize)
            if (opacities[i] < 1) hasDecay = true
          } else {
            opacities[i] = 1
          }
        }
        if (hasDecay) {
          node._decayOpacities = opacities
        }
      } else {
        // Datum/path length mismatch (e.g. stacked areas) — use uniform decay
        // based on the newest mappable datum
        let minOpacity = 1
        for (const d of datumArr) {
          const idx = indexMap.get(d)
          if (idx != null) {
            const op = computeDecayOpacity(decay, idx, bufferSize)
            if (op < minOpacity) minOpacity = op
          }
        }
        if (minOpacity < 1) {
          const opacities = new Array<number>(vertexCount)
          opacities.fill(minOpacity)
          node._decayOpacities = opacities
        }
      }
      continue
    }

    const idx = indexMap.get(node.datum)
    if (idx == null) continue
    const decayOpacity = computeDecayOpacity(decay, idx, bufferSize)
    if (node.type === "heatcell") {
      node.style = { opacity: decayOpacity }
    } else if (node.type === "candlestick") {
      // Candlestick doesn't have a style object — store opacity for renderer
      node._decayOpacity = decayOpacity
    } else {
      const baseOpacity = node.style?.opacity ?? 1
      node.style = { ...node.style, opacity: baseOpacity * decayOpacity }
    }
  }
}

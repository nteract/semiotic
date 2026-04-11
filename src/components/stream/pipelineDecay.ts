/**
 * Shared decay encoding utilities for all pipeline stores.
 *
 * `computeDecayOpacity()` — core algorithm used by all four pipeline stores
 * (XY, Ordinal, Network, Geo) to compute age-based opacity.
 *
 * `applyDecay()` — XY-specific application that handles per-vertex decay
 * for line/area nodes. Other stores call `computeDecayOpacity()` directly
 * with their own node iteration logic.
 */
import type { SceneNode, DecayConfig } from "./types"

/**
 * Compute decay opacity for a datum at `bufferIndex` out of `bufferSize` items.
 * Index 0 = oldest, bufferSize-1 = newest. Returns 0–1.
 */
export function computeDecayOpacity(decay: DecayConfig, bufferIndex: number, bufferSize: number): number {
  if (bufferSize <= 1) return 1

  const minOpacity = decay.minOpacity ?? 0.1
  // age: 0 = newest, bufferSize-1 = oldest
  const age = bufferSize - 1 - bufferIndex

  switch (decay.type) {
    case "linear": {
      const t = 1 - age / (bufferSize - 1)
      return minOpacity + t * (1 - minOpacity)
    }
    case "exponential": {
      const halfLife = decay.halfLife ?? bufferSize / 2
      const t = Math.pow(0.5, age / halfLife)
      return minOpacity + t * (1 - minOpacity)
    }
    case "step": {
      const threshold = decay.stepThreshold ?? bufferSize * 0.5
      return age < threshold ? 1 : minOpacity
    }
    default:
      return 1
  }
}

/**
 * Apply decay opacity to a list of scene nodes.
 * Uses the datum's index in the buffer data array.
 */
export function applyDecay(decay: DecayConfig, nodes: SceneNode[], data: Record<string, any>[]): void {
  const bufferSize = data.length
  if (bufferSize <= 1) return

  // Build datum→index lookup
  const indexMap = new Map<any, number>()
  for (let i = 0; i < data.length; i++) {
    indexMap.set(data[i], i)
  }

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

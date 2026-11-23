import type { Datum } from "../charts/shared/datumTypes"
import type { PointSceneNode } from "./types"

const sourceIndices = new WeakMap<PointSceneNode, number>()

/** Retain source order when projection clipping omits intervening rows. */
export function rememberGeoPointSource(
  node: PointSceneNode,
  index: number
): void {
  sourceIndices.set(node, index)
}

/** Custom layouts can retain original datums; built-in nodes already carry an index. */
export function geoPointIndices(
  nodes: PointSceneNode[],
  rows: Datum[]
): number[] {
  let fallback: Map<unknown, number[]> | undefined
  return nodes.map((node) => {
    const stored = sourceIndices.get(node)
    if (stored !== undefined) return stored
    if (!fallback) {
      fallback = new Map()
      for (let i = rows.length - 1; i >= 0; i--) {
        if (!(i in rows)) continue
        const indices = fallback.get(rows[i])
        if (indices) indices.push(i)
        else fallback.set(rows[i], [i])
      }
    }
    return fallback.get(node.datum)?.pop() ?? -1
  })
}

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
  const cursors = new Map<unknown, number>()
  return nodes.map((node) => {
    const stored = sourceIndices.get(node)
    if (stored !== undefined) return stored
    if (!fallback) {
      const indicesByRow = new Map<unknown, number[]>()
      fallback = indicesByRow
      rows.forEach((row, i) => {
        const indices = indicesByRow.get(row)
        if (indices) indices.push(i)
        else indicesByRow.set(row, [i])
      })
    }
    const cursor = cursors.get(node.datum) ?? 0
    cursors.set(node.datum, cursor + 1)
    return fallback.get(node.datum)?.[cursor] ?? -1
  })
}

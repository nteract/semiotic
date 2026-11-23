/**
 * ChartAccessor evaluation for ProcessSankey normalize / push / tooltip paths.
 */
import type { Datum } from "../../shared/datumTypes"
import type { ChartAccessor } from "../../shared/types"
import type { ProcessSankeyNormalizedNode } from "./buildScenes"
import { toProcessSankeyTime } from "./time"

/** Read a string-or-function accessor against a datum. */
export function readChartAccessor<T extends Datum, V>(
  accessor: ChartAccessor<T, V>,
  d: T,
): V {
  if (typeof accessor === "function") return accessor(d)
  return d[accessor as string] as V
}

export function normalizeProcessNode(
  raw: Datum, id: string, label: unknown, group: unknown, extent: unknown
): ProcessSankeyNormalizedNode & { __raw: Datum } {
  const node: ProcessSankeyNormalizedNode & { __raw: Datum } = { id, label: String(label ?? id), __raw: raw }
  if (group != null && String(group) !== "") node.group = String(group)
  if (Array.isArray(extent) && extent.length === 2) {
    const start = toProcessSankeyTime(extent[0])
    const end = toProcessSankeyTime(extent[1])
    if (Number.isFinite(start) && Number.isFinite(end)) node.xExtent = [start, end]
  }
  return node
}

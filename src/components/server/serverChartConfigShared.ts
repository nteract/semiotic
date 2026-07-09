import type { Datum } from "../charts/shared/datumTypes"
/**
 * Shared helpers + ChartConfig type for serverChartConfigs family modules.
 */
import { interpolateViridis } from "../charts/shared/colorPalettes"

export type FrameType = "xy" | "ordinal" | "network" | "geo" | "physics"

export interface ChartConfig {
  frameType: FrameType
  /** Build frame props from HOC-level props */
  buildProps: (data: any, colorBy: any, colorScheme: any, common: Datum, rest: Datum) => Datum
}

export function accessorValue(accessor: any, fallback: string, d: Datum): any {
  if (typeof accessor === "function") return accessor(d)
  return d[accessor || fallback]
}

export function numericValue(value: any): number {
  return value instanceof Date ? value.getTime() : Number(value)
}

export function viridisColor(i: number, n: number): string {
  return interpolateViridis(n === 1 ? 0.5 : i / (n - 1))
}

export function prepareConnectedScatterplotData(
  data: any,
  rest: Datum,
): { data: any; orderMap: WeakMap<Datum, { idx: number; total: number }> } {
  if (!Array.isArray(data)) {
    return { data, orderMap: new WeakMap() }
  }
  const xAccessor = rest.xAccessor || "x"
  const yAccessor = rest.yAccessor || "y"
  const ordered = rest.orderAccessor
    ? [...data].sort((a, b) => {
        if (a == null || typeof a !== "object") return 1
        if (b == null || typeof b !== "object") return -1
        return numericValue(accessorValue(rest.orderAccessor, "order", a))
          - numericValue(accessorValue(rest.orderAccessor, "order", b))
      })
    : data

  const orderMap = new WeakMap<Datum, { idx: number; total: number }>()
  let total = 0
  for (const d of ordered) {
    if (d == null || typeof d !== "object") continue
    const x = numericValue(accessorValue(xAccessor, "x", d))
    const y = numericValue(accessorValue(yAccessor, "y", d))
    if (Number.isFinite(x) && Number.isFinite(y)) total++
  }
  let idx = 0
  for (const d of ordered) {
    if (d == null || typeof d !== "object") continue
    const x = numericValue(accessorValue(xAccessor, "x", d))
    const y = numericValue(accessorValue(yAccessor, "y", d))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      orderMap.set(d, { idx: idx++, total })
    }
  }
  return { data: ordered, orderMap }
}

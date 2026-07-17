import type { Datum } from "../charts/shared/datumTypes"
import type { ChartMode } from "../charts/shared/types"
import type { ChartModeInput, ChartModeResult } from "../charts/shared/chartMode"
import type { SemioticTheme } from "../store/ThemeStore"
import type { ReactNode } from "react"
/**
 * Shared helpers + ChartConfig type for serverChartConfigs family modules.
 */
import { interpolateViridis } from "../charts/shared/colorPalettes"

export type FrameType = "xy" | "ordinal" | "network" | "geo" | "physics"
export type ServerAccessorValue = string | number | boolean | Date | null | undefined
export type ServerAccessor = string | ((datum: Datum) => ServerAccessorValue)
export type ServerColorScheme = string | string[] | Record<string, string> | undefined
export type ServerChartData = Datum | Datum[] | null | undefined
export type ServerMargin = { top: number; right: number; bottom: number; left: number }

export interface ServerChartLayoutDefaults {
  /** Force a semantic mode for aliases such as the server-only Sparkline. */
  mode?: ChartMode
  /** HOC-specific primary dimensions. Compact/mobile modes retain shared defaults. */
  primarySize?: { width: number; height: number }
  /** Chart-specific margin contract when the HOC does not use mode margins. */
  margin?: ServerMargin | ((props: Datum, resolved: ChartModeResult) => ServerMargin)
  /** HOC defaults applied before explicit props and semantic mode resolution. */
  modeDefaults?: Partial<ChartModeInput>
}

export interface ServerChartOverlayContext {
  theme: SemioticTheme
}

export interface ChartConfig {
  frameType: FrameType
  layout?: ServerChartLayoutDefaults
  /** Build frame props from HOC-level props */
  buildProps: (data: ServerChartData, colorBy: ServerAccessor | undefined, colorScheme: ServerColorScheme, common: Datum, rest: Datum) => Datum
  /** Optional chart-owned SVG overlay rendered after the shared frame. */
  renderOverlay?: (frameProps: Datum, context: ServerChartOverlayContext) => ReactNode
}

export function accessorValue(accessor: ServerAccessor | undefined, fallback: string, d: Datum): ServerAccessorValue {
  if (typeof accessor === "function") return accessor(d)
  return d[accessor || fallback]
}

export function numericValue(value: ServerAccessorValue): number {
  return value instanceof Date ? value.getTime() : Number(value)
}

export function viridisColor(i: number, n: number): string {
  return interpolateViridis(n === 1 ? 0.5 : i / (n - 1))
}

export function prepareConnectedScatterplotData(
  data: ServerChartData,
  rest: Datum,
): { data: ServerChartData; orderMap: WeakMap<Datum, { idx: number; total: number }> } {
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

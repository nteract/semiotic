import type { Datum } from "../charts/shared/datumTypes"
import type { ChartMode } from "../charts/shared/types"
import type { ChartModeInput, ChartModeResult } from "../charts/shared/chartMode"
import type { SemioticTheme } from "../store/themeCore"
import type { ReactNode } from "react"
import type { EvidenceSink } from "./renderEvidence"
/**
 * Shared helpers + ChartConfig type for serverChartConfigs family modules.
 */
import { interpolateViridis } from "../charts/shared/colorPalettes"
import type { PrimitiveStyleOverrides } from "../charts/shared/mergeShapeStyle"
import { buildRegressionAnnotation, type RegressionProp } from "../charts/shared/regressionUtils"

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
  /**
   * Render a chart-owned static composition instead of one Stream Frame.
   *
   * Composite HOCs such as MinimapChart and ScatterplotMatrix have more than
   * one scene, while ChainReactionChart's semantic reading is authored SVG
   * chrome over an intentionally empty physics body scene. Forcing those
   * forms through a single lower-level frame either drops meaning or returns
   * an empty image. A custom renderer still receives the normalized
   * HOC-level props and must populate the same evidence sink as a frame
   * renderer, so `renderChartWithEvidence()` remains truthful.
   */
  renderStatic?: (frameProps: Datum, sink?: EvidenceSink) => string
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

/**
 * Pull the top-level primitive styling props out of a chart's raw props so a
 * server config can overlay them with `mergeShapeStyle`, exactly as the HOC
 * does before handing style functions to its frame.
 *
 * Every shape-drawing HOC applies `stroke`/`strokeWidth`/`opacity` last, so
 * they win over `frameProps.*Style` returns and the HOC's own base style. A
 * server config that builds its style function without this overlay silently
 * drops the whole channel — the static SVG comes back byte-identical to an
 * unstyled render while the canvas honors it.
 *
 * Keys are omitted when unset so `mergeShapeStyle` can return its input
 * unchanged and callers keep the no-override fast path.
 */
export function primitiveStyleOverrides(rest: Datum): PrimitiveStyleOverrides {
  const overrides: PrimitiveStyleOverrides = {}
  if (rest.stroke !== undefined) overrides.stroke = rest.stroke as string
  if (rest.strokeWidth !== undefined) overrides.strokeWidth = rest.strokeWidth as number
  if (rest.opacity !== undefined) overrides.opacity = rest.opacity as number
  return overrides
}

/**
 * Server chart configs receive their raw HOC props as a generic datum. Keep
 * the regression sugar merge in one place so every chart family that exposes
 * `regression` preserves the client ordering: the trend paints beneath
 * caller-authored annotations.
 */
export function mergeServerRegressionAnnotation(
  annotations: unknown,
  regression: unknown,
): Datum[] | undefined {
  const trend = buildRegressionAnnotation(regression as RegressionProp | undefined)
  const userAnnotations = Array.isArray(annotations)
    ? annotations as Datum[]
    : undefined
  return trend ? [trend, ...(userAnnotations ?? [])] : userAnnotations
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

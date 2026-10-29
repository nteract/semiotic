import type { ReactNode } from "react"
import type { AxisExtentMode } from "../charts/shared/axisExtent"

export interface AxisTickCountOptions {
  axis?: { ticks?: number; tickCount?: number; extent?: AxisExtentMode }
  /** Final plot dimension in pixels, before scalePadding insets the range. */
  size: number
  orientation?: "horizontal" | "vertical"
  axisExtent?: AxisExtentMode
}

/** Requested tick count capped at one per 30px vertically or 70px horizontally.
 * d3 treats this as a hint, so the number of returned ticks can differ.
 * Exact mode uses at least two ticks without a size cap; zero hides nice ticks. */
export function resolveAxisTickCount({
  axis,
  size,
  orientation,
  axisExtent
}: AxisTickCountOptions): number {
  const requested = axis?.ticks ?? axis?.tickCount ?? 5
  if ((axis?.extent ?? axisExtent) === "exact") return Math.max(2, requested)
  return Math.min(
    requested,
    Math.max(2, Math.floor(size / (orientation === "horizontal" ? 70 : 30)))
  )
}

/**
 * Only primitive labels can be meaningfully compared without rendering.
 * `String(<span />)` is always "[object Object]", so ReactNode ticks cannot
 * use text-based deduplication.
 */
export function hasSameTickLabel(
  a: string | ReactNode,
  b: string | ReactNode
): boolean {
  const aIsText = typeof a === "string" || typeof a === "number"
  const bIsText = typeof b === "string" || typeof b === "number"
  return aIsText && bIsText && String(a) === String(b)
}

/**
 * Drop each tick whose text label repeats the one before it. A coarse
 * formatter (whole seconds over a sub-second domain, rounded currency) would
 * otherwise print the same label at several positions. Shared by XY and
 * ordinal value axes so axis labels, tick marks, and grid lines stay aligned.
 */
export function dropRepeatedTickLabels<T extends { label: string | ReactNode }>(
  ticks: T[]
): T[] {
  return ticks.filter(
    (tick, index) =>
      index === 0 || !hasSameTickLabel(tick.label, ticks[index - 1].label)
  )
}

/** Greedily filter ticks so consecutive labels are at least `minPx` apart. */
export function filterTicksByPixelDistance<
  T extends {
    value: number | Date | string
    pixel: number
    label: string | ReactNode
  }
>(ticks: T[], minPx: number): T[] {
  if (ticks.length <= 2) return ticks
  const result = [ticks[0]]
  for (let i = 1; i < ticks.length; i++) {
    if (Math.abs(ticks[i].pixel - result[result.length - 1].pixel) >= minPx) {
      result.push(ticks[i])
    } else if (i === ticks.length - 1) {
      // Keep the final endpoint by replacing the nearby intermediate tick.
      result[result.length - 1] = ticks[i]
    }
  }
  return result
}

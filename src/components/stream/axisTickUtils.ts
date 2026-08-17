import type { ReactNode } from "react"

/** Resolve the canonical `ticks` count while retaining `tickCount` compatibility. */
export function axisTickCount(
  axis: { ticks?: number; tickCount?: number } | undefined,
  fallback: number,
): number {
  return axis?.ticks ?? axis?.tickCount ?? fallback
}

export function defaultTickFormat(v: string | number | Date, _index?: number, _allTicks?: number[]): string {
  if (v instanceof Date) {
    return `${v.toLocaleString("en", { month: "short" })} ${v.getDate()}`
  }
  if (typeof v === "number") return String(Math.round(v * 100) / 100)
  return String(v)
}

/**
 * Only primitive labels can be meaningfully compared without rendering.
 * `String(<span />)` is always "[object Object]", which used to erase every
 * subsequent ReactNode tick when collision filtering also de-duplicated text.
 */
export function hasSameTickLabel(a: string | ReactNode, b: string | ReactNode): boolean {
  const aIsText = typeof a === "string" || typeof a === "number"
  const bIsText = typeof b === "string" || typeof b === "number"
  return aIsText && bIsText && String(a) === String(b)
}

/** Greedily filter ticks so consecutive labels are at least `minPx` apart. */
export function filterTicksByPixelDistance<T extends {
  value: number | Date
  pixel: number
  label: string | ReactNode
}>(ticks: T[], minPx: number): T[] {
  if (ticks.length <= 2) return ticks
  const result = [ticks[0]]
  for (let i = 1; i < ticks.length - 1; i++) {
    if (Math.abs(ticks[i].pixel - result[result.length - 1].pixel) >= minPx) {
      result.push(ticks[i])
    }
  }
  const last = ticks[ticks.length - 1]
  // Always keep the last tick (axis endpoint); if too close, replace the
  // previous intermediate tick.
  if (Math.abs(last.pixel - result[result.length - 1].pixel) >= minPx) {
    result.push(last)
  } else {
    result[result.length - 1] = last
  }
  return result
}

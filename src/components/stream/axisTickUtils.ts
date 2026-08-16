import type { ReactNode } from "react"

export function defaultTickFormat(v: string | number | Date, _index?: number, _allTicks?: number[]): string {
  if (v instanceof Date) {
    return `${v.toLocaleString("en", { month: "short" })} ${v.getDate()}`
  }
  if (typeof v === "number") return String(Math.round(v * 100) / 100)
  return String(v)
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

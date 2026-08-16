/** Resolved chart margin in pixels — every side populated. This is the
 *  internal shape after the frame merges the user-supplied margin with
 *  chart-mode defaults, so downstream layout math can read all four fields
 *  without null-checking. */
export interface MarginType {
  top: number
  bottom: number
  left: number
  right: number
}

/** Public margin side value. Numbers set a pixel baseline; chart-owned chrome
 *  such as legends may grow that side when it needs more room. `"auto"` and
 *  `null` explicitly start from the chart-mode default. */
export type MarginSide = number | "auto" | null | undefined

/** Public-API margin shape. Users can pass any subset of sides (`{ left: 120 }`
 *  for wide y-axis labels is a common pattern) or a single number as shorthand
 *  for "same baseline on all sides". Numeric values are minima when Semiotic
 *  reserves chart-owned chrome such as legends. Pass a side as `"auto"` or
 *  `null` to start from the chart-mode default. The frame fills missing/auto
 *  sides before handing a fully-resolved `MarginType` to layout code. */
export type PartialMargin = number | {
  top?: MarginSide
  right?: MarginSide
  bottom?: MarginSide
  left?: MarginSide
}

export function resolveMarginSide(value: MarginSide, fallback: number): number {
  return typeof value === "number" ? value : fallback
}

export function normalizePartialMargin(m: PartialMargin | undefined): Partial<MarginType> | undefined {
  if (m == null) return undefined
  if (typeof m === "number") return { top: m, right: m, bottom: m, left: m }
  const out: Partial<MarginType> = {}
  if (typeof m.top === "number") out.top = m.top
  if (typeof m.right === "number") out.right = m.right
  if (typeof m.bottom === "number") out.bottom = m.bottom
  if (typeof m.left === "number") out.left = m.left
  return out
}

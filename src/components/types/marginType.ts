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

/** Public-API margin shape. Users can pass any subset of sides (`{ left: 120 }`
 *  for wide y-axis labels is a common pattern) or a single number as shorthand
 *  for "same on all sides". The frame fills missing sides from the chart-mode
 *  defaults before handing a fully-resolved `MarginType` to the layout code. */
export type PartialMargin = number | Partial<MarginType>

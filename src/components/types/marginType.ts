/** Chart margin in pixels. Every HOC accepts a partial `Margin` via its `margin`
 *  prop; the frame merges it with the chart-mode defaults before computing the
 *  inner plot area. */
export interface MarginType {
  top: number
  bottom: number
  left: number
  right: number
}

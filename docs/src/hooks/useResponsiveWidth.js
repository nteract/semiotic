import { useEffect, useRef, useState } from "react"

/**
 * Track a host element's width, clamped to a minimum, for full-bleed example
 * charts that must never render below an art-directed minimum (they scroll
 * horizontally instead). Returns `[width, ref]` — attach `ref` to the measured
 * element and feed `width` to the chart.
 *
 * Differs from `useContainerWidth` (`[ref, width]`, raw `contentRect`, `null`
 * until first observe): this starts AT `minWidth` so the first SSR/paint is
 * stable, floors to an integer, clamps to `[minWidth, maxWidth]`, and is guarded
 * for environments without `ResizeObserver` (docs static rendering).
 *
 * @param {number} minWidth Floor the chart never renders below (it scrolls instead).
 * @param {number} [maxWidth] Optional cap so an art-directed chart doesn't over-stretch.
 * @param {{ bucket?: number }} [options] When `bucket` is set (e.g. 40), width
 *   updates only on that step — keeps expensive ProcessSankey layouts from
 *   re-running on every resize pixel tick.
 */
export default function useResponsiveWidth(minWidth, maxWidth = Infinity, options = {}) {
  const ref = useRef(null)
  const [width, setWidth] = useState(minWidth)
  const bucket = options?.bucket > 0 ? options.bucket : 0

  useEffect(() => {
    const host = ref.current
    if (!host || typeof ResizeObserver === "undefined") return
    const resolve = (raw) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, Math.floor(raw)))
      if (!bucket) return clamped
      return Math.max(minWidth, Math.min(maxWidth, Math.round(clamped / bucket) * bucket))
    }
    const update = () =>
      setWidth((prev) => {
        const next = resolve(host.clientWidth)
        return next === prev ? prev : next
      })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [minWidth, maxWidth, bucket])

  return [width, ref]
}

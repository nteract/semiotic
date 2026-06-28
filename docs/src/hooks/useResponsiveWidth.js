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
 */
export default function useResponsiveWidth(minWidth, maxWidth = Infinity) {
  const ref = useRef(null)
  const [width, setWidth] = useState(minWidth)

  useEffect(() => {
    const host = ref.current
    if (!host || typeof ResizeObserver === "undefined") return
    const update = () =>
      setWidth(Math.max(minWidth, Math.min(maxWidth, Math.floor(host.clientWidth))))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [minWidth, maxWidth])

  return [width, ref]
}

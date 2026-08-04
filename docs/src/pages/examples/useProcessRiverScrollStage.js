/**
 * Scroll-linked stage selection for vertical ProcessSankey “history river”
 * examples. Maps a fixed viewport reading line onto the chart’s time domain
 * and reports the nearest authored stage / milestone.
 *
 * Pure helpers are exported for unit tests; the hook owns the scroll/resize
 * listeners and rAF coalescing.
 */
import { useEffect, useRef } from "react"

/**
 * @param {number} plotY  pixel offset from the top of the plot area
 * @param {number} plotHeight
 * @param {readonly [number, number]} domain  [t0, t1] (time falls top → bottom)
 */
export function timeAtPlotY(plotY, plotHeight, domain) {
  if (!(plotHeight > 0) || !domain || domain.length < 2) return domain?.[0] ?? 0
  const t0 = domain[0]
  const t1 = domain[1]
  const clamped = Math.max(0, Math.min(plotHeight, plotY))
  return t0 + (clamped / plotHeight) * (t1 - t0)
}

/**
 * @param {number} time
 * @param {Array<{ id: string, time: number }>} stages
 */
export function nearestStageId(time, stages) {
  if (!stages?.length) return null
  let best = stages[0]
  let bestDist = Math.abs(stages[0].time - time)
  for (let i = 1; i < stages.length; i++) {
    const dist = Math.abs(stages[i].time - time)
    if (dist < bestDist) {
      best = stages[i]
      bestDist = dist
    }
  }
  return best.id
}

/**
 * Resolve the plot rectangle inside a chart shell. Prefer the frame’s
 * canvas/SVG when present so axis chrome outside the plot does not skew the
 * time mapping; fall back to the shell bounds + authored margin.
 */
export function resolvePlotGeometry(chartEl, { height, margin } = {}) {
  if (!chartEl) return null
  const frame =
    chartEl.querySelector(".stream-network-frame") ||
    chartEl.querySelector("canvas") ||
    chartEl
  const rect = frame.getBoundingClientRect()
  const mTop = margin?.top ?? 0
  const mBottom = margin?.bottom ?? 0
  const mLeft = margin?.left ?? 0
  const mRight = margin?.right ?? 0
  // Prefer the authored chart height when the element is still laying out
  // (height 0) so first-paint scroll can still resolve a stage.
  const totalHeight = rect.height > 0 ? rect.height : (height ?? 0)
  const plotHeight = Math.max(0, totalHeight - mTop - mBottom)
  return {
    plotTop: rect.top + mTop,
    plotLeft: rect.left + mLeft,
    plotHeight,
    plotWidth: Math.max(0, (rect.width > 0 ? rect.width : 0) - mLeft - mRight),
  }
}

/**
 * Viewport Y used as the “reading line” — roughly where a sticky stage
 * panel sits on desktop, a bit above mid-screen on small viewports.
 */
export function readingLineY(viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800) {
  return Math.min(Math.max(viewportHeight * 0.28, 120), 220)
}

/**
 * @param {object} options
 * @param {React.RefObject<HTMLElement | null>} options.chartRef
 * @param {Array<{ id: string, time: number }>} options.stages
 * @param {readonly [number, number]} options.domain
 * @param {number} options.height  authored chart height (px)
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} options.margin
 * @param {(stageId: string) => void} options.onStageIdChange
 * @param {boolean} [options.enabled=true]
 * @param {string | null} [options.activeStageId]  current selection (for equality skip)
 */
export function useProcessRiverScrollStage({
  chartRef,
  stages,
  domain,
  height,
  margin,
  onStageIdChange,
  enabled = true,
  activeStageId = null,
}) {
  const stagesRef = useRef(stages)
  const domainRef = useRef(domain)
  const heightRef = useRef(height)
  const marginRef = useRef(margin)
  const onChangeRef = useRef(onStageIdChange)
  const activeRef = useRef(activeStageId)
  const enabledRef = useRef(enabled)
  const rafRef = useRef(null)

  stagesRef.current = stages
  domainRef.current = domain
  heightRef.current = height
  marginRef.current = margin
  onChangeRef.current = onStageIdChange
  activeRef.current = activeStageId
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) return undefined
    if (typeof window === "undefined") return undefined

    const sample = () => {
      rafRef.current = null
      if (!enabledRef.current) return
      const chartEl = chartRef?.current
      if (!chartEl) return
      const geometry = resolvePlotGeometry(chartEl, {
        height: heightRef.current,
        margin: marginRef.current,
      })
      if (!geometry || !(geometry.plotHeight > 0)) return

      const focusY = readingLineY(window.innerHeight)
      const plotY = focusY - geometry.plotTop
      // Outside the chart: don’t thrash the panel while the user reads
      // the masthead or the findings below.
      if (plotY < -40 || plotY > geometry.plotHeight + 40) return

      const time = timeAtPlotY(plotY, geometry.plotHeight, domainRef.current)
      const nextId = nearestStageId(time, stagesRef.current)
      if (nextId != null && nextId !== activeRef.current) {
        onChangeRef.current?.(nextId)
      }
    }

    const schedule = () => {
      if (rafRef.current != null) return
      rafRef.current = window.requestAnimationFrame(sample)
    }

    sample()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [chartRef, enabled])
}

export default useProcessRiverScrollStage

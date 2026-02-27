import type { RendererFn } from "./types"

const DEFAULT_POSITIVE_COLOR = "#28a745"
const DEFAULT_NEGATIVE_COLOR = "#dc3545"

export function computeWaterfallExtent(
  data: Iterable<any>,
  getValue: (d: any) => number
): [number, number] {
  let min = 0
  let max = 0
  let cumulative = 0

  for (const d of data) {
    const v = getValue(d)
    if (v == null || Number.isNaN(v)) continue
    cumulative += v
    if (cumulative < min) min = cumulative
    if (cumulative > max) max = cumulative
  }

  return [min, max]
}

export const waterfallRenderer: RendererFn = (ctx, data, scales, layout, style, accessors, annotations, options) => {
  const { time: timeScale, value: valueScale } = scales
  const { timeAxis, width, height } = layout
  const { time: getTime, value: getValue } = accessors
  const ws = options?.waterfallStyle

  const positiveColor = ws?.positiveColor ?? DEFAULT_POSITIVE_COLOR
  const negativeColor = ws?.negativeColor ?? DEFAULT_NEGATIVE_COLOR
  const gap = ws?.gap ?? 1
  const connectorStroke = ws?.connectorStroke
  const connectorWidth = ws?.connectorWidth ?? 1
  const hasStroke = ws?.stroke != null
  if (hasStroke) {
    ctx.strokeStyle = ws!.stroke!
    ctx.lineWidth = ws?.strokeWidth ?? 1
  }

  // Collect into array for random access (skip NaN/null values)
  const arr: any[] = []
  for (const d of data) {
    const v = getValue(d)
    if (v == null || Number.isNaN(v)) continue
    arr.push(d)
  }

  if (arr.length === 0) return

  let baseline = 0
  // Track the end edge of the previous bar and its cumulative value for connectors
  let prevEdge: number | null = null
  let prevCumulative: number | null = null

  for (let i = 0; i < arr.length; i++) {
    const d = arr[i]
    const t = getTime(d)
    const delta = getValue(d)
    const cumEnd = baseline + delta

    // Compute bar width from time gap to next point
    let barWidthTime: number
    if (i < arr.length - 1) {
      barWidthTime = getTime(arr[i + 1]) - t
    } else if (i > 0) {
      barWidthTime = t - getTime(arr[i - 1])
    } else {
      // Single point fallback: use 0 to trigger pixel fallback
      barWidthTime = 0
    }

    ctx.fillStyle = delta >= 0 ? positiveColor : negativeColor

    if (timeAxis === "x") {
      let rawX0: number, rawX1: number

      if (barWidthTime !== 0) {
        rawX0 = timeScale(t)
        rawX1 = timeScale(t + barWidthTime)
      } else {
        rawX0 = timeScale(t)
        rawX1 = rawX0 + width / 10
      }

      const x0 = Math.min(rawX0, rawX1) + gap / 2
      const x1 = Math.max(rawX0, rawX1) - gap / 2
      const barWidth = x1 - x0
      if (barWidth <= 0) {
        baseline = cumEnd
        prevEdge = x1
        prevCumulative = cumEnd
        continue
      }

      const yBaseline = valueScale(baseline)
      const yTop = valueScale(cumEnd)
      const rectY = Math.min(yBaseline, yTop)
      const rectH = Math.abs(yBaseline - yTop)

      // Connector line at the baseline level from previous bar's right edge to this bar's left edge
      if (connectorStroke && prevEdge != null && prevCumulative != null) {
        ctx.save()
        ctx.strokeStyle = connectorStroke
        ctx.lineWidth = connectorWidth
        const connY = valueScale(prevCumulative)
        ctx.beginPath()
        ctx.moveTo(prevEdge, connY)
        ctx.lineTo(x0, connY)
        ctx.stroke()
        ctx.restore()
        if (hasStroke) {
          ctx.strokeStyle = ws!.stroke!
          ctx.lineWidth = ws?.strokeWidth ?? 1
        }
      }

      ctx.fillRect(x0, rectY, barWidth, rectH)
      if (hasStroke) ctx.strokeRect(x0, rectY, barWidth, rectH)

      prevEdge = x1
    } else {
      // timeAxis === "y": horizontal bars
      let rawY0: number, rawY1: number

      if (barWidthTime !== 0) {
        rawY0 = timeScale(t)
        rawY1 = timeScale(t + barWidthTime)
      } else {
        rawY0 = timeScale(t)
        rawY1 = rawY0 + height / 10
      }

      const y0 = Math.min(rawY0, rawY1) + gap / 2
      const y1 = Math.max(rawY0, rawY1) - gap / 2
      const barHeight = y1 - y0
      if (barHeight <= 0) {
        baseline = cumEnd
        prevEdge = y1
        prevCumulative = cumEnd
        continue
      }

      const xBaseline = valueScale(baseline)
      const xEnd = valueScale(cumEnd)
      const rectX = Math.min(xBaseline, xEnd)
      const rectW = Math.abs(xEnd - xBaseline)

      // Connector line at the baseline level from previous bar's bottom edge to this bar's top edge
      if (connectorStroke && prevEdge != null && prevCumulative != null) {
        ctx.save()
        ctx.strokeStyle = connectorStroke
        ctx.lineWidth = connectorWidth
        const connX = valueScale(prevCumulative)
        ctx.beginPath()
        ctx.moveTo(connX, prevEdge)
        ctx.lineTo(connX, y0)
        ctx.stroke()
        ctx.restore()
        if (hasStroke) {
          ctx.strokeStyle = ws!.stroke!
          ctx.lineWidth = ws?.strokeWidth ?? 1
        }
      }

      ctx.fillRect(rectX, y0, rectW, barHeight)
      if (hasStroke) ctx.strokeRect(rectX, y0, rectW, barHeight)

      prevEdge = y1
    }

    baseline = cumEnd
    prevCumulative = cumEnd
  }
}

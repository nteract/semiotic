import type { RendererFn } from "./types"

interface ColorThreshold {
  value: number
  color: string
  thresholdType: "greater" | "lesser"
}

function resolveColor(
  value: number,
  thresholds: ColorThreshold[],
  baseColor: string
): string {
  let color = baseColor
  for (const t of thresholds) {
    if (t.thresholdType === "lesser") {
      if (value < t.value) color = t.color
    } else {
      if (value > t.value) color = t.color
    }
  }
  return color
}

export const lineRenderer: RendererFn = (ctx, data, scales, layout, style, accessors, annotations) => {
  const { time: timeScale, value: valueScale } = scales
  const { timeAxis } = layout
  const { time: getTime, value: getValue } = accessors

  const baseColor = style.stroke || "#007bff"

  // Extract color thresholds from annotations
  const colorThresholds: ColorThreshold[] | null =
    annotations
      ? annotations
          .filter((a) => a.type === "threshold" && a.color)
          .map((a) => ({
            value: a.value as number,
            color: a.color as string,
            thresholdType: (a.thresholdType || "greater") as "greater" | "lesser"
          }))
      : null

  const hasColorThresholds = colorThresholds && colorThresholds.length > 0

  // Fast path: no color thresholds — single-path draw, zero overhead
  if (!hasColorThresholds) {
    ctx.beginPath()
    ctx.strokeStyle = baseColor
    ctx.lineWidth = style.strokeWidth || 2
    if (style.strokeDasharray) {
      ctx.setLineDash(style.strokeDasharray.split(/[\s,]+/).map(Number))
    } else {
      ctx.setLineDash([])
    }

    let started = false

    for (const d of data) {
      const t = getTime(d)
      const v = getValue(d)

      if (t == null || v == null || Number.isNaN(t) || Number.isNaN(v)) {
        started = false
        continue
      }

      const tPixel = timeScale(t)
      const vPixel = valueScale(v)

      const x = timeAxis === "x" ? tPixel : vPixel
      const y = timeAxis === "x" ? vPixel : tPixel

      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
    return
  }

  // Threshold mode: segment-based drawing
  ctx.lineWidth = style.strokeWidth || 2
  if (style.strokeDasharray) {
    ctx.setLineDash(style.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([])
  }

  let prevX: number | null = null
  let prevY: number | null = null
  let prevValue: number | null = null
  let prevColor: string | null = null
  let pathStarted = false

  function toPixel(t: number, v: number): [number, number] {
    const tPixel = timeScale(t)
    const vPixel = valueScale(v)
    return timeAxis === "x" ? [tPixel, vPixel] : [vPixel, tPixel]
  }

  function startSegment(color: string, x: number, y: number) {
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.moveTo(x, y)
    pathStarted = true
  }

  function endSegment() {
    if (pathStarted) {
      ctx.stroke()
      pathStarted = false
    }
  }

  for (const d of data) {
    const t = getTime(d)
    const v = getValue(d)

    if (t == null || v == null || Number.isNaN(t) || Number.isNaN(v)) {
      endSegment()
      prevX = null
      prevY = null
      prevValue = null
      prevColor = null
      continue
    }

    const [x, y] = toPixel(t, v)
    const currColor = resolveColor(v, colorThresholds, baseColor)

    if (prevX === null || prevColor === null || prevValue === null) {
      // First valid point
      startSegment(currColor, x, y)
      prevX = x
      prevY = y
      prevValue = v
      prevColor = currColor
      continue
    }

    if (currColor === prevColor) {
      ctx.lineTo(x, y)
    } else {
      // Find all thresholds crossed between prevValue and v, sorted by interpolation t
      const crossings: Array<{ t: number; color: string }> = []

      for (const threshold of colorThresholds) {
        const tv = threshold.value
        // Check if the threshold value lies between prevValue and v
        if ((prevValue <= tv && v >= tv) || (prevValue >= tv && v <= tv)) {
          // Don't add crossing at exact endpoints
          if (prevValue !== tv && v !== tv) {
            const interpT = (tv - prevValue) / (v - prevValue)
            crossings.push({ t: interpT, color: "" }) // color resolved after sorting
          }
        }
      }

      // Sort crossings by interpolation parameter
      crossings.sort((a, b) => a.t - b.t)

      // Walk through crossings
      let lastT = 0
      let runningColor = prevColor

      for (const crossing of crossings) {
        const midX = prevX + (x - prevX) * crossing.t
        const midY = prevY! + (y - prevY!) * crossing.t

        // Determine value at crossing point to resolve next color
        const midValue = prevValue + (v - prevValue) * crossing.t
        // Nudge slightly past the crossing to determine the color on the other side
        const nudgedValue = prevValue + (v - prevValue) * Math.min(crossing.t + 0.0001, 1)
        const nextColor = resolveColor(nudgedValue, colorThresholds, baseColor)

        ctx.lineTo(midX, midY)
        endSegment()
        startSegment(nextColor, midX, midY)
        runningColor = nextColor
      }

      ctx.lineTo(x, y)
    }

    prevX = x
    prevY = y
    prevValue = v
    prevColor = currColor
  }

  endSegment()
}

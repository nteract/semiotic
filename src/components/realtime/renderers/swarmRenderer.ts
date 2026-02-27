import type { RendererFn } from "./types"

const DEFAULT_PALETTE = [
  "#007bff", "#28a745", "#dc3545", "#fd7e14", "#6f42c1",
  "#20c997", "#e83e8c", "#17a2b8", "#6610f2", "#ffc107"
]

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

export const swarmRenderer: RendererFn = (ctx, data, scales, layout, style, accessors, annotations, options) => {
  const { time: timeScale, value: valueScale } = scales
  const { timeAxis } = layout
  const { time: getTime, value: getValue, category: getCategory } = accessors
  const ss = options?.swarmStyle
  const barColors = options?.barColors

  const radius = ss?.radius ?? 3
  const defaultFill = ss?.fill ?? style.stroke ?? "#007bff"
  const opacity = ss?.opacity ?? 0.7
  const hasStroke = ss?.stroke != null

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

  ctx.globalAlpha = opacity

  let paletteIndex = 0
  const categoryColorCache: Record<string, string> = {}

  for (const d of data) {
    const t = getTime(d)
    const v = getValue(d)
    if (v == null || Number.isNaN(v)) continue

    let x: number, y: number
    if (timeAxis === "x") {
      x = timeScale(t)
      y = valueScale(v)
    } else {
      x = valueScale(v)
      y = timeScale(t)
    }

    // Determine fill color
    let fill = defaultFill
    if (getCategory) {
      const cat = getCategory(d)
      if (barColors && barColors[cat]) {
        fill = barColors[cat]
      } else {
        if (!(cat in categoryColorCache)) {
          categoryColorCache[cat] = DEFAULT_PALETTE[paletteIndex % DEFAULT_PALETTE.length]
          paletteIndex++
        }
        fill = categoryColorCache[cat]
      }
    }

    // Threshold coloring overrides category/default fill
    if (hasColorThresholds) {
      fill = resolveColor(v, colorThresholds, fill)
    }

    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    if (hasStroke) {
      ctx.strokeStyle = ss!.stroke!
      ctx.lineWidth = ss?.strokeWidth ?? 1
      ctx.stroke()
    }
  }

  ctx.globalAlpha = 1
}

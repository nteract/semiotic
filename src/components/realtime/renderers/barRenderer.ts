import type { RendererFn } from "./types"
import { computeBins } from "../BinAccumulator"

const DEFAULT_PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2",
  "#59a14f", "#edc948", "#b07aa1", "#ff9da7",
  "#9c755f", "#bab0ac"
]

export const barRenderer: RendererFn = (ctx, data, scales, layout, style, accessors, annotations, options) => {
  const binSize = options?.binSize
  if (!binSize) return

  const { time: timeScale, value: valueScale } = scales
  const { timeAxis } = layout
  const { time: getTime, value: getValue, category: getCategory } = accessors
  const barColors = options?.barColors
  const barStyle = options?.barStyle

  const bins = computeBins(data, getTime, getValue, binSize, getCategory)
  if (bins.size === 0) return

  const [domainMin, domainMax] = timeScale.domain() as [number, number]

  const gap = barStyle?.gap ?? 1
  const hasCategories = getCategory != null

  // Determine category order: barColors keys first, then alphabetical for unlisted
  let categoryOrder: string[] | null = null
  if (hasCategories) {
    const allCategories = new Set<string>()
    for (const bin of bins.values()) {
      for (const cat of bin.categories.keys()) {
        allCategories.add(cat)
      }
    }
    const colorKeys = barColors ? Object.keys(barColors) : []
    const listed = new Set(colorKeys)
    const unlisted = Array.from(allCategories).filter(c => !listed.has(c)).sort()
    categoryOrder = [...colorKeys.filter(k => allCategories.has(k)), ...unlisted]
  }

  // Bar stroke settings
  const hasBarStroke = barStyle?.stroke != null
  if (hasBarStroke) {
    ctx.strokeStyle = barStyle!.stroke!
    ctx.lineWidth = barStyle?.strokeWidth ?? 1
  }

  for (const bin of bins.values()) {
    if (timeAxis === "x") {
      const clampedStart = Math.max(bin.start, domainMin)
      const clampedEnd = Math.min(bin.end, domainMax)
      if (clampedStart >= clampedEnd) continue

      const rawX0 = timeScale(clampedStart)
      const rawX1 = timeScale(clampedEnd)
      const x0 = Math.min(rawX0, rawX1) + gap / 2
      const x1 = Math.max(rawX0, rawX1) - gap / 2
      const barWidth = x1 - x0
      if (barWidth <= 0) continue

      if (hasCategories && categoryOrder) {
        let cumulativeBase = 0
        let paletteIdx = 0
        for (const cat of categoryOrder) {
          const catVal = bin.categories.get(cat) || 0
          if (catVal === 0) continue

          const yBottom = valueScale(cumulativeBase)
          const yTop = valueScale(cumulativeBase + catVal)
          const rectY = Math.min(yBottom, yTop)
          const rectH = Math.abs(yBottom - yTop)

          ctx.fillStyle = (barColors && barColors[cat]) || DEFAULT_PALETTE[paletteIdx % DEFAULT_PALETTE.length]
          ctx.fillRect(x0, rectY, barWidth, rectH)
          if (hasBarStroke) ctx.strokeRect(x0, rectY, barWidth, rectH)

          cumulativeBase += catVal
          paletteIdx++
        }
      } else {
        const yZero = valueScale(0)
        const yTop = valueScale(bin.total)
        const rectY = Math.min(yZero, yTop)
        const rectH = Math.abs(yZero - yTop)

        ctx.fillStyle = barStyle?.fill || style.stroke || "#007bff"
        ctx.fillRect(x0, rectY, barWidth, rectH)
        if (hasBarStroke) ctx.strokeRect(x0, rectY, barWidth, rectH)
      }
    } else {
      // timeAxis === "y": horizontal bars
      const clampedStart = Math.max(bin.start, domainMin)
      const clampedEnd = Math.min(bin.end, domainMax)
      if (clampedStart >= clampedEnd) continue

      const rawY0 = timeScale(clampedStart)
      const rawY1 = timeScale(clampedEnd)
      const y0 = Math.min(rawY0, rawY1) + gap / 2
      const y1 = Math.max(rawY0, rawY1) - gap / 2
      const barHeight = y1 - y0
      if (barHeight <= 0) continue

      if (hasCategories && categoryOrder) {
        let cumulativeBase = 0
        let paletteIdx = 0
        for (const cat of categoryOrder) {
          const catVal = bin.categories.get(cat) || 0
          if (catVal === 0) continue

          const xLeft = valueScale(cumulativeBase)
          const xRight = valueScale(cumulativeBase + catVal)
          const rectX = Math.min(xLeft, xRight)
          const rectW = Math.abs(xRight - xLeft)

          ctx.fillStyle = (barColors && barColors[cat]) || DEFAULT_PALETTE[paletteIdx % DEFAULT_PALETTE.length]
          ctx.fillRect(rectX, y0, rectW, barHeight)
          if (hasBarStroke) ctx.strokeRect(rectX, y0, rectW, barHeight)

          cumulativeBase += catVal
          paletteIdx++
        }
      } else {
        const xZero = valueScale(0)
        const xEnd = valueScale(bin.total)
        const rectX = Math.min(xZero, xEnd)
        const rectW = Math.abs(xEnd - xZero)

        ctx.fillStyle = barStyle?.fill || style.stroke || "#007bff"
        ctx.fillRect(rectX, y0, rectW, barHeight)
        if (hasBarStroke) ctx.strokeRect(rectX, y0, rectW, barHeight)
      }
    }
  }
}

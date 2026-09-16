import {
  estimateLabel,
  cacheLabelMeasurer,
  type LabelMeasurer
} from "./labelMeasurement"

/** Call after mount; SSR and initial hydration deliberately use estimates. */
export function browserLabelMeasurer(): LabelMeasurer {
  if (typeof document === "undefined") return estimateLabel
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return estimateLabel
  return cacheLabelMeasurer((text, font) => {
    const cssFont = `${font.weight} ${font.size}px ${font.family}`
    if (!document.fonts?.check(cssFont, text)) return estimateLabel(text, font)
    context.font = cssFont
    const metrics = context.measureText(text)
    const ascent = Math.ceil(
      Math.max(
        metrics.actualBoundingBoxAscent,
        metrics.fontBoundingBoxAscent ?? 0
      )
    )
    const descent = Math.ceil(
      Math.max(
        metrics.actualBoundingBoxDescent,
        metrics.fontBoundingBoxDescent ?? 0
      )
    )
    const width = Math.max(
      metrics.width,
      metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
    )
    if (
      ![width, ascent, descent].every(Number.isFinite) ||
      ascent + descent <= 0
    )
      return estimateLabel(text, font)
    return {
      width,
      height: ascent + descent,
      ascent,
      left: metrics.actualBoundingBoxLeft,
      source: "measured"
    }
  })
}

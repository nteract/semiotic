/** Shared text-metric seam. No DOM work occurs until a caller requests it. */
export interface LabelFont {
  family: string
  version: string | number
  size: number
  weight: string | number
}

export interface LabelMeasurement {
  width: number
  height: number
  ascent: number
  /** Distance from the painted left edge to the text origin (italic overhang). */
  left?: number
  source: "measured" | "estimated"
}

export type LabelMeasurer = (text: string, font: LabelFont) => LabelMeasurement

export const estimateLabel: LabelMeasurer = (text, font) => ({
  width: Array.from(text).length * font.size * 0.65,
  height: font.size * 1.2,
  ascent: font.size * 0.9,
  source: "estimated"
})

/** Cache belongs to the font/renderer session and is bounded for push mode. */
export function cacheLabelMeasurer(measure: LabelMeasurer): LabelMeasurer {
  const cache = new Map<string, LabelMeasurement>()
  return (text, font) => {
    const key = JSON.stringify([
      text,
      font.family,
      font.version,
      font.size,
      font.weight
    ])
    const cached = cache.get(key)
    if (cached) return cached
    const result = measure(text, font)
    if (cache.size >= 512) cache.delete(cache.keys().next().value!)
    cache.set(key, result)
    return result
  }
}


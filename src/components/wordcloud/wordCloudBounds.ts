import type { WordCloudLayoutResult, WordCloudPlacedWord } from "./types"

/** Bounds of occupied word geometry, excluding any mask obstacle. */
export function wordCloudBounds(
  words: readonly WordCloudPlacedWord[]
): WordCloudLayoutResult["bounds"] {
  if (words.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  // Preparation and portable-layout validation both need occupied bounds.
  // Scan once rather than allocating four coordinate arrays.
  for (const word of words) {
    minX = Math.min(minX, word.x + word.x0)
    minY = Math.min(minY, word.y + word.y0)
    maxX = Math.max(maxX, word.x + word.x1)
    maxY = Math.max(maxY, word.y + word.y1)
  }
  return [{ x: minX, y: minY }, { x: maxX, y: maxY }]
}

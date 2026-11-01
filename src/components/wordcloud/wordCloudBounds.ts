import type { WordCloudLayoutResult, WordCloudPlacedWord } from "./types"

/** Bounds of occupied word geometry, excluding any mask obstacle. */
export function wordCloudBounds(
  words: readonly WordCloudPlacedWord[]
): WordCloudLayoutResult["bounds"] {
  return words.length
    ? [
        {
          x: Math.min(...words.map((word) => word.x + word.x0)),
          y: Math.min(...words.map((word) => word.y + word.y0))
        },
        {
          x: Math.max(...words.map((word) => word.x + word.x1)),
          y: Math.max(...words.map((word) => word.y + word.y1))
        }
      ]
    : null
}

"use client"

// Dedicated entry: the raster engine is never exported by XY/network/root.
export { WordCloud } from "./charts/wordcloud/WordCloud"
export type {
  WordCloudProps,
  WordCloudAnnotation
} from "./charts/wordcloud/WordCloud"
export { prepareWordCloudLayout } from "./wordcloud/prepareWordCloudLayout"
export { normalizeWordCloudInput } from "./wordcloud/normalizeWordCloudInput"
export { validateWordCloudLayout } from "./wordcloud/validateWordCloudLayout"
export { WordCloudLayoutError } from "./wordcloud/types"
export type {
  WordCloudLayoutOptions,
  WordCloudLayoutResult,
  WordCloudPlacedWord,
  WordCloudOmission,
  WordCloudMask,
  WordCloudCanvasEnvironment
} from "./wordcloud/types"

export { useSelection, useSelectionActions } from "./store/useSelection"

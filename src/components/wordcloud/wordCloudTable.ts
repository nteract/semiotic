import type { WordCloudLayoutOptions, WordCloudLayoutResult } from "./types"

/** Ranked source values remain available even when a term cannot be placed. */
export function wordCloudTableScene(
  options: WordCloudLayoutOptions,
  layout?: WordCloudLayoutResult
) {
  if (!layout) return []
  const outcomes = [
    ...layout.words.map((word) => ({ ...word, reason: "placed" })),
    ...layout.omitted
  ]
  const rows = outcomes.map((word) => {
    const source = options.data[word.sourceIndex]
    const datum =
      source && typeof source === "object" ? source : { input: "Invalid row" }
    const raw =
      source && typeof source === "object"
        ? typeof options.valueAccessor === "function"
          ? options.valueAccessor(source)
          : source[options.valueAccessor ?? "value"]
        : undefined
    const value =
      typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN
    const term =
      source && typeof source === "object"
        ? String(
            typeof options.textAccessor === "function"
              ? options.textAccessor(source)
              : (source[options.textAccessor ?? "text"] ?? word.id)
          )
        : word.id
    return {
      type: "text",
      datum,
      sourceIndex: word.sourceIndex,
      accessibility: {
        label: term,
        tableFields: {
          ...datum,
          term,
          value: Number.isFinite(value) ? value : "Invalid value",
          placement: word.reason
        }
      },
      rankValue: Number.isFinite(value) ? value : -Infinity
    }
  })
  return rows.sort(
    (a, b) => b.rankValue - a.rankValue || a.sourceIndex - b.sourceIndex
  )
}

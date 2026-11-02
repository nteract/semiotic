import type {
  WordCloudLayoutOptions,
  WordCloudLayoutResult,
  WordCloudAccessor
} from "./types"
import type { Datum } from "../charts/shared/datumTypes"

// Normalization may skip an accessor for an omitted row (for example, a
// missing label). The accessible omission report must not turn that into a crash.
function tableValue(row: Datum, accessor: WordCloudAccessor<unknown>): unknown {
  if (!row || typeof row !== "object") return undefined
  try {
    return typeof accessor === "function" ? accessor(row) : row[accessor]
  } catch {
    return undefined
  }
}

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
    const raw = tableValue(source, options.valueAccessor ?? "value")
    const value =
      typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN
    const term = String(tableValue(source, options.textAccessor ?? "text") ?? word.id)
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

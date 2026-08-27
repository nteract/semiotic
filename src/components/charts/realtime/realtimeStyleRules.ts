import type { Datum } from "../shared/datumTypes"
import type { StyleRuleContext } from "../shared/styleRules"

/** Resolve the visible aggregate carried by a realtime histogram segment. */
export function makeHistogramRuleContext(): (datum: Datum) => StyleRuleContext {
  return (datum: Datum) => {
    const rawValue = datum.categoryValue ?? datum.total
    const value = typeof rawValue === "number" && Number.isFinite(rawValue)
      ? rawValue
      : undefined
    const start = Number(datum.binStart)
    const end = Number(datum.binEnd)
    const x = Number.isFinite(start) && Number.isFinite(end)
      ? (start + end) / 2
      : undefined
    return {
      value,
      x,
      y: value,
      category: datum.category == null ? undefined : String(datum.category),
    }
  }
}

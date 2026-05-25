"use client"
import { useMemo } from "react"
import { useChartObserver } from "./useObservation"
import type { ChartObservation } from "./ObservationStore"
import type { InterrogationFocus } from "./useChartInterrogation"

export interface UseChartFocusOptions {
  /** Limit attention to a specific chart instance. Required when the page has more than one. */
  chartId?: string
  /**
   * Which observation types count as "focused." Default is hover + click +
   * selection — anything that signals user attention. Set to ["click"] for
   * sticky-focus UIs where hover doesn't change the AI's reference point.
   */
  types?: ChartObservation["type"][]
}

/**
 * Default observation types this hook subscribes to. The "-end" variants
 * are included so a hover-out / click-elsewhere / brush-clear event can
 * *clear* an existing focus rather than leaving it stuck on the previous
 * datum — matches the `brush-end` branch in the reducer below.
 */
const DEFAULT_FOCUS_TYPES: ChartObservation["type"][] = [
  "hover",
  "hover-end",
  "click",
  "click-end",
  "selection",
  "selection-end",
  "brush-end",
]

/**
 * Convenience hook: returns the latest `InterrogationFocus` for use with
 * `useChartInterrogation`'s `focus` option. Internally subscribes to the
 * observation store and converts the latest matching observation into the
 * focus shape.
 *
 * Pair with `<Chart onObservation={…} chartId="myChart" />` and an
 * `<ObservationProvider>` ancestor.
 *
 * Returns `null` when no qualifying observation has fired yet.
 *
 * @example
 * function ChartWithChat({ data }) {
 *   const focus = useChartFocus({ chartId: "sales" })
 *   const { ask, history, annotations } = useChartInterrogation({
 *     data,
 *     focus,                    // ← latest hovered/clicked datum threads in
 *     onQuery: async (q, ctx) => {
 *       // ctx.focus is the same `focus` value passed above
 *       return askLLM({ question: q, focus: ctx.focus, summary: ctx.summary })
 *     },
 *   })
 *   return (
 *     <>
 *       <LineChart data={data} chartId="sales" annotations={annotations} />
 *       <YourChatUI history={history} onAsk={ask} />
 *     </>
 *   )
 * }
 */
export function useChartFocus(options: UseChartFocusOptions = {}): InterrogationFocus | null {
  const { chartId, types = DEFAULT_FOCUS_TYPES } = options
  const { latest } = useChartObserver({ chartId, types, limit: 1 })

  return useMemo(() => {
    if (!latest) return null
    // *-end observations signal "user moved away" — clear focus.
    if (
      latest.type === "hover-end" ||
      latest.type === "selection-end" ||
      latest.type === "brush-end" ||
      latest.type === "click-end"
    ) {
      return null
    }
    // Hover/click carry the datum directly; selection carries it under
    // selection.fields. Normalize so the focus shape is consistent.
    let datum: unknown
    if (latest.type === "selection") {
      datum = latest.selection.fields
    } else if (latest.type === "hover" || latest.type === "click") {
      datum = latest.datum
    } else {
      return null
    }
    if (!datum || typeof datum !== "object") return null
    return {
      datum: datum as Record<string, unknown>,
      x: (latest as { x?: number }).x,
      y: (latest as { y?: number }).y,
      source: latest.type as InterrogationFocus["source"],
    }
  }, [latest])
}

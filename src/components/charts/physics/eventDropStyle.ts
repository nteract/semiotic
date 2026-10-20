import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { PhysicsStyleRuleOptions } from "./physicsChartShared"
import { styleFromColorAccessor } from "./physicsChartShared"
import type { EventDropSource } from "./eventDropSources"
import { eventDropSourceStyle } from "./eventDropSources"
import { physicsCanvasThemeCSSValue } from "../../stream/physics/PhysicsCanvasTheme"

export type EventDropColorBy<T extends Datum = Datum> =
  ChartAccessor<T, string> | { window: "cycle" | string[] }

const WINDOW_COLORS = [
  "#4e79a7",
  "#59a14f",
  "#e15759",
  "#f28e2b",
  "#76b7b2",
  "#edc948",
  "#b07aa1",
  "#ff9da7"
]

/** Source identity provides defaults; explicit colorBy and style rules win. */
export function eventDropBodyStyle(
  sources: readonly EventDropSource[] | undefined,
  colorBy: EventDropColorBy | undefined,
  rules: PhysicsStyleRuleOptions
) {
  const windowPalette =
    typeof colorBy === "object"
      ? colorBy.window === "cycle"
        ? WINDOW_COLORS
        : colorBy.window
      : undefined
  const accessor = typeof colorBy === "object" ? undefined : colorBy
  const defaultStyle = styleFromColorAccessor(
    accessor,
    physicsCanvasThemeCSSValue("primary"),
    rules
  )
  const styles = new Map(
    sources?.map((source) => [
      source.id,
      styleFromColorAccessor(
        accessor,
        source.color ?? physicsCanvasThemeCSSValue("primary"),
        rules
      )
    ])
  )
  return (body: { datum?: unknown }) => {
    const source = String((body.datum as Datum | undefined)?.source ?? "")
    if (windowPalette?.length) {
      const windowIndex = Number(
        (body.datum as Datum | undefined)?.windowIndex ?? 0
      )
      const fill =
        windowPalette[
          ((windowIndex % windowPalette.length) + windowPalette.length) %
            windowPalette.length
        ]
      return {
        ...eventDropSourceStyle(sources, source),
        ...styleFromColorAccessor(undefined, fill, rules)(body)
      }
    }
    return {
      ...eventDropSourceStyle(sources, source),
      ...(styles.get(source) ?? defaultStyle)(body)
    }
  }
}

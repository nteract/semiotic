import type { Datum } from "./datumTypes"
import { DEFAULT_COLOR, getColor } from "./colorUtils"
import type { Accessor, ChartAccessor } from "./types"
import { resolveStyleRules, type StyleRule, type StyleRuleContext } from "./styleRules"

/** Pure portion of the LineChart style contract, shared by CSR and SSR. */
export interface XYLineBaseStyleOptions {
  lineWidth?: number
  colorBy?: Accessor<string> | ChartAccessor<Datum, string>
  colorScale?: (value: string) => string
  color?: string
  resolveStroke?: (datum: Datum, group?: string) => string
  fillArea?: boolean | string[]
  areaOpacity?: number
  styleRules?: ReadonlyArray<StyleRule>
  ruleContext?: (datum: Datum, group?: string) => StyleRuleContext
}

/**
 * Build the deterministic data-to-style callback used before primitive and
 * selection overlays. Keeping this free of React lets renderChart() apply the
 * same default/color/fill/rule precedence as the client HOC.
 */
export function buildXYLineBaseStyle(
  options: XYLineBaseStyleOptions,
): (datum: Datum, group?: string) => Datum {
  const {
    lineWidth = 2,
    colorBy,
    colorScale,
    color,
    resolveStroke,
    fillArea,
    areaOpacity = 0.3,
    styleRules,
    ruleContext,
  } = options

  return (datum: Datum, group?: string): Datum => {
    const style: Datum = { strokeWidth: lineWidth }
    const shouldFill = fillArea === true
      || (Array.isArray(fillArea) && group != null && fillArea.includes(group))

    let resolved: string | undefined
    if (resolveStroke) {
      resolved = resolveStroke(datum, group)
    } else if (colorBy) {
      if (colorScale) {
        resolved = getColor(datum, colorBy as ChartAccessor<Datum, string>, colorScale) as string
      }
    } else {
      resolved = color || DEFAULT_COLOR
    }

    if (resolved !== undefined) {
      style.stroke = resolved
      if (shouldFill) {
        style.fill = resolved
        style.fillOpacity = areaOpacity
      }
    }

    if (styleRules?.length) {
      Object.assign(
        style,
        resolveStyleRules(
          datum,
          styleRules,
          ruleContext ? ruleContext(datum, group) : { value: undefined, category: group },
        ),
      )
    }
    return style
  }
}

import type { LegendLayout, LegendValue } from "../types/legendTypes"
import { buildStaticCategoricalLegendConfig } from "./staticLegend"
import {
  reserveLegendMargin,
  type AxisChromeInput,
} from "../legendLayout"
import type { resolveTheme } from "./themeResolver"

type LegendPosition = "right" | "left" | "top" | "bottom"

export function reserveStaticLegendMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    categories: string[]
    colorScheme?: string | string[] | Record<string, string>
    theme: ReturnType<typeof resolveTheme>
    position?: LegendPosition
    size: [number, number]
    hasTitle?: boolean
    legendLayout?: LegendLayout
    minimumMargin?: number
    axisChrome?: AxisChromeInput
  }
): void {
  if (options.categories.length === 0) return
  const position = options.position || "right"
  const legend = buildStaticCategoricalLegendConfig(
    options.categories,
    options.colorScheme,
    options.theme,
  )
  reserveLegendMargin(margin, {
    legend,
    position,
    size: options.size,
    hasTitle: options.hasTitle,
    legendLayout: options.legendLayout,
    minimumMargin: options.minimumMargin,
    axisChrome: options.axisChrome,
  })
}

/**
 * Reserve a caller-supplied categorical, gradient, or raw React legend.
 * Raw nodes share `resolveLegendPlacement`'s predictable 100px/20px fallback
 * box, keeping static plot geometry aligned with the live overlay.
 */
export function reserveLegendConfigMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    legend: unknown
    theme: ReturnType<typeof resolveTheme>
    position?: LegendPosition
    size: [number, number]
    hasTitle?: boolean
    legendLayout?: LegendLayout
    minimumMargin?: number
    axisChrome?: AxisChromeInput
  }
): void {
  const position = options.position || "right"
  const legend = options.legend as LegendValue
  reserveLegendMargin(margin, {
    legend,
    position,
    size: options.size,
    hasTitle: options.hasTitle,
    legendLayout: options.legendLayout,
    minimumMargin: options.minimumMargin,
    axisChrome: options.axisChrome,
  })
}

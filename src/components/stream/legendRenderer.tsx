"use client"
import * as React from "react"
import type { ReactNode } from "react"
import Legend, { GradientLegend } from "../Legend"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import { isLegendConfig, isGradientLegendConfig } from "../types/legendTypes"
import {
  resolveLegendPlacement,
  type AxisChromeInput,
} from "../legendLayout"

export interface LegendRenderConfig {
  legend: LegendValue
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  title?: string | ReactNode
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendInteraction?: string
  /**
   * Chrome drawn by the **bottom** axis, so a bottom legend can be placed
   * outside it instead of on top of the tick labels. Omit for frames with no
   * horizontal axis (network, geo) — the gutter resolves to 0. Top legends do
   * not auto-measure; see `LegendLayout.axisGutter`.
   */
  axisChrome?: AxisChromeInput
}

/**
 * Renders a legend (categorical, gradient, or custom ReactNode) inside an SVG overlay.
 * Computes position based on `legendPosition` and chart dimensions.
 */
export function renderLegendFromConfig(config: LegendRenderConfig): ReactNode {
  const {
    legend,
    totalWidth,
    totalHeight,
    margin,
    legendPosition = "right",
    legendLayout,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendInteraction,
  } = config

  if (!legend) return null

  const { x, y, width: legendWidth } = resolveLegendPlacement(legend, {
    totalWidth,
    totalHeight,
    margin,
    position: legendPosition,
    legendLayout,
    axisChrome: config.axisChrome,
  })
  const isHorizontal = legendPosition === "top" || legendPosition === "bottom"

  return (
    <g transform={`translate(${x}, ${y})`}>
      {isGradientLegendConfig(legend)
        ? <GradientLegend
            config={legend.gradient}
            orientation={isHorizontal ? "horizontal" : "vertical"}
            width={legendWidth}
            customHoverBehavior={legendHoverBehavior}
            customClickBehavior={legendClickBehavior}
            highlightedCategory={legendHighlightedCategory}
            isolatedCategories={legendIsolatedCategories}
            legendInteraction={legendInteraction}
          />
        : isLegendConfig(legend)
        ? <Legend
            legendGroups={legend.legendGroups}
            title=""
            width={legendWidth}
            orientation={isHorizontal ? "horizontal" : "vertical"}
            legendLayout={legendLayout}
            customHoverBehavior={legendHoverBehavior}
            customClickBehavior={legendClickBehavior}
            highlightedCategory={legendHighlightedCategory}
            isolatedCategories={legendIsolatedCategories}
            legendInteraction={legendInteraction}
          />
        : (legend as ReactNode)}
    </g>
  )
}

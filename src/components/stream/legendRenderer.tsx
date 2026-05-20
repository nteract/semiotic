"use client"
import * as React from "react"
import type { ReactNode } from "react"
import Legend, { GradientLegend } from "../Legend"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../types/legendTypes"
import { isLegendConfig, isGradientLegendConfig } from "../types/legendTypes"

export interface LegendRenderConfig {
  legend: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
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
    title,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendInteraction,
  } = config

  if (!legend) return null

  const isHorizontal = legendPosition === "top" || legendPosition === "bottom"
  const hasTitle = Boolean(title)
  const plotWidth = Math.max(0, totalWidth - margin.left - margin.right)
  const legendWidth = Math.max(1, legendLayout?.maxWidth ?? (isHorizontal ? plotWidth : 100))
  let tx: number, ty: number
  if (legendPosition === "left") {
    tx = Math.max(4, margin.left - legendWidth - 10); ty = margin.top
  } else if (legendPosition === "top") {
    tx = margin.left; ty = hasTitle ? 32 : 8
  } else if (legendPosition === "bottom") {
    tx = margin.left; ty = totalHeight - margin.bottom + 38
  } else {
    // right (default)
    tx = totalWidth - margin.right + 10; ty = margin.top
  }

  return (
    <g transform={`translate(${tx}, ${ty})`}>
      {isGradientLegendConfig(legend)
        ? <GradientLegend
            config={legend.gradient}
            orientation={isHorizontal ? "horizontal" : "vertical"}
            width={legendWidth}
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

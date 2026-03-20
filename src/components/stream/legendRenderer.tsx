"use client"
import * as React from "react"
import type { ReactNode } from "react"
import Legend, { GradientLegend } from "../Legend"
import type { LegendGroup, GradientLegendConfig } from "../types/legendTypes"
import { isLegendConfig, isGradientLegendConfig } from "../types/legendTypes"

export interface LegendRenderConfig {
  legend: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  legendPosition?: "right" | "left" | "top" | "bottom"
  title?: string | ReactNode
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
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
    title,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
  } = config

  if (!legend) return null

  const isHorizontal = legendPosition === "top" || legendPosition === "bottom"
  const hasTitle = Boolean(title)
  let tx: number, ty: number
  if (legendPosition === "left") {
    tx = 4; ty = margin.top
  } else if (legendPosition === "top") {
    tx = 0; ty = hasTitle ? 32 : 8
  } else if (legendPosition === "bottom") {
    tx = 0; ty = totalHeight - margin.bottom + 50
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
            width={isHorizontal ? totalWidth : 100}
          />
        : isLegendConfig(legend)
        ? <Legend
            legendGroups={legend.legendGroups}
            title=""
            width={isHorizontal ? totalWidth : 100}
            orientation={isHorizontal ? "horizontal" : "vertical"}
            customHoverBehavior={legendHoverBehavior}
            customClickBehavior={legendClickBehavior}
            highlightedCategory={legendHighlightedCategory}
            isolatedCategories={legendIsolatedCategories}
          />
        : (legend as ReactNode)}
    </g>
  )
}

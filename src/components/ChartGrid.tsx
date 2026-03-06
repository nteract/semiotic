"use client"
import * as React from "react"

export interface ChartGridProps {
  /** Chart components to arrange in the grid */
  children: React.ReactNode
  /** Number of columns. Default: "auto" (auto-fill based on minCellWidth) */
  columns?: number | "auto"
  /** Minimum cell width for auto columns. Default: 300 */
  minCellWidth?: number
  /** Gap between cells in pixels. Default: 16 */
  gap?: number
  /** CSS class for the grid container */
  className?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

/**
 * ChartGrid — responsive grid layout for multiple Semiotic charts.
 *
 * Arranges child charts in a CSS Grid that reflows based on available space.
 * Each cell automatically gets `responsiveWidth` behavior since the grid
 * manages the cell dimensions.
 *
 * Works naturally with `LinkedCharts` for coordinated views:
 *
 * ```tsx
 * <LinkedCharts>
 *   <ChartGrid columns={2}>
 *     <LineChart data={d} xAccessor="x" yAccessor="y" responsiveWidth />
 *     <BarChart data={d} categoryAccessor="cat" valueAccessor="val" responsiveWidth />
 *   </ChartGrid>
 * </LinkedCharts>
 * ```
 */
export function ChartGrid({
  children,
  columns = "auto",
  minCellWidth = 300,
  gap = 16,
  className,
  style,
}: ChartGridProps) {
  const gridTemplateColumns =
    columns === "auto"
      ? `repeat(auto-fill, minmax(${minCellWidth}px, 1fr))`
      : `repeat(${columns}, 1fr)`

  return (
    <div
      className={`semiotic-chart-grid${className ? ` ${className}` : ""}`}
      style={{
        display: "grid",
        gridTemplateColumns,
        gap,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

ChartGrid.displayName = "ChartGrid"

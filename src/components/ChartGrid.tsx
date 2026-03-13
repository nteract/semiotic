"use client"
import * as React from "react"

export type ChartEmphasis = "primary" | "secondary"

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
 * Children can set `emphasis="primary"` to span two columns and receive
 * higher visual weight, following the F-pattern reading layout recommended
 * by Carbon Design guidelines.
 *
 * ```tsx
 * <ChartGrid columns={2}>
 *   <LineChart data={d} emphasis="primary" responsiveWidth />
 *   <BarChart data={d} responsiveWidth />
 *   <ScatterChart data={d} responsiveWidth />
 * </ChartGrid>
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
  const numColumns = typeof columns === "number" ? columns : undefined
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
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        const emphasis = (child.props as any).emphasis as ChartEmphasis | undefined
        if (emphasis === "primary" && (numColumns === undefined || numColumns >= 2)) {
          return (
            <div style={{ gridColumn: "span 2" }}>
              {child}
            </div>
          )
        }
        return child
      })}
    </div>
  )
}

ChartGrid.displayName = "ChartGrid"

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
  /** Columns between mobile and tablet breakpoints. Leave undefined to use the base grid. */
  tabletColumns?: number
  /** Columns at the mobile breakpoint. Default: 1 */
  mobileColumns?: number
  /** Mobile breakpoint used by generated CSS. Default 480. */
  mobileBreakpoint?: number
  /** Tablet breakpoint used by generated CSS. Default 860. */
  tabletBreakpoint?: number
  /** Defaults injected into direct child charts when the child has not declared the prop. */
  chartDefaults?: Record<string, unknown>
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
  tabletColumns,
  mobileColumns = 1,
  mobileBreakpoint = 480,
  tabletBreakpoint = 860,
  chartDefaults,
  className,
  style,
}: ChartGridProps) {
  const instanceId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const responsiveClassName = `semiotic-chart-grid-${instanceId}`
  const numColumns = typeof columns === "number" ? columns : undefined
  const gridTemplateColumns =
    columns === "auto"
      ? `repeat(auto-fill, minmax(${minCellWidth}px, 1fr))`
      : `repeat(${columns}, 1fr)`
  const classNames = [
    "semiotic-chart-grid",
    responsiveClassName,
    className,
  ].filter(Boolean).join(" ")

  return (
    <>
      <style>{`
        ${tabletColumns ? `
        @media (max-width: ${tabletBreakpoint}px) {
          .${responsiveClassName} {
            grid-template-columns: repeat(${tabletColumns}, minmax(0, 1fr)) !important;
          }
        }` : ""}
        @media (max-width: ${mobileBreakpoint}px) {
          .${responsiveClassName} {
            grid-template-columns: repeat(${mobileColumns}, minmax(0, 1fr)) !important;
          }
          .${responsiveClassName} > [data-semiotic-chart-grid-primary="true"] {
            grid-column: span ${mobileColumns} !important;
          }
        }
      `}</style>
      <div
        className={classNames}
        style={{
          display: "grid",
          gridTemplateColumns,
          gap,
          width: "100%",
          ...style,
        }}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<{ emphasis?: ChartEmphasis }>(child)) return child
          const childProps = child.props as Record<string, unknown>
          const injected: Record<string, unknown> = {}
          if (chartDefaults) {
            for (const [key, value] of Object.entries(chartDefaults)) {
              if (childProps[key] == null) injected[key] = value
            }
          }
          const renderedChild = Object.keys(injected).length > 0
            ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, injected)
            : child
          const emphasis = child.props.emphasis
          if (emphasis === "primary" && (numColumns === undefined || numColumns >= 2)) {
            return (
              <div
                data-semiotic-chart-grid-primary="true"
                style={{ gridColumn: "span 2", minWidth: 0 }}
              >
                {renderedChild}
              </div>
            )
          }
          return renderedChild
        })}
      </div>
    </>
  )
}

ChartGrid.displayName = "ChartGrid"

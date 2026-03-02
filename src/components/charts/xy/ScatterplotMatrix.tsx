"use client"
import * as React from "react"
import { useMemo, useCallback, useId, useRef, useEffect } from "react"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor } from "../shared/colorUtils"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelection, useBrushSelection, useLinkedHover } from "../../store/useSelection"
import { buildPredicate } from "../../store/SelectionStore"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScatterplotMatrixProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Array of data objects */
  data: TDatum[]
  /** Array of field names to include in the matrix */
  fields: string[]
  /** Optional display labels for fields */
  fieldLabels?: Record<string, string>
  /** Field or function to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme @default "category10" */
  colorScheme?: string | string[]
  /** Size of each cell in pixels @default 150 */
  cellSize?: number
  /** Gap between cells in pixels @default 4 */
  cellGap?: number
  /** Point radius @default 2 */
  pointRadius?: number
  /** Point opacity @default 0.5 */
  pointOpacity?: number
  /** What to show on the diagonal @default "histogram" */
  diagonal?: "histogram" | "density" | "label"
  /** Number of histogram bins @default 20 */
  histogramBins?: number
  /** Brush interaction mode @default "crossfilter" */
  brushMode?: "crossfilter" | "intersect" | false
  /** Enable linked hover @default true */
  linkedHoverEnabled?: boolean
  /** Opacity for unselected points @default 0.1 */
  unselectedOpacity?: number
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Show legend @default true when colorBy is set */
  showLegend?: boolean
}

// ── Scatterplot Cell ───────────────────────────────────────────────────────

interface CellProps {
  data: Record<string, any>[]
  xField: string
  yField: string
  cellSize: number
  pointRadius: number
  pointOpacity: number
  colorBy?: ChartAccessor<any, string>
  colorScale?: (v: string) => string
  selectionName: string
  unselectedOpacity: number
  showGrid: boolean
  tooltip?: TooltipProp
}

function ScatterplotCell({
  data,
  xField,
  yField,
  cellSize,
  pointRadius,
  pointOpacity,
  colorBy,
  colorScale,
  selectionName,
  unselectedOpacity,
  showGrid,
  tooltip
}: CellProps) {
  const clientId = `splom-${xField}-${yField}`

  const selectionHook = useSelection({
    name: selectionName,
    clientId,
    fields: [xField, yField]
  })

  const brushHook = useBrushSelection({
    name: selectionName,
    xField,
    yField
  })

  const pointStyle = useCallback(
    (d: Record<string, any>) => {
      const style: Record<string, any> = {
        fillOpacity: pointOpacity,
        r: pointRadius
      }

      if (colorBy) {
        style.fill = getColor(d, colorBy, colorScale)
      } else {
        style.fill = DEFAULT_COLOR
      }

      if (selectionHook.isActive && !selectionHook.predicate(d)) {
        style.fillOpacity = unselectedOpacity
        style.strokeOpacity = unselectedOpacity
      }

      return style
    },
    [colorBy, colorScale, pointOpacity, pointRadius, selectionHook.isActive, selectionHook.predicate, unselectedOpacity]
  )

  const axes = useMemo((): Array<Record<string, unknown>> => [
    { orient: "left", ticks: 3, tickFormat: () => "", ...(showGrid && { tickLineGenerator: () => null }) },
    { orient: "bottom", ticks: 3, tickFormat: () => "", ...(showGrid && { tickLineGenerator: () => null }) }
  ], [showGrid])

  const xyFrameProps: XYFrameProps = {
    size: [cellSize, cellSize],
    points: data,
    xAccessor: xField,
    yAccessor: yField,
    pointStyle,
    axes: axes as any,
    hoverAnnotation: true,
    interaction: brushHook.brushInteraction,
    margin: { top: 4, bottom: 4, left: 4, right: 4 },
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function })
  }

  return <XYFrame {...xyFrameProps} />
}

// ── Diagonal Cell (Histogram) ──────────────────────────────────────────────

interface DiagonalCellProps {
  data: Record<string, any>[]
  field: string
  label: string
  cellSize: number
  bins: number
  colorBy?: ChartAccessor<any, string>
  colorScale?: (v: string) => string
  selectionName: string
  unselectedOpacity: number
}

function DiagonalCell({
  data,
  field,
  label,
  cellSize,
  bins,
  colorBy,
  colorScale,
  selectionName,
  unselectedOpacity
}: DiagonalCellProps) {
  const selectionHook = useSelection({
    name: selectionName,
    clientId: `splom-diag-${field}`,
    fields: [field]
  })

  const histogram = useMemo(() => {
    const values = data.map((d) => d[field]).filter((v) => v != null && !isNaN(v))
    if (values.length === 0) return { bars: [], selectedBars: [], max: 0 }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const binWidth = (max - min) / bins || 1

    const counts = new Array(bins).fill(0)
    const selectedCounts = new Array(bins).fill(0)

    for (const d of data) {
      const v = d[field]
      if (v == null || isNaN(v)) continue
      const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1)
      counts[idx]++
      if (!selectionHook.isActive || selectionHook.predicate(d)) {
        selectedCounts[idx]++
      }
    }

    const maxCount = Math.max(...counts, 1)

    return {
      bars: counts.map((c, i) => ({
        x: (i / bins) * cellSize,
        w: (cellSize / bins) - 1,
        h: (c / maxCount) * (cellSize - 24),
        count: c
      })),
      selectedBars: selectedCounts.map((c, i) => ({
        x: (i / bins) * cellSize,
        w: (cellSize / bins) - 1,
        h: (c / maxCount) * (cellSize - 24),
        count: c
      })),
      max: maxCount
    }
  }, [data, field, bins, cellSize, selectionHook.isActive, selectionHook.predicate])

  return (
    <svg width={cellSize} height={cellSize} style={{ overflow: "hidden" }}>
      <text
        x={cellSize / 2}
        y={14}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="#333"
      >
        {label}
      </text>
      {/* Full distribution (dimmed when selection active) */}
      {histogram.bars.map((bar, i) => (
        <rect
          key={`bg-${i}`}
          x={bar.x}
          y={cellSize - bar.h}
          width={Math.max(bar.w, 1)}
          height={bar.h}
          fill="#ccc"
          opacity={selectionHook.isActive ? 0.3 : 0.6}
        />
      ))}
      {/* Selected distribution */}
      {selectionHook.isActive &&
        histogram.selectedBars.map((bar, i) => (
          <rect
            key={`sel-${i}`}
            x={bar.x}
            y={cellSize - bar.h}
            width={Math.max(bar.w, 1)}
            height={bar.h}
            fill={DEFAULT_COLOR}
            opacity={0.7}
          />
        ))}
    </svg>
  )
}

// ── Label Cell ─────────────────────────────────────────────────────────────

function LabelCell({ label, cellSize }: { label: string; cellSize: number }) {
  return (
    <svg width={cellSize} height={cellSize}>
      <text
        x={cellSize / 2}
        y={cellSize / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight="bold"
        fill="#333"
      >
        {label}
      </text>
    </svg>
  )
}

// ── ScatterplotMatrix ──────────────────────────────────────────────────────

function ScatterplotMatrixInner<TDatum extends Record<string, any> = Record<string, any>>(
  props: ScatterplotMatrixProps<TDatum>
) {
  const {
    data,
    fields,
    fieldLabels = {},
    colorBy,
    colorScheme = "category10",
    cellSize = 150,
    cellGap = 4,
    pointRadius = 2,
    pointOpacity = 0.5,
    diagonal = "histogram",
    histogramBins = 20,
    brushMode = "crossfilter",
    linkedHoverEnabled = true,
    unselectedOpacity = 0.1,
    showGrid = false,
    tooltip,
    showLegend,
    width,
    height,
    className
  } = props

  const safeData = (data || []) as Record<string, any>[]
  const selectionName = "splom"

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const n = fields.length
  const labelWidth = 40
  const totalWidth = n * cellSize + (n - 1) * cellGap + labelWidth
  const totalHeight = n * cellSize + (n - 1) * cellGap + labelWidth

  // Legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return null
    const colorField = typeof colorBy === "string" ? colorBy : null
    if (!colorField) return null
    const categories = [...new Set(safeData.map((d) => d[colorField]))]
    return categories.map((cat) => ({
      label: String(cat),
      color: colorScale ? colorScale(String(cat)) : DEFAULT_COLOR
    }))
  }, [shouldShowLegend, colorBy, safeData, colorScale])

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: `${labelWidth}px ${fields.map(() => `${cellSize}px`).join(" ")}`,
      gridTemplateRows: `${fields.map(() => `${cellSize}px`).join(" ")} ${labelWidth}px`,
      gap: `${cellGap}px`,
      width: "fit-content"
    }),
    [fields, cellSize, cellGap, labelWidth]
  )

  return (
    <div className={className} style={{ position: "relative" }}>
      {legend && (
        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          {legend.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: item.color
                }}
              />
              <span style={{ fontSize: 11 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <div style={gridStyle}>
        {fields.map((rowField, row) => (
          <React.Fragment key={`row-${rowField}`}>
            {/* Row label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 11,
                fontWeight: "bold",
                color: "#333"
              }}
            >
              {fieldLabels[rowField] || rowField}
            </div>

            {/* Cells for this row */}
            {fields.map((colField, col) => {
              if (row === col) {
                // Diagonal
                if (diagonal === "label") {
                  return (
                    <LabelCell
                      key={`diag-${rowField}`}
                      label={fieldLabels[rowField] || rowField}
                      cellSize={cellSize}
                    />
                  )
                }
                return (
                  <DiagonalCell
                    key={`diag-${rowField}`}
                    data={safeData}
                    field={rowField}
                    label={fieldLabels[rowField] || rowField}
                    cellSize={cellSize}
                    bins={histogramBins}
                    colorBy={colorBy}
                    colorScale={colorScale}
                    selectionName={selectionName}
                    unselectedOpacity={unselectedOpacity}
                  />
                )
              }

              return (
                <ScatterplotCell
                  key={`cell-${rowField}-${colField}`}
                  data={safeData}
                  xField={colField}
                  yField={rowField}
                  cellSize={cellSize}
                  pointRadius={pointRadius}
                  pointOpacity={pointOpacity}
                  colorBy={colorBy}
                  colorScale={colorScale}
                  selectionName={selectionName}
                  unselectedOpacity={unselectedOpacity}
                  showGrid={showGrid}
                  tooltip={tooltip}
                />
              )
            })}
          </React.Fragment>
        ))}

        {/* Bottom column labels */}
        <div /> {/* Empty corner cell */}
        {fields.map((field) => (
          <div
            key={`col-label-${field}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: "bold",
              color: "#333"
            }}
          >
            {fieldLabels[field] || field}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ScatterplotMatrix (SPLOM) — multi-dimensional scatter visualization
 *
 * Renders an N×N grid of scatterplots for all pairwise combinations of the
 * specified fields. Diagonal cells show histograms. Built-in brush-and-link
 * with crossfilter support: brushing one cell highlights matching points
 * across all other cells.
 *
 * @example
 * ```tsx
 * <ScatterplotMatrix
 *   data={iris}
 *   fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
 *   colorBy="species"
 *   cellSize={160}
 *   diagonal="histogram"
 * />
 * ```
 */
export function ScatterplotMatrix<TDatum extends Record<string, any> = Record<string, any>>(
  props: ScatterplotMatrixProps<TDatum>
) {
  const { brushMode = "crossfilter" } = props

  const selectionConfig = brushMode
    ? { splom: { resolution: brushMode as "crossfilter" | "intersect" } }
    : undefined

  return (
    <LinkedCharts selections={selectionConfig}>
      <ScatterplotMatrixInner {...props} />
    </LinkedCharts>
  )
}

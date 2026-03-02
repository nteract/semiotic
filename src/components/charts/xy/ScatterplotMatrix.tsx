"use client"
import * as React from "react"
import { useMemo, useCallback, useState } from "react"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelection, useBrushSelection } from "../../store/useSelection"
import { useSelectionSelector } from "../../store/SelectionStore"

// Internal field used to identify datums across cells
const SPLOM_IDX = "__splomIdx"

// Shared clientId for all hover writers — ensures each new hover REPLACES
// the previous one (same key in the clause Map) instead of accumulating.
const HOVER_CLIENT_ID = "splom-hover-source"

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
  /** Enable hover cross-highlighting @default true */
  hoverMode?: boolean
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
  fieldLabels: Record<string, string>
  cellSize: number
  pointRadius: number
  pointOpacity: number
  colorBy?: ChartAccessor<any, string>
  colorScale?: (v: string) => string
  brushSelectionName: string
  hoverSelectionName: string
  unselectedOpacity: number
  showGrid: boolean
  tooltip?: TooltipProp
  /** "brush" or "hover" — mutually exclusive */
  mode: "brush" | "hover"
  /** Callback when a point is hovered (hover mode only). Called with null on clear. */
  onPointHover?: (datum: Record<string, any> | null) => void
}

function ScatterplotCell({
  data,
  xField,
  yField,
  fieldLabels,
  cellSize,
  pointRadius,
  pointOpacity,
  colorBy,
  colorScale,
  brushSelectionName,
  hoverSelectionName,
  unselectedOpacity,
  showGrid,
  tooltip,
  mode,
  onPointHover
}: CellProps) {
  const clientId = `splom-${xField}-${yField}`

  // Brush selection (crossfilter) — only used in brush mode
  const brushSelectionHook = useSelection({
    name: brushSelectionName,
    clientId,
    fields: [xField, yField]
  })

  const brushHook = useBrushSelection({
    name: brushSelectionName,
    xField,
    yField
  })

  // Hover selection — all cells share HOVER_CLIENT_ID so each new hover
  // REPLACES the previous cell's clause instead of accumulating.
  const hoverHook = useSelection({
    name: hoverSelectionName,
    clientId: HOVER_CLIENT_ID,
    fields: [SPLOM_IDX]
  })

  const hoverSelectPoints = hoverHook.selectPoints

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | undefined) => {
      if (!d) {
        onPointHover?.(null)
        return
      }
      const idx = d[SPLOM_IDX]
      if (idx !== undefined) {
        hoverSelectPoints({ [SPLOM_IDX]: [idx] })
        onPointHover?.(d)
      }
    },
    [hoverSelectPoints, onPointHover]
  )

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

      if (mode === "hover") {
        const hoverHighlighted = hoverHook.isActive && hoverHook.predicate(d)
        if (hoverHighlighted) {
          style.fillOpacity = 1
          style.r = pointRadius * 2.5
          style.stroke = "#333"
          style.strokeWidth = 1.5
        } else if (hoverHook.isActive) {
          style.fillOpacity = pointOpacity * 0.6
        }
      } else {
        // brush mode
        const brushDimmed = brushSelectionHook.isActive && !brushSelectionHook.predicate(d)
        if (brushDimmed) {
          style.fillOpacity = unselectedOpacity
          style.strokeOpacity = unselectedOpacity
        }
      }

      return style
    },
    [colorBy, colorScale, pointOpacity, pointRadius, mode, brushSelectionHook.isActive, brushSelectionHook.predicate, hoverHook.isActive, hoverHook.predicate, unselectedOpacity]
  )

  const axes = useMemo((): Array<Record<string, unknown>> => [
    { orient: "left", ticks: 3, tickFormat: () => "", ...(showGrid && { tickLineGenerator: () => null }) },
    { orient: "bottom", ticks: 3, tickFormat: () => "", ...(showGrid && { tickLineGenerator: () => null }) }
  ], [showGrid])

  // Suppress XYFrame's internal tooltip by using hoverAnnotation: [() => null].
  // This creates the voronoi overlay (truthy) and fires customHoverBehavior,
  // but the () => null function produces no tooltip annotation:
  //   changeVoronoi maps [() => null] → filters out falsy → voronoiHover([])
  //   AnnotationLayer: annotations.concat([]) → no tooltip rendered.
  // This also actively clears any stuck tooltip on each hover event.
  const noTooltipHoverAnnotation = useMemo(() => [() => null], [])

  const xyFrameProps: XYFrameProps = {
    size: [cellSize, cellSize],
    points: data,
    xAccessor: xField,
    yAccessor: yField,
    pointStyle,
    axes: axes as any,
    margin: { top: 4, bottom: 4, left: 4, right: 4 },
    ...(mode === "brush" && { interaction: brushHook.brushInteraction }),
    // Hover mode: voronoi for detection + customHoverBehavior for cross-highlight.
    // noTooltipHoverAnnotation suppresses XYFrame's internal tooltip.
    ...(mode === "hover" && {
      hoverAnnotation: noTooltipHoverAnnotation,
      customHoverBehavior
    })
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
  brushSelectionName: string
  hoverSelectionName: string
  unselectedOpacity: number
  /** "brush" or "hover" — matches parent mode */
  mode: "brush" | "hover"
}

function DiagonalCell({
  data,
  field,
  label,
  cellSize,
  bins,
  colorBy,
  colorScale,
  brushSelectionName,
  hoverSelectionName,
  unselectedOpacity,
  mode
}: DiagonalCellProps) {
  const brushHook = useSelection({
    name: brushSelectionName,
    clientId: `splom-diag-${field}`,
    fields: [field]
  })

  const hoverHook = useSelection({
    name: hoverSelectionName,
    clientId: `splom-diag-${field}-hover`,
    fields: [SPLOM_IDX]
  })

  // Use the active mode's predicate
  const activeHook = mode === "hover" ? hoverHook : brushHook
  const isActive = activeHook.isActive
  const activePredicate = activeHook.predicate

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
      if (!isActive || activePredicate(d)) {
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
  }, [data, field, bins, cellSize, isActive, activePredicate])

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
          opacity={isActive ? 0.3 : 0.6}
        />
      ))}
      {/* Selected distribution */}
      {isActive &&
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
    hoverMode = true,
    unselectedOpacity = 0.1,
    showGrid = false,
    tooltip,
    showLegend,
    width,
    height,
    className
  } = props

  const brushSelectionName = "splom"
  const hoverSelectionName = "splom-hover"

  // Brush and hover are mutually exclusive: hover wins when enabled
  const cellMode: "brush" | "hover" = hoverMode ? "hover" : (brushMode ? "brush" : "hover")

  // Grid-level hover state — single tooltip for the entire matrix
  const clearSelection = useSelectionSelector((s: any) => s.clearSelection)
  const [hoveredInfo, setHoveredInfo] = useState<{
    datum: Record<string, any>
    xField: string
    yField: string
    colIndex: number
    rowIndex: number
    /** Pixel x of the point within its cell (from voronoiX) */
    px: number
    /** Pixel y of the point within its cell (from voronoiY) */
    py: number
  } | null>(null)

  // Clear all hover state when mouse leaves the grid
  const handleGridMouseLeave = useCallback(() => {
    clearSelection(hoverSelectionName)
    setHoveredInfo(null)
  }, [clearSelection, hoverSelectionName])

  // Stamp each datum with a stable index for cross-cell identity matching
  const indexedData = useMemo(() => {
    return ((data || []) as Record<string, any>[]).map((d, i) => {
      if (d[SPLOM_IDX] !== undefined) return d
      return { ...d, [SPLOM_IDX]: i }
    })
  }, [data])

  const colorScale = useColorScale(indexedData, colorBy, colorScheme)

  const n = fields.length
  const labelWidth = 40

  // Legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return null
    const colorField = typeof colorBy === "string" ? colorBy : null
    if (!colorField) return null
    const categories = [...new Set(indexedData.map((d) => d[colorField]))]
    return categories.map((cat) => ({
      label: String(cat),
      color: colorScale ? colorScale(String(cat)) : DEFAULT_COLOR
    }))
  }, [shouldShowLegend, colorBy, indexedData, colorScale])

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
      <div style={gridStyle} onMouseLeave={cellMode === "hover" ? handleGridMouseLeave : undefined}>
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
                    data={indexedData}
                    field={rowField}
                    label={fieldLabels[rowField] || rowField}
                    cellSize={cellSize}
                    bins={histogramBins}
                    colorBy={colorBy}
                    colorScale={colorScale}
                    brushSelectionName={brushSelectionName}
                    hoverSelectionName={hoverSelectionName}
                    unselectedOpacity={unselectedOpacity}
                    mode={cellMode}
                  />
                )
              }

              return (
                <ScatterplotCell
                  key={`cell-${rowField}-${colField}`}
                  data={indexedData}
                  xField={colField}
                  yField={rowField}
                  fieldLabels={fieldLabels}
                  cellSize={cellSize}
                  pointRadius={pointRadius}
                  pointOpacity={pointOpacity}
                  colorBy={colorBy}
                  colorScale={colorScale}
                  brushSelectionName={brushSelectionName}
                  hoverSelectionName={hoverSelectionName}
                  unselectedOpacity={unselectedOpacity}
                  showGrid={showGrid}
                  tooltip={tooltip}
                  mode={cellMode}
                  onPointHover={cellMode === "hover" ? (datum) => {
                    if (datum) {
                      setHoveredInfo({
                        datum,
                        xField: colField,
                        yField: rowField,
                        colIndex: col,
                        rowIndex: row,
                        px: datum.voronoiX ?? 0,
                        py: datum.voronoiY ?? 0
                      })
                    } else {
                      setHoveredInfo(null)
                    }
                  } : undefined}
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
      {/* Single tooltip for the entire matrix — positioned above the hovered point */}
      {hoveredInfo && cellMode === "hover" && (() => {
        const d = hoveredInfo.datum
        const xLabel = fieldLabels[hoveredInfo.xField] || hoveredInfo.xField
        const yLabel = fieldLabels[hoveredInfo.yField] || hoveredInfo.yField
        const label = colorBy
          ? typeof colorBy === "function" ? (colorBy as Function)(d) : d[colorBy as string]
          : null
        // Cell origin in grid coordinates (account for legend height via relative positioning)
        const cellLeft = labelWidth + hoveredInfo.colIndex * (cellSize + cellGap)
        const cellTop = hoveredInfo.rowIndex * (cellSize + cellGap)
        // Point position within the cell (voronoiX/Y are pixel coords within the Frame)
        const tooltipLeft = cellLeft + hoveredInfo.px
        const tooltipTop = cellTop + hoveredInfo.py - 8  // 8px above the point
        return (
          <div
            style={{
              position: "absolute",
              left: tooltipLeft,
              top: tooltipTop,
              transform: "translate(-50%, -100%)",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid #ddd",
              borderRadius: 3,
              padding: "4px 8px",
              fontSize: 11,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10
            }}
          >
            {label != null && <div style={{ fontWeight: "bold", marginBottom: 2 }}>{String(label)}</div>}
            <div>{xLabel}: {d[hoveredInfo.xField] != null ? Number(d[hoveredInfo.xField]).toFixed(1) : "–"}</div>
            <div>{yLabel}: {d[hoveredInfo.yField] != null ? Number(d[hoveredInfo.yField]).toFixed(1) : "–"}</div>
          </div>
        )
      })()}
    </div>
  )
}

/**
 * ScatterplotMatrix (SPLOM) — multi-dimensional scatter visualization
 *
 * Renders an N×N grid of scatterplots for all pairwise combinations of the
 * specified fields. Diagonal cells show histograms. Supports two interaction
 * modes:
 *
 * - **Hover** (default): hover a point to cross-highlight the same datum
 *   in every cell. Set `hoverMode={true}` (the default).
 * - **Brush**: drag to select a region in one cell; matching points are
 *   highlighted across all cells (crossfilter: the brushed cell excludes
 *   its own filter). Set `hoverMode={false}` to enable brush mode.
 *
 * The two modes are mutually exclusive — hover takes priority when enabled.
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
  const { brushMode = "crossfilter", hoverMode = true } = props

  const selectionConfig: Record<string, { resolution?: "union" | "intersect" | "crossfilter" }> = {}
  if (!hoverMode && brushMode) {
    selectionConfig.splom = { resolution: brushMode as "crossfilter" | "intersect" }
  }
  if (hoverMode) {
    selectionConfig["splom-hover"] = { resolution: "union" }
  }

  return (
    <LinkedCharts selections={selectionConfig}>
      <ScatterplotMatrixInner {...props} />
    </LinkedCharts>
  )
}

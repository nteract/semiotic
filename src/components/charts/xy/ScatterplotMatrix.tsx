"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo, useCallback, useState } from "react"
import { resolveExplicitColor } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  TooltipRoot,
  normalizeTooltip,
  type TooltipProp,
} from "../../Tooltip/Tooltip"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import { useColorScale, DEFAULT_COLOR, resolveMobileInteraction } from "../shared/hooks"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelectionSelector } from "../../store/SelectionStore"
import {
  type ScatterplotMatrixHoverInfo,
} from "./scatterplotMatrixInteractionTypes"
import {
  AccessibleDataTable,
  AccessibleTablePortal,
  ScreenReaderSummary,
  SkipToTableLink,
} from "../../stream/AccessibleDataTable"
import type { AccessibleSceneNode } from "../../stream/accessibleDataRows"
import { ScatterplotCell, DiagonalCell, LabelCell, SPLOM_IDX } from "./scatterplotMatrixCells"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScatterplotMatrixProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /** Array of data objects */
  data: TDatum[]
  /** Array of field names to include in the matrix */
  fields: string[]
  /** Optional display labels for fields */
  fieldLabels?: Record<string, string>
  /** Field or function to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme @default "category10" */
  colorScheme?: string | string[] | Record<string, string>
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
  /** Field or function to identify each data point in tooltips. Defaults to "Row {index}" */
  idAccessor?: string | ((d: TDatum) => string)
  /**
   * Called when a point in any cell is clicked. Receives the clicked row datum
   * and its grid-relative pixel position `{ x, y }` — the same coordinate space
   * as `onObservation`. Fires in hover mode (the default); in brush mode the
   * drag-select overlay captures pointer events, so clicks are not delivered.
   */
  onClick?: (datum: TDatum, event: { x: number; y: number }) => void
}

// ── ScatterplotMatrix ──────────────────────────────────────────────────────

function ScatterplotMatrixInner<TDatum extends Datum = Datum>(
  props: ScatterplotMatrixProps<TDatum>
) {
  const {
    data,
    fields,
    fieldLabels = {},
    colorBy,
    colorScheme,
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
    maxDevicePixelRatio,
    tooltip,
    showLegend,
    idAccessor,
    width: _width,
    height: _height,
    className,
    title,
    description,
    summary,
    accessibleTable = true,
    onObservation,
    onClick,
    chartId
  } = props

  const brushSelectionName = "splom"
  const hoverSelectionName = "splom-hover"
  const mobileInteraction = resolveMobileInteraction(props.mobileInteraction, {
    mode: props.mode,
    width: _width ?? fields.length * cellSize,
    mobileSemantics: props.mobileSemantics,
  })

  // Brush and hover are mutually exclusive: hover wins when enabled
  const cellMode: "brush" | "hover" = hoverMode ? "hover" : (brushMode ? "brush" : "hover")

  // Grid-level hover state — single tooltip for the entire matrix
  const clearSelection = useSelectionSelector((state) => state.clearSelection)
  const [hoveredInfo, setHoveredInfo] = useState<ScatterplotMatrixHoverInfo | null>(null)

  // Clear all hover state when mouse leaves the grid
  const handleGridMouseLeave = useCallback(() => {
    clearSelection(hoverSelectionName)
    setHoveredInfo(null)
  }, [clearSelection, hoverSelectionName])

  // Stamp each datum with a stable index for cross-cell identity matching
  const indexedData = useMemo(() => {
    return ((data || []) as Datum[]).map((d, i) => {
      if (d[SPLOM_IDX] !== undefined) return d
      return { ...d, [SPLOM_IDX]: i }
    })
  }, [data])

  const colorScale = useColorScale(indexedData, colorBy, colorScheme)
  const tableId = `${React.useId().replace(/:/g, "")}-data-table`
  const accessibleScene = useMemo<AccessibleSceneNode[]>(
    () => (data || []).map((datum) => ({ type: "point", datum })),
    [data],
  )

  // ScatterplotMatrix owns one grid-level tooltip instead of six or more
  // competing frame tooltips. Normalize the public HOC prop once so custom
  // functions/config objects receive the same raw-datum and chrome behavior
  // as every other chart family. (`tooltip` was previously accepted but
  // ignored.)
  const normalizedTooltip = useMemo(
    () => normalizeTooltip(tooltip),
    [tooltip],
  )

  const _n = fields.length
  const labelWidth = 40

  // Translate a cell's local pixel offset into grid-relative coordinates so
  // hover and click observations (and onClick) share one coordinate space.
  const gridPoint = useCallback(
    (col: number, row: number, px?: number, py?: number): [number, number] => {
      const cellLeft = labelWidth + cellGap + col * (cellSize + cellGap)
      const cellTop = row * (cellSize + cellGap)
      return [cellLeft + (px ?? 0), cellTop + (py ?? 0)]
    },
    [labelWidth, cellSize, cellGap]
  )

  // Legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return null
    const colorField = typeof colorBy === "string" ? colorBy : null
    if (!colorField) return null
    const categories = Array.from(new Set(indexedData.map((d) => d[colorField]).filter((v) => v != null)))
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
    <div
      className={className}
      style={{ position: "relative", color: "var(--semiotic-text, #333)", fontFamily: "var(--semiotic-font-family, sans-serif)" }}
      role="group"
      aria-label={description || title || `Scatterplot matrix comparing ${fields.length} fields`}
    >
      {title && (
        <div className="semiotic-chart-title" style={{ fontWeight: 600, marginBottom: 8 }}>
          {title}
        </div>
      )}
      {accessibleTable && <AccessibleTablePortal accessibleTable={accessibleTable}><SkipToTableLink tableId={tableId} /></AccessibleTablePortal>}
      <ScreenReaderSummary summary={summary} />
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
      <div style={{ position: "relative", width: "fit-content" }}>
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
                color: "var(--semiotic-text, #333)"
              }}
            >
              {resolveExplicitColor(fieldLabels, rowField) ?? rowField}
            </div>

            {/* Cells for this row */}
            {fields.map((colField, col) => {
              if (row === col) {
                // Diagonal
                if (diagonal === "label") {
                  return (
                    <LabelCell
                      key={`diag-${rowField}`}
                      label={resolveExplicitColor(fieldLabels, rowField) ?? rowField}
                      cellSize={cellSize}
                    />
                  )
                }
                return (
                  <DiagonalCell
                    key={`diag-${rowField}`}
                    data={indexedData}
                    field={rowField}
                    label={resolveExplicitColor(fieldLabels, rowField) ?? rowField}
                    cellSize={cellSize}
                    bins={histogramBins}
                    colorBy={colorBy as ChartAccessor<Datum, string> | undefined}
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
                  colorBy={colorBy as ChartAccessor<Datum, string> | undefined}
                  colorScale={colorScale}
                  brushSelectionName={brushSelectionName}
                  hoverSelectionName={hoverSelectionName}
                  unselectedOpacity={unselectedOpacity}
                  showGrid={showGrid}
                  maxDevicePixelRatio={maxDevicePixelRatio}
                  mobileInteraction={mobileInteraction}
                  mode={cellMode}
                  onPointHover={cellMode === "hover" ? (datum, px, py) => {
                    if (datum) {
                      setHoveredInfo({
                        datum,
                        xField: colField,
                        yField: rowField,
                        colIndex: col,
                        rowIndex: row,
                        px: px ?? 0,
                        py: py ?? 0
                      })
                      if (onObservation) {
                        // Emit grid-relative coordinates, matching click, so a
                        // coordinated-view handler can position UI consistently
                        // across event types. (The internal tooltip uses the
                        // cell-local px/py stored in hoveredInfo instead.)
                        const [gx, gy] = gridPoint(col, row, px, py)
                        onObservation({ type: "hover", datum, x: gx, y: gy, timestamp: Date.now(), chartType: "ScatterplotMatrix", chartId })
                      }
                    } else {
                      setHoveredInfo(null)
                      if (onObservation) {
                        onObservation({ type: "hover-end", timestamp: Date.now(), chartType: "ScatterplotMatrix", chartId })
                      }
                    }
                  } : undefined}
                  onPointClick={(onClick || onObservation) ? (datum, px, py) => {
                    if (!datum) return
                    const [gx, gy] = gridPoint(col, row, px, py)
                    if (onClick) onClick(datum as TDatum, { x: gx, y: gy })
                    if (onObservation) {
                      onObservation({ type: "click", datum, x: gx, y: gy, timestamp: Date.now(), chartType: "ScatterplotMatrix", chartId })
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
            {resolveExplicitColor(fieldLabels, field) ?? field}
          </div>
        ))}
      </div>
      {/* Single tooltip for the entire matrix — positioned above the hovered point. */}
      {hoveredInfo && cellMode === "hover" && tooltip !== false && (() => {
        const d = hoveredInfo.datum
        const xFieldLabel = resolveExplicitColor(fieldLabels, hoveredInfo.xField) ?? hoveredInfo.xField
        const yFieldLabel = resolveExplicitColor(fieldLabels, hoveredInfo.yField) ?? hoveredInfo.yField
        const colorLabel = colorBy
          ? typeof colorBy === "function" ? colorBy(d as TDatum) : d[colorBy]
          : null
        // Resolve ID for header
        const idLabel = idAccessor
          ? (typeof idAccessor === "function" ? idAccessor(d as TDatum) : d[idAccessor])
          : `Row ${d[SPLOM_IDX]}`
        // Cell origin in grid coordinates
        const cellLeft = labelWidth + cellGap + hoveredInfo.colIndex * (cellSize + cellGap)
        const cellTop = hoveredInfo.rowIndex * (cellSize + cellGap)
        // Point position within the cell
        const tooltipLeft = cellLeft + hoveredInfo.px
        const tooltipTop = cellTop + hoveredInfo.py
        const rawDatum = { ...d }
        delete rawDatum[SPLOM_IDX]
        const hasCustomContent = typeof normalizedTooltip === "function"
        const customContent = hasCustomContent ? normalizedTooltip(rawDatum) : null
        const defaultContent = (
          <TooltipRoot
            style={{
              color: "var(--semiotic-tooltip-text, #333)",
              background: "var(--semiotic-tooltip-bg, rgba(255,255,255,0.95))",
              border: "1px solid var(--semiotic-border, #ddd)",
              borderRadius: 3,
              padding: "4px 8px",
              fontSize: 11,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              boxShadow: "none",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 2 }}>{String(idLabel)}</div>
            <div>{xFieldLabel}: {d[hoveredInfo.xField] != null ? Number(d[hoveredInfo.xField]).toFixed(1) : "–"}</div>
            <div>{yFieldLabel}: {d[hoveredInfo.yField] != null ? Number(d[hoveredInfo.yField]).toFixed(1) : "–"}</div>
            {colorLabel != null && <div style={{ opacity: 0.8 }}>{typeof colorBy === "string" ? colorBy : "group"}: {String(colorLabel)}</div>}
          </TooltipRoot>
        )
        const tooltipContent = hasCustomContent ? customContent : defaultContent
        if (!tooltipContent) return null
        return (
          <FlippingTooltip
            x={tooltipLeft}
            y={tooltipTop}
            containerWidth={labelWidth + fields.length * cellSize + fields.length * cellGap}
            containerHeight={fields.length * cellSize + labelWidth + fields.length * cellGap}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            className="scatterplot-matrix-tooltip"
            zIndex={10}
          >
            {tooltipContent}
          </FlippingTooltip>
        )
      })()}
      </div>
      {accessibleTable && (
        <AccessibleTablePortal accessibleTable={accessibleTable}><AccessibleDataTable
            scene={accessibleScene}
            chartType="scatterplot matrix"
            tableId={tableId}
            chartTitle={title}
          /></AccessibleTablePortal>
      )}
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
 * // Iris dataset — every pairwise field combination
 * <ScatterplotMatrix
 *   data={iris}
 *   fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
 *   colorBy="species"
 *   cellSize={160}
 *   diagonal="histogram"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Brush mode: drag in any cell to highlight matching points across the
 * // matrix. The `crossfilter` mode excludes the brushed cell from its own
 * // filter so it stays fully visible while the others dim non-matches.
 * // Brush selections live in the matrix's internal selection store and do
 * // not propagate to charts rendered outside the component.
 * <ScatterplotMatrix
 *   data={observations}
 *   fields={["x", "y", "z"]}
 *   hoverMode={false}
 *   brushMode="crossfilter"
 * />
 * ```
 */
export function ScatterplotMatrix<TDatum extends Datum = Datum>(
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
ScatterplotMatrix.displayName = "ScatterplotMatrix"

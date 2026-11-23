"use client"
import { SCATTERPLOT_MATRIX_SIZE } from "../shared/chartSizeDefaultsXY"
import type { Datum } from "../shared/datumTypes"

import { useMemo, useCallback, useState, useId } from "react"
import { resolveExplicitColor } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  TooltipRoot,
  normalizeTooltip,
  type TooltipProp,
} from "../../Tooltip/Tooltip"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import { hasOwnTooltipChrome, hasTooltipContent } from "../../Tooltip/tooltipChrome"
import { useColorScale, DEFAULT_COLOR, resolveMobileInteraction } from "../shared/hooks"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelectionSelector } from "../../store/SelectionStore"
import {
  AccessibleDataTable,
  AccessibleTablePortal,
  ScreenReaderSummary,
  SkipToTableLink,
} from "../../stream/AccessibleDataTable"
import type { AccessibleSceneNode } from "../../stream/accessibleDataRows"
import { MatrixGrid } from "./scatterplotMatrixGrid"
import { ScatterplotCell, DiagonalCell, LabelCell, SPLOM_IDX, HOVER_SELECTION, BRUSH_SELECTION } from "./scatterplotMatrixCells"
import { type StyleRule } from "../shared/styleRules"
import { withSizedChartErrorBoundary } from "../shared/withChartErrorBoundary"

// ── Types ──────────────────────────────────────────────────────────────────

interface HoveredPoint {
  datum: Datum
  xField: string
  yField: string
  px: number
  py: number
}

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
   * Declarative, threshold-aware point styling applied to every scatter cell.
   * `axis: "x"|"y"` is the cell's plotted fields; `field` reads the source row.
   */
  styleRules?: StyleRule[]
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
    cellSize = SCATTERPLOT_MATRIX_SIZE.cellSize,
    cellGap = SCATTERPLOT_MATRIX_SIZE.cellGap,
    pointRadius = 2,
    pointOpacity = 0.5,
    diagonal = "histogram",
    histogramBins = 20,
    brushMode = "crossfilter",
    hoverMode = true,
    unselectedOpacity = 0.1,
    maxDevicePixelRatio,
    tooltip,
    showLegend,
    idAccessor,
    styleRules,
    width: _width,
    className,
    title,
    description,
    summary,
    accessibleTable = true,
    onObservation,
    onClick,
    chartId
  } = props

  const mobileInteraction = resolveMobileInteraction(props.mobileInteraction, {
    mode: props.mode,
    width: _width ?? fields.length * cellSize,
    mobileSemantics: props.mobileSemantics,
  })

  // Brush and hover are mutually exclusive: hover wins when enabled
  const cellMode = !hoverMode && brushMode ? "brush" : "hover"

  // Grid-level hover state — single tooltip for the entire matrix
  const clearSelection = useSelectionSelector((state) => state.clearSelection)
  const [hoveredInfo, setHoveredInfo] = useState<HoveredPoint | null>(null)

  // Clear all hover state when mouse leaves the grid
  const handleGridMouseLeave = useCallback(() => {
    clearSelection(HOVER_SELECTION)
    setHoveredInfo(null)
  }, [clearSelection])

  // Stamp each datum with a stable index for cross-cell identity matching
  const indexedData = useMemo(() => {
    return ((data || []) as Datum[]).map((d, i) => {
      if (d[SPLOM_IDX] !== undefined) return d
      return { ...d, [SPLOM_IDX]: i }
    })
  }, [data])

  const colorScale = useColorScale(indexedData, colorBy, colorScheme)
  const tableId = `${useId().replace(/:/g, "")}-data-table`
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

  const labelWidth = SCATTERPLOT_MATRIX_SIZE.labelWidth

  const stride = cellSize + cellGap
  const fieldLabel = (field: string) => resolveExplicitColor(fieldLabels, field) ?? field
  const gridPoint = (col: number, row: number, px: number, py: number) => ({
    x: labelWidth + cellGap + col * stride + px,
    y: row * stride + py
  })
  function handlePoint(type: "hover" | "click", datum: Datum | null, col: number, row: number, px = 0, py = 0) {
    if (!datum) {
      if (type === "hover") {
        setHoveredInfo(null)
        onObservation?.({ type: "hover-end", timestamp: Date.now(), chartType: "ScatterplotMatrix", chartId })
      }
      return
    }
    const { x, y } = gridPoint(col, row, px, py)
    if (type === "hover") setHoveredInfo({ datum, xField: fields[col], yField: fields[row], px, py })
    else onClick?.(datum as TDatum, { x, y })
    onObservation?.({ type, datum, x, y, timestamp: Date.now(), chartType: "ScatterplotMatrix", chartId })
  }

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
        <MatrixGrid fields={fields} cellSize={cellSize} cellGap={cellGap} labelWidth={labelWidth}
          brush={cellMode === "brush"} labelFor={fieldLabel}
          onMouseLeave={cellMode === "hover" ? handleGridMouseLeave : undefined}>
          {(rowField, row, colField, col, label) => {
            if (row === col) {
              // Diagonal
              if (diagonal === "label") {
                return (
                  <LabelCell
                    label={label}
                    cellSize={cellSize}
                  />
                )
              }
              return (
                <DiagonalCell
                  data={indexedData}
                  field={rowField}
                  label={label}
                  cellSize={cellSize}
                  bins={histogramBins}
                  colorBy={colorBy as ChartAccessor<Datum, string> | undefined}
                  colorScale={colorScale}
                  mode={cellMode}
                />
              )
            }

            return (
              <ScatterplotCell
                data={indexedData}
                xField={colField}
                yField={rowField}
                description={`${label} scatterplot`}
                cellSize={cellSize}
                pointRadius={pointRadius}
                pointOpacity={pointOpacity}
                styleRules={styleRules}
                colorBy={colorBy as ChartAccessor<Datum, string> | undefined}
                colorScale={colorScale}
                unselectedOpacity={unselectedOpacity}
                maxDevicePixelRatio={maxDevicePixelRatio}
                mobileInteraction={mobileInteraction}
                mode={cellMode}
                onPointHover={cellMode === "hover" ? (datum, x, y) => handlePoint("hover", datum, col, row, x, y) : undefined}
                onPointClick={onClick || onObservation ? (datum, x, y) => handlePoint("click", datum, col, row, x, y) : undefined}
              />
            )
          }}
        </MatrixGrid>
        {/* Single tooltip for the entire matrix — positioned above the hovered point. */}
        {hoveredInfo && cellMode === "hover" && tooltip !== false && (() => {
          const { datum: d, xField, yField, px, py } = hoveredInfo
          const col = fields.indexOf(xField)
          const row = fields.indexOf(yField)
          if (col < 0 || row < 0) return null
          const colorLabel = colorBy
            ? typeof colorBy === "function" ? colorBy(d as TDatum) : d[colorBy]
            : null
          // Resolve ID for header
          const idLabel = idAccessor
            ? (typeof idAccessor === "function" ? idAccessor(d as TDatum) : d[idAccessor])
            : `Row ${d[SPLOM_IDX]}`
          const { [SPLOM_IDX]: _index, ...rawDatum } = d
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
              {[xField, yField].map(field => (
                <div key={field}>{fieldLabel(field)}: {d[field] != null ? Number(d[field]).toFixed(1) : "–"}</div>
              ))}
              {colorLabel != null && <div style={{ opacity: 0.8 }}>{typeof colorBy === "string" ? colorBy : "group"}: {String(colorLabel)}</div>}
            </TooltipRoot>
          )
          const tooltipContent = hasCustomContent ? customContent : defaultContent
          if (!hasTooltipContent(tooltipContent)) return null
          return (
            <FlippingTooltip
              contentOwnsChrome={hasOwnTooltipChrome(normalizedTooltip)}
              {...gridPoint(col, row, px, py)}
              containerWidth={labelWidth + fields.length * stride}
              containerHeight={labelWidth + fields.length * stride}
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
export const ScatterplotMatrix = /* @__PURE__ */ withSizedChartErrorBoundary(function ScatterplotMatrix<TDatum extends Datum = Datum>(
  props: ScatterplotMatrixProps<TDatum>
) {
  const { brushMode = "crossfilter", hoverMode = true } = props

  const selectionConfig: Record<string, { resolution?: "union" | "intersect" | "crossfilter" }> = {}
  if (!hoverMode && brushMode) {
    selectionConfig[BRUSH_SELECTION] = { resolution: brushMode }
  }
  if (hoverMode) {
    selectionConfig[HOVER_SELECTION] = { resolution: "union" }
  }

  return (
    <LinkedCharts selections={selectionConfig}>
      <ScatterplotMatrixInner {...props} />
    </LinkedCharts>
  )
}, "ScatterplotMatrix", (props) => {
  const side = SCATTERPLOT_MATRIX_SIZE.labelWidth + (props.fields?.length ?? 0) *
    ((props.cellSize ?? SCATTERPLOT_MATRIX_SIZE.cellSize) + (props.cellGap ?? SCATTERPLOT_MATRIX_SIZE.cellGap))
  return { width: side, height: side }
})

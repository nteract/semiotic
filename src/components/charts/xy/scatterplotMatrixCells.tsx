"use client"
import * as React from "react"
import { useMemo, useCallback, useRef } from "react"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor, ResolvedMobileInteractionConfig } from "../shared/types"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameHandle, HoverData, Style } from "../../stream/types"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { scatterXYPlugin } from "../../stream/xyPlugins/pointPlugin"
import { getColor, resolveExplicitColor } from "../shared/colorUtils"
import { getMax, getMinMax } from "../shared/minMax"
import { DEFAULT_COLOR } from "../shared/hooks"
import { useSelection, useBrushSelection } from "../../store/useSelection"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { ScatterplotMatrixBrushOverlayLazy } from "./scatterplotMatrixBrushOverlayLazy"

registerXYPlugin(scatterXYPlugin)

// Internal field used to identify datums across cells
export const SPLOM_IDX = "__splomIdx"

// Shared clientId for all hover writers - ensures each new hover REPLACES
// the previous one (same key in the clause Map) instead of accumulating.
const HOVER_CLIENT_ID = "splom-hover-source"

const CELL_MARGIN = { top: 4, bottom: 4, left: 4, right: 4 }

// -- Scatterplot Cell -------------------------------------------------------

interface CellProps {
  data: Datum[]
  xField: string
  yField: string
  fieldLabels: Record<string, string>
  cellSize: number
  pointRadius: number
  pointOpacity: number
  colorBy?: ChartAccessor<Datum, string>
  colorScale?: (v: string) => string
  brushSelectionName: string
  hoverSelectionName: string
  unselectedOpacity: number
  showGrid: boolean
  maxDevicePixelRatio?: number
  mobileInteraction?: ResolvedMobileInteractionConfig
  /** "brush" or "hover" - mutually exclusive */
  mode: "brush" | "hover"
  /** Callback when a point is hovered (hover mode only). */
  onPointHover?: (datum: Datum | null, px?: number, py?: number) => void
  /** Callback when a point is clicked. */
  onPointClick?: (datum: Datum | null, px?: number, py?: number) => void
}

export function ScatterplotCell({
  data,
  xField,
  yField,
  fieldLabels: _fieldLabels,
  cellSize,
  pointRadius,
  pointOpacity,
  colorBy,
  colorScale,
  brushSelectionName,
  hoverSelectionName,
  unselectedOpacity,
  showGrid: _showGrid,
  maxDevicePixelRatio,
  mobileInteraction,
  mode,
  onPointHover,
  onPointClick
}: CellProps) {
  const frameRef = useRef<StreamXYFrameHandle>(null)
  const clientId = `splom-${xField}-${yField}`

  // Brush selection (crossfilter) - only used in brush mode
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

  // Hover selection - all cells share HOVER_CLIENT_ID so each new hover
  // REPLACES the previous cell's clause instead of accumulating.
  const hoverHook = useSelection({
    name: hoverSelectionName,
    clientId: HOVER_CLIENT_ID,
    fields: [SPLOM_IDX]
  })

  const hoverSelectPoints = hoverHook.selectPoints

  // Brush callback: convert d3-brush data-space extent to useBrushSelection format
  const handleBrush = useCallback(
    (extent: [number, number][] | null) => {
      if (!extent) {
        brushHook.brushInteraction.end(null)
        return
      }
      brushHook.brushInteraction.during(extent)
    },
    [brushHook.brushInteraction]
  )

  const customHoverBehavior = useCallback(
    (hover: HoverData | null) => {
      if (!hover) {
        onPointHover?.(null)
        return
      }
      const d = hover.data
      const idx = d?.[SPLOM_IDX]
      if (idx !== undefined) {
        hoverSelectPoints({ [SPLOM_IDX]: [idx] })
        onPointHover?.(d, hover.x + CELL_MARGIN.left, hover.y + CELL_MARGIN.top)
      }
    },
    [hoverSelectPoints, onPointHover]
  )

  const customClickBehavior = useCallback(
    (hover: HoverData | null) => {
      if (!hover) {
        onPointClick?.(null)
        return
      }
      const d = hover.data
      if (d) {
        onPointClick?.(d, hover.x + CELL_MARGIN.left, hover.y + CELL_MARGIN.top)
      }
    },
    [onPointClick]
  )

  const pointStyle = useCallback(
    (d: Datum) => {
      const style: Style & { r?: number } = {
        opacity: pointOpacity,
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
          style.opacity = 1
          style.r = pointRadius * 2.5
          style.stroke = "#333"
          style.strokeWidth = 1.5
        } else if (hoverHook.isActive) {
          style.opacity = pointOpacity * 0.6
        }
      } else {
        // brush mode
        const brushDimmed = brushSelectionHook.isActive && !brushSelectionHook.predicate(d)
        if (brushDimmed) {
          style.opacity = unselectedOpacity
        }
      }

      return style
    },
    [pointOpacity, pointRadius, colorBy, mode, colorScale, hoverHook, brushSelectionHook, unselectedOpacity]
  )

  return (
    <div style={{ position: "relative", width: cellSize, height: cellSize }}>
      <StreamXYFrame
        ref={frameRef}
        chartType="scatter"
        data={data}
        size={[cellSize, cellSize]}
        xAccessor={xField}
        yAccessor={yField}
        pointStyle={pointStyle}
        margin={CELL_MARGIN}
        showAxes={false}
        maxDevicePixelRatio={maxDevicePixelRatio}
        enableHover={mode === "hover"}
        accessibleTable={false}
        description={`${resolveExplicitColor(_fieldLabels, xField) ?? xField} versus ${resolveExplicitColor(_fieldLabels, yField) ?? yField} scatterplot`}
        {...buildCustomBehaviorProps({
          forceHoverBehavior: mode === "hover",
          forceClickBehavior: !!onPointClick,
          mobileInteraction,
          customHoverBehavior: customHoverBehavior as (d: Datum | null) => void,
          customClickBehavior: customClickBehavior as (d: Datum | null) => void,
        })}
        tooltipContent={mode === "hover" ? (() => null) : undefined}
      />
      {mode === "brush" && (
        <ScatterplotMatrixBrushOverlayLazy
          frameRef={frameRef}
          cellSize={cellSize}
          onBrush={handleBrush}
        />
      )}
    </div>
  )
}

// -- Diagonal Cell (Histogram) ----------------------------------------------

interface DiagonalCellProps {
  data: Datum[]
  field: string
  label: string
  cellSize: number
  bins: number
  colorBy?: ChartAccessor<Datum, string>
  colorScale?: (v: string) => string
  brushSelectionName: string
  hoverSelectionName: string
  unselectedOpacity: number
  /** "brush" or "hover" - matches parent mode */
  mode: "brush" | "hover"
}

export function DiagonalCell({
  data,
  field,
  label,
  cellSize,
  bins,
  colorBy,
  colorScale,
  brushSelectionName,
  hoverSelectionName,
  unselectedOpacity: _unselectedOpacity,
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
    const colorField = typeof colorBy === "string" ? colorBy : null
    const values: number[] = []
    const categorySet = new Set<string>()
    for (const d of data) {
      const value = d[field]
      if (value != null && !isNaN(value)) values.push(Number(value))
      if (colorField) {
        const category = d[colorField]
        if (category != null) categorySet.add(String(category))
      }
    }
    if (values.length === 0) return { bars: [], selectedBars: [], categoryBars: [], selectedCategoryBars: [], max: 0, categories: [] }

    const [min, max] = getMinMax(values)
    const binWidth = (max - min) / bins || 1

    const categories = Array.from(categorySet)
    // O(1) category->index lookup
    const categoryIndexMap = new Map<string, number>(categories.map((cat, i) => [cat, i]))

    const counts = new Array(bins).fill(0)
    const selectedCounts = new Array(bins).fill(0)

    // Per-category counts: categoryCounts[binIdx][categoryIdx]
    const categoryCounts: number[][] = Array.from({ length: bins }, () => new Array(categories.length).fill(0))
    const selectedCategoryCounts: number[][] = Array.from({ length: bins }, () => new Array(categories.length).fill(0))

    for (const d of data) {
      const v = d[field]
      if (v == null || isNaN(v)) continue
      const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1)
      counts[idx]++
      if (!isActive || activePredicate(d)) {
        selectedCounts[idx]++
      }
      if (colorField) {
        const catIdx = categoryIndexMap.get(String(d[colorField]))
        if (catIdx !== undefined) {
          categoryCounts[idx][catIdx]++
          if (!isActive || activePredicate(d)) {
            selectedCategoryCounts[idx][catIdx]++
          }
        }
      }
    }

    const maxCount = getMax(counts, 1)

    // Build stacked bar segments per bin per category
    const categoryBars = categoryCounts.map((catCounts, i) => {
      let y0 = 0
      return catCounts.map((c, catIdx) => {
        const h = (c / maxCount) * (cellSize - 24)
        const segment = {
          x: (i / bins) * cellSize,
          w: (cellSize / bins) - 1,
          h,
          y0,
          category: categories[catIdx]
        }
        y0 += h
        return segment
      })
    })

    const selectedCategoryBars = selectedCategoryCounts.map((catCounts, i) => {
      let y0 = 0
      return catCounts.map((c, catIdx) => {
        const h = (c / maxCount) * (cellSize - 24)
        const segment = {
          x: (i / bins) * cellSize,
          w: (cellSize / bins) - 1,
          h,
          y0,
          category: categories[catIdx]
        }
        y0 += h
        return segment
      })
    })

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
      categoryBars,
      selectedCategoryBars,
      max: maxCount,
      categories
    }
  }, [data, field, bins, cellSize, isActive, activePredicate, colorBy])

  return (
    <svg width={cellSize} height={cellSize} style={{ overflow: "hidden" }}>
      <text
        x={cellSize / 2}
        y={14}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
        fill="var(--semiotic-text, #333)"
        fontFamily="var(--semiotic-font-family, sans-serif)"
      >
        {label}
      </text>
      {/* Full distribution - colored by category when colorBy is set */}
      {histogram.categories.length > 0
        ? histogram.categoryBars.map((segments, i) =>
            segments.map((seg, catIdx) => (
              <rect
                key={`bg-${i}-${catIdx}`}
                x={seg.x}
                y={cellSize - seg.y0 - seg.h}
                width={Math.max(seg.w, 1)}
                height={seg.h}
                fill={colorScale ? colorScale(seg.category) : DEFAULT_COLOR}
                opacity={isActive ? 0.3 : 0.6}
              />
            ))
          )
        : histogram.bars.map((bar, i) => (
            <rect
              key={`bg-${i}`}
              x={bar.x}
              y={cellSize - bar.h}
              width={Math.max(bar.w, 1)}
              height={bar.h}
              fill={DEFAULT_COLOR}
              opacity={isActive ? 0.3 : 0.6}
            />
          ))}
      {/* Selected distribution - colored by category when colorBy is set */}
      {isActive &&
        (histogram.categories.length > 0
          ? histogram.selectedCategoryBars.map((segments, i) =>
              segments.map((seg, catIdx) => (
                <rect
                  key={`sel-${i}-${catIdx}`}
                  x={seg.x}
                  y={cellSize - seg.y0 - seg.h}
                  width={Math.max(seg.w, 1)}
                  height={seg.h}
                  fill={colorScale ? colorScale(seg.category) : DEFAULT_COLOR}
                  opacity={0.7}
                />
              ))
            )
          : histogram.selectedBars.map((bar, i) => (
              <rect
                key={`sel-${i}`}
                x={bar.x}
                y={cellSize - bar.h}
                width={Math.max(bar.w, 1)}
                height={bar.h}
                fill={DEFAULT_COLOR}
                opacity={0.7}
              />
            )))}
    </svg>
  )
}

// -- Label Cell -------------------------------------------------------------

export function LabelCell({ label, cellSize }: { label: string; cellSize: number }) {
  return (
    <svg width={cellSize} height={cellSize}>
      <text
        x={cellSize / 2}
        y={cellSize / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight="bold"
        fill="var(--semiotic-text, #333)"
        fontFamily="var(--semiotic-font-family, sans-serif)"
      >
        {label}
      </text>
    </svg>
  )
}


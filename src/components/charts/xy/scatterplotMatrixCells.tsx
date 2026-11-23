"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor, ResolvedMobileInteractionConfig } from "../shared/types"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, HoverData, Style } from "../../stream/types"
import { ensureXYPlugin } from "../../stream/xyPlugins/registry"
import { scatterXYPlugin } from "../../stream/xyPlugins/pointPlugin"
import { getColor } from "../shared/colorUtils"
import { getMax, getMinMax } from "../shared/minMax"
import { DEFAULT_COLOR } from "../shared/hooks"
import { useSelection } from "../../store/useSelection"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { composeStyleRules, makeXYRuleContext, type StyleRule } from "../shared/styleRules"

// Registered at render (not import) so unused charts stay tree-shakeable.
function ensureScatterplotMatrixCellsRegistrations(): void {
  ensureXYPlugin(scatterXYPlugin)
}

// Internal field used to identify datums across cells
export const HOVER_SELECTION = "splom-hover"
export const BRUSH_SELECTION = "splom"
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
  description: string
  cellSize: number
  pointRadius: number
  pointOpacity: number
  styleRules?: StyleRule[]
  colorBy?: ChartAccessor<Datum, string>
  colorScale?: (v: string) => string
  unselectedOpacity: number
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
  description,
  cellSize,
  pointRadius,
  pointOpacity,
  styleRules,
  colorBy,
  colorScale,
  unselectedOpacity,
  maxDevicePixelRatio,
  mobileInteraction,
  mode,
  onPointHover,
  onPointClick
}: CellProps) {
  ensureScatterplotMatrixCellsRegistrations()

  // Brush selection (crossfilter) - only used in brush mode
  const brushSelectionHook = useSelection({
    name: BRUSH_SELECTION,
    fields: [xField, yField]
  })

  // Hover selection - all cells share HOVER_CLIENT_ID so each new hover
  // REPLACES the previous cell's clause instead of accumulating.
  const hoverHook = useSelection({
    name: HOVER_SELECTION,
    clientId: HOVER_CLIENT_ID,
    fields: [SPLOM_IDX]
  })

  const hoverSelectPoints = hoverHook.selectPoints

  const { selectInterval, clear } = brushSelectionHook
  const handleBrush: NonNullable<StreamXYFrameProps["onBrush"]> = useCallback(extent => {
    if (extent) selectInterval({ [xField]: extent.x, [yField]: extent.y })
    else clear()
  }, [selectInterval, clear, xField, yField])

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

  const ruledPointStyle = useMemo(
    () => composeStyleRules(
      (d: Datum) => ({
        opacity: pointOpacity,
        r: pointRadius,
        fill: colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      }),
      styleRules,
      makeXYRuleContext(xField, yField)
    ),
    [pointOpacity, pointRadius, colorBy, colorScale, styleRules, xField, yField]
  )
  const pointStyle = useCallback(
    (d: Datum) => {
      const style: Style & { r?: number } = { ...ruledPointStyle(d) }

      if (mode === "hover") {
        const hoverHighlighted = hoverHook.isActive && hoverHook.predicate(d)
        if (hoverHighlighted) {
          style.opacity = 1
          style.r = pointRadius * 2.5
          style.stroke = "#333"
          style.strokeWidth = 1.5
        } else if (hoverHook.isActive) {
          style.opacity = (typeof style.opacity === "number" ? style.opacity : pointOpacity) * 0.6
        }
      } else {
        const brushDimmed = brushSelectionHook.isActive && !brushSelectionHook.predicate(d)
        if (brushDimmed) {
          style.opacity = unselectedOpacity
        }
      }

      return style
    },
    [ruledPointStyle, mode, hoverHook, brushSelectionHook, unselectedOpacity, pointRadius, pointOpacity]
  )

  return (
    <StreamXYFrame
      tabIndex={-1}
      onBrush={mode === "brush" ? handleBrush : undefined}
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
      description={description}
      {...buildCustomBehaviorProps({
        forceHoverBehavior: mode === "hover",
        forceClickBehavior: !!onPointClick,
        mobileInteraction,
        customHoverBehavior,
        customClickBehavior,
      })}
      tooltipContent={mode === "hover" ? (() => null) : undefined}
    />
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
  mode
}: DiagonalCellProps) {
  const { isActive, predicate } = useSelection({
    name: mode === "hover" ? HOVER_SELECTION : BRUSH_SELECTION
  })
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
    if (!values.length) return []
    const [min, max] = getMinMax(values)
    const binWidth = (max - min) / bins || 1
    const categories = Array.from(categorySet)
    const categoryIndex = new Map(categories.map((category, i) => [category, i]))
    const counts = new Array<number>(bins).fill(0)
    const makeBins = () => Array.from({ length: bins }, () => new Array<number>(categories.length || 1).fill(0))
    const all = makeBins()
    const selected = isActive ? makeBins() : null
    for (const row of data) {
      const value = row[field]
      if (value == null || isNaN(value)) continue
      const bin = Math.min(Math.floor((value - min) / binWidth), bins - 1)
      counts[bin]++
      const category = categories.length && colorField ? categoryIndex.get(String(row[colorField])) : 0
      if (category === undefined) continue
      all[bin][category]++
      if (selected && predicate(row)) selected[bin][category]++
    }
    const maxCount = getMax(counts, 1)
    const renderBars = (series: number[][], opacity: number) => series.map((stack, bin) => {
      let bottom = cellSize
      return stack.map((count, i) => {
        const h = (count / maxCount) * (cellSize - 24)
        bottom -= h
        return <rect key={i} x={(bin / bins) * cellSize} y={bottom}
          width={Math.max(cellSize / bins - 1, 1)} height={h}
          fill={categories.length && colorScale ? colorScale(categories[i]) : DEFAULT_COLOR}
          opacity={opacity} />
      })
    })
    return [renderBars(all, isActive ? 0.3 : 0.6), selected && renderBars(selected, 0.7)]
  }, [data, field, bins, cellSize, isActive, predicate, colorBy, colorScale])

  return <LabelCell label={label} cellSize={cellSize} histogram={histogram} />
}

export function LabelCell({ label, cellSize, histogram }: {
  label: string
  cellSize: number
  histogram?: React.ReactNode
}) {
  const centered = histogram === undefined
  return (
    <svg width={cellSize} height={cellSize} style={centered ? undefined : { overflow: "hidden" }}>
      <text
        x={cellSize / 2}
        y={centered ? cellSize / 2 : 14}
        textAnchor="middle"
        dominantBaseline={centered ? "middle" : undefined}
        fontSize={centered ? 12 : 11}
        fontWeight="bold"
        fill="var(--semiotic-text, #333)"
        fontFamily={centered ? undefined : "var(--semiotic-font-family, sans-serif)"}
      >
        {label}
      </text>
      {histogram}
    </svg>
  )
}

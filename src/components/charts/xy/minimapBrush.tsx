/**
 * MinimapChart's overview brush: a LinearBrush over the overview's plot.
 * Loaded lazily with minimapBrushLazy, so charts without a mounted overview
 * never download it.
 */
"use client"
import * as React from "react"
import { LinearBrush } from "../../controls/LinearBrush"
import { formatBrushValue } from "../../controls/linearBrushLabels"
import { BRUSH_ACCENT } from "../../stream/brushTheme"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { StreamScales } from "../../stream/types"
import type { MinimapBrushEndMeta, MinimapConfig } from "./minimapChartTypes"

export interface MinimapBrushProps {
  config: MinimapConfig
  scales: StreamScales | null
  margin: { top: number; right: number; bottom: number; left: number }
  /** Overview plot size in px. */
  plotWidth: number
  plotHeight: number
  brushDirection: "x" | "y"
  extent: [number, number] | null
  /** The chart's axis formatter for the brushed axis, used when it returns a string. */
  axisFormat?: (value: number) => unknown
  onBrush: (extent: [number, number] | null) => void
  onBrushEnd?: (extent: [number, number] | null, meta: MinimapBrushEndMeta) => void
  onObservation?: OnObservationCallback
  chartId?: string
}

const SURFACE = "var(--semiotic-surface, var(--semiotic-bg, #ffffff))"

/** A formatter that only accepts string output, falling back to the brush default. */
function stringFormat(format: ((value: number) => unknown) | undefined) {
  return (value: number) => {
    try {
      const text = format?.(value)
      return typeof text === "string" ? text : formatBrushValue(value)
    } catch {
      return formatBrushValue(value)
    }
  }
}

export function MinimapBrush({
  config,
  scales,
  margin,
  plotWidth,
  plotHeight,
  brushDirection,
  extent,
  axisFormat,
  onBrush,
  onBrushEnd,
  onObservation,
  chartId,
}: MinimapBrushProps) {
  const scale = scales?.[brushDirection]
  const style = config.brushStyle ?? {}
  const handles = config.handles ? (config.handles === true ? {} : config.handles) : null
  const format = React.useMemo(
    () => (config.extentLabelFormat ? stringFormat(config.extentLabelFormat) : stringFormat(axisFormat)),
    [config.extentLabelFormat, axisFormat]
  )
  if (!scale) return null
  const domain = scale.domain().map(Number)
  const length = brushDirection === "x" ? plotWidth : plotHeight
  // At least 1px, so the detail chart never gets a zero-width domain.
  const minSpan = Math.max(config.minSpan ?? 0, length > 0 ? Math.abs(domain[1] - domain[0]) / length : 0)
  const accent = style.stroke ?? BRUSH_ACCENT
  const mask = style.mask === true ? {} : style.mask || null

  return (
    <LinearBrush
      scale={scale}
      orientation={brushDirection}
      inset={margin}
      // Size hints for pointer math and label placement before layout.
      width={plotWidth}
      height={plotHeight}
      value={extent}
      label={config.brushLabel ?? "Overview range"}
      minSpan={minSpan}
      resetOnDoubleClick={config.resetOnDoubleClick}
      emptySelection={handles ? "full-extent" : "hidden"}
      selectionStyle={{
        backgroundColor: `color-mix(in srgb, ${style.fill ?? BRUSH_ACCENT} ${(style.fillOpacity ?? 0.2) * 100}%, transparent)`,
        borderWidth: style.strokeWidth ?? 1,
        borderStyle: "solid",
        borderColor: accent,
      }}
      activeSelectionStyle={style.activeStroke ? { borderColor: style.activeStroke } : undefined}
      maskStyle={mask ? { backgroundColor: mask.fill ?? SURFACE, opacity: mask.opacity ?? 0.6 } : undefined}
      showHandles={!!handles}
      showMoveHandle={!!handles?.move}
      handleSize={handles?.size}
      handleStyle={handles ? {
        ...(handles.fill && { backgroundColor: handles.fill }),
        ...(handles.stroke && { borderColor: handles.stroke }),
        ...(handles.radius != null && { borderRadius: handles.radius }),
      } : undefined}
      activeHandleStyle={handles?.activeFill ? { backgroundColor: handles.activeFill } : undefined}
      renderHandle={config.renderHandle}
      showExtentLabels={config.showExtentLabels}
      formatValue={format}
      labelBounds={brushDirection === "x" ? [-margin.left, plotWidth + margin.right] : [-margin.top, plotHeight + margin.bottom]}
      onChange={(next) => onBrush(next)}
      onChangeEnd={(next, meta) => {
        if (meta.changed) onBrushEnd?.(next, { source: meta.source, atDomainStart: meta.atDomainStart, atDomainEnd: meta.atDomainEnd })
      }}
      chartType="MinimapChart"
      chartId={chartId}
      // `brush` observations already report every change; forward only the
      // gesture boundaries.
      onObservation={onObservation ? (observation) => {
        if (observation.type !== "control-change") onObservation(observation)
      } : undefined}
    />
  )
}

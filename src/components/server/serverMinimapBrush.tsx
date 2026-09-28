import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "../store/themeCore"
import { resolveBrushSelectionStyle } from "../stream/brushTheme"
import { createLinearBrushTrack, normalizeBrushValue } from "../controls/linearBrushGeometry"
import { linearBrushHandleThickness } from "../controls/linearBrushMetrics"
import { formatBrushValue, placeLinearBrushLabels } from "../controls/linearBrushLabels"
import { finiteNumber } from "./serverCompositeShared"

// MinimapChart's overview brush as static SVG: the selection, mask, built-in
// handles, and extent labels that the browser LinearBrush draws, with the same
// data-semiotic-brush-part / -label hooks. Geometry and label placement come
// from the same pure modules; `renderHandle` has no static form, so the
// built-in handles stand in.

const LABEL_FONT_SIZE = 11
const LABEL_LINE_HEIGHT = LABEL_FONT_SIZE * 1.2
const LABEL_OFFSET = 4

interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface StaticMinimapBrushInput {
  theme: SemioticTheme
  /** The chart's `minimap` config. */
  config: Datum
  direction: "x" | "y"
  /** The overview's domain on the brushed axis. */
  domain: readonly [number, number]
  extent: readonly [number, number] | null
  /** The overview plot in the composite SVG's coordinates. */
  plot: Box
  margin: { top: number; right: number; bottom: number; left: number }
  /** The chart's formatter for the brushed axis, used when it returns a string. */
  axisFormat?: unknown
}

const objectOf = (value: unknown): Datum | null =>
  value === true ? {} : value && typeof value === "object" ? (value as Datum) : null
const stringOf = (value: unknown) => (typeof value === "string" ? value : undefined)

function labelFormat(format: unknown) {
  return (value: number) => {
    try {
      const text = typeof format === "function" ? format(value) : undefined
      return typeof text === "string" ? text : formatBrushValue(value)
    } catch {
      return formatBrushValue(value)
    }
  }
}

/** A built-in handle: a rounded box with two grip lines, its border inside the box as in HTML. */
function handle(key: string, cx: number, cy: number, width: number, height: number, style: { fill: string; stroke: string; grip: string; radius: number }, gripAxis: "x" | "y") {
  const grips = [0.35, 0.65].map((at) =>
    gripAxis === "x"
      ? { x1: cx - width / 2 + width * at, x2: cx - width / 2 + width * at, y1: cy - height * 0.2, y2: cy + height * 0.2 }
      : { x1: cx - width * 0.2, x2: cx + width * 0.2, y1: cy - height / 2 + height * at, y2: cy - height / 2 + height * at }
  )
  return (
    <g key={key} className="semiotic-brush-handle" data-semiotic-brush-part={key}>
      <rect x={cx - width / 2 + 0.5} y={cy - height / 2 + 0.5} width={width - 1} height={height - 1} rx={style.radius} fill={style.fill} stroke={style.stroke} strokeWidth={1} />
      {grips.map((line, index) => <line key={index} {...line} stroke={style.grip} strokeWidth={1} />)}
    </g>
  )
}

export function renderStaticMinimapBrush(input: StaticMinimapBrushInput): React.ReactNode {
  const { theme, config, direction, plot, margin } = input
  const track = createLinearBrushTrack({ domain: input.domain, orientation: direction })
  if (!track) return null
  const handles = objectOf(config.handles)
  const value = normalizeBrushValue(input.extent, track) ?? (handles ? [track.min, track.max] as [number, number] : null)
  if (!value) return null

  const brushStyle = objectOf(config.brushStyle) ?? {}
  const themed = resolveBrushSelectionStyle(theme, 0.2)
  const surface = theme.colors.surface ?? theme.colors.background
  const length = direction === "x" ? plot.width : plot.height
  const [from, to] = [track.toFraction(value[0]), track.toFraction(value[1])].sort((a, b) => a - b)
  const span = (a: number, b: number): Box => direction === "x"
    ? { x: plot.x + a * length, y: plot.y, width: (b - a) * length, height: plot.height }
    : { x: plot.x, y: plot.y + a * length, width: plot.width, height: (b - a) * length }
  const parts: React.ReactNode[] = []

  const mask = objectOf(brushStyle.mask)
  if (mask) {
    for (const [a, b] of [[0, from], [to, 1]]) {
      parts.push(<rect key={`mask-${a}`} className="semiotic-brush-mask" data-semiotic-brush-part="mask" {...span(a, b)} fill={stringOf(mask.fill) ?? surface} opacity={finiteNumber(mask.opacity, 0.6)} />)
    }
  }

  // An SVG stroke straddles its edge; the browser's border sits inside the box.
  const strokeWidth = finiteNumber(brushStyle.strokeWidth, 1)
  const box = span(from, to)
  parts.push(
    <rect
      key="selection"
      className="selection"
      data-semiotic-brush-part="selection"
      x={box.x + strokeWidth / 2}
      y={box.y + strokeWidth / 2}
      width={Math.max(0, box.width - strokeWidth)}
      height={Math.max(0, box.height - strokeWidth)}
      fill={stringOf(brushStyle.fill) ?? themed.fill}
      fillOpacity={finiteNumber(brushStyle.fillOpacity, 0.2)}
      stroke={stringOf(brushStyle.stroke) ?? themed.stroke}
      strokeWidth={strokeWidth}
    />
  )

  if (handles) {
    const size = finiteNumber(handles.size, 12)
    const thickness = linearBrushHandleThickness(size)
    const style = {
      fill: stringOf(handles.fill) ?? surface,
      stroke: stringOf(handles.stroke) ?? themed.stroke,
      grip: themed.stroke,
      radius: finiteNumber(handles.radius, 3),
    }
    for (const [side, edge] of [["start", from], ["end", to]] as const) {
      parts.push(direction === "x"
        ? handle(side, plot.x + edge * length, plot.y + plot.height / 2, thickness, size * 2, style, "x")
        : handle(side, plot.x + plot.width / 2, plot.y + edge * length, size * 2, thickness, style, "y"))
    }
    if (handles.move) {
      const middle = (from + to) / 2
      parts.push(direction === "x"
        ? handle("move", plot.x + middle * length, plot.y, size * 2, thickness, style, "x")
        : handle("move", plot.x, plot.y + middle * length, thickness, size * 2, style, "y"))
    }
  }

  if (config.showExtentLabels) {
    const labels = placeLinearBrushLabels({
      value,
      track,
      length,
      orientation: direction,
      format: labelFormat(config.extentLabelFormat ?? input.axisFormat),
      fontSize: LABEL_FONT_SIZE,
      bounds: direction === "x" ? [-margin.left, plot.width + margin.right] : [-margin.top, plot.height + margin.bottom],
    })
    const rowSize = Math.max(1, ...labels.map((label) => label.lines.length)) * LABEL_LINE_HEIGHT
    for (const label of labels) {
      const before = label.placement === "before"
      // The first line's baseline sits about 0.95em into its line box.
      const x = direction === "x" ? plot.x + label.fraction * length : plot.x + plot.width + LABEL_OFFSET
      const top = direction === "x"
        ? plot.y + plot.height + LABEL_OFFSET + label.row * rowSize
        : plot.y + label.from
      parts.push(
        <text
          key={`label-${label.kind}`}
          className="semiotic-brush-label"
          data-semiotic-brush-label={label.kind}
          x={x}
          y={top + LABEL_FONT_SIZE * 0.95}
          fill={theme.colors.textSecondary}
          fontFamily={theme.typography.fontFamily}
          fontSize={LABEL_FONT_SIZE}
          textAnchor={direction === "x" && before ? "end" : "start"}
        >
          {label.lines.map((line, index) => (
            <tspan key={index} x={x} dy={index === 0 ? 0 : LABEL_LINE_HEIGHT}>{line}</tspan>
          ))}
        </text>
      )
    }
  }
  return <g className="semiotic-minimap-brush">{parts}</g>
}
